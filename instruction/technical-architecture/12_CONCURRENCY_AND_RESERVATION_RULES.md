# Module 12: Concurrency, Locking & Reservation Engineering Rules

**Scope:** every RMDU Mobiles workflow that reads shared state and then writes it — device reservations, comparison sessions, price alerts, recommendation generation, shopkeeper cards, reviews/votes, chat turns, admin ranking, counters. **Owner:** Meet Rabadiya. **Version:** 1.0, 2026-10-28.

**Status:** mandatory implementation contract. It describes required mechanics, not proven behavior.

**Relationship to the other modules:** [Module 11](11_SYSTEM_DESIGN_MASTER_RULES.md) defines *what* a claim/hold is and what availability may say; [Module 10](10_SYSTEM_DESIGN_AND_RELIABILITY_RULES.md) defines *platform* reliability, tables and provisioning. This module defines *how* to lock, expire, validate, display, recover and monitor it in PostgreSQL and the API.

**Verified platform facts this module builds on:** the [PostgREST gateway](../../backend/core/db.py) sends one HTTP call per statement and **each call is its own transaction**; `device_scores.overall_score` is trigger-computed; `comparison_sessions` carries `CHECK (array_length(device_ids,1) BETWEEN 1 AND 4)`; a UUID array has no per-element foreign key. Before [migration 07](../../database/07_concurrency_holds_and_versions.sql) there was **no `version` column anywhere** — §3's optimistic option was theoretical until that migration added one to `devices`, `user_profiles`, `recommendation_rules` and `categories`.

**Shipped primitives (migration 07):** `fn_bump_row_version()` + `version` columns; `fn_rerank_device()` (advisory lock, category row lock, expected revision, dense shift, audit in one transaction); `resource_holds` + `fn_claim_slot` / `fn_confirm_slot` / `fn_release_slot` / `fn_slot_status` / `fn_sweep_concurrency_state`; `idempotency_requests` + `fn_begin_idempotent` / `fn_complete_idempotent`. Proof lives in [`backend/scripts/qa_concurrency.py`](../../backend/scripts/qa_concurrency.py).

---

## 1. Lock Strategy Selector

**Truth is serialized by constraints; work is serialized by locks.** Prefer the first mechanism in the table that actually protects the invariant.

| Need | Mechanism | Where | Never use it for |
|---|---|---|---|
| One row per key | `UNIQUE` constraint / upsert | DB | Multi-step business logic |
| One holder of a scarce slot | unique partial index on `status='held'` | DB | Long-lived UI state |
| Edit without overwriting | expected `version` in `WHERE` | DB | High-contention counters |
| Multi-statement invariant on rows that exist | row lock (`FOR NO KEY UPDATE` / `FOR UPDATE`) | RPC | Anything across an external call |
| Serialize a workflow with no natural row | **transaction-scoped advisory lock** | RPC | Cross-request state |
| Cross-row predicate invariant | `SERIALIZABLE` + bounded retry | RPC | Read paths |
| Queue/worker fair claim | `FOR UPDATE SKIP LOCKED` | RPC | User-facing reads |

Hard rules:

1. Every lock and claim lives **inside one database function**. A lock taken in one PostgREST call is already released when the next call starts.
2. `lock_timeout = 1s`, `statement_timeout = 3s` for interactive RPCs (`SET LOCAL`), so contention fails fast instead of queueing traffic.
3. Consistent acquisition order everywhere: **users → brands → devices → categories → child rows**, UUID ascending within a group. A workflow may skip a group, never re-order.
4. No network call, upload, AI request or file write while holding a lock.
5. A blocked writer is a UX decision (§9), not an excuse to retry in a loop.

---

## 2. Advisory Locks (transaction-scoped only)

Advisory locks are for **serializing work**, not for representing truth. Use them only when a workflow spans multiple statements and has no row that can be locked naturally.

```sql
-- inside the RPC, never outside a transaction
IF NOT pg_try_advisory_xact_lock(hashtextextended('rank:' || p_category_id::text, 0)) THEN
    RAISE EXCEPTION 'rank_busy' USING ERRCODE = 'P0001';  -- API maps this to 409 + retry_after
END IF;
```

Rules:

- **Always the `_xact_` variant.** Session-level advisory locks leak across pooled connections (PgBouncer transaction pooling on `6543`) and can never be safely released by a later request.
- **Namespace every key** so features cannot collide:

