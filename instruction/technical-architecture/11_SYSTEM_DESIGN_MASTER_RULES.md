# Module 11: System Design Master Rules — Concurrency, Integrity, Availability & Capacity

**Scope:** every RMDU Mobiles user flow (home, categories, device detail, compare, quiz/chat, recommendations, shopkeeper cards, price alerts, reviews, profile, admin) and every database-backed mutation. **Owner:** Meet Rabadiya. **Version:** 2.0, 2026-10-28.

**Status:** mandatory design contract. It defines required behavior; it does not claim the current code already complies. [Module 10](10_SYSTEM_DESIGN_AND_RELIABILITY_RULES.md) owns the table-by-table ownership map, infrastructure provisioning, backup/restore drills and incident mechanics. [Module 12](12_CONCURRENCY_AND_RESERVATION_RULES.md) owns the implementation mechanics — advisory and row locks, timeout matrix, `Idempotency-Key` contract, conflict UX and deadlock monitoring. This module is the working rulebook for **concurrency, data integrity, availability behavior and load**, aligned with the [database engineering standards](../../database/instruction_for_db/01_DATABASE_ENGINEERING_STANDARDS_AND_RULES.md).

---

## 1. The Core Model

Three things must never be confused:

| Layer | Examples | Authority |
|---|---|---|
| **Intention** | a click, a cart, a pinned comparison, an unsaved form | browser/local state only |
| **Claim** | a committed row that grants one holder exclusive use of a scarce thing | PostgreSQL |
| **Truth** | availability counts, rank order, ownership, expiry | PostgreSQL, read fresh |

The train-ticket lesson: a seat is a **capacity-1 slot**. Two people open it, both click Book, both pay, one is refunded and angry — and the site was "up" the whole time. It failed because availability came from a stale read, the claim was decided in the click handler, and payment confirmed a hold nobody owned.

The correct shape, applied to every scarce resource:

```text
available ──claim──> held(holder, expires_at) ──confirm──> confirmed
    ^                     │
    └──── release/expire ─┘        confirm legal only while held && not expired
```

Ten non-negotiables:

1. **The database decides the winner**, never the browser or a Python `if` between two HTTP calls.
2. **A hold has an owner, a token, and a server-side expiry.** No ownerless, endless holds.
3. **A held slot is not available.** It is "on hold until HH:MM", never bookable by someone else.
4. **Confirm requires the original hold**, inside its validity window.
5. **Availability = capacity − confirmed − active holds.** Any other number is a guess.
6. **Check and change happen together** in one transaction, never across separate PostgREST calls.
7. **Every write is repeat-safe.** Double clicks, retries and provider replays converge on one effect.
8. **Every failure path releases.** Cancel, timeout, crash, validation error — one release path, no orphans.
9. **Server time is the only clock.** The client may display a pessimistic countdown, never a longer one.
10. **No false success.** "Saved", "available", "sent", "reserved" require committed evidence.

Rule 6 has a hard platform constraint: the [PostgREST gateway](../../backend/core/db.py) issues one HTTP call per statement, and **each call is its own transaction**. Multiple awaited calls, `asyncio.gather`, or an in-process lock cannot create atomicity. Atomic workflows must be a single database RPC.

---

## 2. The Seat, Translated to RMDU

| RMDU flow | Scarce thing | Capacity today | Correct model |
|---|---|---|---|
| Store stock / booking (future) | a unit at a shop | 1 per unit | Full hold contract (§6). Pending hold is not sellable to anyone else |
| Category ranking | a position in a category | exactly 1 device per rank | Move in place inside one transaction; no delete-then-reinsert (§5) |
| Recommendation generation | the "current" ranked set for a user | 1 authoritative generation | Publish as one snapshot with a source revision; reject stale jobs |
| Shopkeeper card | a shareable code | 1 per code | Unique-insert claim with bounded retry; durable expiry/revocation |
| Alert trigger cycle | one notification event | 1 per `(alert, revision)` | Worker claim + unique outbox key; trigger state ≠ delivery state |
| Review / vote | one voice per person | 1 per `(user, device)` | Unique constraint; replay returns the existing row |
| Comparison | **not scarce** | unlimited | Local/persisted session only. Never hold or lock a device for comparing |
| Cart (if added) | **not scarce** | unlimited | A cart is an intention. It must not reserve stock; only checkout claims a hold |
| AI chat turn | one ordered turn per session | 1 per sequence | Lease claim + `UNIQUE (session_id, client_turn_id)` |

