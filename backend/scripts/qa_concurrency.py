"""§10 lock-specific test matrix for migration 07.

Runs against the live Supabase project using the service-role key (no API server
needed, no ADMIN_API_KEY). It creates a throwaway category, brand and three
devices, then proves the invariants the rules promise:

  * a single re-rank wins per expected version, and ranks stay dense
  * two claims on one slot produce exactly one holder (oversell = 0)
  * a repeated Idempotency-Key returns the original decision
  * confirm is repeat-safe, and expiry cannot be confirmed
  * the sweeper expires overdue holds and keeps the rows as history
  * slot_status never reveals who holds a slot

Everything it creates is deleted in `finally`; the QA rows are prefixed `qa-`.

Usage:
    python scripts/qa_concurrency.py

Requires migration 07 to be applied. Exits non-zero on any failed check.
"""

from __future__ import annotations

import sys
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings  # noqa: E402

GREEN, RED, DIM, RESET = "\033[92m", "\033[91m", "\033[2m", "\033[0m"
RESOURCE_TYPE = "qa-slot"
results: List[tuple[bool, str, str]] = []

# When stdout is piped, a Windows console falls back to cp1252 and any glyph
# outside it aborts the run mid-way with UnicodeEncodeError. Degrade instead.
try:
    sys.stdout.reconfigure(errors="replace")
except Exception:  # noqa: BLE001 - reconfigure is absent on very old runtimes
    pass


def check(name: str, condition: bool, detail: str = "") -> None:
    results.append((condition, name, detail))
    mark = f"{GREEN}PASS{RESET}" if condition else f"{RED}FAIL{RESET}"
    print(f"[{mark}] {name}" + (f" {DIM}{detail}{RESET}" if detail else ""))