| Key prefix | Purpose |
|---|---|
| `rank:<category_id>` | one rank mutation per category |
| `reco:<user_id>` | one recommendation generation per user |
| `card:<short_code>` | short-code allocation (only if retry logic needs it) |
| `job:<queue>` | single-flight sweeper/scanner |
| `hold:<type>:<key>` | only when claim logic needs pre-serialization |

- **Hash, never pass raw strings** to the bigint API, and never use user-supplied text as the key.
- **Do not** use an advisory lock where a unique index already decides the winner (holds, reviews, alerts). Constraints survive crashes and are visible to every writer.
- **Never** use an advisory lock to "protect" a read or to fake a queue. Queues belong in a table with `SKIP LOCKED`.

Worked pattern — admin rank move, shipped as `fn_rerank_device()`:

```sql
-- 1) serialize per category (transaction-scoped, never session-level)
IF NOT pg_try_advisory_xact_lock(hashtextextended('rank:' || p_category::text, 0)) THEN
    RETURN jsonb_build_object('status', 'busy', 'retry_after', 1);
END IF;
-- 2) lock the stable parent, 3) verify the caller's expected revision,
-- 4) move in place (deferred UNIQUE (category_id, rank)), 5) audit, 6) commit
SELECT version FROM categories WHERE id = p_category FOR NO KEY UPDATE;
-- rank updates happen here; fn_shift_category_ranks keeps ranks dense
-- the category revision is bumped only when something actually changed
```

`FOR NO KEY UPDATE` is preferred on parent rows that children reference by FK: it blocks competing writers without blocking new `KEY SHARE` FK inserts.

---

## 3. Race-Condition Library (per workflow)

| Workflow | Actual race | Mechanism | Expiry / release |
|---|---|---|---|
| Device reservation / stock (future) | two buyers, one unit | Hold row + partial unique index; inline reclaim of expired holds | `expires_at`, sweeper, cancel |
| Comparison session | duplicate sessions, invalid device arrays | **No device lock.** Idempotent create keyed by a `client_session_id` (needs a column + `UNIQUE (user_id, client_session_id)`); validate 2–4 distinct, visible devices in the RPC | Retention only (30 d); never reserves a device |
| Comparison analytics write | optional persistence fails after a good calculation | Return the result with `persisted:false`; never fail the comparison | n/a |
| Price alert create/rearm | double submit, stale trigger | `INSERT ... ON CONFLICT (user_id, device_id) DO UPDATE`, reset `is_triggered=false`, new cycle id | Re-evaluate on each price change |
| Alert worker scan | two workers deliver twice | Claim batch with `FOR UPDATE SKIP LOCKED` + `UNIQUE (alert_id, trigger_revision)` outbox row | Lease + attempt cap; dead-letter |
| Recommendation generation | slow old job overwrites new set | `reco:<user_id>` advisory lock **or** partial unique index `(user_id) WHERE status IN ('queued','running')`; publish with source revision check | Job lease; reject stale revision |
| Recommendation publish | readers see half a set | Delete+insert inside one RPC; require `max(rank) = count` and unique `(user_id, device_id)` | Old generation remains until commit |
| Shopkeeper card create | duplicate cards, code collision | Idempotency key per create + unique `short_code` with ≤5 retries | `expires_at` (default 7 d); durable revoke |
| Public card lookup | view counter lost updates | `UPDATE ... SET view_count = view_count + 1 RETURNING`; never blocks the read | n/a |
| Review submit | duplicate reviews | `UNIQUE (user_id, device_id)`; replay returns stored row | Edits return to moderation |
| Helpful vote | counter inflation | Needs `review_votes UNIQUE (review_id, user_id)` + atomic counter in one txn | Vote delete |
| Chat turn | interleaved/duplicate turns | `UNIQUE (session_id, client_turn_id)` + sequence; lease before generation; recheck on publish | Session close rejects late publish |
| Admin rank move | two editors, duplicate/gapped ranks | Advisory lock + parent row lock + deferred unique + expected revision | n/a |
| User provisioning | two first logins create two profiles | `INSERT ... ON CONFLICT (email/user_id) DO NOTHING` in the auth trigger | n/a |
| Any counter | read-modify-write loss | Atomic SQL increment | n/a |

Two consequences worth stating explicitly:

- **Comparison sessions must not reserve devices.** Locking a phone because someone opened a compare drawer is phantom unavailability dressed up as safety. Only stock/booking claims reserve inventory.
- **A cart is an intention, not a hold.** Adding to cart creates no claim; checkout claims one.

---

## 4. Session Timeout & Auto-Release Policy

Every temporary claim gets a **database-owned** expiry. No expiry, no temporary claim.

| Claim / session | TTL | Extension | Release triggers | Sweep |
|---|---|---|---|---|
| Stock hold (payment flow) | 10 min | once, ≤5 min | confirm, cancel, expiry, payment failure | inline + every 15–30 s |
| Admin reservation | 5 min | none | confirm/cancel/expiry | same |
| Checkout idle session | 15 min | none | abandonment, expiry | on demand |
| Comparison session | retention 30 d | n/a | user delete, retention job | daily batch |
| Public card capability | `expires_at` (default 7 d) | max 30 d at create | revoke, expiry, owner delete | lookup-time check |
| Guest chat session | 7 d retention | n/a | close, retention job | daily batch |
| Authenticated chat | 30 d retention | n/a | close, retention job | daily batch |
| Background job lease | 2–5 min | renew while running | success, failure, lease expiry | scanner |
| Admin edit form | 30 min token | none | save, cancel, expiry | n/a |
| Idempotency key | 24 h | n/a | completion, expiry | daily batch |

Rules:

- The UI countdown is **display only**. Server `expires_at` decides; a client clock that disagrees loses.
- Release **before** a new claim can succeed, inside the same transaction (§6 of Module 11).
- Expiry must be idempotent: a second sweeper pass is a no-op, never a second release event.
- A released/expired token is never reused or reactivated. The next claim gets a new token.
- Deactivating a device, revoking a card, or deleting an account releases dependent claims; soft-delete does not silently extend them.
- Malformed or missing timestamps **fail closed** (treat as expired/unavailable).

---

## 5. Database-Level Integrity: Constraints and Triggers

### 5.1 Constraints already present (use them, do not re-implement)

| Invariant | Constraint |
|---|---|
| One device per category position | `device_categories_rank_unique UNIQUE (category_id, rank)` DEFERRABLE |
| No duplicate membership | `device_categories_unique UNIQUE (device_id, category_id)` |
| Unique URL / brand / category / rule priority | `devices.slug`, `brands.name`, `categories.slug`, `recommendation_rules.priority` |
| One row per user/device | `recommendations_user_device_unique`, `reviews_user_device_unique`, `price_alerts_user_device_unique` |
| One row per parent | `user_profiles.user_id`, `device_specs.device_id`, `device_scores.device_id`, `device_embeddings.device_id` |
| Weights sum to 1.00 | `weights_sum_to_one` |
| Bounds | `rating 1–5`, `match_score 0–100`, `rank ≥ 1`, price/budget/alert `CHECK`s in 03 |
| Comparison cardinality | `chk_comparison_device_count` (1–4 in DB; API requires 2–4 **distinct**) |
| Capability uniqueness | `shopkeeper_cards.short_code UNIQUE`, `ai_chat_sessions.session_token UNIQUE` |
| Live claim per slot | `resource_holds_live_uniq` on `(resource_type, resource_key) WHERE status IN ('held','confirmed')` |
| One claim per idempotency key | `resource_holds_idem_uniq` on `(holder_key, resource_type, idempotency_key)` |
| One result per Idempotency-Key | `idempotency_requests_scope_unique` on `(actor_scope, operation, key)` |
| Lost-update detection | `version` columns + `fn_bump_row_version()` on `devices`, `user_profiles`, `recommendation_rules`, `categories` |

### 5.2 Triggers in use (know what fires before you write)

| Trigger | Behavior | Rule |
|---|---|---|
| `fn_shift_category_ranks` (`BEFORE INSERT/UPDATE OF rank`) | shifts sibling ranks dense | recursion-guarded only after [migration 06](../../database/06_fix_category_rank_trigger.sql); never re-rank via delete + reinsert |
| `fn_compute_overall_score` (`BEFORE INSERT/UPDATE OF` seven scores) | computes `overall_score` | never write `overall_score` from the app |
| `fn_set_updated_at` | stamps `updated_at` | not a version; do not use for conflict detection unless proven monotonic |
| `fn_generate_short_code` (`BEFORE INSERT`) | `md5(random())` 8 chars | capability, not authentication; collisions rely on the unique index |
| `handle_new_auth_user`, `handle_user_login_sync` | provisions `users` + `user_profiles` | must stay idempotent (`ON CONFLICT`) |