Two rules fall out of this table:

- **Do not lock what is not scarce.** Holding devices for comparison, quiz completion, or "viewing" is the classic phantom-booking bug: users see unavailable stock that nobody is buying.
- **Do not skip a hold for what is scarce.** A "Buy" button without an expiring hold is the train-ticket bug with extra steps.

---

## 3. Five Claim Primitives

Pick exactly one per resource. Never "SELECT, decide in application code, then write".

| # | Primitive | Use for | Correct shape | "Taken" signal |
|---|---|---|---|---|
| 1 | **Unique-insert claim** | Names and one-per-parent rows | `INSERT ... ON CONFLICT DO NOTHING RETURNING id` | zero rows |
| 2 | **Conditional update claim** | Editing an existing owned row | `UPDATE ... WHERE id=$1 AND version=$2` | zero rows affected → `409` |
| 3 | **Locked read claim** | Short critical sections | `SELECT ... FOR UPDATE` (never across an external call) | lock timeout → `409`/retry |
| 4 | **Expiring hold claim** | Capacity-limited slots | partial unique index `WHERE status='held'` + `expires_at` | unique violation → holder + `retry_after` |
| 5 | **Lease / fencing claim** | Jobs, chat turns, workers | `lease_until`, `attempts`, `worker_token`; stale token cannot publish | no row claimed |

Shared rules: the claim is one transaction/RPC; success returns only after commit; the caller receives a **claim token** for later steps; a timeout means **unknown**, so retry with the same idempotency key or query status — never mint a new key and claim again.

---

## 4. Transactions & Data Integrity

### 4.1 Isolation levels — choose deliberately

| Level | Prevents | Still allows | Use in RMDU |
|---|---|---|---|
| `READ COMMITTED` (default) | dirty reads | lost updates, write skew, phantoms | Single-row conditional writes, unique-insert claims, most reads |
| `REPEATABLE READ` | non-repeatable reads, phantoms (per snapshot) | **write skew** — two transactions read overlapping sets and both write | Multi-statement reads that must see one snapshot (ranking read, recommendation computation) |
| `SERIALIZABLE` | write skew, phantoms | serialization failures (`40001`) | Cross-row invariants: dense unique ranks, weights summing to 1.00, capacity counts |

- `REPEATABLE READ` is **not** a substitute for `SERIALIZABLE` when the invariant spans rows someone else may change. Two admins moving different devices can each keep "ranks are dense" true locally and break it globally.
- Serialization failures are expected: retry the **whole transaction** at most twice with jitter, never an individual statement.
- Lock/statement budgets for interactive mutations: `lock_timeout = 1s`, `statement_timeout = 3s`. Migrations keep `lock_timeout = 3s`.

### 4.2 The five failure classes, with RMDU examples

| Class | Example | Defense |
|---|---|---|
| **Lost update** | Two admins save a price; the slower save silently wins | Expected version in `WHERE`; zero rows → `409` |
| **Write skew** | Two rank moves each keep the category valid alone, together create a duplicate/gap | Lock the parent `categories` row, or `SERIALIZABLE` |
| **Phantom** | A paginated list shifts while a device is inserted, so page 2 repeats page 1 | Stable sort + UUID tie-break + keyset cursor, not `OFFSET` |
| **Non-atomic multi-write** | Device created, specs write fails → half-published phone | One RPC for device + specs + scores + categories + audit |
| **Duplicate effect** | Double-click creates two cards, two reviews, two chats | Idempotency key + unique constraint; replay returns the stored result |

