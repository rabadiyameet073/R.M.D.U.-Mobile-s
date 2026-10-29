"""Two-way dynamism test: database <-> console <-> storefront.

Proves the rule the storefront is built on — one source of truth, two faces:

  A. DB first      a row inserted straight into PostgREST (as SQL Editor would)
                   appears in /admin/* and in /site/* with no deploy.
  B. Console first a row created/edited through /admin/* is written to the
                   database and immediately rendered by /site/*.
  C. Convergence   rename, soft delete and deactivate each propagate to both
                   surfaces, so nothing keeps showing a stale copy.

Every row it creates is prefixed `QA Sync <suffix>` / `qa-sync-<suffix>` and is
hard-deleted in `finally`, including the audit rows the writes produced.

Usage (server must run with ADMIN_API_KEY set):
    python scripts/qa_storefront_sync.py --admin-key <key> [--base http://127.0.0.1:8000]

The cleanup step needs the Supabase secret key, read from the same .env the API
uses. Copy-field and site_settings checks report SKIP on a database without
migration 09 instead of failing, so the script is useful before and after it.
"""

from __future__ import annotations

import argparse
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings  # noqa: E402

GREEN, RED, YELLOW, DIM, RESET = "\033[92m", "\033[91m", "\033[93m", "\033[2m", "\033[0m"

# A Windows console defaults to a legacy code page; one unencodable character in
# a log line would otherwise abort the run before `finally` could clean up.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:  # noqa: BLE001 - not every stream supports it
    pass