Trigger discipline:

- No external calls, no HTTP, no AI, no filesystem inside a trigger.
- Bounded work only; a trigger that touches N rows per insert is a write amplifier.
- Idempotent and re-runnable; recursion guarded (`pg_trigger_depth()`), tested with concurrent writers.
- `SECURITY DEFINER` only with a fixed `search_path` and least privilege; a trigger must not bypass RLS invisibly.
- Triggers enforce **data invariants**, never authorization or "who may claim".
- **Column-level grants are part of integrity.** The current `reviews` UPDATE policy is row-scoped, so `helpful_votes`, `is_approved` and `verified_owner` are editable through direct PostgREST unless column grants revoke them. Same class of risk for `users.role` / `is_active`. Fix with column grants or a narrow RPC — never with a comment.
- Arrays cannot carry per-element FKs. Validate element count, distinctness and existence in the RPC for `comparison_sessions.device_ids` and `ai_chat_messages.referenced_device_ids`.

---

## 6. API-Layer Validation & Idempotency

### 6.1 Validation order (fail early, fail cheap)

`auth token → authorization/ownership → schema (Pydantic) → domain (exists, visible, lifecycle) → claim → commit → respond`.

- Identity always comes from the verified token subject, never from a body/query `user_id`. The service key bypasses RLS, so route-level checks are mandatory.
- Allowlist mutable fields; reject unknown keys; enforce lengths, enums, ranges.
- Money is `Decimal`, never float; timestamps are server-generated.
- Admin edits require `If-Match` / expected revision; a missing precondition is a `428`/`422`, not a blind overwrite.

### 6.2 Idempotency contract

| Concern | Requirement |
|---|---|
| Header | `Idempotency-Key` required on POST/PATCH that create or claim |
| Scope | unique on `(actor_scope, operation, key)`; `actor_scope` = `user:<uuid>` or `guest:<token-hash>` |
| Body binding | store a SHA-256 of the canonical body; same key + different body → `409 idempotency_key_reuse` |
| State | `in_progress` → `completed` / `failed`; commit the result with the effect |
| Replay | same key + same body returns the **stored** status/body, not a second execution |
| Concurrency | two simultaneous copies: one executes, the other waits or gets `409 retry_after` |
| Async | `202` + durable job id and a status endpoint; "pending" is never "done" |
| Retention | ≥24 h, and ≥ provider replay window for payment events |
| Unknown outcome | timeout is **unknown**: re-query by key/token; never mint a new key |

```sql
CREATE TABLE idempotency_requests (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_scope  TEXT NOT NULL,          -- 'user:<uuid>' | 'admin:<id>' | 'guest:<hash>'
    operation    TEXT NOT NULL,          -- 'card.create', 'reservation.create'
    key          TEXT NOT NULL,
    request_hash TEXT NOT NULL,          -- SHA-256 of canonical body
    status       VARCHAR(12) NOT NULL DEFAULT 'in_progress'
                 CHECK (status IN ('in_progress','completed','failed')),
    http_status  SMALLINT,               -- status of the original response
    result       JSONB,                  -- body to replay verbatim
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT idempotency_requests_scope_unique UNIQUE (actor_scope, operation, key)
);
-- reads: fn_begin_idempotent() -> started | replay | in_progress | mismatch
-- writes: fn_complete_idempotent() records http_status + result (or failed)
```

### 6.3 Status-code contract

| Situation | Status | Body |
|---|---|---|
| Slot taken / version stale / duplicate identity | `409` | `{code, current, retry_after?}` |
| Precondition (`If-Match`) failed | `412` | current revision |
| Not owner / locked by policy | `403` | reason code |
| Validation | `422` | field errors |
| Rate limited | `429` | `Retry-After` |
| Dependency down / overload shed | `503` | `Retry-After` |
| Outcome unknown | `202` or `409 retry_status` | status lookup URL |

Never return `200` for a write that changed zero rows.

---

## 7. Frontend UX for Real-Time Availability

The UI renders server state; it never computes availability.