### 4.3 Atomicity rules

- One business mutation = one transaction. A deferred constraint must pass before success is acknowledged.
- Never hold a lock while calling OpenAI, storage, a payment provider, or waiting on a browser. Prepare externally, then commit a short, version-checked write — or persist a job and finish later.
- Counters are incremented in SQL (`SET view_count = view_count + 1`), never read-modify-written in Python.
- Append-only evidence (audit, outbox) commits **with** the mutation; best-effort logging is not evidence.
- Any side effect outside the database needs a durable job/outbox row committed first. In-process background tasks do not survive a restart.

---

## 5. Optimistic vs Pessimistic Locking

**Optimistic (default for edits)** — devices, specs, scores, profiles, rules, card text:

```sql
UPDATE devices
   SET price = :price, version = version + 1
 WHERE id = :id AND version = :expected;
-- 0 rows => conflict or unseen deletion: return 409 (412 with If-Match), never success
```

- Requires a monotonic `version` added by migration; `updated_at` equality is acceptable only if the server sets it reliably.
- Conflicts are a product decision: return the caller's draft plus the current server state, and let the user merge. Never auto-overwrite.
- The browser sends the version it loaded. A form that has been open since before a change must not silently win.

**Pessimistic (only where races are expected)** — rank moves, hold claims, worker queues:

- Lock the **stable parent** first (`categories`, `devices`), then children. Global order: users → brands → devices → categories → child rows, UUID ascending within each group.
- `FOR UPDATE SKIP LOCKED` for queue/worker claims; never for user-facing reads.
- Never hold a row lock across an `await` on an external service.
- Locked positions (`rank_locked`) require an explicit override + reason + audit row; automated re-ranking must skip them.

**Admin ranking is the canonical safe move** — one transaction that locks the category, checks the expected revision, validates every device, updates memberships **in place** with the deferred unique constraint, preserves `id`/`added_by`/`created_at`, and writes audit evidence. The current [delete-then-reinsert path](../../backend/routers/admin.py) is not acceptable: a crash exposes an empty ranking and concurrent edits are lost.

---

## 6. The Hold Contract (reservations, stock, checkout)

RMDU has no inventory, order or payment table today; shopkeeper cards are advice, not stock. The moment "Reserve" or "Buy" appears, this section is mandatory and [Module 10 §17](10_SYSTEM_DESIGN_AND_RELIABILITY_RULES.md) applies: model the entities first, never hang stock off `devices.price`.

State machine: `held → confirmed` (holder, before expiry) or `held → released | expired`. A `confirmed` claim keeps blocking the slot until the owning workflow records the sale and calls `fn_release_slot(..., 'converted')`; no state ever moves back to `held`.

Shipped as `resource_holds` in [migration 07](../../database/07_concurrency_holds_and_versions.sql). The holder is a namespaced `holder_key`, not an FK, because a claim can belong to a user (`user:<uuid>`), a guest (`guest:<hash>`) or a background job (`job:<id>`).

```sql
CREATE TABLE resource_holds (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type   VARCHAR(40) NOT NULL,          -- 'stock_unit', 'category_slot', ...
    resource_key    TEXT        NOT NULL,          -- stable key, never a display string
    holder_key      TEXT        NOT NULL,          -- 'user:<uuid>' | 'job:<id>' | 'guest:<hash>'
    hold_token      UUID        NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    status          VARCHAR(12) NOT NULL DEFAULT 'held'
                    CHECK (status IN ('held', 'confirmed', 'released', 'expired')),
    idempotency_key TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    confirmed_at    TIMESTAMPTZ,
    released_at     TIMESTAMPTZ,
    release_reason  VARCHAR(40),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (expires_at > created_at)
);

-- the partial unique index is the race referee: one live claim per slot.
-- 'confirmed' is included: a sale in progress must not free the slot.
CREATE UNIQUE INDEX resource_holds_live_uniq
    ON resource_holds (resource_type, resource_key)
    WHERE status IN ('held', 'confirmed');
CREATE UNIQUE INDEX resource_holds_idem_uniq
    ON resource_holds (holder_key, resource_type, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
CREATE INDEX resource_holds_sweep ON resource_holds (expires_at) WHERE status = 'held';
```

