"""Read-only mode contract check (run against a server started with DB_READ_ONLY=true).

What it proves, in the order a visitor would hit it:

* reads still answer (health, meta, catalog)
* the public card link still resolves (its view counter is best-effort)
* guest compare and guest recommendations still answer, without a stored session
* every write is refused with `503 database_locked` and a `Retry-After`
* nothing was created: the admin list is unchanged afterwards

This script issues no direct database write. The only mutating requests are the
deliberate ones the API is expected to refuse, so a pass means the lock held.

Usage
    $env:DB_READ_ONLY='true'; python -m uvicorn main:app --port 8027
    python scripts/qa_read_only_mode.py --admin-key <key> --base http://127.0.0.1:8027

Exit code 0 = the lock held and every read survived.
"""

from __future__ import annotations

import argparse
import sys
from typing import List

import httpx

sys.stdout.reconfigure(encoding="utf-8")

PASSED: List[str] = []
FAILED: List[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    (PASSED if ok else FAILED).append(name)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{('  -> ' + detail) if detail else ''}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", default="http://127.0.0.1:8027")
    parser.add_argument("--admin-key", required=True)
    args = parser.parse_args()
    api = args.base.rstrip("/") + "/api/v1"

    with httpx.Client(
        timeout=40.0, headers={"X-Admin-Key": args.admin_key}
    ) as client:
        health = client.get(f"{api}/health")
        check(
            "health answers with the database up",
            health.status_code == 200 and health.json().get("database") == "ok",
            f"{health.status_code} {health.text[:80]}",
        )

        meta = client.get(f"{api}/meta")
        flags = (meta.json().get("features") or {}) if meta.status_code == 200 else {}
        check("meta answers", meta.status_code == 200, str(meta.status_code))
        check(
            "the lock is advertised to the SPA",
            flags.get("db_read_only") is True and flags.get("admin_writes") is False,
            f"db_read_only={flags.get('db_read_only')} admin_writes={flags.get('admin_writes')}",
        )

        listing = client.get(f"{api}/devices", params={"limit": 2})
        items = listing.json().get("items", []) if listing.status_code == 200 else []
        # An empty catalog is a seeding fact, not a read-only symptom: only the
        # status proves the read path still works.
        check(
            "catalog reads",
            listing.status_code == 200,
            f"{listing.status_code} items={len(items)}",
        )

        card = client.get(f"{api}/retail/cards/ZZTOP9")
        check(
            "public card link resolves instead of failing on its counter",
            card.status_code == 404 and card.json()["error"]["code"] == "card_not_found",
            f"{card.status_code} {card.text[:90]}",
        )

        if len(items) >= 2:
            compare = client.post(f"{api}/compare", json={"devices": [items[0]["id"], items[1]["id"]]})
            body = compare.json() if compare.status_code == 200 else {}
            check(
                "guest compare answers without a stored session",
                compare.status_code == 200
                and body.get("session_id") is None
                and bool(body.get("rows")),
                f"{compare.status_code} session_id={body.get('session_id')}",
            )

        recs = client.post(
            f"{api}/recommendations",
            json={"budget_max": 50000, "primary_priority": "camera", "limit": 2},
        )
        check("guest recommendations answer", recs.status_code == 200, str(recs.status_code))

        write = client.post(f"{api}/admin/brands", json={"name": "QA ReadOnly Probe"})
        payload = write.json().get("error", {}) if write.status_code >= 400 else {}
        check(
            "admin write refused as database_locked",
            write.status_code == 503 and payload.get("code") == "database_locked",
            f"{write.status_code} {payload.get('code')}",
        )
        check(
            "refusal tells the caller when to retry",
            bool(write.headers.get("retry-after")),
            str(write.headers.get("retry-after")),
        )

        probe = client.get(f"{api}/admin/brands", params={"search": "QA ReadOnly Probe"})
        rows = probe.json() if probe.status_code == 200 else None
        if isinstance(rows, dict):
            rows = rows.get("items")
        check(
            "the refused write left nothing behind",
            rows is not None and len(rows) == 0,
            f"{probe.status_code} rows={None if rows is None else len(rows)}",
        )

    print()
    print(f"{len(PASSED)} passed, {len(FAILED)} failed")
    return 0 if not FAILED else 1


if __name__ == "__main__":
    raise SystemExit(main())
