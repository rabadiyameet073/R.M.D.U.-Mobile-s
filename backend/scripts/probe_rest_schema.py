"""Probe the live PostgREST schema (no direct Postgres connection needed).

`apply_sql.py --check` is authoritative, but it needs a DSN, and Supabase's
direct host is often unreachable from a laptop while the REST endpoint still
answers. This script asks PostgREST whether a column or table exists by
selecting it: a missing object comes back as HTTP 400 with SQLSTATE 42703
(undefined column) or 42P01 (undefined table).

Usage (from the `backend` directory):
    python scripts/probe_rest_schema.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings  # noqa: E402

# (label, table, column-or-None, introduced-by)
PROBES = [
    ("devices.version",            "devices",           "version",     "07"),
    ("devices.is_active",          "devices",           "is_active",   "01"),
    ("categories.version",         "categories",        "version",     "07"),
    ("categories.subtitle",        "categories",        "subtitle",    "09"),
    ("categories.highlights",      "categories",        "highlights",  "09"),
    ("categories.hero_video_url",  "categories",        "hero_video_url",  "09"),
    ("categories.cover_image_url", "categories",        "cover_image_url", "09"),
    ("site_settings",              "site_settings",     None,          "09"),
    ("audit_log",                  "audit_log",         None,          "01"),
    ("resource_holds",             "resource_holds",    None,          "07"),
    ("idempotency_requests",       "idempotency_requests", None,       "07"),
    ("review_votes",               "review_votes",      None,          "08"),
]


def main() -> int:
    headers = {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
        "User-Agent": settings.server_user_agent,
    }
    base = f"{settings.supabase_url}/rest/v1"
    missing: list[str] = []

    with httpx.Client(base_url=base, timeout=20.0, headers=headers) as client:
        catalog = client.get("/devices", params={"select": "id", "limit": "1"})
        print(f"connectivity  devices select -> {catalog.status_code}")
        if catalog.status_code >= 400:
            print(f"  {catalog.text[:200]}")
            print("cannot reach the REST endpoint; nothing to probe.")
            return 1

        for label, table, column, migration in PROBES:
            params = {"select": column or "*", "limit": "1"}
            response = client.get(f"/{table}", params=params)
            if response.status_code == 200:
                print(f"  OK    {label}")
                continue
            body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            code = body.get("code", "?")
            if code in {"42703", "42P01", "PGRST205"}:
                print(f"  MISS  {label}  (needs migration {migration})")
                missing.append(f"{label} -> migration {migration}")
            else:
                print(f"  ERR   {label}  {response.status_code} {code} {body.get('message', '')[:80]}")
                missing.append(f"{label} (probe error)")

    print()
    if missing:
        print(f"{len(missing)} object(s) not present on the live database:")
        for row in missing:
            print(f"  - {row}")
        return 1
    print("live schema matches every migration through 09.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