Claim (one transaction; server clock only) — `fn_claim_slot()` performs steps 1–3 and returns `held | taken | limited | expired | busy | confirmed` instead of raising, so the API owns the HTTP mapping:

```sql
-- 1) reclaim a dead hold on the same key (expiry is a predicate, not an index)
UPDATE resource_holds SET status = 'expired', released_at = NOW(), release_reason = 'expired'
 WHERE resource_type = p_type AND resource_key = p_key
   AND status = 'held' AND expires_at <= NOW();

-- 2) the unique partial index elects exactly one winner
INSERT INTO resource_holds (resource_type, resource_key, holder_key,
                            quantity, expires_at, idempotency_key)
VALUES (p_type, p_key, p_holder, p_qty, clock_timestamp() + p_ttl, p_idem)
ON CONFLICT DO NOTHING
RETURNING hold_token, expires_at;
-- 3) zero rows -> read the live claim, return taken + retry_after (never the holder)
```

Confirm (idempotent, expiry-bound) — `fn_confirm_slot()`:

```sql
UPDATE resource_holds SET status = 'confirmed', confirmed_at = NOW()
 WHERE hold_token = p_token AND status = 'held' AND expires_at > NOW()
RETURNING id, resource_key;
-- 0 rows: already confirmed -> return the same success payload
--         expired or released -> 409 + compensation, never a confirm
```

Sweeper: `fn_sweep_concurrency_state()` expires `status='held' AND expires_at <= NOW()` in batches of ≤500 every 15–30 s and purges `idempotency_requests` past retention, **plus** the inline reclaim above so a stalled sweeper never blocks a sale. Expiry is never enforced by a trigger that runs on read.

Hold rules:

- **TTL:** 10 minutes for payment flows, 5 for admin reservations; one extension of ≤5 minutes, then the slot returns to the pool.
- **Grace:** the DB value is authoritative. The UI countdown may be up to 30 s pessimistic (show less, never more).
- **Late payment:** never confirm. Record the late provider event, refund/void, release, and tell the user the slot was re-released.
- **Provider callbacks** are idempotent via `UNIQUE (provider, provider_event_id)` on a `payment_events` table; confirmation is keyed by `hold_token`, never by a browser redirect.
- **Order rows commit with the confirm** (`orders`, `order_items`) so a confirmed hold without an order is impossible.
- **Hoarding limits:** max 2 concurrent holds per user, 5 claims/minute per user, 10/minute per IP, 15-minute cooldown after 3 abandoned holds. Waitlist/notify-me replaces refresh-spamming.

---

## 7. Live Availability Truth (No Ghost Bookings)

Four states, rendered from one fresh authoritative read:

| State | Payload | Copy | Allowed action |
|---|---|---|---|
| Available | `available: n > 0` | "Available" (+ count if > 1) | Reserve |
| Held by you | `mine: {hold_token, expires_at}` | "Held for you · 04:12 left" | Pay, Cancel |
| Held by others | `available: 0, held_until` | "On hold · releases 04:12" | Notify me / Waitlist |
| Unavailable | `available: 0` | "Currently unavailable" | Notify me / Similar phones |