def client() -> httpx.Client:
    return httpx.Client(
        base_url=f"{settings.supabase_url}/rest/v1",
        timeout=30.0,
        headers={
            "apikey": settings.supabase_secret_key,
            "Authorization": f"Bearer {settings.supabase_secret_key}",
            "User-Agent": settings.server_user_agent,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )


def rpc(http: httpx.Client, name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    response = http.post(f"/rpc/{name}", json=payload)
    if response.status_code >= 400:
        raise RuntimeError(f"{name} -> {response.status_code}: {response.text[:300]}")
    body = response.json()
    return body if isinstance(body, dict) else {"result": body}


def rpc_once(name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """One call on its own connection; safe to run inside a worker thread."""
    with client() as http:
        return rpc(http, name, payload)


def run_parallel(fn: Callable[[int], Dict[str, Any]], count: int) -> List[Dict[str, Any]]:
    with ThreadPoolExecutor(max_workers=count) as pool:
        futures = [pool.submit(fn, index) for index in range(count)]
        return [future.result() for future in futures]


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def cleanup(http: httpx.Client, state: Dict[str, Any]) -> None:
    print(f"\n{DIM}cleaning up QA rows…{RESET}")
    try:
        http.delete("/resource_holds", params={"resource_type": f"eq.{RESOURCE_TYPE}"})
        http.delete("/idempotency_requests", params={"actor_scope": f"eq.{state['actor']}"})
        if state.get("category_id"):
            http.delete("/audit_log", params={"target_id": f"eq.{state['category_id']}"})
        if state.get("device_ids"):
            joined = ",".join(state["device_ids"])
            http.delete("/devices", params={"id": f"in.({joined})"})
        if state.get("brand_id"):
            http.delete("/brands", params={"id": f"eq.{state['brand_id']}"})
        if state.get("category_id"):
            http.delete("/categories", params={"id": f"eq.{state['category_id']}"})

        leftovers = http.get(
            "/devices", params={"select": "id", "slug": "like.qa-conc-*"}
        ).json()
        check(
            "cleanup removed every QA row",
            leftovers == [],
            f"devices left={len(leftovers)}",
        )

        stray_holds = http.get(
            "/resource_holds",
            params={"select": "id", "resource_type": f"eq.{RESOURCE_TYPE}"},
        ).json()
        check(
            "no QA holds survive",
            stray_holds == [],
            f"holds left={len(stray_holds)}",
        )

        stray_keys = http.get(
            "/idempotency_requests",
            params={"select": "id", "actor_scope": f"eq.{state['actor']}"},
        ).json()
        check(
            "no QA idempotency records survive",
            stray_keys == [],
            f"keys left={len(stray_keys)}",
        )
    except Exception as exc:  # noqa: BLE001 - cleanup must never mask the report
        print(f"{RED}cleanup error: {exc}{RESET}")


def test_ranking(http: httpx.Client, state: Dict[str, Any]) -> None:
    category_id = state["category_id"]
    alpha, beta, gamma = state["device_ids"]

    version = http.get(
        "/categories", params={"select": "version", "id": f"eq.{category_id}"}
    ).json()[0]["version"]
    check("migration 07 exposes categories.version", version == 1, f"version={version}")

    placements = [(alpha, 1), (beta, 2), (gamma, 3)]
    for device_id, rank in placements:
        response = rpc(
            http,
            "fn_rerank_device",
            {
                "p_category_id": category_id,
                "p_device_id": device_id,
                "p_new_rank": rank,
                "p_expected_version": version,
            },
        )
        version = response.get("category_version")
        check(
            f"rerank {device_id[:8]} -> rank {rank}",
            response.get("status") == "ok" and response.get("rank") == rank,
            f"status={response.get('status')}",
        )

    rows = http.get(
        "/device_categories",
        params={"select": "device_id,rank", "category_id": f"eq.{category_id}", "order": "rank.asc"},
    ).json()
    check(
        "ranks are dense 1..N",
        [row["rank"] for row in rows] == [1, 2, 3],
        f"ranks={[row['rank'] for row in rows]}",
    )

    # Same expected version, two writers, one outcome.
    stale_version = 1
    outcomes = run_parallel(
        lambda index: rpc(
            http,
            "fn_rerank_device",
            {
                "p_category_id": category_id,
                "p_device_id": beta if index % 2 else gamma,
                "p_new_rank": 1,
                "p_expected_version": stale_version,
            },
        ),
        4,
    )
    statuses = [item.get("status") for item in outcomes]
    check(
        "stale expected_version is refused, never applied",
        statuses.count("ok") == 0 and all(s in ("version_conflict", "busy") for s in statuses),
        f"statuses={statuses}",
    )

    # Correct version, four writers racing for rank 1: exactly one applies.
    # Each writer also sends a unique justification so a win is always a real
    # write (a no-op placement deliberately does not burn a revision).
    current = http.get(
        "/categories", params={"select": "version", "id": f"eq.{category_id}"}
    ).json()[0]["version"]
    outcomes = run_parallel(
        lambda index: rpc_once(
            "fn_rerank_device",
            {
                "p_category_id": category_id,
                "p_device_id": [alpha, beta, gamma, beta][index % 4],
                "p_new_rank": 1,
                "p_expected_version": current,
                "p_justification": f"qa-race-{index}",
            },
        ),
        4,
    )
    statuses = [item.get("status") for item in outcomes]
    check(
        "concurrent rerank has exactly one winner",
        statuses.count("ok") == 1,
        f"statuses={statuses}",
    )

    rows = http.get(
        "/device_categories",
        params={
            "select": "rank",
            "category_id": f"eq.{category_id}",
            "order": "rank.asc",
        },
    ).json()
    check(
        "ranking stayed dense after the race",
        [row["rank"] for row in rows] == sorted(row["rank"] for row in rows)
        and len({row["rank"] for row in rows}) == len(rows),
        f"ranks={[row['rank'] for row in rows]}",
    )


def test_device_version(http: httpx.Client, state: Dict[str, Any]) -> None:
    device_id = state["device_ids"][0]
    current = http.get(
        "/devices", params={"select": "version", "id": f"eq.{device_id}"}
    ).json()[0]["version"]

    first = http.patch(
        "/devices",
        params={"id": f"eq.{device_id}", "version": f"eq.{current}"},
        json={"price": 11111},
    )
    after = http.get(
        "/devices", params={"select": "version,price", "id": f"eq.{device_id}"}
    ).json()[0]
    check(
        "conditional update applies and bumps version",
        len(first.json()) == 1
        and after["version"] == current + 1
        and float(after["price"]) == 11111,
        f"version={after['version']}",
    )

    stale = http.patch(
        "/devices",
        params={"id": f"eq.{device_id}", "version": f"eq.{current}"},
        json={"price": 22222},
    )
    check(
        "same version twice = zero rows (409 path)",
        stale.json() == [],
        f"rows={len(stale.json())}",
    )


def test_hold_race(http: httpx.Client, state: Dict[str, Any]) -> None:
    key = f"{state['suffix']}-slot-1"
    holder_a, holder_b = f"user:{state['suffix']}-a", f"user:{state['suffix']}-b"

    outcomes = run_parallel(
        lambda index: rpc_once(
            "fn_claim_slot",
            {
                "p_resource_type": RESOURCE_TYPE,
                "p_resource_key": key,
                "p_holder_key": holder_a if index == 0 else holder_b,
                "p_ttl_seconds": 60,
            },
        ),
        2,
    )
    statuses = sorted(item.get("status") for item in outcomes)
    winners = [item for item in outcomes if item.get("status") == "held"]
    check(
        "one slot, two holders -> exactly one held",
        statuses == ["held", "taken"] and len(winners) == 1,
        f"statuses={statuses}",
    )

    live = http.get(
        "/resource_holds",
        params={
            "select": "id",
            "resource_type": f"eq.{RESOURCE_TYPE}",
            "resource_key": f"eq.{key}",
            "status": "in.(held,confirmed)",
        },
    ).json()
    check("oversell = 0", len(live) == 1, f"live_holds={len(live)}")

    loser = next(item for item in outcomes if item.get("status") == "taken")
    check(
        "loser learns the deadline, not the holder",
        "hold_token" not in loser and loser.get("retry_after", 0) >= 1,
        f"retry_after={loser.get('retry_after')}",
    )

    # Either racer can win, so record who actually holds the token — confirming
    # as the wrong holder must not be confused with a broken confirm.
    winner_index = next(
        index for index, item in enumerate(outcomes) if item.get("status") == "held"
    )
    state["hold_token"] = winners[0]["hold_token"]
    state["hold_key"] = key
    state["hold_holder"] = holder_a if winner_index == 0 else holder_b
    state["holder_a"] = holder_a

    status = rpc(
        http, "fn_slot_status", {"p_resource_type": RESOURCE_TYPE, "p_resource_key": key}
    )
    check(
        "slot_status reports held without leaking the holder",
        status.get("status") == "held" and "holder_key" not in status,
        f"status={status.get('status')}",
    )


def test_idempotent_claim(http: httpx.Client, state: Dict[str, Any]) -> None:
    key = f"{state['suffix']}-slot-idem"
    payload = {
        "p_resource_type": RESOURCE_TYPE,
        "p_resource_key": key,
        "p_holder_key": state["holder_a"],
        "p_ttl_seconds": 60,
        "p_idempotency_key": f"{state['suffix']}-idem-1",
    }
    first = rpc(http, "fn_claim_slot", payload)
    second = rpc(http, "fn_claim_slot", payload)
    check(
        "same Idempotency-Key replays the same hold",
        first.get("status") == "held"
        and second.get("status") == "held"
        and second.get("replayed") is True
        and first.get("hold_token") == second.get("hold_token"),
        f"first={first.get('status')} second={second.get('status')}",
    )
    state.setdefault("extra_hold_tokens", []).append(first.get("hold_token"))


def test_confirm_and_expiry(http: httpx.Client, state: Dict[str, Any]) -> None:
    token = state["hold_token"]
    holder = state["hold_holder"]

    confirmed = rpc(http, "fn_confirm_slot", {"p_hold_token": token, "p_holder_key": holder})
    replay = rpc(http, "fn_confirm_slot", {"p_hold_token": token, "p_holder_key": holder})
    check(
        "confirm is applied once and is repeat-safe",
        confirmed.get("status") == "confirmed"
        and confirmed.get("replayed") is False
        and replay.get("status") == "confirmed"
        and replay.get("replayed") is True,
        f"first={confirmed.get('status')} second={replay.get('status')}",
    )

    other = rpc(http, "fn_confirm_slot", {"p_hold_token": token, "p_holder_key": "user:someone-else"})
    check(
        "only the holder can confirm",
        other.get("status") == "forbidden",
        f"status={other.get('status')}",
    )

    released = rpc(
        http,
        "fn_release_slot",
        {"p_hold_token": token, "p_holder_key": holder, "p_reason": "qa_done"},
    )
    check("release frees the slot", released.get("status") == "released", released.get("status", ""))

    # Expiry: age the hold past its deadline, then try to confirm it.
    # Own holder key, so the 2-live-hold fairness rule cannot turn this fixture
    # into a `limited` response that would look like a broken claim.
    expiry_holder = f"user:{state['suffix']}-expiry"
    expired_hold = rpc(
        http,
        "fn_claim_slot",
        {
            "p_resource_type": RESOURCE_TYPE,
            "p_resource_key": f"{state['suffix']}-slot-expiry",
            "p_holder_key": expiry_holder,
            "p_ttl_seconds": 60,
        },
    )
    check(
        "expiry fixture claimed a slot",
        expired_hold.get("status") == "held",
        f"status={expired_hold.get('status')}",
    )
    if expired_hold.get("status") == "held":
        past = datetime.now(timezone.utc) - timedelta(minutes=5)
        http.patch(
            "/resource_holds",
            params={"hold_token": f"eq.{expired_hold['hold_token']}"},
            json={"created_at": iso(past - timedelta(minutes=5)), "expires_at": iso(past)},
        )
        late = rpc(
            http,
            "fn_confirm_slot",
            {"p_hold_token": expired_hold["hold_token"], "p_holder_key": expiry_holder},
        )
        check(
            "confirm after expiry is refused",
            late.get("status") == "expired",
            f"status={late.get('status')}",
        )

    # Sweeper: needs a hold that is overdue but still `held` — the confirm above
    # already expired its own row, so it cannot testify for the sweeper. Use a
    # separate holder so the 2-live-hold fairness rule cannot interfere.
    sweep_key = f"{state['suffix']}-slot-sweep"
    sweep_hold = rpc(
        http,
        "fn_claim_slot",
        {
            "p_resource_type": RESOURCE_TYPE,
            "p_resource_key": sweep_key,
            "p_holder_key": f"user:{state['suffix']}-sweep",
            "p_ttl_seconds": 60,
        },
    )
    check(
        "sweeper fixture claimed a slot",
        sweep_hold.get("status") == "held",
        f"status={sweep_hold.get('status')}",
    )
    if sweep_hold.get("status") == "held":
        past = datetime.now(timezone.utc) - timedelta(minutes=5)
        http.patch(
            "/resource_holds",
            params={"hold_token": f"eq.{sweep_hold['hold_token']}"},
            json={"created_at": iso(past - timedelta(minutes=5)), "expires_at": iso(past)},
        )

        sweep = rpc(http, "fn_sweep_concurrency_state", {"p_hold_limit": 50})
        check(
            "sweeper expires overdue holds",
            sweep.get("expired_holds", 0) >= 1,
            f"expired={sweep.get('expired_holds')}",
        )

        swept = http.get(
            "/resource_holds",
            params={"select": "status", "hold_token": f"eq.{sweep_hold['hold_token']}"},
        ).json()
        check(
            "swept hold is expired, not deleted",
            [row["status"] for row in swept] == ["expired"],
            f"status={[row['status'] for row in swept]}",
        )

        freed = rpc(
            http,
            "fn_slot_status",
            {"p_resource_type": RESOURCE_TYPE, "p_resource_key": sweep_key},
        )
        check(
            "swept slot is bookable again",
            freed.get("status") == "available",
            f"status={freed.get('status')}",
        )


def test_idempotency_records(http: httpx.Client, state: Dict[str, Any]) -> None:
    actor = state["actor"]
    key = f"{state['suffix']}-op-1"
    base = {"p_actor_scope": actor, "p_operation": "qa.op", "p_key": key}

    started = rpc(http, "fn_begin_idempotent", {**base, "p_request_hash": "hash-a"})
    in_flight = rpc(http, "fn_begin_idempotent", {**base, "p_request_hash": "hash-a"})
    check(
        "second attempt while in flight is refused",
        started.get("status") == "started" and in_flight.get("status") == "in_progress",
        f"started={started.get('status')} second={in_flight.get('status')}",
    )

    mismatch = rpc(http, "fn_begin_idempotent", {**base, "p_request_hash": "hash-b"})
    check("same key + different body = mismatch", mismatch.get("status") == "mismatch", mismatch.get("status", ""))

    recorded = rpc(
        http,
        "fn_complete_idempotent",
        {
            "p_actor_scope": actor,
            "p_operation": "qa.op",
            "p_key": key,
            "p_http_status": 201,
            "p_result": {"id": state["device_ids"][0]},
        },
    )
    replay = rpc(http, "fn_begin_idempotent", {**base, "p_request_hash": "hash-a"})
    check(
        "retry replays the stored result",
        recorded.get("status") == "recorded"
        and replay.get("status") == "replay"
        and replay.get("http_status") == 201
        and (replay.get("result") or {}).get("id") == state["device_ids"][0],
        f"status={replay.get('status')} http={replay.get('http_status')}",
    )


STRUCTURE = [
    ("column devices.version", "/devices", {"select": "version", "limit": "1"}),
    ("column user_profiles.version", "/user_profiles", {"select": "version", "limit": "1"}),
    ("column categories.version", "/categories", {"select": "version", "limit": "1"}),
    ("column recommendation_rules.version", "/recommendation_rules", {"select": "version", "limit": "1"}),
    ("table resource_holds", "/resource_holds", {"select": "id", "limit": "1"}),
    ("table idempotency_requests", "/idempotency_requests", {"select": "id", "limit": "1"}),
]

RPC_NAMES = [
    "fn_rerank_device",
    "fn_claim_slot",
    "fn_confirm_slot",
    "fn_release_slot",
    "fn_slot_status",
    "fn_begin_idempotent",
    "fn_complete_idempotent",
    "fn_sweep_concurrency_state",
]


def preflight(http: httpx.Client) -> bool:
    """Verify migration 07 landed, read-only, before writing anything.

    Structure comes from GETs on the new columns/tables; the RPCs are read from
    the PostgREST OpenAPI document rather than called, so nothing is executed and
    an un-migrated or half-migrated database is left exactly as found.
    """
    failures = 0
    for label, path, params in STRUCTURE:
        response = http.get(path, params=params)
        good = response.status_code < 400
        failures += 0 if good else 1
        check(label, good, "" if good else response.text[:110])

    spec = http.get("/")
    if spec.status_code != 200:
        check("OpenAPI spec readable", False, f"HTTP {spec.status_code}")
        failures += 1
    else:
        exposed = {
            path.rsplit("/", 1)[-1]
            for path in spec.json().get("paths", {})
            if path.startswith("/rpc/")
        }
        for name in RPC_NAMES:
            failures += 0 if name in exposed else 1
            check(f"rpc {name}", name in exposed)

    if failures:
        print(
            f"\n{RED}{failures} structural check(s) failed — nothing was written.{RESET}\n"
            "If the columns/tables are missing, run in the Supabase SQL Editor, in order:\n"
            "    database/06_fix_category_rank_trigger.sql\n"
            "    database/07_concurrency_holds_and_versions.sql\n"
            "If only the RPCs are missing, 07 landed partially: re-run it, then reload\n"
            "PostgREST with: NOTIFY pgrst, 'reload schema';"
        )
        return False
    print(f"{DIM}structure verified; running the matrix{RESET}\n")
    return True


def main() -> int:
    suffix = uuid.uuid4().hex[:6]
    state: Dict[str, Any] = {"suffix": suffix, "actor": f"admin:qa-{suffix}"}
    http = client()

    if not preflight(http):
        http.close()
        return 1

    try:
        category = http.post(
            "/categories",
            json={
                "name": f"QA Concurrency {suffix}",
                "slug": f"qa-conc-cat-{suffix}",
                "display_order": 999,
            },
        )
        if category.status_code >= 400:
            print(f"{RED}cannot create QA category: {category.text[:300]}{RESET}")
            return 1
        created_category = category.json()[0]
        state["category_id"] = created_category["id"]

        brand = http.post("/brands", json={"name": f"QA Conc Brand {suffix}"})
        state["brand_id"] = brand.json()[0]["id"]

        state["device_ids"] = []
        for index in range(3):
            device = http.post(
                "/devices",
                json={
                    "brand_id": state["brand_id"],
                    "name": f"QA Conc {suffix} {index + 1}",
                    "slug": f"qa-conc-{suffix}-{index + 1}",
                    "price": 10000 + index,
                },
            )
            state["device_ids"].append(device.json()[0]["id"])

        test_ranking(http, state)
        test_device_version(http, state)
        test_hold_race(http, state)
        test_idempotent_claim(http, state)
        test_confirm_and_expiry(http, state)
        test_idempotency_records(http, state)
    finally:
        cleanup(http, state)
        http.close()

    failures = [name for ok, name, _ in results if not ok]
    print(f"\n{len(results) - len(failures)}/{len(results)} checks passed")
    if failures:
        print("Failed:")
        for name in failures:
            print(f"  - {name}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