results: List[tuple[str, str, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append(("PASS" if ok else "FAIL", name, detail))
    mark = f"{GREEN}PASS{RESET}" if ok else f"{RED}FAIL{RESET}"
    print(f"[{mark}] {name}" + (f" {DIM}{detail}{RESET}" if detail else ""))


def skip(name: str, reason: str) -> None:
    results.append(("SKIP", name, reason))
    print(f"[{YELLOW}SKIP{RESET}] {name} {DIM}{reason}{RESET}")


def rest_headers() -> Dict[str, str]:
    return {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
        "User-Agent": settings.server_user_agent,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def slugs(payload: dict) -> List[str]:
    return [row.get("slug") for row in payload.get("categories", [])]


def cards(payload: dict) -> List[dict]:
    return [row.get("device") or {} for row in payload.get("items", [])]


def cleanup(rest: httpx.Client, state: Dict[str, Any]) -> None:
    print(f"\n{DIM}cleaning up QA rows...{RESET}")
    device_ids = [item for item in state.get("device_ids", []) if item]
    if device_ids:
        joined = ",".join(device_ids)
        for child in ("recommendations", "shopkeeper_cards", "reviews", "price_alerts"):
            rest.delete(f"/{child}", params={"device_id": f"in.({joined})"})
        rest.delete("/audit_log", params={"target_id": f"in.({joined})"})
        rest.delete("/devices", params={"id": f"in.({joined})"})
    if state.get("brand_id"):
        rest.delete("/audit_log", params={"target_id": f"eq.{state['brand_id']}"})
        rest.delete("/brands", params={"id": f"eq.{state['brand_id']}"})
    if state.get("category_ids"):
        joined = ",".join(state["category_ids"])
        rest.delete("/audit_log", params={"target_id": f"in.({joined})"})
        rest.delete("/categories", params={"id": f"in.({joined})"})
    if state.get("setting_keys"):
        for key in state["setting_keys"]:
            rest.delete("/audit_log", params={"target_id": f"eq.{key}"})
            rest.delete("/site_settings", params={"key": f"eq.{key}"})

    leftovers = {
        "devices": rest.get("/devices", params={"select": "id", "slug": f"like.{state['prefix']}*"}),
        "categories": rest.get("/categories", params={"select": "id", "slug": f"like.{state['prefix']}*"}),
        "brands": rest.get("/brands", params={"select": "id", "name": f"like.{state['brand_name']}"}),
    }
    remaining = {name: len(response.json() or []) for name, response in leftovers.items()}
    check(
        "cleanup removed every QA row",
        not any(remaining.values()),
        " ".join(f"{name}={count}" for name, count in remaining.items()),
    )


def main(base: str, admin_key: str) -> int:
    suffix = uuid.uuid4().hex[:6]
    prefix = f"qa-sync-{suffix}"
    brand_name = f"QA Sync Brand {suffix}"
    category_name = f"QA Sync Cat {suffix}"
    state: Dict[str, Any] = {
        "prefix": prefix,
        "brand_name": brand_name,
        "device_ids": [],
        "category_ids": [],
        "setting_keys": [],
    }

    api = httpx.Client(base_url=base, timeout=90.0)
    admin = httpx.Client(base_url=base, timeout=90.0, headers={"X-Admin-Key": admin_key})
    rest = httpx.Client(
        base_url=f"{settings.supabase_url}/rest/v1", timeout=30.0, headers=rest_headers()
    )

    try:
        # ── 0. the console must be closed to anonymous callers ────────────────
        anon_write = api.post("/api/v1/admin/categories", json={"name": "hack"})
        check(
            "anonymous console write is rejected",
            anon_write.status_code in (401, 403),
            f"status={anon_write.status_code}",
        )
        anon_read = api.get("/api/v1/admin/site/settings")
        check(
            "anonymous console read is rejected",
            anon_read.status_code in (401, 403),
            f"status={anon_read.status_code}",
        )
        wrong_key = httpx.Client(
            base_url=base, timeout=30.0, headers={"X-Admin-Key": "not-the-key"}
        )
        bad = wrong_key.get("/api/v1/admin/site/settings")
        check(
            "wrong admin key is rejected",
            bad.status_code in (401, 403),
            f"status={bad.status_code}",
        )
        wrong_key.close()

        # ── A. database first: a plain INSERT reaches both surfaces ───────────
        inserted = rest.post(
            "/categories",
            json={"name": category_name, "slug": prefix, "is_active": True, "display_order": 0},
        )
        check("DB insert of a category succeeds", inserted.status_code == 201, inserted.text[:200])
        if inserted.status_code != 201:
            return 1
        db_category = inserted.json()[0]
        state["category_ids"].append(db_category["id"])

        home = api.get("/api/v1/site/home")
        home_body = home.json() if home.status_code == 200 else {}
        check(
            "DB-inserted category appears on the storefront home",
            home.status_code == 200 and prefix in slugs(home_body),
            f"status={home.status_code} categories={len(home_body.get('categories', []))}",
        )
        console = admin.get("/api/v1/admin/categories")
        console_slugs = [row.get("slug") for row in console.json()] if console.status_code == 200 else []
        check(
            "the same row appears in the console",
            console.status_code == 200 and prefix in console_slugs,
            f"status={console.status_code} rows={len(console_slugs)}",
        )
        page = api.get(f"/api/v1/site/categories/{prefix}")
        check(
            "the DB-inserted category already has a working storefront page",
            page.status_code == 200 and (page.json() or {}).get("slug") == prefix,
            f"status={page.status_code}",
        )

        # ── B. console first: create a brand, a device in that category ───────
        brand = admin.post("/api/v1/admin/brands", json={"name": brand_name, "country": "India"})
        check("POST /admin/brands", brand.status_code == 201, brand.text[:160])
        if brand.status_code != 201:
            return 1
        state["brand_id"] = brand.json()["id"]

        device_payload = {
            "name": f"QA Sync Phone {suffix}",
            "brand_name": brand_name,
            "slug": f"{prefix}-phone",
            "price": 18999,
            "launch_date": "2026-03-01",
            "is_featured": True,
            "image_url": "https://example.com/qa-sync.png",
            "color_options": ["Graphite"],
            "specs": {
                "processor_name": "QA Sync Chip",
                "ram_gb": 8,
                "storage_gb": 256,
                "display_size_inch": 6.5,
                "refresh_rate_hz": 120,
                "camera_primary_mp": 64,
                "battery_mah": 5500,
                "charging_watt": 45,
                "five_g": True,
                "nfc": True,
                "os": "Android 15",
                "ip_rating": "IP68",
            },
            "scores": {
                "performance_score": 81,
                "camera_score": 78,
                "battery_score": 88,
                "display_score": 80,
                "value_score": 86,
                "build_score": 76,
                "software_score": 79,
            },
            "categories": [{"category_slug": prefix, "rank": 1}],
            "pros_cons": [
                {"type": "pro", "description": "Two-day battery", "importance": 5, "display_order": 0},
                {"type": "con", "description": "No wireless charging", "importance": 2, "display_order": 0},
            ],
            "features": [
                {"feature_name": "Charging", "feature_value": "45W wired", "display_order": 0},
            ],
            "ussd_codes": [
                {"code": "*#06#", "description": "Show IMEI", "category": "general"},
            ],
        }
        created = admin.post("/api/v1/admin/devices", json=device_payload)
        check("POST /admin/devices", created.status_code == 201, created.text[:240])
        if created.status_code != 201:
            return 1
        device = created.json()
        device_id = device["id"]
        state["device_ids"].append(device_id)

        # ── B2. the storefront renders what the console just wrote ────────────
        cat_page = api.get(f"/api/v1/site/categories/{prefix}")
        cat_body = cat_page.json() if cat_page.status_code == 200 else {}
        members = cat_body.get("devices") or []
        check(
            "console-created device is ranked in the category page",
            cat_page.status_code == 200
            and len(members) == 1
            and members[0]["device"]["id"] == device_id
            and members[0]["rank"] == 1,
            f"status={cat_page.status_code} members={len(members)}",
        )
        home = api.get("/api/v1/site/home")
        featured_ids = [row.get("id") for row in (home.json() or {}).get("featured", [])]
        check(
            "the featured flag carries through to the home page",
            home.status_code == 200 and device_id in featured_ids,
            f"featured={len(featured_ids)}",
        )
        tile = next(
            (row for row in (home.json() or {}).get("categories", []) if row.get("slug") == prefix),
            {},
        )
        check(
            "the home tile counts the new member",
            tile.get("device_count") == 1 and tile.get("devices"),
            f"device_count={tile.get('device_count')}",
        )

        detail = api.get(f"/api/v1/devices/{device_payload['slug']}")
        detail_body = detail.json() if detail.status_code == 200 else {}
        check(
            "device detail exposes specs, pros/cons, features and USSD",
            detail.status_code == 200
            and (detail_body.get("specs") or {}).get("processor_name") == "QA Sync Chip"
            and len(detail_body.get("pros", [])) == 1
            and len(detail_body.get("cons", [])) == 1
            and len(detail_body.get("features", [])) == 1
            and any(code.get("code") == "*#06#" for code in detail_body.get("ussd_codes", [])),
            f"status={detail.status_code}",
        )

        # ── C. converging edits ───────────────────────────────────────────────
        # Assigning the device bumped the category revision, so the console must
        # reload before writing: that is the optimistic-lock contract, and a
        # stale write is expected to fail.
        console_rows = admin.get("/api/v1/admin/categories").json() or []
        current_version = next(
            (row.get("version") for row in console_rows if row.get("id") == db_category["id"]),
            None,
        )
        renamed = admin.patch(
            f"/api/v1/admin/categories/{db_category['id']}",
            json={"name": f"{category_name} Renamed", "version": current_version},
        )
        check(
            "PATCH /admin/categories renames it",
            renamed.status_code == 200,
            renamed.text[:160],
        )
        cat_body = (api.get(f"/api/v1/site/categories/{prefix}").json() or {})
        home_body = (api.get("/api/v1/site/home").json() or {})
        tile = next((row for row in home_body.get("categories", []) if row.get("slug") == prefix), {})
        check(
            "the rename reaches the storefront page and tile",
            cat_body.get("name") == f"{category_name} Renamed"
            and tile.get("name") == f"{category_name} Renamed",
            f"page={cat_body.get('name')} tile={tile.get('name')}",
        )

        soft = admin.delete(f"/api/v1/admin/devices/{device_id}")
        cat_body = (api.get(f"/api/v1/site/categories/{prefix}").json() or {})
        featured_ids = [
            row.get("id") for row in (api.get("/api/v1/site/home").json() or {}).get("featured", [])
        ]
        check(
            "soft-deleting a device removes it from the ranking and the home page",
            soft.status_code == 200
            and not cat_body.get("devices")
            and device_id not in featured_ids,
            f"members={len(cat_body.get('devices') or [])} featured={device_id in featured_ids}",
        )
        detail_after = api.get(f"/api/v1/devices/{device_payload['slug']}")
        check(
            "the deactivated device detail is no longer public",
            detail_after.status_code == 404,
            f"status={detail_after.status_code}",
        )

        deactivated = admin.delete(f"/api/v1/admin/categories/{db_category['id']}")
        gone_home = (api.get("/api/v1/site/home").json() or {})
        gone_page = api.get(f"/api/v1/site/categories/{prefix}")
        check(
            "deactivating a category removes it from home and closes its page",
            deactivated.status_code == 200
            and prefix not in slugs(gone_home)
            and gone_page.status_code == 404
            and (gone_page.json() or {}).get("error", {}).get("code") == "category_not_found",
            f"home_has={prefix in slugs(gone_home)} page={gone_page.status_code}",
        )

        # ── D. migration-09 surfaces: category copy + site settings ──────────
        copy_probe = admin.patch(
            f"/api/v1/admin/categories/{db_category['id']}",
            json={"subtitle": "QA subtitle copy"},
        )
        if copy_probe.status_code == 503:
            skip("category display copy reaches the storefront", "needs migration 09")
        else:
            check(
                "PATCH /admin/categories writes display copy",
                copy_probe.status_code == 200,
                copy_probe.text[:160],
            )
            copy_body = admin.patch(
                f"/api/v1/admin/categories/{db_category['id']}",
                json={
                    "subtitle": "QA subtitle copy",
                    "highlights": ["First chip", "Second chip"],
                    "cover_image_url": "https://example.com/qa-cover.jpg",
                },
            )
            cat_body = (api.get(f"/api/v1/site/categories/{prefix}").json() or {})
            check(
                "category copy is rendered by the storefront page",
                copy_body.status_code == 200
                and cat_body.get("subtitle") == "QA subtitle copy"
                and list(cat_body.get("highlights") or []) == ["First chip", "Second chip"],
                f"subtitle={cat_body.get('subtitle')} highlights={cat_body.get('highlights')}",
            )

        setting_key = f"qa_probe_{suffix}"
        setting_value = {"title": "QA headline", "items": ["a", "b"]}
        setting = admin.post(
            "/api/v1/admin/site/settings",
            json={
                "key": setting_key,
                "value": setting_value,
                "description": "QA probe row",
                "is_public": True,
            },
        )
        if setting.status_code == 503:
            skip("site settings reach the storefront", "needs migration 09")
        else:
            check(
                "POST /admin/site/settings stores a JSON document",
                setting.status_code == 201,
                setting.text[:200],
            )
            state["setting_keys"].append(setting_key)
            public_settings = api.get("/api/v1/site/settings")
            public_body = public_settings.json() if public_settings.status_code == 200 else {}
            check(
                "the public storefront endpoint serves it",
                setting_key in public_body,
                f"status={public_settings.status_code} keys={sorted(public_body)[:6]}",
            )

            private_key = f"qa_private_{suffix}"
            private = admin.post(
                "/api/v1/admin/site/settings",
                json={"key": private_key, "value": {"secret": "hidden"}, "is_public": False},
            )
            state["setting_keys"].append(private_key)
            public_body = api.get("/api/v1/site/settings").json() or {}
            console_rows = admin.get("/api/v1/admin/site/settings").json() or {}
            console_keys = [row.get("key") for row in console_rows.get("items", [])]
            check(
                "a private setting stays in the console and never reaches the storefront",
                private.status_code == 201
                and private_key not in public_body
                and private_key in console_keys,
                f"public_leak={private_key in public_body} console_has={private_key in console_keys}",
            )

            version = (setting.json() or {}).get("version")
            updated = admin.put(
                f"/api/v1/admin/site/settings/{setting_key}",
                json={"value": {"title": "QA headline v2"}, "version": version},
            )
            public_body = api.get("/api/v1/site/settings").json() or {}
            check(
                "an edit is served immediately, without a deploy",
                updated.status_code == 200
                and (public_body.get(setting_key) or {}).get("title") == "QA headline v2",
                f"status={updated.status_code} value={public_body.get(setting_key)}",
            )
            stale = admin.put(
                f"/api/v1/admin/site/settings/{setting_key}",
                json={"value": {"title": "should not win"}, "version": version},
            )
            check(
                "a stale edit is rejected instead of overwriting",
                stale.status_code == 409,
                f"status={stale.status_code}",
            )
            removed = admin.delete(f"/api/v1/admin/site/settings/{setting_key}")
            public_body = api.get("/api/v1/site/settings").json() or {}
            check(
                "deleting a setting removes it from the storefront",
                removed.status_code == 204 and setting_key not in public_body,
                f"status={removed.status_code}",
            )
    finally:
        cleanup(rest, state)
        api.close()
        admin.close()
        rest.close()

    failures = [name for status, name, _ in results if status == "FAIL"]
    skipped = [name for status, name, _ in results if status == "SKIP"]
    passed = len(results) - len(failures) - len(skipped)
    print(f"\n{passed} passed, {len(failures)} failed, {len(skipped)} skipped")
    if failures:
        print("Failed:")
        for name in failures:
            print(f"  - {name}")
    if skipped:
        print("Skipped (apply the migration named above, then re-run):")
        for name in skipped:
            print(f"  - {name}")
    return 1 if failures else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("--admin-key", required=True)
    args = parser.parse_args()
    sys.exit(main(args.base, args.admin_key))