- Availability responses are `Cache-Control: no-store`, never CDN-cached, never served stale-on-error.
- Push with SSE/WebSocket where available; otherwise poll visible screens every 30 s with jitter and refetch on focus/reconnect. Hidden tabs stop polling.
- Countdown seeds from `expires_at` plus the server-time offset captured in the response; re-sync on every response and on `visibilitychange`. `Date.now()` alone is not authority.
- The only optimistic label is "Reserving…". "Reserved" appears after commit with the real expiry.
- A reload mid-checkout rehydrates from `hold_token`; it never creates a second claim. Expired while away → say so plainly, offer the waitlist.
- Counts never change in the browser. A confirm decrements on commit; a release restores availability after the release commits, not before.
- Staff see the reason (holder, expiry); the public sees the aggregate only.
- **Ghost-booking test:** any screen that shows "Available" while no claim would succeed is a defect, even if every request returned HTTP 200.

---

## 8. Every Scarce Resource in the Current Schema

Each row is a real constraint in [migration 01](../../database/01_mobilemart_schema.sql) / [02](../../database/02_google_oauth_customer_sync.sql) / [03](../../database/03_normalization_and_indexes.sql).

| Resource | Existing exclusivity | Primitive | Release / expiry | Response when taken |
|---|---|---|---|---|
| Category position | `UNIQUE (category_id, rank)` DEFERRABLE + `UNIQUE (device_id, category_id)` | 3, lock parent category | member removed → renumber in the same transaction, dense ranks | `409 rank_conflict` + current map |
| `devices.slug` | `UNIQUE` | 1 | permanent; never reused for another device | `409 slug_taken` |
| `brands.name`, `categories.slug`, `recommendation_rules.priority` | `UNIQUE` | 1 | rename only via audited change | `409` |
| `shopkeeper_cards.short_code` | `UNIQUE` + `md5` trigger | 1, bounded retry (≤5) | `expires_at`; durable revocation, not hard delete | retry, then `503` |
| `user_profiles.user_id` | `UNIQUE` | 1 (upsert `DO NOTHING`) | deleted with the user | return existing row |
| `device_specs` / `device_scores` / `device_embeddings` per device | `UNIQUE (device_id)` | 1 + version check | replaced as one snapshot | `409` |
| `reviews`, `price_alerts`, `recommendations` per user-device | composite `UNIQUE` | 1; replay returns stored row | delete or replace; an alert rearm starts a new trigger cycle | `200` existing, or `409` |
| Locked rank | `rank_locked` flag | 3 | explicit override + reason + audit | `403 rank_locked` |
| Chat turn order | **no constraint today** | 5; needs `UNIQUE (session_id, client_turn_id)` + sequence | closed session rejects late publish | `409 turn_conflict` |
| Background work | **no job table today** | 5 / `SKIP LOCKED` | lease expiry requeues | claimed by nobody else |
| Helpful vote | **no vote table**, counter only | 1 on future `review_votes UNIQUE (review_id, user_id)` | delete vote | `409` / no-op |
| Card view count | none — counter | atomic increment | n/a | telemetry failure never blocks the page |

**Verified source gaps (2026-10-28):** [retail.py](../../backend/routers/retail.py) increments `view_count` with read-modify-write and `_is_expired()` returns `False` on a malformed timestamp (fails open → expired card looks valid); [admin.py](../../backend/routers/admin.py) rewrites rankings by delete-then-reinsert. These are documented defects, not patterns to copy.

---

## 9. Never-Broken Site Contract

"Broken" means blank screen, infinite spinner, fabricated data, or a false availability claim — not "shows an error state".