| State | Payload | Copy | Controls |
|---|---|---|---|
| Available | `available > 0` | "Available" | Reserve enabled |
| Held by you | `mine: {token, expires_at}` | "Held for you · 04:12" | Pay, Cancel |
| Held by others | `available: 0, held_until` | "On hold · releases 04:12" | Waitlist, similar phones |
| Expiring (yours) | `expires_at - now < 60s` | "1 minute left" + urgency tone | Pay now, extend (once) |
| Unavailable | `available: 0` | "Currently unavailable" | Notify me |

- **Countdown:** derive from `expires_at` + server offset from the response; re-sync on every response, tab focus and reconnect. Announce at 60 s / 30 s / 10 s via `aria-live="polite"` — not every tick.
- **Pending actions:** `aria-busy` + disabled control + "Reserving…" until commit. Only optimistic label allowed.
- **Conflict (`409`):** never a red generic error. Open a "just taken" panel that states what happened, shows alternatives, and preserves the user's filters/draft.
- **Cross-tab:** sync the active hold token with `BroadcastChannel` so two tabs cannot claim twice.
- **Refresh source:** SSE/WebSocket where available, otherwise 30 s polling with jitter on visible screens only, refetch on focus. Availability is `no-store`.
- **Reload/resume:** rehydrate from the stored `hold_token`; if expired, say "your hold expired" and offer the waitlist.
- **Comparison tray:** pins are local state (max 4, no duplicates, resolved by id/slug). No timers, no locks. If AI comparison is queued, show queue position, not a fake spinner.
- **Forbidden:** decrementing counts in React, "In stock" from cache, hiding a `409` behind a toast that disappears, showing "sold out" when the state is "on hold".

Suggested seams: `useAvailability(resource)`, `useReservation(resource)`, `useServerClock()`; components `AvailabilityBadge`, `HoldTimer`, `ReserveButton`, `ConflictPanel`, `WaitlistButton` — data through hooks, no inline fetches.

---

## 8. Fallback When a Lock or Claim Fails

| Condition | Detect | Response | Client behavior |
|---|---|---|---|
| Row locked > 1 s | `lock_not_available` (55P03) | `409 retry_after` | Backoff once, then show conflict |
| Advisory lock busy | `pg_try_advisory_xact_lock = false` | `409 retry_after` | Queue position or retry |
| Deadlock | `40P01` | rollback whole txn, retry ≤2 with jitter, then `409` | Human message, no auto-loop |
| Serialization failure | `40001` | same whole-transaction retry | same |
| Hold expired during payment | confirm returns 0 rows | `409 hold_expired` + compensation | "Slot released", waitlist |
| Idempotency key reused with new body | hash mismatch | `409 idempotency_key_reuse` | New key only after user intent |
| Provider down | timeout / 5xx | hold stays, order pending | "Payment pending", status polling |
| DB/PostgREST down | transport error | `503` + `Retry-After`; public reads may serve labelled stale | Read-only ladder, no write retries |
| Free-text lock/claim panic | any unexpected | fail closed | Never force-release another user's hold |

Rules: never "fix" contention by removing a constraint, disabling a trigger, escalating to a superuser write, or force-releasing someone else's hold. Administrative release requires authorization, a reason and an audit row. If a lock cannot be acquired within budget, the operation did not happen — say so.

---

## 9. Monitoring & Alerting for Deadlocks and Stuck Transactions

| Signal | Source | Alert |
|---|---|---|
| Deadlocks | `pg_stat_database.deadlocks`, server log | any increase in 5 min |
| Lock waits > 5 s | `pg_locks` not granted, `pg_stat_activity.wait_event_type='Lock'` | >5 sessions 2 min |
| Long transactions | `pg_stat_activity.xact_start` | >5 s interactive, >5 min migration |
| Idle in transaction | `state='idle in transaction'` | >30 s (set `idle_in_transaction_session_timeout`) |
| Advisory lock leaks | `pg_locks` where `locktype='advisory'` | held >60 s |
| Hold sweep lag | oldest `held` with `expires_at < NOW()` | >60 s |
| Orphan / stale holds | holder inactive, expiry passed, status still `held` | any |
| Confirm after expiry | counter | any |
| Idempotency replays vs conflicts | API metric | conflict ratio >5% |
| Job backlog age | oldest queued job | >5 min |

Read-only diagnostics (run as a privileged role, never exposed through the public API):

