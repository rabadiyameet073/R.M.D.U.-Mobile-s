# Rule 06 — Claim & Availability Integrity (inviolable)

Shared data changes only through an atomic, repeat-safe claim. A click is an intention; a committed row is the truth. Full contract: [Module 11 — System Design Master Rules](../../technical-architecture/11_SYSTEM_DESIGN_MASTER_RULES.md).

---

## Protocol

1. **One claim primitive per resource**: unique-insert, conditional update, locked read, expiring hold, or lease. Never `SELECT` → decide in Python → `UPDATE`.
2. **Zero rows means denied**: a taken slot, a stale version, or a failed condition returns `409` (or `412` with `If-Match`). A zero-row update is never success.
3. **Check and change together**: ownership, lifecycle, uniqueness and expected version are enforced inside the writing transaction or RPC. PostgREST calls are separate transactions; do not assume atomicity across two of them.
4. **Server time is the only clock**: expiries and countdowns come from the database timestamp. A malformed or missing expiry fails closed.
5. **Availability is never invented**: render available / held-by-you / held-by-others / unavailable from a fresh `no-store` read. No cached, optimistic or browser-decremented "available".
6. **Hold before you promise**: any scarce thing (stock, rank position, share code, chat turn) is claimed, then confirmed or released. Pending holds are not sellable to anyone else and expire automatically.
7. **Repeat-safe writes**: double clicks, retries after timeout, and provider replays converge on one effect via an idempotency key plus a durable unique constraint. An unknown outcome is queried, never blind-retried with a new key.
8. **Releases are guaranteed**: every failure path (cancel, timeout, validation error, crash) releases the claim or is reclaimed by the sweeper. No orphan holds.

---

## Good / Bad

- ✅ `INSERT ... ON CONFLICT DO NOTHING RETURNING` and treating zero rows as "already taken".
- ✅ `UPDATE ... WHERE id = $1 AND version = $2` with a `409` carrying the current server state.
- ✅ Moving a category rank in one transaction with the parent row locked and the deferred unique constraint respected.
- ✅ Incrementing a counter in SQL (`view_count = view_count + 1`).
- ✅ Showing "On hold · releases 04:12" plus a waitlist instead of a Buy button.
- ❌ Reading a row, mutating it in application code, then writing it back.
- ❌ Deleting a category's memberships and reinserting them across separate requests.
- ❌ Confirming a payment from a browser redirect, or confirming an expired hold.
- ❌ Treating a malformed `expires_at` as "not expired", or computing expiry from `Date.now()`.
- ❌ Using an `asyncio.Lock`, a module-level dictionary, or in-process cache for cross-replica correctness.

---

## Enforcement

Every work report touching data, availability, or a submit action must state:
> **Claim integrity**: resource + constraint named | primitive used | isolation level and lock order | idempotency behavior | `409` path | test evidence | `oversell=0`, `double_confirm=0`, `confirm_after_expiry=0`.

A change without that evidence — or with a read-then-write claim — cannot be merged or closed. Known gaps are recorded with an owner and an expiry date; the platform is never described as "always available" or "never double-books" while a gap is open.