| Surface | Must always render | Empty / not-found | Slow (>5 s) | Dependency down | Forbidden |
|---|---|---|---|---|---|
| Shell, header, nav | Logo, nav, skip-link | — | static shell first | shell + cached routes | white screen, JS-only nav |
| Home | hero poster, rails, featured | honest "catalog updating" | skeletons | cached rails + `data_as_of` | invented featured phones |
| Category | ranked list, filters, URL state | `200` empty, `noindex, follow` | keep prior list, refresh chip | stale ≤5 min labelled | "no phones" on a 500 |
| Device detail | name, price, specs, scores, pros/cons, USSD | "Not provided"; 404 page | progressive sections | cached detail, availability unknown | invented specs, `₹0`, auto-dial USSD |
| Compare (2–4) | matrix, ties, unknowns | "add another phone" | local compare still works | cache + optional AI | duplicate device compared |
| Quiz / AI | questions, progress, fallback picks | honest "no match" + relax options | 15 s fallback or durable job | deterministic catalog fallback | invented phones, blocking browse |
| Profile / recommendations | own data, versioned edit | "complete your profile" | pending save + retry | read-only + banner | overwriting a newer save |
| Card create | preview, code, expiry | validation message | disable submit, keep draft | retry, one card only | two cards per click |
| Public card page | device summary, expiry | generic "card unavailable" | cached-safe render | generic unavailable | PII, expired content |
| Price alerts | target, state | "no alerts yet" | keep state | queued, never "sent" | "sent" without delivery proof |
| Reviews | approved reviews, summary | "be the first" | existing stay | read-only | self-assigned `verified_owner` |
| Admin | tables, revisions, audit | real "0 rows" | disable writes, keep reads | read-only + banner | silent overwrite, delete-reinsert |
| Auth | form, Google button, errors | clear validation | disable, keep input | "temporarily unavailable" | guest access to private data |
| 404 / offline / stale chunk | helpful page | — | one auto-reload, then message | offline banner | reload loop |

Global rules: an error boundary and skeleton per route; media never gates content (posters, `font-display: swap`); no spinner past 10 s without a message, retry and exit; keyboard and 360 px remain usable in every degraded state; degraded screens say what is degraded.

---

## 10. Resilience & Graceful Degradation

Failure taxonomy: **expected** (validation, `404`, taken slot) → return the domain error; **transient** (timeout, `429`, `503`) → bounded retry with jitter; **durable** (schema mismatch, revoked grants) → stop, alert, disable the feature; **unknown-outcome** (timeout after a write) → query status by token/key, never blind-retry.

| Failure | User sees | System does |
|---|---|---|
| API replica dies | other replica serves | drain, remove, restart, inspect |
| PostgreSQL / PostgREST down | bounded stale cache if eligible, else `503` | no unconfirmed writes; open breaker; alert |
| Auth down | public browsing works | protected ops return temporary unavailability; never bypass |
| AI / embeddings down | deterministic keyword fallback, labelled | pause expensive rebuilds |
| Notification provider down | alert queued, not "sent" | durable retry with dedupe |
| Analytics / view counter fails | content still renders | count loss separately; never retry a GET forever |
| Media / CDN fails | text + controls usable | posters/placeholders, alert on asset errors |

Degradation ladder — step down one level at a time, never skip to invented data:

`L0` normal → `L1` stale-but-labelled reads (≤5 min) → `L2` read-only (writes disabled with banner) → `L3` static shell + cached catalog → `L4` honest `503` with status page → `L5` maintenance.

Never: disable auth to recover, return an empty catalog as success, or lift a constraint/RLS/hold check to "fix" an incident.

---

## 11. Performance Under Load

### 11.1 Caching tiers

| Data | Policy | Notes |
|---|---|---|
| Versioned JS/CSS/media | immutable, content-hash | keep previous release assets through rollback |
| Public catalog / detail | 60 s fresh, stale-on-error ≤5 min | label `data_as_of`; prices informational |
| Categories / rules | 60 s fresh, ≤5 min stale | one explicit rule version per computation |
| Personalized recommendations | private, ≤5 min, revision-compatible | never shared across users |
| Profile, history, chat, admin, card access | `private, no-store` | expiry/ownership never from cache |
| Availability / holds | `no-store`, no stale-on-error | truth cannot be cached |
| Counters / analytics | eventual, labelled | never authoritative for eligibility |

Keys include normalized filters, page/cursor, currency, locale, projection revision and identity where private. Invalidate **after commit** via durable events; add TTL jitter and single-flight refresh to stop stampedes. Cache failure falls back to bounded DB reads, not unbounded traffic.

