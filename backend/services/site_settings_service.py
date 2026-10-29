"""Reads and writes for `site_settings` (migration 09).

One row per section (`site`, `hero`, `nav`, `footer`, …), each holding a JSON
document. The storefront reads the public rows through `/site/settings`; this
module is the only writer, and it keeps the two guarantees the rest of the admin
surface relies on:

* **Optimistic concurrency.** An update carries the revision it read; the UPDATE
  predicate includes that revision, so a second writer gets a 409 instead of
  silently overwriting the first.
* **Audit trail.** Every create, update and delete writes an `audit_log` row in
  the same request, so "who changed the hero copy" is answerable.

Reads are independent of the admin key: the storefront calls
`services.site_service.public_settings()`, which merges these rows over the
built-in defaults.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from core.db import DataAccessError, db
from core.errors import APIError
from services.audit import log_action

logger = logging.getLogger("rmdu.site_settings")

SETTINGS_COLUMNS = "id,key,value,description,is_public,version,created_at,updated_at"
MIGRATION_FILE = "database/09_storefront_copy_and_site_settings.sql"

# PostgREST reports a missing table/column with these SQLSTATE codes.
_MISSING_CODES = {"42P01", "42703", "PGRST205"}

UNSET = object()


def migration_required() -> APIError:
    """The honest answer when the tables this module owns do not exist yet."""
    return APIError(
        503,
        "migration_required",
        f"Site copy storage is not available. Apply {MIGRATION_FILE} first.",
        {"migration": MIGRATION_FILE},
    )


def _is_missing_storage(exc: DataAccessError) -> bool:
    code = str((exc.payload or {}).get("code") or "")
    if code in _MISSING_CODES:
        return True
    message = (exc.message or "").lower()
    return exc.status_code in (400, 404) and (
        "does not exist" in message or "could not find" in message
    )


def _translate(exc: DataAccessError) -> APIError:
    if _is_missing_storage(exc):
        return migration_required()
    return APIError(502, "database_error", "The site copy could not be read or written.")


async def list_settings() -> List[dict]:
    """Every section, private ones included (admin surface only)."""
    try:
        result = await db.select(
            "site_settings", columns=SETTINGS_COLUMNS, order="key.asc", limit=200
        )
    except DataAccessError as exc:
        raise _translate(exc) from exc
    return result.rows


async def get_setting(key: str) -> Optional[dict]:
    try:
        return await db.select_one(
            "site_settings", columns=SETTINGS_COLUMNS, filters={"key": f"eq.{key}"}
        )
    except DataAccessError as exc:
        raise _translate(exc) from exc


async def upsert_setting(
    key: str,
    *,
    value: Any = UNSET,
    description: Any = UNSET,
    is_public: Any = UNSET,
    expected_version: Optional[int] = None,
    ip_address: Optional[str] = None,
) -> dict:
    """Create the section, or update it at the revision the caller read."""
    existing = await get_setting(key)

    if existing is None:
        if value is UNSET:
            raise APIError(422, "value_required", "A new site setting needs a value.")
        values: Dict[str, Any] = {"key": key, "value": value}
        if description is not UNSET:
            values["description"] = description
        if is_public is not UNSET:
            values["is_public"] = bool(is_public)
        try:
            rows = await db.insert("site_settings", values, columns=SETTINGS_COLUMNS)
        except DataAccessError as exc:
            raise _translate(exc) from exc
        await log_action(
            "site_setting.create",
            target_type="site_setting",
            target_id=rows[0]["id"],
            new_value=values,
            ip_address=ip_address,
        )
        return rows[0]

    current_version = int(existing.get("version") or 1)
    if expected_version is not None and expected_version != current_version:
        raise APIError(
            409,
            "version_conflict",
            f"Another writer already moved '{key}' to version {current_version}; reload and retry.",
            {"current_version": current_version},
        )

    updates: Dict[str, Any] = {}
    if value is not UNSET:
        updates["value"] = value
    if description is not UNSET:
        updates["description"] = description
    if is_public is not UNSET:
        updates["is_public"] = bool(is_public)
    if not updates:
        return existing

    updates["version"] = current_version + 1
    filters = {"key": f"eq.{key}", "version": f"eq.{current_version}"}
    try:
        rows = await db.update("site_settings", filters, updates, columns=SETTINGS_COLUMNS)
    except DataAccessError as exc:
        raise _translate(exc) from exc
    if not rows:
        fresh = await get_setting(key)
        raise APIError(
            409,
            "version_conflict",
            f"'{key}' changed while this edit was being saved; reload and retry.",
            {"current_version": (fresh or {}).get("version")},
        )

    await log_action(
        "site_setting.update",
        target_type="site_setting",
        target_id=existing["id"],
        old_value={field: existing.get(field) for field in updates if field != "version"},
        new_value=updates,
        ip_address=ip_address,
    )
    return rows[0]


async def delete_setting(key: str, *, ip_address: Optional[str] = None) -> dict:
    """Remove a section; the storefront falls back to its built-in copy."""
    existing = await get_setting(key)
    if not existing:
        raise APIError(404, "site_setting_not_found", f"No site setting with key '{key}'.")
    try:
        await db.delete("site_settings", {"key": f"eq.{key}"})
    except DataAccessError as exc:
        raise _translate(exc) from exc
    await log_action(
        "site_setting.delete",
        target_type="site_setting",
        target_id=existing["id"],
        old_value=existing,
        new_value=None,
        ip_address=ip_address,
    )
    return existing
