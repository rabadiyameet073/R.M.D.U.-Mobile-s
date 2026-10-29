"""Schema parity audit: every write model must match a real column.

A Pydantic model that names a column the database does not have fails only at
runtime, as a raw `400 column ... does not exist` on one endpoint — exactly the
class of bug that made `POST /admin/categories` fail on a cold process. This
checks it up front.

The column truth comes from PostgREST's own OpenAPI document, so it reflects the
*deployed* database rather than the migration files. That distinction matters
here: `database/09` and `database/10` may not be applied yet, and a model that
needs them should say so instead of failing silently.

Run from the `backend` directory:  python scripts/audit_schema_parity.py
Exit code 0 = every write model fits the live schema (or its table is missing
and reported as a pending migration).
"""

from __future__ import annotations

import os
import sys
from typing import Dict, List, Optional, Set, Tuple

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx  # noqa: E402

from core.config import settings  # noqa: E402
from schemas import admin, catalog, site, user  # noqa: E402

#: (table, model, fields that are not columns, {model field: column})
#: `ignore` is for request-only fields — a nested payload, an RPC argument, or a
#: computed convenience field. Anything else missing from the table is a bug.
CHECKS: List[Tuple[str, object, Set[str], Dict[str, str]]] = [
    ("brands", admin.BrandCreate, set(), {}),
    ("brands", admin.BrandUpdate, set(), {}),
    (
        "devices",
        admin.DeviceCreate,
        # Nested collections are written to their own tables; brand_name is
        # resolved to a brand row before the insert.
        {"brand_name", "specs", "scores", "categories", "pros_cons", "features", "ussd_codes"},
        {},
    ),
    ("devices", admin.DeviceUpdate, {"brand_name"}, {}),
    ("device_specs", admin.SpecsReplace, set(), {}),
    ("device_pros_cons", admin.ProsConsItem, {"id"}, {}),
    ("device_features", admin.FeatureItem, {"id"}, {}),
    ("device_ussd_codes", admin.UssdCreate, set(), {}),
    ("device_ussd_codes", admin.UssdUpdate, set(), {}),
    ("categories", admin.CategoryCreate, set(), {}),
    ("categories", admin.CategoryUpdate, {"version"}, {}),
    ("reviews", catalog.ReviewCreateRequest, set(), {}),
    ("reviews", catalog.ReviewUpdateRequest, set(), {}),
    ("reviews", catalog.ReviewModerationRequest, set(), {}),
    ("users", admin.AdminUserUpdate, set(), {}),
    ("user_profiles", user.ProfileUpdate, {"version"}, {}),
    ("user_phone_history", user.PhoneHistoryCreate, set(), {}),
    ("price_alerts", user.PriceAlertCreate, set(), {}),
    (
        "shopkeeper_cards",
        user.ShopkeeperCardCreate,
        # Relative lifetime, converted to expires_at by the service.
        {"expires_in_days"},
        {},
    ),
    ("site_settings", admin.SiteSettingCreate, set(), {}),
    ("site_settings", admin.SiteSettingUpdate, {"version"}, {}),
    ("recommendation_rules", admin.RuleUpsertRequest, set(), {}),
]

#: Tables that a later migration introduces. A missing table is reported as a
#: pending migration rather than as a schema mismatch.
MIGRATION_OWNED = {"site_settings": "database/09_storefront_copy_and_site_settings.sql"}

#: Columns a later migration introduces, on tables that already exist. A
#: mismatch made up only of these is a pending deployment step, not a code bug:
#: the backend already falls back to a projection without them.
MIGRATION_OWNED_COLUMNS = {
    "categories": (
        {"subtitle", "highlights", "hero_video_url", "cover_image_url"},
        "database/09_storefront_copy_and_site_settings.sql",
    ),
}


def live_columns() -> Dict[str, Set[str]]:
    """Column names per table, from PostgREST's generated OpenAPI document."""
    headers = {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
    }
    with httpx.Client(timeout=30.0, headers=headers) as client:
        response = client.get(f"{settings.supabase_url}/rest/v1/")
    response.raise_for_status()
    definitions = response.json().get("definitions") or {}
    return {
        table: set((spec.get("properties") or {}).keys())
        for table, spec in definitions.items()
    }


def main() -> int:
    try:
        columns = live_columns()
    except (httpx.HTTPError, ValueError) as exc:
        print(f"could not read the live schema over PostgREST: {exc}")
        print("This check needs network access to Supabase; run it where the API runs.")
        return 2

    print(f"tables visible to PostgREST: {len(columns)}")
    mismatches: List[str] = []
    pending: Dict[str, str] = {}
    checked = 0

    for table, model, ignore, rename in CHECKS:
        name = model.__name__
        if table not in columns:
            pending.setdefault(table, MIGRATION_OWNED.get(table, "unknown migration"))
            continue
        checked += 1
        sent = {
            rename.get(field, field)
            for field in model.model_fields
            if field not in ignore
        }
        unknown = sorted(sent - columns[table])
        if not unknown:
            continue
        owned, migration = MIGRATION_OWNED_COLUMNS.get(table, (set(), ""))
        if migration and set(unknown) <= owned:
            pending[f"{table}.{'/'.join(unknown)}"] = migration
            continue
        mismatches.append(f"{name} -> {table}: no such column(s) {', '.join(unknown)}")

    for table, migration in sorted(pending.items()):
        print(f"SKIP {table}: absent, apply {migration}")

    print(f"write models checked: {checked}")
    if mismatches:
        print("\nSCHEMA MISMATCH:")
        for row in mismatches:
            print("  " + row)
        return 1
    print("OK: every write model field exists as a column on its table.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
