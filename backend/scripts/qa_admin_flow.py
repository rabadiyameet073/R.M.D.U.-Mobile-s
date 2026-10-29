"""Temporary-data integration test for admin writes + engines.

Creates a QA brand and two devices through the public admin API, exercises the
catalog/recommendation/comparison/ranking paths, then hard-deletes every row it
created (including the compare session and audit entries).

Usage (server must run with ADMIN_API_KEY set):
    python scripts/qa_admin_flow.py --admin-key <key> [--base http://127.0.0.1:8000]

The cleanup step needs the Supabase secret key; it is read from the same .env
the API uses. Never run this against a catalog you cannot afford to touch for
a few seconds — the QA rows use a `qa-` prefix and are removed in `finally`.
"""

from __future__ import annotations

import argparse
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, List

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings  # noqa: E402

GREEN, RED, DIM, RESET = "\033[92m", "\033[91m", "\033[2m", "\033[0m"
results: List[tuple[bool, str, str]] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    results.append((condition, name, detail))
    mark = f"{GREEN}PASS{RESET}" if condition else f"{RED}FAIL{RESET}"
    print(f"[{mark}] {name}" + (f" {DIM}{detail}{RESET}" if detail else ""))


def rest_headers() -> Dict[str, str]:
    return {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
        "User-Agent": settings.server_user_agent,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def cleanup(rest: httpx.Client, state: Dict[str, Any]) -> None:
    print(f"\n{DIM}cleaning up QA rows…{RESET}")
    device_ids = [item for item in state.get("device_ids", []) if item]
    if state.get("comparison_id"):
        rest.delete("/comparison_sessions", params={"id": f"eq.{state['comparison_id']}"})
    if device_ids:
        joined = ",".join(device_ids)
        # Children first: a device delete cascades, but explicit deletes keep the
        # intent readable when auditing what the test touched.
        for child in ("recommendations", "shopkeeper_cards", "reviews", "price_alerts"):
            rest.delete(f"/{child}", params={"device_id": f"in.({joined})"})
        rest.delete("/audit_log", params={"target_id": f"in.({joined})"})
        response = rest.delete("/devices", params={"id": f"in.({joined})"})
        print(f"{DIM}devices delete -> {response.status_code}{RESET}")
    if state.get("brand_id"):
        rest.delete("/audit_log", params={"target_id": f"eq.{state['brand_id']}"})
        response = rest.delete("/brands", params={"id": f"eq.{state['brand_id']}"})
        print(f"{DIM}brand delete -> {response.status_code}{RESET}")

    # Prove the run left nothing behind.
    leftover_devices = rest.get("/devices", params={"select": "id", "slug": "like.qa-*"})
    leftover_brands = rest.get("/brands", params={"select": "id", "name": "like.QA *"})
    check(
        "cleanup removed every QA row",
        leftover_devices.content in (b"[]", b"") and leftover_brands.content in (b"[]", b""),
        f"devices={len(leftover_devices.json())} brands={len(leftover_brands.json())}",
    )


def main(base: str, admin_key: str) -> int:
    suffix = uuid.uuid4().hex[:6]
    brand_name = f"QA Temp Brand {suffix}"
    alpha_slug = f"qa-alpha-{suffix}"
    beta_slug = f"qa-beta-{suffix}"
    state: Dict[str, Any] = {}

    api = httpx.Client(base_url=base, timeout=60.0)
    admin = httpx.Client(
        base_url=base,
        timeout=60.0,
        headers={"X-Admin-Key": admin_key},
    )
    rest = httpx.Client(
        base_url=f"{settings.supabase_url}/rest/v1", timeout=30.0, headers=rest_headers()
    )

    try:
        # ── create ────────────────────────────────────────────
        brand = admin.post("/api/v1/admin/brands", json={"name": brand_name, "country": "India"})
        check("POST /admin/brands", brand.status_code == 201, brand.text[:200])
        if brand.status_code != 201:
            return 1
        state["brand_id"] = brand.json()["id"]

        alpha_payload = {
            "name": f"QA Alpha {suffix}",
            "brand_name": brand_name,
            "slug": alpha_slug,
            "price": 24999,
            "launch_date": "2026-01-15",
            "is_featured": True,
            "image_url": "https://example.com/qa-alpha.png",
            "gallery_urls": ["https://example.com/qa-alpha-1.png"],
            "color_options": ["Black"],
            "specs": {
                "processor_name": "QA Snap X1",
                "processor_brand": "QA",
                "ram_gb": 8,
                "storage_gb": 128,
                "display_size_inch": 6.6,
                "display_type": "AMOLED",
                "refresh_rate_hz": 120,
                "camera_primary_mp": 50,
                "camera_front_mp": 16,
                "camera_features": ["OIS"],
                "battery_mah": 5000,
                "charging_watt": 67,
                "five_g": True,
                "nfc": True,
                "os": "Android 15",
                "weight_grams": 195,
                "ip_rating": "IP67",
            },
            "scores": {
                "performance_score": 88,
                "camera_score": 72,
                "battery_score": 80,
                "display_score": 82,
                "value_score": 90,
                "build_score": 75,
                "software_score": 78,
            },
            "categories": [
                {"category_slug": "gaming-guru", "rank": 1},
                {"category_slug": "budget-killer", "rank": 1},
            ],
            "pros_cons": [
                {"type": "pro", "description": "Sustained 90fps in QA games", "importance": 5, "display_order": 0},
                {"type": "pro", "description": "67W charging in the box", "importance": 4, "display_order": 1},
                {"type": "con", "description": "No wireless charging", "importance": 3, "display_order": 0},
            ],
            "features": [
                {"feature_name": "Cooling", "feature_value": "Vapor chamber", "display_order": 0},
                {"feature_name": "Display", "feature_value": "120Hz AMOLED", "display_order": 1},
            ],
            "ussd_codes": [
                {"code": "*#*#4636#*#*", "description": "QA diagnostics menu", "category": "secret"},
            ],
        }
        beta_payload = {
            "name": f"QA Beta {suffix}",
            "brand_name": brand_name,
            "slug": beta_slug,
            "price": 21999,
            "launch_date": "2026-02-10",
            "specs": {
                "processor_name": "QA Snap X0",
                "ram_gb": 6,
                "storage_gb": 128,
                "display_size_inch": 6.7,
                "refresh_rate_hz": 90,
                "camera_primary_mp": 108,
                "camera_features": ["OIS", "Night mode"],
                "battery_mah": 6000,
                "charging_watt": 33,
                "five_g": True,
                "os": "Android 15",
            },
            "scores": {
                "performance_score": 70,
                "camera_score": 90,
                "battery_score": 92,
                "display_score": 76,
                "value_score": 85,
                "build_score": 70,
                "software_score": 74,
            },
            "categories": [
                {"category_slug": "gaming-guru", "rank": 2},
                {"category_slug": "battery-boss", "rank": 1},
            ],
        }

        alpha = admin.post("/api/v1/admin/devices", json=alpha_payload)
        alpha_body = alpha.json() if alpha.status_code == 201 else {}
        check("POST /admin/devices (alpha)", alpha.status_code == 201, alpha.text[:300])
        if alpha.status_code == 201:
            state.setdefault("device_ids", []).append(alpha_body["id"])

        beta = admin.post("/api/v1/admin/devices", json=beta_payload)
        beta_body = beta.json() if beta.status_code == 201 else {}
        check("POST /admin/devices (beta)", beta.status_code == 201, beta.text[:300])
        if beta.status_code == 201:
            state.setdefault("device_ids", []).append(beta_body["id"])

        if alpha.status_code != 201 or beta.status_code != 201:
            return 1

        alpha_id = alpha_body["id"]
        beta_id = beta_body["id"]

        # ── console read surfaces ─────────────────────────────
        admin_devices = admin.get(
            "/api/v1/admin/devices", params={"q": f"QA Alpha {suffix}"}
        )
        listed = admin_devices.json().get("items", []) if admin_devices.status_code == 200 else []
        check(
            "GET /admin/devices finds the draft by name",
            admin_devices.status_code == 200 and any(row["id"] == alpha_id for row in listed),
            f"status={admin_devices.status_code} items={len(listed)}",
        )

        hidden = admin.get(
            "/api/v1/admin/devices", params={"is_active": "false", "q": f"QA {suffix}"}
        )
        check(
            "GET /admin/devices can filter to deactivated rows",
            hidden.status_code == 200 and isinstance(hidden.json().get("items"), list),
            f"status={hidden.status_code}",
        )

        admin_brands = admin.get("/api/v1/admin/brands", params={"q": brand_name})
        brand_rows = admin_brands.json() if admin_brands.status_code == 200 else []
        brand_row = next((row for row in brand_rows if row["id"] == state["brand_id"]), {})
        check(
            "GET /admin/brands lists the brand with its device count",
            admin_brands.status_code == 200 and brand_row.get("device_count") == 2,
            f"status={admin_brands.status_code} count={brand_row.get('device_count')}",
        )

        # ── storefront filters on real rows ───────────────────
        nfc_only = api.get("/api/v1/devices", params={"nfc": "true", "page_size": 100})
        nfc_ids = [row["id"] for row in nfc_only.json().get("items", [])] if nfc_only.status_code == 200 else []
        check(
            "GET /devices?nfc=true keeps the NFC device and drops the other",
            nfc_only.status_code == 200 and alpha_id in nfc_ids and beta_id not in nfc_ids,
            f"status={nfc_only.status_code} matches={len(nfc_ids)}",
        )

        suggest = api.get("/api/v1/devices/suggest", params={"q": f"QA Alpha {suffix}"})
        suggest_rows = suggest.json() if suggest.status_code == 200 else []
        check(
            "GET /devices/suggest returns the typeahead row",
            suggest.status_code == 200
            and any(row["id"] == alpha_id and row.get("brand_name") for row in suggest_rows),
            f"status={suggest.status_code} rows={len(suggest_rows)}",
        )

        # ── saved comparison round trip ───────────────────────
        compared = api.post(
            "/api/v1/compare",
            json={"devices": [alpha_id, beta_id], "priority": "camera"},
        )
        compared_body = compared.json() if compared.status_code == 200 else {}
        session_id = compared_body.get("session_id")
        state["comparison_id"] = session_id
        check(
            "POST /compare stores a session for the two QA devices",
            compared.status_code == 200
            and bool(session_id)
            and compared_body.get("winner_device_id") == beta_id,
            f"status={compared.status_code} winner={compared_body.get('winner_device_id')}",
        )

        if session_id:
            reopened = api.get(
                f"/api/v1/compare/{session_id}", params={"priority": "camera"}
            )
            reopened_body = reopened.json() if reopened.status_code == 200 else {}
            check(
                "GET /compare/{session_id} re-opens the saved session",
                reopened.status_code == 200
                and reopened_body.get("session_id") == session_id
                and reopened_body.get("winner_device_id") == beta_id
                and len(reopened_body.get("rows", [])) > 10,
                f"status={reopened.status_code} rows={len(reopened_body.get('rows', []))}",
            )

        unknown = api.get(f"/api/v1/compare/{uuid.uuid4()}")
        check(
            "GET /compare unknown session -> 404",
            unknown.status_code == 404
            and unknown.json().get("error", {}).get("code") == "comparison_not_found",
            f"status={unknown.status_code}",
        )

        overall = alpha_body.get("overall_score")
        check(
            "overall_score computed by DB trigger",
            overall is not None and abs(float(overall) - 81.35) < 0.01,
            f"expected 81.35 got {overall}",
        )
        check(
            "detail hydrates specs/scores/categories",
            bool(alpha_body.get("specs")) and bool(alpha_body.get("scores")) and len(alpha_body.get("categories", [])) == 2,
            f"categories={[item['slug'] for item in alpha_body.get('categories', [])]}",
        )

        # One POST must populate every child table the product page reads.
        specs = alpha_body.get("specs") or {}
        check(
            "POST /admin/devices writes the whole spec sheet",
            specs.get("processor_name") == "QA Snap X1"
            and specs.get("nfc") is True
            and specs.get("battery_mah") == 5000
            and specs.get("camera_features") == ["OIS"],
            f"processor={specs.get('processor_name')} nfc={specs.get('nfc')}",
        )
        check(
            "POST /admin/devices writes pros, cons and features",
            len(alpha_body.get("pros", [])) == 2
            and len(alpha_body.get("cons", [])) == 1
            and len(alpha_body.get("features", [])) == 2,
            f"pros={len(alpha_body.get('pros', []))} cons={len(alpha_body.get('cons', []))} "
            f"features={len(alpha_body.get('features', []))}",
        )
        check(
            "POST /admin/devices writes device USSD codes",
            any(code.get("code") == "*#*#4636#*#*" for code in alpha_body.get("ussd_codes", [])),
            f"codes={[code.get('code') for code in alpha_body.get('ussd_codes', [])]}",
        )

        # The console edits through this feed: it must return the draft and only the
        # USSD codes this device owns, because the public detail merges the
        # universal codes into the payload and the console would then edit rows it
        # does not own.
        editor = admin.get(f"/api/v1/admin/devices/{alpha_id}")
        editor_body = editor.json() if editor.status_code == 200 else {}
        check(
            "GET /admin/devices/{id} returns the editor feed for a draft",
            editor.status_code == 200
            and (editor_body.get("specs") or {}).get("processor_name") == "QA Snap X1"
            and len(editor_body.get("pros", [])) == 2
            and len(editor_body.get("features", [])) == 2
            and all(
                not code.get("is_universal") for code in editor_body.get("ussd_codes", [])
            ),
            f"status={editor.status_code} body={editor.text[:140]}",
        )

        # Update path: one version-checked PATCH, then the per-table routes.
        patched = admin.patch(
            f"/api/v1/admin/devices/{alpha_id}",
            json={"model_number": "QA-M1", "version": alpha_body["version"]},
        )
        check(
            "PATCH /admin/devices/{id} applies a version-checked update",
            patched.status_code == 200
            and patched.json().get("model_number") == "QA-M1"
            and patched.json().get("version") == alpha_body["version"] + 1,
            patched.text[:160],
        )
        stale = admin.patch(
            f"/api/v1/admin/devices/{alpha_id}",
            json={"model_number": "QA-M2", "version": alpha_body["version"]},
        )
        check(
            "PATCH /admin/devices/{id} rejects a stale version",
            stale.status_code == 409,
            f"expected 409, got {stale.status_code}: {stale.text[:120]}",
        )

        # A partial spec upsert must keep the fields the console did not send.
        partial = admin.put(
            f"/api/v1/admin/devices/{alpha_id}/specs",
            json={"processor_name": "QA Snap X2"},
        )
        check(
            "PUT /admin/devices/{id}/specs keeps the fields it did not receive",
            partial.status_code == 200
            and (partial.json() or {}).get("processor_name") == "QA Snap X2"
            and (partial.json() or {}).get("battery_mah") == 5000,
            partial.text[:160],
        )

        # ── reads ─────────────────────────────────────────────
        found = api.get("/api/v1/devices", params={"q": f"QA Alpha {suffix}"})
        check(
            "GET /devices search finds new device",
            found.status_code == 200 and found.json()["meta"]["total"] == 1,
            found.text[:160],
        )

        filtered = api.get(
            "/api/v1/devices",
            params={"five_g": "true", "min_price": 20000, "max_price": 26000, "sort": "score_desc"},
        )
        check(
            "filtered+sorted list includes QA rows",
            filtered.status_code == 200
            and all(item["slug"].startswith("qa-") for item in filtered.json()["items"]),
            f"{len(filtered.json().get('items', []))} items",
        )

        brand_detail = api.get(f"/api/v1/brands/{brand_name}")
        check("GET /brands/{identifier} by name", brand_detail.status_code == 200,
              brand_detail.text[:120])

        gaming = api.get("/api/v1/categories/gaming-guru/devices")
        gaming_rows = gaming.json().get("items", []) if gaming.status_code == 200 else []
        check(
            "category ranking lists QA devices",
            len(gaming_rows) == 2 and gaming_rows[0]["manual_rank"] == 1,
            f"ranks={[row['manual_rank'] for row in gaming_rows]}",
        )

        # ── recommendation engine ─────────────────────────────
        recs = api.post(
            "/api/v1/recommendations",
            json={
                "budget_min": 15000,
                "budget_max": 30000,
                "primary_priority": "gaming",
                "limit": 5,
            },
        )
        rec_body = recs.json() if recs.status_code == 200 else {}
        items = rec_body.get("items", [])
        check(
            "gaming recommendations rank alpha first",
            recs.status_code == 200
            and len(items) == 2
            and items[0]["device"]["slug"] == alpha_slug
            and items[0]["match_score"] > items[1]["match_score"],
            f"scores={[item['match_score'] for item in items]}",
        )
        check(
            "recommendation reasons + breakdown present",
            bool(items) and bool(items[0].get("reason")) and len(items[0]["breakdown"]["contributions"]) == 7,
            items[0]["reason"][:90] if items else "",
        )
        check(
            "budget filter excludes out-of-range devices",
            all(15000 <= item["device"]["price"] <= 30000 for item in items),
            f"prices={[item['device']['price'] for item in items]}",
        )

        battery_recs = api.get("/api/v1/recommendations/quick", params={"priority": "battery"})
        battery_items = battery_recs.json().get("items", []) if battery_recs.status_code == 200 else []
        check(
            "battery priority ranks beta first",
            bool(battery_items) and battery_items[0]["device"]["slug"] == beta_slug,
            f"first={battery_items[0]['device']['slug'] if battery_items else None}",
        )

        # ── compare ───────────────────────────────────────────
        comparison = api.post(
            "/api/v1/compare",
            json={"devices": [alpha_slug, beta_slug], "priority": "gaming"},
        )
        cmp_body = comparison.json() if comparison.status_code == 200 else {}
        if cmp_body.get("session_id"):
            state["comparison_id"] = cmp_body["session_id"]
        check(
            "POST /compare builds full matrix",
            comparison.status_code == 200
            and len(cmp_body.get("rows", [])) >= 40
            and len(cmp_body.get("devices", [])) == 2,
            f"rows={len(cmp_body.get('rows', []))}",
        )
        check(
            "compare winner for gaming",
            cmp_body.get("winner_device_id") == alpha_body["id"],
            cmp_body.get("verdict", "")[:120],
        )
        row_keys = {row["key"] for row in cmp_body.get("rows", [])}
        check(
            "compare covers scores/specs/commercial",
            {"price", "overall_score", "battery_mah", "processor_name", "ip_rating"} <= row_keys,
            f"{len(row_keys)} rows",
        )

        # ── admin updates + triggers ──────────────────────────
        rescore = admin.put(
            f"/api/v1/admin/devices/{alpha_body['id']}/scores",
            json={
                "performance_score": 95,
                "camera_score": 72,
                "battery_score": 80,
                "display_score": 82,
                "value_score": 90,
                "build_score": 75,
                "software_score": 78,
            },
        )
        new_overall = rescore.json().get("scores", {}).get("overall_score") if rescore.status_code == 200 else None
        check(
            "PUT /admin/devices/{id}/scores recomputes overall",
            rescore.status_code == 200 and new_overall is not None and abs(float(new_overall) - 83.1) < 0.01,
            f"expected 83.1 got {new_overall}",
        )

        rerank = admin.put(
            f"/api/v1/admin/devices/{alpha_body['id']}/categories",
            json={"categories": [{"category_slug": "gaming-guru", "rank": 2}]},
        )
        gaming_after = api.get("/api/v1/categories/gaming-guru/devices").json().get("items", [])
        check(
            "rank trigger shifted the sibling device",
            rerank.status_code == 200
            and gaming_after[0]["device"]["slug"] == beta_slug
            and gaming_after[1]["manual_rank"] == 2,
            f"order={[(row['device']['slug'], row['manual_rank']) for row in gaming_after]}",
        )

        rules = admin.put(
            "/api/v1/admin/rules",
            json={
                "priority": "value",
                "weight_perf": 0.20,
                "weight_camera": 0.15,
                "weight_battery": 0.20,
                "weight_display": 0.15,
                "weight_value": 0.20,
                "weight_build": 0.05,
                "weight_software": 0.05,
            },
        )
        check("PUT /admin/rules upsert", rules.status_code == 200, rules.text[:160])

        stats = admin.get("/api/v1/admin/stats")
        check(
            "GET /admin/stats counts QA rows",
            stats.status_code == 200 and stats.json()["counts"]["devices"] >= 2,
            f"devices={stats.json()['counts']['devices']}" if stats.status_code == 200 else "",
        )

        audit = admin.get("/api/v1/admin/audit-log", params={"target_type": "device"})
        check(
            "audit log recorded mutations",
            audit.status_code == 200
            and any(item["action"] == "device.create" for item in audit.json()["items"]),
            f"{len(audit.json().get('items', []))} entries" if audit.status_code == 200 else "",
        )

        # ── soft delete ───────────────────────────────────────
        deactivated = admin.delete(f"/api/v1/admin/devices/{beta_body['id']}")
        visible = api.get("/api/v1/devices", params={"q": f"QA Beta {suffix}"})
        check(
            "soft delete removes device from public catalog",
            deactivated.status_code == 200 and visible.json()["meta"]["total"] == 0,
            f"still_visible={visible.json()['meta']['total']}",
        )
    finally:
        cleanup(rest, state)
        api.close()
        admin.close()
        rest.close()

    failures = [name for ok, name, _ in results if not ok]
    print(f"\n{len(results) - len(failures)}/{len(results)} checks passed")
    if failures:
        print("Failed:")
        for name in failures:
            print(f"  - {name}")
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    parser.add_argument("--admin-key", required=True)
    args = parser.parse_args()
    sys.exit(main(args.base, args.admin_key))