### 11.2 Connection capacity

- Size as `replicas × pool_size ≤ database allowance − reserved admin/worker connections`. Autoscaling replicas cannot fix a saturated database.
- Use transaction pooling (PgBouncer `6543`) for the API and direct connections only for migrations/batch jobs.
- Bound request fan-out, body size, page size (≤100), vector batches and AI concurrency. Reject overload early with a retryable response instead of exhausting memory.
- Ban N+1: one bounded join/aggregation per list, not one query per card. Use keyset pagination for growing feeds (`(created_at, id) < ($ts, $id)`), never deep `OFFSET`.

### 11.3 Rate limiting & abuse budgets

| Surface | Starting budget | Notes |
|---|---|---|
| Login / auth attempts | 5/min per IP | exponential lockout, shared state |
| Claim / reserve | 5/min per user, 10/min per IP | plus 2 concurrent holds (§6) |
| Public card lookup | 30/min per IP | codes are guessable; generic 404s |
| AI query / chat turn | 10/min per user | cost budget per provider |
| Reviews / votes | 3/hour per user | unique constraint still wins |
| Admin mutations | 60/min per key/identity | audit every write |

Return `429` with `Retry-After`; count limits across replicas in shared state; never let a rate limiter be the only thing protecting correctness.

### 11.4 Load shedding priority

Under saturation, protect in this order: availability reads → catalog/detail → compare → claims/confirms → personalization → AI → analytics. Shed AI and analytics first with `503`/`429` + `Retry-After`; never shed a confirm that can still commit. Budgets: reads p95 ≤ 500 ms, p99 ≤ 2 s; ordinary writes p95 ≤ 1 s; claim/confirm p95 ≤ 300 ms; availability read p95 ≤ 200 ms.

---

## 12. Observability & Integrity Counters

Trace every request through API → RPC → worker with a request ID. Dashboards: availability, p50/p95/p99, 5xx/timeouts, stale/fallback rate, pool/locks/storage, claim conflict rate, hold age, sweeper lag, job backlog, AI spend.

| Metric | Healthy | Page-worthy |
|---|---|---|
| `oversell_total` / `double_confirm_total` | 0 | any value |
| `confirm_after_expiry_total` | 0 | any value |
| Live holds older than TTL | 0 | >0 for 2 min |
| Sweeper lag | <60 s | >5 min |
| Orphan holds (holder inactive/expired session) | 0 | >0 |
| Duplicate or gapped stored ranks | 0 | any |
| Claim conflicts | <10% of attempts | >30% sustained |
| Availability staleness | 0 s | >60 s |

A site that is up and overselling is down. Page on integrity, not just uptime.

---

## 13. Operating & Release Rules

- **One RPC per business move.** Admins and UIs call it; they never compose multi-call write sequences.
- **Kill switches** per dependency: AI, embeddings, public card lookup, alert delivery, reviews, checkout. Each has an owner, a switch, and documented degraded behavior.
- **Staged bulk imports:** upload → validate → dry-run report → apply atomically (or resumable batches) → reversible by run ID.
- **Change control:** contract → migration (expand/backfill/contract) → RPC + grants → flag → canary → verify invariants → enable → keep rollback for one release.
- **Runbooks before launch:** expired-hold sweep, stuck "confirming" order, oversell reconciliation (identify, notify, compensate, never delete evidence), restore with outbound jobs paused.
- **Admin safety:** expected revision on every edit, reasons on locked ranks, audit committed with the mutation.
- **Migrations:** lock-timeout every DDL step, `CREATE INDEX CONCURRENTLY` outside transaction blocks, never run a rollback that restores a known unsafe trigger or destroys committed data.

---

## 14. Proof: Test Matrix

Run in isolated staging with run-owned IDs; clean up by run ID, never by table purge.

