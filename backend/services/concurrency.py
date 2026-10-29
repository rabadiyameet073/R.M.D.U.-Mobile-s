"""Thin wrappers around the transactional RPCs in migrations 07 and 08.

Two concerns live here so routers stay declarative:

* **Missing storage.** Every RPC in this module needs a migration that may not
  have been applied yet. PostgREST answers `404 Could not find the function …`
  when that happens; that is a deployment fact, not a client error, so it is
  reported as `503 migration_required` with the file to apply. The alternative —
  letting a 404 leak — tells the caller the card or device does not exist, which
  is a lie.
* **Expected business outcomes.** The ranking RPCs return `busy`,
  `version_conflict` and `unknown_members` instead of raising, because they are
  ordinary outcomes of two admins working at once. `interpret_rank` turns them
  into the HTTP contract once, so no route reinvents the mapping.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from core.db import DataAccessError, db
from core.errors import APIError

MIGRATION_FILES = {
    "fn_rerank_device": "database/07_concurrency_holds_and_versions.sql",
    "fn_increment_card_view": "database/08_atomic_counters_votes_and_dense_ranks.sql",
    "fn_vote_review_helpful": "database/08_atomic_counters_votes_and_dense_ranks.sql",
    "fn_remove_category_member": "database/08_atomic_counters_votes_and_dense_ranks.sql",
    "fn_rerank_category_batch": "database/08_atomic_counters_votes_and_dense_ranks.sql",
}


def is_missing_function(exc: DataAccessError) -> bool:
    """True when PostgREST could not resolve the function in its schema cache.

    PostgREST reports a missing function as 404 with this wording. Narrow on
    purpose: a 404 from the RPC's own `PT404` raise means a row is missing, and
    that must stay a 404 for the caller.
    """
    if exc.status_code != 404:
        return False
    message = (exc.message or "").lower()
    return "could not find the function" in message or (
        "function public." in message and "does not exist" in message
    )


async def call_rpc(
    function: str,
    payload: Optional[dict] = None,
    *,
    feature: str,
) -> Dict[str, Any]:
    """Call one transactional RPC, translating the two framework failures.

    * Missing migration  → `503 migration_required`
    * `PT422` raise       → `422 unprocessable_request`
    * `PT404` raise       → `404 not_found`
    """
    try:
        result = await db.rpc(function, payload or {})
    except DataAccessError as exc:
        if is_missing_function(exc):
            raise APIError(
                503,
                "migration_required",
                f"{feature} needs a database migration that is not applied yet: "
                f"{MIGRATION_FILES.get(function, 'database/')}.",
                {"function": function},
                headers={"Retry-After": "60"},
            ) from exc
        if exc.status_code == 422:
            raise APIError(422, "unprocessable_request", exc.message) from exc
        if exc.status_code == 404:
            raise APIError(404, "not_found", exc.message) from exc
        raise
    return result or {}


def interpret_rank(result: Dict[str, Any], *, subject: str = "category") -> Dict[str, Any]:
    """Map a ranking RPC result onto HTTP, or return the `ok` payload.

    `busy` is a 409 with `Retry-After` rather than a 500: the caller should
    retry the same write, not repair anything.
    """
    status = result.get("status")
    if status == "ok":
        return result
    if status == "version_conflict":
        raise APIError(
            409,
            f"{subject}_version_conflict",
            f"The {subject} ranking changed since you loaded it; reload and retry.",
            {"current_version": result.get("current_version")},
        )
    if status == "busy":
        raise APIError(
            409,
            "rank_busy",
            f"Another request is editing this {subject}; retry in a moment.",
            headers={"Retry-After": str(result.get("retry_after") or 1)},
        )
    if status == "unknown_members":
        raise APIError(
            422,
            "unknown_category_members",
            "Some devices in this order are not ranked in the category.",
            {"device_ids": result.get("device_ids") or []},
        )
    if status == "not_found":
        raise APIError(404, "not_found", "No matching row.")
    raise APIError(
        502,
        "rank_failed",
        "The ranking service returned an unexpected result.",
        {"status": status},
    )