```sql
-- blocked sessions and who blocks them
SELECT w.pid, w.state, w.wait_event_type, w.xact_start,
       pg_blocking_pids(w.pid) AS blockers, left(w.query, 120) AS query
  FROM pg_stat_activity w
 WHERE w.wait_event_type = 'Lock';

-- idle transactions holding locks
SELECT pid, state, xact_start, now() - xact_start AS age, left(query, 120)
  FROM pg_stat_activity
 WHERE state LIKE 'idle in transaction%'
 ORDER BY age DESC;
```

Runbook: detect → identify blocker and owner → decide cancel vs terminate (only the blocker, only with authorization, never a running migration) → confirm release → reconcile the affected claim/idempotency/outbox rows → record root cause and add a regression test. `log_lock_waits` and `deadlock_timeout` are configuration changes with evidence, not ad-hoc debugging.

---

## 10. Proof: Lock-Specific Test Matrix

| Scenario | Pass condition |
|---|---|
| Two RPCs contend for `rank:<category>` | one proceeds; other gets `409` within 1 s, no partial ranks |
| Two users claim the last unit | one `held`, one `409 retry_after`, count ≥ 0 |
| Expired hold is re-claimed | old row `expired`, exactly one new `held`, no orphan |
| Confirm after expiry | 0 rows updated, compensation path, no order |
| Deadlock induced (opposite lock order in a test helper) | detector aborts one, retry succeeds once, no duplicate effect |
| Lock timeout (long-held row) | fails fast at 1 s with `409`, not a 30 s hang |
| Idempotent replay (same key/body) | identical response, one row/effect |
| Same key, different body | `409`, no write |
| Two tabs reserve | one claim; second tab adopts the existing token |
| Clock skew (client −5 min) | countdown still matches server expiry |
| Kill the worker mid-job | lease expires, job retried, no duplicate publish |
| Migration under traffic | no lock waits beyond budget; queries stay under `statement_timeout` |
| 2× peak on a hot category | p95 within budget, no 5xx from pool exhaustion |

---

## 11. Good / Bad

- ✅ `pg_try_advisory_xact_lock(hashtextextended('reco:'||user_id::text, 0))` inside the generation RPC.
- ✅ `FOR NO KEY UPDATE` on the category row, then in-place rank updates with the deferred unique constraint.
- ✅ `UPDATE ... SET view_count = view_count + 1 RETURNING`.
- ✅ `409` with the current holder, expiry and `retry_after`.
- ✅ Idempotency row committed with the effect, 24 h retention.
- ❌ Session-level `pg_advisory_lock` in a PgBouncer/pooled API.
- ❌ Taking a lock in one PostgREST call and assuming it still exists in the next.
- ❌ `SELECT` → mutate in Python → `UPDATE` for inventory, counters, or ranks.
- ❌ Re-ranking by deleting and reinserting memberships.
- ❌ Locking devices for comparison sessions or carts.
- ❌ Catching a deadlock and retrying a single statement instead of the whole transaction.
- ❌ Retrying an unknown-outcome write with a fresh idempotency key.
- ❌ "Fixing" a stuck lock by disabling a trigger, dropping a constraint, or force-releasing another user's hold.

---

## 12. Enforcement

Every work report for a data-changing or availability-showing change must state:

> **Concurrency:** workflow + invariant | lock/claim mechanism | isolation | lock order | timeout + retry policy | idempotency key | failure status | deadlock/stuck-txn observability | test evidence.

Plus the Module 11 line: `oversell=0`, `double_confirm=0`, `confirm_after_expiry=0`.

---

## 13. Definition of Done

- [ ] Workflow and invariant named; mechanism chosen from §1, not improvised.
- [ ] Advisory locks are `_xact_`, namespaced and hashed; no lock crosses a request boundary.
- [ ] Lock order and timeouts (`lock_timeout=1s`, `statement_timeout=3s`) set inside the RPC.
- [ ] Expiry TTL, extension and release path defined for every temporary claim (§4).
- [ ] Constraints/triggers relied on are named; no application re-implementation; column grants protect privileged fields.
- [ ] Idempotency key, request hash, replay and `409`-on-reuse implemented for creates/claims.
- [ ] UI states, countdown, `409` conflict panel and waitlist verified at 360 px with keyboard and screen reader.
- [ ] Failure table (§8) exercised: lock timeout, deadlock, serialization, expiry mid-payment, unknown outcome.
- [ ] Deadlock/stuck-transaction monitoring live before the feature ships; runbook written.
- [ ] Lock-specific tests from §10 pass in staging, with run-owned IDs cleaned up.