| Scenario | Pass condition |
|---|---|
| Two users claim the last slot | exactly one `held`; other gets `409` + `retry_after`; count never negative |
| Holder abandons | slot returns only after `expires_at`, once, via inline reclaim or sweeper |
| Payment after expiry | no confirm; compensation recorded; oversell stays 0 |
| Double-click reserve / double submit | one hold / one row; same token returned |
| Timeout then retry, same key | same result; different body → `409` |
| Two sweepers on one hold | one transition, no double effect |
| Two admins move the same rank | one wins, stale edit `409`, ranks dense/unique, public snapshot complete |
| Rank edit during public read | reader sees full old or full new ordering |
| Two recommendation jobs finish out of order | older generation cannot replace newer |
| Card code collision | bounded retry → one card, no orphans |
| 100 concurrent card views | atomic count equals successful increments |
| Two first logins | one profile, no reset of existing preferences |
| User A uses B's IDs (API + direct PostgREST) | denied on tables, views, RPCs, arrays |
| 2× peak load, AI/provider slow | p95 within budget, shedding order respected, no queue unbounded |
| DB/Auth/AI/media down | documented ladder level, no fake success, nav usable |
| Rolling deploy with a live hold | hold survives, countdown and confirm still correct |
| Restore + provider replay | no duplicate confirm; RTO/RPO measured |

---

## 15. Good / Bad

- ✅ Claim with `INSERT ... ON CONFLICT DO NOTHING RETURNING` and treat zero rows as "taken".
- ✅ Move a category rank in one transaction with a locked parent and a deferred unique constraint.
- ✅ Increment a counter in SQL (`view_count = view_count + 1`).
- ✅ Return `409` with the current state so the UI can reconcile, and keep the user's draft.
- ✅ Show "On hold · releases 04:12" and a waitlist instead of a Buy button.
- ❌ `row = select(); row.count += 1; update(row.count)` — lost updates under concurrency.
- ❌ Delete a category's memberships then reinsert them across separate requests.
- ❌ `if not existing: insert()` in Python when a unique constraint already exists.
- ❌ Relying on an `asyncio.Lock`, a module-level dict, or in-process cache for cross-replica correctness.
- ❌ Confirming a payment from a browser redirect, or confirming a hold whose `expires_at` has passed.
- ❌ Decrementing availability in React, or printing "In stock" from a cached response.
- ❌ Parsing `expires_at` and treating a malformed value as "not expired".
- ❌ Retrying an unknown-outcome write with a new idempotency key.

---

## 16. Enforcement

Every work report that touches data, availability, or a submit action must state:

> **Concurrency/Integrity:** resource + constraint named | claim primitive used | isolation level and lock order | idempotency behavior | `409` path | test evidence | integrity counters `oversell=0`, `double_confirm=0`, `confirm_after_expiry=0`.

Any change without that evidence, or with a read-then-write claim, is not mergeable. Record known gaps with an owner and an expiry date — do not describe the system as "always available" or "never double-books" while a gap is open.

---

## 17. Definition of Done

- [ ] Scarce resource named with its existing constraint (or the migration that adds it).
- [ ] One claim primitive chosen; claim is a single transaction/RPC; zero rows = denied.
- [ ] Isolation level justified; lock order documented; deadlock/serialization retry bounded to the whole transaction.
- [ ] Expected versions on every edit path; zero affected rows returns `409`/`412`, never success.
- [ ] Hold TTL, extension, grace, release path and sweeper defined (if the flow reserves anything).
- [ ] Confirm is idempotent, owner-bound, expiry-bound, and commits its order/effect atomically.
- [ ] Availability is fresh, `no-store`, hold-aware, and rendered in the four-state model.
- [ ] Every surface in §9 has loading, empty, slow, error and degraded states browser-verified.
- [ ] Cache tiers, pool sizing, rate limits and shedding order set for the changed surface.
- [ ] Integrity counters and alerts exist; concurrency tests from §14 pass.
- [ ] Tracker distinguishes implemented, tested, pending and uncommitted work honestly.
