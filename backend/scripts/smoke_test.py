"""Smoke-test the RMDU API against the running server.

Usage:
    python scripts/smoke_test.py [--base http://127.0.0.1:8000]

Read-only checks plus one throwaway anonymous chat session. Exits non-zero when
any assertion fails so it can gate CI or a deploy checklist.
"""

from __future__ import annotations

import argparse
import sys
import uuid
from typing import Any, Optional

import httpx

GREEN = "\033[92m"
RED = "\033[91m"
DIM = "\033[2m"
RESET = "\033[0m"

results: list[tuple[bool, str, str]] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    results.append((condition, name, detail))
    mark = f"{GREEN}PASS{RESET}" if condition else f"{RED}FAIL{RESET}"
    suffix = f" {DIM}{detail}{RESET}" if detail else ""
    print(f"[{mark}] {name}{suffix}")


def body_snippet(response: httpx.Response, size: int = 240) -> str:
    text = response.text.replace("\n", " ")
    return text[:size] + ("…" if len(text) > size else "")


def main(base: str) -> int:
    client = httpx.Client(base_url=base, timeout=45.0)
    api = "/api/v1"

    # ── system ────────────────────────────────────────────────
    health = client.get("/health")
    check("GET /health", health.status_code == 200 and health.json()["database"] == "ok",
          body_snippet(health))

    openapi = client.get(f"{api}/openapi.json")
    openapi_body = openapi.json() if openapi.status_code == 200 else {}
    check("GET openapi.json", openapi.status_code == 200 and "paths" in openapi_body,
          f"{len(openapi_body.get('paths', {}))} paths")

    operations = [
        operation
        for path_item in openapi_body.get("paths", {}).values()
        for operation in path_item.values()
        if isinstance(operation, dict)
    ]
    untagged = [op for op in operations if not op.get("tags")]
    check(
        "every operation is tagged for /docs grouping",
        bool(operations) and not untagged,
        f"{len(operations)} operations, {len(untagged)} untagged",
    )
    documented_tags = {tag["name"] for tag in openapi_body.get("tags", [])}
    used_tags = {tag for op in operations for tag in op.get("tags", [])}
    check(
        "every used tag is declared with a description",
        bool(documented_tags) and used_tags <= documented_tags,
        f"declared={len(documented_tags)} used={len(used_tags)} "
        f"missing={sorted(used_tags - documented_tags)}",
    )
    check(
        "category meta is documented",
        f"{api}/categories/{{identifier}}/meta" in openapi_body.get("paths", {}),
    )

    meta = client.get(f"{api}/meta")
    check("GET /meta", meta.status_code == 200 and "categories" in meta.json(),
          body_snippet(meta))

    # ── catalog ───────────────────────────────────────────────
    categories = client.get(f"{api}/categories")
    category_rows = categories.json() if categories.status_code == 200 else []
    check("GET /categories", categories.status_code == 200 and isinstance(category_rows, list),
          f"{len(category_rows)} categories")

    brands = client.get(f"{api}/brands")
    check("GET /brands", brands.status_code == 200, body_snippet(brands))

    devices = client.get(f"{api}/devices", params={"page_size": 3})
    check(
        "GET /devices",
        devices.status_code == 200 and "items" in devices.json(),
        body_snippet(devices),
    )

    filtered = client.get(
        f"{api}/devices",
        params={"five_g": "true", "min_price": 10000, "max_price": 60000, "sort": "score_desc"},
    )
    check("GET /devices with filters", filtered.status_code == 200, body_snippet(filtered))

    nfc = client.get(f"{api}/devices", params={"nfc": "true"})
    check("GET /devices?nfc filter", nfc.status_code == 200, body_snippet(nfc))

    suggest = client.get(f"{api}/devices/suggest", params={"q": "phone"})
    check(
        "GET /devices/suggest",
        suggest.status_code == 200 and isinstance(suggest.json(), list),
        body_snippet(suggest),
    )
    suggest_blank = client.get(f"{api}/devices/suggest")
    check("GET /devices/suggest without q -> 422", suggest_blank.status_code == 422)

    featured = client.get(f"{api}/devices/featured")
    check("GET /devices/featured", featured.status_code == 200, body_snippet(featured))

    if category_rows:
        slug = category_rows[0]["slug"]
        detail = client.get(f"{api}/categories/{slug}")
        check(f"GET /categories/{slug}", detail.status_code == 200,
              f"devices={len(detail.json().get('devices', []))}")
        ranked = client.get(f"{api}/categories/{slug}/devices", params={"ranking": "auto"})
        check(f"GET /categories/{slug}/devices", ranked.status_code == 200, body_snippet(ranked))

    missing = client.get(f"{api}/devices/definitely-not-a-device")
    envelope = missing.json() if missing.status_code == 404 else {}
    check(
        "404 uses error envelope",
        missing.status_code == 404 and envelope.get("error", {}).get("code") == "device_not_found",
        body_snippet(missing),
    )

    # ── recommendations ──────────────────────────────────────
    rules = client.get(f"{api}/recommendations/rules")
    rule_rows = rules.json() if rules.status_code == 200 else []
    check("GET /recommendations/rules", rules.status_code == 200 and len(rule_rows) >= 1,
          f"{len(rule_rows)} rules")

    recs = client.post(
        f"{api}/recommendations",
        json={
            "budget_min": 10000,
            "budget_max": 40000,
            "primary_priority": "gaming",
            "secondary_priority": "battery",
            "limit": 3,
        },
    )
    rec_body = recs.json() if recs.status_code == 200 else {}
    check(
        "POST /recommendations",
        recs.status_code == 200 and "items" in rec_body and "weights" in rec_body,
        f"items={len(rec_body.get('items', []))} weights_sum="
        f"{round(sum(rec_body.get('weights', {}).values()), 2)}",
    )

    quick = client.get(f"{api}/recommendations/quick", params={"priority": "camera"})
    check("GET /recommendations/quick", quick.status_code == 200, body_snippet(quick))

    bad_budget = client.post(
        f"{api}/recommendations", json={"budget_min": 50000, "budget_max": 10000}
    )
    check("Validation rejects inverted budget", bad_budget.status_code == 422,
          body_snippet(bad_budget))

    # ── compare ──────────────────────────────────────────────
    fake_ids = [str(uuid.uuid4()), str(uuid.uuid4())]
    compare_missing = client.post(f"{api}/compare", json={"devices": fake_ids})
    check("POST /compare unknown ids -> 404", compare_missing.status_code == 404,
          body_snippet(compare_missing))

    compare_bad = client.post(f"{api}/compare", json={"devices": ["only-one"]})
    check("POST /compare requires 2 devices", compare_bad.status_code == 422,
          body_snippet(compare_bad))

    missing_session = client.get(f"{api}/compare/{uuid.uuid4()}")
    check(
        "GET /compare unknown session -> 404",
        missing_session.status_code == 404
        and missing_session.json().get("error", {}).get("code") == "comparison_not_found",
        body_snippet(missing_session),
    )

    review_edit = client.patch(f"{api}/devices/nope/reviews/{uuid.uuid4()}", json={"rating": 4})
    check("PATCH review without token -> 401", review_edit.status_code == 401,
          body_snippet(review_edit))

    review_delete = client.delete(f"{api}/devices/nope/reviews/{uuid.uuid4()}")
    check("DELETE review without token -> 401", review_delete.status_code == 401,
          body_snippet(review_delete))

    # ── auth gates ───────────────────────────────────────────
    me = client.get(f"{api}/me")
    check(
        "GET /me without token -> 401",
        me.status_code == 401 and me.json().get("error", {}).get("code") == "authentication_required",
        body_snippet(me),
    )
    bad_token = client.get(f"{api}/me", headers={"Authorization": "Bearer not-a-token"})
    check("GET /me with bad token -> 401", bad_token.status_code == 401, body_snippet(bad_token))

    admin = client.get(f"{api}/admin/stats")
    check("GET /admin/stats gated", admin.status_code in (401, 503), f"status={admin.status_code}")
    admin_wrong = client.get(f"{api}/admin/stats", headers={"X-Admin-Key": "wrong"})
    check(
        "GET /admin/stats wrong key rejected",
        admin_wrong.status_code in (401, 503),
        f"status={admin_wrong.status_code}",
    )

    admin_devices = client.get(f"{api}/admin/devices")
    check("GET /admin/devices gated", admin_devices.status_code in (401, 503),
          f"status={admin_devices.status_code}")
    admin_brands = client.get(f"{api}/admin/brands")
    check("GET /admin/brands gated", admin_brands.status_code in (401, 503),
          f"status={admin_brands.status_code}")

    # ── ai ───────────────────────────────────────────────────
    status = client.get(f"{api}/ai/status")
    check("GET /ai/status", status.status_code == 200, body_snippet(status))

    session_list = client.get(f"{api}/ai/chat/sessions")
    check("GET /ai/chat/sessions without token -> 401", session_list.status_code == 401,
          body_snippet(session_list))

    query = client.post(f"{api}/ai/query", json={"query": "best gaming phone under 30000", "limit": 3})
    query_body = query.json() if query.status_code == 200 else {}
    check(
        "POST /ai/query",
        query.status_code == 200 and query_body.get("mode") in ("keyword", "semantic"),
        f"mode={query_body.get('mode')}",
    )

    session = client.post(f"{api}/ai/chat/sessions", json={"greeting": "Hi, I need a phone."})
    session_body: Optional[dict[str, Any]] = session.json() if session.status_code == 201 else None
    check("POST /ai/chat/sessions", session.status_code == 201 and session_body is not None,
          body_snippet(session))

    if session_body:
        token = session_body["session_token"]
        turn = client.post(
            f"{api}/ai/chat/sessions/{token}/messages",
            json={"content": "Which phone has the best battery under 25000?"},
        )
        turn_body = turn.json() if turn.status_code == 200 else {}
        check(
            "POST chat message -> grounded reply",
            turn.status_code == 200 and bool(turn_body.get("assistant_message", {}).get("content")),
            body_snippet(turn),
        )
        history = client.get(f"{api}/ai/chat/sessions/{token}/messages")
        count = len(history.json()) if history.status_code == 200 else 0
        check("GET chat messages", history.status_code == 200 and count >= 3, f"{count} messages")
        closed = client.delete(f"{api}/ai/chat/sessions/{token}")
        check("DELETE chat session", closed.status_code == 200 and closed.json()["is_active"] is False,
              body_snippet(closed))

    failures = [name for ok, name, _ in results if not ok]
    print()
    print(f"{len(results) - len(failures)}/{len(results)} checks passed")
    if failures:
        print("Failed:")
        for name in failures:
            print(f"  - {name}")
        return 1
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    sys.exit(main(args.base))
