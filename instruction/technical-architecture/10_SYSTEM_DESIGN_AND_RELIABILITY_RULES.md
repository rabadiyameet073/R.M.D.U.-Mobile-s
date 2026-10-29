# Module 10: RMDU Mobiles System Design, Concurrency & Reliability Rules

**Scope:** All RMDU Mobiles frontend flows, FastAPI APIs, Supabase tables/views/functions, background jobs, deployments, and operational changes. **Owner:** Meet Rabadiya. **Version:** 1.0, 2026-10-28.

**Status:** Mandatory design and release requirements, NOT a declaration that the current implementation already satisfies them. This document does not apply migrations, provision infrastructure, or make the site highly available by itself.

## 1. Read First: The Platform Contract

RMDU Mobiles is a smartphone discovery, recommendation, comparison, and shopkeeper-card platform. The current 24-table schema does **not** implement inventory, reservations, orders, or payments. Device visibility (`is_active`) means published catalog content, not stock availability. A shopkeeper card is advice, not a reservation or guaranteed selling price.

The concurrency lesson is: **a click is an intention; only an authorized, validated, committed database operation changes shared truth.** Two users may compare the same phone simultaneously. Two admins may not silently overwrite the same ranking. Two workers may not deliver the same alert twice merely because both saw it as pending.

### Non-negotiable rules
1. **One source of truth:** PostgreSQL owns durable state; caches, UI state, and generated AI text do not.
2. **One business mutation, one transaction:** Related records become visible together or not at all.
3. **Check and change together:** Enforce ownership, expected version, lifecycle, and uniqueness in the write transaction, not just in an earlier read.
4. **Safe repeats:** Double clicks, retries, duplicate jobs, and lost responses must not create duplicate business effects.
5. **No silent lost updates:** Use optimistic versions for editing and database locks for shared ordering/claims.
6. **No false success:** Never show “saved,” “sent,” “available,” or “up to date” without evidence appropriate to that claim.
7. **Failures stay local:** AI, analytics, media, or notifications must not take down catalog browsing.
8. **Bound everything:** Request size, latency, retries, fan-out, queue length, database connections, and storage growth need limits.
9. **Fail closed for authority:** Never bypass authentication, moderation, expiry, or ownership because a dependency is down.
10. **Prove recovery:** A backup, rollback, failover, or concurrency guarantee is unverified until tested.

### Authority and reading order
- Use the current schema and runtime contracts to establish facts; use this module to define required behavior. Record discrepancies instead of silently treating a desired feature as implemented.
- Follow the [database engineering standards](../../database/instruction_for_db/01_DATABASE_ENGINEERING_STANDARDS_AND_RULES.md) and [database pre-implementation gate](../../database/instruction_for_db/02_PRE_IMPLEMENTATION_CHECKLIST_AND_GOVERNANCE.md) for modeling, DDL, and query changes.
- Use [schema 01](../../database/01_mobilemart_schema.sql), [OAuth migration 02](../../database/02_google_oauth_customer_sync.sql), [constraints/indexes 03](../../database/03_normalization_and_indexes.sql), and [RLS migration 04](../../database/04_complete_rls_and_fk_indexes.sql) as migration sources; their presence does not prove deployment.
- Module 10 resolves older instruction examples that disagree with verified contracts: prices are `NUMERIC(10,2)` with `currency`, not stored `price_inr`/`price_usd` integer columns; API routes are `/api/v1/devices` and `/api/v1/recommendations`, not `/phones` and `/recommend`.
- Dynamic means database-driven content and configuration. Explicit, allowlisted table/column names in typed code are correct; arbitrary runtime schema guessing is not.

## 2. Current Baseline and Explicit Gaps

The table map below is grounded in repository schema and the previous live-DB checks. Runtime observations here were checked against the current source on 2026-10-28; there was no new production mutation or infrastructure audit for this document.

| Evidence | Required interpretation |
|---|---|
| [PostgREST gateway](../../backend/core/db.py) makes individual HTTP calls using a server credential | Each call has its own database transaction. Multiple awaited calls, an async lock, or `asyncio.gather` do not create a cross-request transaction. |
| [Admin rank writes](../../backend/routers/admin.py) delete category memberships and reinsert them | This avoids the observed recursive trigger path, but can expose empty/partial rankings, lose concurrent edits, and replace membership identities. It is **not production-safe**. |
| [Migration 06](../../database/06_fix_category_rank_trigger.sql) adds a recursion guard | Previous session did not apply it. Even after application, recursion protection does not serialize writers or replace an atomic rank API. |
| Device creation, [recommendation replacement](../../backend/services/recommendation_engine.py), and [chat turns](../../backend/routers/ai.py) use multiple writes | They require atomic workflows or explicit durable job states. Successful sequential smoke tests do not prove crash safety. |
| [Card views](../../backend/routers/retail.py) and helpful votes use read/modify/write counters; alert scan selects then marks rows | Concurrent requests need atomic increments, vote uniqueness, or conditional worker claims. Marking an alert is not notification delivery. |
| [Audit logging](../../backend/services/audit.py) is best-effort | Required admin audit evidence must be committed with the mutation, not silently lost. |
| `brands.name` exists; `brands.slug` does not in the previously verified schema | [Seed 05](../../database/05_seed_catalog_phones.sql) and its rollback require reconciliation before execution. Do not rerun migrations blindly. |
| Earlier checks found five categories, five rules, and an empty catalog | Historical observation, not a permanent assumption or live monitoring result. An empty catalog must render honestly. |
| Availability infrastructure, durable jobs, idempotency storage, and restore drills have not been established by these tests | They remain release requirements. Do not describe the current service as always available or fully production-hardened. |

## 3. Architecture and Responsibility Boundaries

```text
Browser -> CDN/static React assets -> FastAPI /api/v1 -> Supabase PostgREST -> PostgreSQL
Browser -> Supabase Auth (Google OAuth and access-token lifecycle)
FastAPI -> restricted PostgreSQL RPCs for atomic business mutations [required]
Committed outbox -> bounded background workers -> AI / notification providers [required]
Monitoring + backups + deployment controller observe these layers independently [required]
```

- Keep a modular monolith: routers validate contracts, services own workflows, the gateway handles transport, and PostgreSQL enforces durable invariants. Do not introduce microservices without a measured scaling or ownership need.
- The canonical business API is FastAPI. Existing direct Supabase access must enforce the **same** invariants and column permissions; revoke alternate write paths that bypass atomic workflows. Browser Auth remains a supported direct integration.
- Stateless API replicas share durable state in PostgreSQL. Per-process locks, timers, dictionaries, or local disks cannot enforce cross-replica correctness.
- Never expose a generic “write any table” endpoint. Complex mutations use narrow, versioned RPC contracts. Revoke default public execution grants, use least-privilege roles, and restrict `search_path` for any justified `SECURITY DEFINER` function.
- User identity comes from verified authentication, not an untrusted `user_id` RPC argument. Service-key calls bypass RLS; route-level ownership/visibility checks are mandatory in addition to database policies.
- The availability plan must account for the shared Supabase dependency: adding API replicas does not make the database or Auth service redundant.

## 4. All 24 Tables: Ownership and Consistency Map

**Strong** means transactional consistency at the mutation boundary. **Derived** means rebuildable, explicitly versioned/freshness-limited output; its publication must still be atomic. Public never means unrestricted write access.

| Table | Owner / exposure | Required invariant and lifecycle |
|---|---|---|
| `brands` | Admin; active public projection | Unique `name`; references from devices restrict deletion. Deactivation must have an explicit catalog visibility policy. |
| `devices` | Admin; published public projection | Unique `slug`, valid brand, nonnegative decimal price and currency. Publish only complete validated records; soft-delete ordinary removals. |
| `device_specs` | Admin; visible device projection | One row per device; validate hardware bounds. Missing values are unknown, not zero or false. |
| `device_scores` | Admin/scoring service; public projection | One row per device; 0–100 scores; overall score from the authoritative DB formula. Update as one snapshot. |
| `device_pros_cons` | Curated admin content; public projection | Belongs to an existing device; preserve ordering and provenance. Publish changes with their catalog revision. |
| `device_features` | Curated admin content; public projection | Validate device reference and content; no invented supported features in fallback output. |
| `device_ussd_codes` | Curated admin content; public projection | Null `device_id` means universal. Warn about destructive codes; never execute dial actions automatically. |
| `categories` | Admin; active public projection | Unique slug and validated metadata. Changes cannot strand membership rows or break existing URLs silently. |
| `device_categories` | Admin/ranking service; public projection | Unique device/category and unique category/rank; positive dense stored ranks; preserve `rank_locked`, attribution, and row identity. Strong transaction. |
| `recommendation_rules` | Admin; public weight projection | Unique priority; seven weights each in [0,1], sum 1.00. One coherent version per calculation. |
| `recommendations` | Service; owner-only | Existing unique user/device; publish a complete ranked generation per user. Expiry plus profile/rule/catalog freshness, not age alone. |
| `users` | Auth provisioning/admin; private | Auth subject is identity. Role, active status, verification, and provider binding are server-controlled, not profile-editable. |
| `user_profiles` | User-owned | One row per user; valid budgets and preferences. Version-checked updates; provisioning must never reset existing preferences. |
| `user_phone_history` | User-owned | Valid references and bounded usage data. Idempotent submission; self-reported history is not independent purchase verification. |
| `comparison_sessions` | Owner-only; anonymous capability if enabled | Validate all array elements and distinct device identities; a UUID array is not an FK per element. Preserve input order. |
| `shopkeeper_cards` | Owner; deliberate limited public share | Unique code; server-authoritative expiry and revocation. Public response excludes identity/PII; counting views cannot block display. |
| `reviews` | Owner submits; moderator publishes | Unique user/device, rating 1–5; only approved reviews contribute to public summaries. Moderation/vote/verification fields protected. |
| `price_alerts` | Owner; service processes | Unique user/device; valid target; one notification per defined trigger cycle. Predicate match and delivery status are distinct. |
| `device_embeddings` | Retrieval service | Unique device; embedding dimensions/model must match; source revision must still be current when publishing. Derived. |
| `user_query_embeddings` | Owner/service; private | Treat queries/vectors as personal data. Cache by normalized query/model and privacy scope; bounded retention. |
| `ai_chat_sessions` | Owner or explicit guest capability | Unique session token, authorized access, active/closed lifecycle; deletion of a user must not turn a private chat into a public guest chat. |
| `ai_chat_messages` | Session-authorized | Allowed role and bounded content; ordered, deduplicated turns with attributable sources. Never trust client-supplied assistant/system roles. |
| `rag_knowledge_chunks` | Curated retrieval service | Validate polymorphic `source_id` and provenance explicitly; enforce source visibility/deletion and model compatibility. Derived. |
| `audit_log` | Security/admin read; system append | Required mutation evidence is durable and append-only for ordinary app roles; minimize PII, retain under policy. |

`vw_category_device_ranks` is a derived view, not an independent source of membership truth. Inspect view security/ownership and grants; table RLS alone does not prove a view or function is safe for public use.

## 5. Transaction, Locking, and Idempotency Rules

### 5.1 Atomic business writes
- Use **one database RPC/transaction** for device + specs + scores + category assignments + mandatory audit; do the same for a complete recommendation replacement or a committed chat turn.
- On any error, roll back every related write. Return success only after commit. A transaction's deferred constraints must pass before success is acknowledged.
- Never hold database locks while calling OpenAI, sending notifications, waiting for a browser, or doing uploads. Prepare external results first, then validate source versions in a short commit; alternatively persist a job and finish later.
- Use `READ COMMITTED` with explicit locks/conditional writes when sufficient. Cross-row predicates need all writers to lock the same stable parent or use `SERIALIZABLE` with bounded retry. `REPEATABLE READ` alone does not prevent every write-skew race.
- For workflows needing multiple locks, use a documented global order: relevant users, devices, categories, then child rows; UUID order within each group. A workflow may skip groups but must not acquire an earlier group later.
- Runtime default targets: 1-second lock timeout and 3-second statement timeout for interactive mutations; migrations retain the existing 3-second lock timeout. Tune only with evidence and recorded approval.

### 5.2 Optimistic edits
- Require an expected version for profile, device, rule, and manual ranking edits. Prefer a monotonic revision added by migration; existing `updated_at` may be used only with reliable server generation and equality semantics.
- Conceptual write: `UPDATE ... SET ..., version = version + 1 WHERE id = :id AND version = :expected AND owner = :actor`.
- Zero affected rows is a conflict or inaccessible resource, not success. Return `409` for a domain version conflict (`412` when using HTTP `If-Match`); let the user reload/merge.
- Deleting a resource, revoking access, or deactivating an account between initial validation and commit must invalidate the mutation.

### 5.3 Retry-safe commands
- Require an `Idempotency-Key` for non-idempotent creates, chat turns, and external-effect jobs. Proposed storage is specified in section 17; a request header alone does nothing.
- Scope uniqueness to actor or guest capability + operation + key. Persist a canonical request hash, state, result reference, and expiry; never put credentials into the hash input or log.
- Same key + same body returns the original committed result. Same key + different body returns `409`. Concurrent copies cannot both execute.
- Commit the result and idempotency completion together. For async work, `202 Accepted` requires a durable job ID and status lookup; “pending” is not “completed.”
- Retain records for at least 24 hours for ordinary commands; external delivery deduplication must cover the provider replay horizon. An expired key must not bypass durable business uniqueness.
- After a timeout, outcome is **unknown**, not necessarily failed. Retry only with the same key or query operation status. Do not silently create a new key.

## 6. Concrete Race-Safe Platform Workflows

### A. Two admins change the same category ranking
1. A and B both load category revision 12. A wants device X at rank 1; B wants device Y at rank 1.
2. A's RPC locks the stable `categories` row, checks revision 12, validates all devices, and updates memberships/ranks **in place** with deferred uniqueness checks.
3. A commits revision 13 with audit evidence. B then sees that its expected revision 12 is stale and receives `409`; no partial rewrite or silent overwrite occurs.
4. A public ranking response reads membership, score, and device projection from one statement/snapshot. It sees the complete old or new state, never a mix from multiple network reads.
5. All writers, including import jobs and admin tools, use this lock/version contract. A recursion guard alone is insufficient; restricted grants prevent alternate direct writes.

Additional rank rules:
- Move within positions 1..N for an existing member or 1..N+1 for a new member; reject invalid positions rather than silently clamp them.
- Preserve membership IDs, `created_at`, `added_by`, and justification. Never delete a whole category and reconstruct it through separate API calls.
- Auto-rank logic cannot move locked entries. Manual changes to locked positions require an explicit authorized override and audit reason, including effects on other locked entries.
- Stored membership ranks remain dense, including inactive members retained for history. A filtered public projection may have gaps; use a separate display position if needed, never renumber stored ranks during a read.
- Define deterministic ordering for tied scores (score descending, UUID tie-break for display); do not fabricate a unique score winner for a genuine tie.

### B. Catalog publishing and two edits to one phone
- A complete create/update is one transaction. A failed spec/category write leaves no half-published device or newly orphaned brand.
- Draft/inactive records can be incomplete; public publication requires valid brand, supported currency/price, and mandatory specs/scores. Draft status beyond `is_active` requires a migration.
- Check expected revision so one admin cannot overwrite another's new price with a stale form. Protect curated fields from bulk mass assignment.
- Treat brand/category deactivation as a visibility event; all lists, detail routes, similar-device results, AI retrieval, and child projections apply the same policy.
- Deactivate rather than cascade-delete catalog records. Historical user views may show a clearly marked unavailable device; they cannot reactivate it accidentally.

### C. Two recommendation generations for one user
- Capture profile, rules, catalog/scoring revisions and hard filters. Computation may run outside the write transaction.
- At publish time, lock the user/profile generation boundary and reject an obsolete source version. An older slow job cannot overwrite a newer request.
- Replace the user's set atomically or publish a new generation and switch its pointer atomically. Readers see one full generation with deterministic ranks.
- Include engine/config version and generation time. Invalidate on profile, price, score, visibility, or rule changes; `engine_version` alone is not a configuration revision.
- Budget, currency, OS, and other hard requirements remain hard filters. Relaxation requires explicit consent and labeled trade-offs; never silently recommend an over-budget phone as within budget.
- Candidate caps must be visible in metadata and measured for recall. “Best in the catalog” is not justified by silently scoring only the first 500 overall-ranked devices.

### D. Two workers process the same price alert
- Claim eligible work in a short transaction with conditional updates or `FOR UPDATE SKIP LOCKED`. Recheck current price, currency, device visibility, and alert revision.
- In that transaction, record the trigger event and a uniquely keyed outbox message. One `(alert_id, trigger_revision)` produces one logical notification event.
- Workers send after commit using the provider's idempotency mechanism when available, then persist acknowledgement. Retry crashes with the same event identity.
- `is_triggered`/`triggered_at` describe the condition match, not successful delivery. Record delivery state separately; never claim exactly-once external delivery when the provider cannot guarantee deduplication.
- Updating/rearming a target creates a new trigger cycle. Stale claimed work must revalidate; cancellation has a defined cutoff once provider submission begins.
- Page through the backlog fairly; a fixed first-500 scan must not permanently starve later alerts. Poison jobs move to a dead-letter state after bounded attempts.

### E. Duplicate reviews and helpful votes
- Database uniqueness on `(user_id, device_id)` wins concurrent review submissions. A replay returns the existing result or a documented conflict, never a second review.
- A proposed `review_votes` relation with unique `(review_id, user_id)` is required for one helpful vote per signed-in person; a counter alone cannot enforce it.
- Insert/delete the vote and increment/decrement any cached count in one transaction. Do not read a count into Python and write `count + 1` later.
- Repeated vote requests are idempotent. Unapproved reviews remain private; content edits return the review to moderation before public redistribution.
- Self-entered phone history may support a “reported owner” label, not a “verified purchase” badge.

### F. Card creation, expiry, and simultaneous views
- Card creation is idempotent; short-code collisions are handled by bounded generation retries behind the unique constraint. The current eight-character generator is not an authentication system.
- Validate `expires_at` against database/server UTC on every public access; expiry is `now >= expires_at`. Malformed timestamps fail closed. Null means no expiry only when policy explicitly permits it.
- Public responses omit user identity, email, and private profile data. Shareable budget/reason text must be deliberately approved by the user; treat the code as a limited public capability, not private-account access.
- Expired/revoked/missing codes receive the same generic public unavailable response; owners can see the specific status. Rate-limit guessing and return `Cache-Control: no-store`.
- A best-effort view statistic cannot block lookup. Use atomic database increments or deduplicated view events; never claim page views are unique people. Crawlers/prefetch may access GET routes.
- Revocation must survive retries/restarts; hard-delete behavior in the current API does not imply a durable `revoked` state exists.

### G. Parallel chat turns, retries, and session closure
- Persist a client turn ID, per-session sequence, processing state, and lease via migration; authorize and atomically claim each turn before expensive generation.
- Serialize conversational turns logically using durable claims/queues, not a database lock held across the model call. Concurrent turns wait in a bounded queue or get a retriable conflict.
- Use the **latest** bounded history, not the oldest 20 messages. Never allow a client greeting to masquerade as trusted system/assistant output.
- After generation, recheck session owner, active state, lease/sequence, and source revision; atomically publish both messages and session activity. Closed/revoked sessions reject late publication.
- A timeout or worker crash leaves a recoverable pending/failed turn, never an undetectable duplicate or half-success. A retry retrieves the same turn/result.
- A guest token grants access only to that guest session. Logging in does not automatically claim arbitrary guest chats; explicit ownership transfer must prove possession and rotate the capability.

### H. Login, profiles, history, and account removal
- Supabase Auth verifies identity. Provision `users` and `user_profiles` idempotently using the auth subject and constraints; simultaneous first logins cannot create two profiles.
- Do not merge accounts solely by email or let ordinary users edit roles, `is_active`, moderation, provider IDs, or verification flags through any write path.
- Reject revoked/deactivated identities even if a token is structurally valid. Refresh expiry errors deliberately; an Auth outage does not permit guest access to private data.
- Profile edits use expected versions. Double-clicked history submissions use idempotency; allow a genuine later ownership period only as an explicit distinct event.
- Account removal needs an authorized, audited workflow covering Auth, public user data, chats, query embeddings, cards, and retained audit policy. Avoid `ON DELETE SET NULL` turning old private chats/queries into anonymously accessible resources.

## 7. Read Contracts and Frontend State

- Every page/section supports loading, success, genuine empty, validation error, unauthorized, unavailable, and retry states. Preserve the last safe UI while revalidating; an API outage is not “no phones found.”
- Lists filter by publication/visibility consistently. Detail errors render a usable unavailable page, not an unhandled exception. Missing specs display “Not provided”; null lists normalize only where the contract permits.
- Debounce search/filter inputs, cancel obsolete requests, and use a query/version key so a slower old response cannot overwrite a newer filter result. Keep shareable filter state in the URL.
- Pinning/comparison is non-exclusive local UI state. Resolve UUID/slug aliases before deduplicating: 2–4 **distinct resolved devices** are allowed by the API. The database's array-length check is weaker and needs explicit existence/distinctness validation.
- Retain comparison input order, label ties/unknowns, and show generation time. A current recalculation is not an immutable historical snapshot unless source values/revisions were saved.
- Optional comparison analytics persistence must not make a successful calculation disappear; return the result with an explicit persistence warning when that optional write fails. An explicit save command must not falsely report success.
- Monetary calculations use decimal arithmetic (`NUMERIC` in DB, Decimal or defined minor units in services). Format at render time. Prices, alerts, and profile budgets currently assume the supported base currency; do not compare INR with USD or relabel amounts without a timestamped FX source and schema/contract support.
- Scores are 0–100 in the DB, ratings 1–5. Any 0–10 UI scale must be a documented conversion, never mislabeled raw values.
- Expired login during a form preserves safe input, prompts reauthentication, then revalidates before resubmission. Private local state and caches clear on logout/account change.
- Use route/section error boundaries, media posters/fallback images, reduced-motion behavior, keyboard support, and bounded lazy loading. A video, font, or modal failure cannot block navigation.
- CDN routing must support direct SPA links without swallowing API/asset 404s. Use a deliberate fallback for stale lazy-load chunks after deployment, with at most one automatic reload and preserved safe state.
- Keep schema metadata/SEO truthful: no invented prices, in-stock claims, fake review totals, or indexed private pages. Loading a route must not publish fabricated catalog content.

## 8. Cache and Real-Time Consistency

| Data | Default policy / maximum stale serving |
|---|---|
| Versioned JS/CSS/media | Immutable cache by content hash; retain previous release assets through rollout/rollback. HTML revalidates. |
| Public catalog/detail | 60-second fresh TTL; stale-on-error up to 5 minutes with `data_as_of`/stale status. Prices are informational, not guaranteed. |
| Public categories/rules | 60-second fresh TTL; at most 5-minute stale display. A computation uses a single explicit rule version, never mixed stale/fresh rules. |
| Personalized recommendations | Private scope; at most 5 minutes and only while source revisions remain compatible. Mark stale or recompute on invalidation. |
| Profile, private history/chat, admin, shared card access | `private, no-store` for sensitive responses; no shared CDN cache. Expiry/ownership decisions never come from stale cache. |
| View counts/analytics | Eventual, approximate where documented; never authoritative for eligibility. |

- Keys include normalized filters, page/cursor, currency, locale, projection/schema revision, and user identity where private. Never share personal recommendation/chat caches across users.
- Invalidate affected device, category, ranking, search, and recommendation entries **after commit** via durable events; add TTL jitter and single-flight refresh to prevent stampedes.
- Visibility/moderation revocations need immediate invalidation. If a route must never show revoked material, require authoritative visibility checks and disable its stale-on-error policy when those checks are unavailable.
- Cache failure falls back to bounded DB reads, not unbounded traffic. Rate limits, bulkheads, and load shedding protect the source.
- Real-time events are hints to refetch, not exclusive ownership/booking guarantees. Subscribe only to authorized projections; deduplicate by revision, discard older events, and resynchronize after reconnect.
- If realtime is unavailable, poll visible public queries every 30 seconds with jitter; stop polling hidden tabs. A missed event cannot leave stale state indefinitely.

## 9. Availability Targets and Graceful Degradation

There is no credible “never goes down” promise. Initial production objectives below are design targets; achieving them requires hosting, monitoring, capacity, and tested operations.

| Objective | Initial target and measurement |
|---|---|
| Core browsing availability | 99.9% over a rolling 30 days for valid catalog/category/detail/compare reads; at most about 43 minutes of complete outage equivalent. Measure valid responses within deadline, not just HTTP 200. |
| Write correctness | Zero accepted writes violating ownership/uniqueness/atomicity in the release test suite; durability and incidents monitored separately from uptime. |
| Public API latency | p95 <= 500 ms, p99 <= 2 s for reads; p95 <= 1 s for ordinary writes, measured at API ingress in-region under representative load. |
| AI interaction | Within 15 s return a grounded response/fallback or a durable pending job; normal browsing never waits on AI. |
| Recovery | Existing DB standard: RTO < 60 minutes, RPO < 15 minutes. Validate backup frequency/PITR and restore evidence against these targets. |
| Detection | External synthetic checks every 60 s; alert on two consecutive failures plus real-traffic error-budget signals. |

Expected client validation failures are not availability failures; DB outages, overload rejections of valid traffic, and incorrectly empty success responses are. Track degraded/stale success separately so fallback cannot hide a long DB outage. Budget exhaustion pauses nonessential releases until reliability work is prioritized.

### Dependency failure behavior
| Failure | User-facing behavior | Operational behavior |
|---|---|---|
| API replica dies | Other healthy replica serves traffic; safe retry only | Remove from load balancing, drain/restart, inspect crash evidence. |
| PostgreSQL/PostgREST unavailable | Bounded public stale cache if eligible; otherwise clear `503`. No unconfirmed writes | Preserve queued committed jobs, open dependency breaker, alert; never invent empty catalog rows. |
| Auth unavailable | Public browsing works; protected operations return temporary unavailability | No authorization bypass or indefinite stale-token acceptance. |
| AI provider/embeddings unavailable | Deterministic catalog/keyword fallback labeled as such | Record fallback rate; pause expensive retries/rebuilds. |
| Notification provider unavailable | Alert remains queued/delayed, not “sent” | Retry durable delivery with deduplication and age monitoring. |
| Analytics/counter write fails | Core content still displays | Count losses separately; do not retry a GET forever. |
| CDN/media failure | Text/specs and accessible controls remain usable | Serve placeholders/posters and alert on asset error rates. |
| Schema/RPC incompatibility | Affected feature disabled with explicit status | Block rollout; do not guess field names or silently drop required writes. |

## 10. Timeouts, Retries, Capacity, and Deployment

- Default interactive read/write deadline: 5 seconds end to end. Allocate transport connect <= 1 second and upstream read <= 3 seconds within the remaining budget. AI has its separate 15-second user deadline.
- At most two retries with exponential backoff and jitter for safe reads and explicitly idempotent operations, only within the deadline. Respect `Retry-After` on `429`/`503`; do not multiply retries at every layer.
- Do not automatically retry validation, permission, or version-conflict failures. Deadlock/serialization retries repeat the **whole** transaction at most twice after rollback, not an individual failed statement.
- Circuit breaker starting policy: open after five consecutive dependency transport/5xx failures, probe after 30 seconds, allow one half-open probe. Count dependency failures, not user 4xx errors. Tune per dependency using metrics.
- Bound HTTP pools, DB connections, request fan-out, body size, page size (max 100 for ordinary lists), vector batches, and AI concurrency. Reject overload early with a retryable response instead of exhausting memory.
- For the availability target, run at least two stateless API replicas across supported failure domains behind health-aware load balancing; use an always-on database plan with verified recovery/failover capability. These are provisioning requirements, not assumptions about the current project.
- Keep a single authoritative database write region initially; use only proven managed failover. Read replicas may lag and must not decide current ownership, conflicts, or newly committed state.
- Implement separate liveness (process only) and readiness (mandatory schema/dependencies with short timeout) probes. Readiness may return `503`; liveness must not restart every replica solely because the DB is down. Current `/health` is not proof of this separation.
- Rolling deploys retain at least one healthy serving replica, warm connections, drain in-flight requests, and tolerate old/new API versions during migration. Runtime secrets come from the deployment secret store, never bundled assets.

## 11. Security and Privacy Gates

- Validate tokens, audience/issuer via the supported Auth flow, active user status, permissions, and object ownership. Use allowlisted mutable fields and projections; UUID opacity is not authorization.
- Enable and test RLS, grants, **column-level write restrictions**, view security, and RPC execution rights. `auth.uid() = user_id` alone does not prevent editing one's role or setting `reviews.is_approved = true` if broad update grants exist.
- Public reads expose only active/approved projections. Test direct PostgREST and API paths independently; service-key success does not prove RLS correctness.
- Replace shared local admin-key access with auditable individual admin identities and role checks for production; require MFA for privileged operations. Keep any service-to-service key server-only, scoped, rotated, and disabled when absent.
- Treat chat tokens and share capabilities as secrets in logs/referrers. Avoid access tokens in URLs; redact existing token-bearing routes from gateway/access telemetry. Generate new capabilities with cryptographically secure randomness.
- Set exact production CORS origins, HTTPS, security headers/CSP, and safe error output. CORS is not authorization. If cookie-based mutation auth is introduced, require CSRF protection.
- Allowlist sort/filter operators and escape PostgREST expression values; putting an unescaped expression in query parameters is not automatically injection-safe.
- Bound and sanitize review/chat/Markdown rendering; no raw HTML execution. Guard future URL ingestion against SSRF (private networks, redirects, content size/type); do not trust uploaded metadata or MIME labels.
- Rate-limit authentication attempts, guest sessions, AI, reviews/votes, and public code lookup using shared state across replicas; include per-user/provider cost budgets and abuse monitoring.
- Retention defaults pending owner/legal review: guest chats 7 days, authenticated chats/query embeddings 30 days, operational logs 30 days, admin audit 180 days. Record consent, access/export/removal handling, and exceptions; do not promise regulatory compliance without assessment.
- Never log secret keys, raw access/session tokens, full chat bodies, or unredacted upstream errors. Backups are encrypted, access-controlled, and expire under a documented retention policy.

## 12. AI, Retrieval, and Background Job Reliability

- Treat retrieved text and user prompts as untrusted input, not instructions granting permissions. The model cannot authorize changes, override budgets, fabricate specs, or execute arbitrary tools/SQL.
- Apply the same device visibility, price/currency, and hard-filter rules before returning semantic results. No match means an honest no-match answer, not an invented phone.
- Source text, model name, dimensions (currently vector(1536)), source revision/hash, and generation time identify an embedding. Model changes need compatible indexes and a staged rebuild, not mixed vector spaces.
- Choose `device_embeddings` as the canonical device-vector source; the additional `devices.embedding` field must not drift as a competing authority. Document any maintained compatibility copy.
- Production vector similarity belongs in an indexed, bounded PostgreSQL query/RPC. Downloading the whole vector collection into Python is not a scalable search contract.
- Reject stale embedding jobs at publish time; deactivate/remove derived chunks when source content becomes hidden or is removed. `rag_knowledge_chunks.source_id` has no universal FK enforcement.
- Durable jobs carry type, dedupe key, actor/scope, source revision, attempt count, lease, next-attempt time, status, and sanitized failure information. Claim bounded batches; renew leases and fence stale workers from publishing.
- Use at-least-once delivery with idempotent consumers. Start with five attempts and exponential backoff (max 15 minutes), then dead-letter and alert; provider replay/expiry limits can require shorter policies.
- Never rely on FastAPI in-process background tasks for work that must survive restarts. Job/outbox support is proposed in section 17, not present merely because an endpoint starts work.

## 13. Database Performance and Growth

- Before a change, record access patterns, current/forecast volume, latency, consistency, privacy, and failure blast radius using the existing DB gate.
- Fetch public card projections in bounded joins/aggregations; do not run per-device queries or unlimited parallel count queries. Add query-count budgets and test beyond empty fixtures.
- Use stable pagination: deterministic sort plus UUID tie-breaker; keyset cursors for growing histories/chat/audit/jobs. Expose actual next cursors, not invented totals after a truncated read.
- Exact counts may be expensive; if estimates replace them, label them and version the contract. Never convert a failed admin count into zero.
- Index measured WHERE/JOIN/ORDER BY paths; include foreign keys and active-row predicates as justified. Avoid predicates involving `NOW()` in indexes.
- Validate query plans with representative data. Existing sub-5/sub-10 ms DB goals concern SQL execution, not network API latency; small-table or selective analytical sequential scans require measured justification rather than a blanket claim that every scan is wrong.
- Budget API replicas x pool size against database capacity and worker usage. Autoscaling API replicas cannot solve saturated DB connections, storage, or query plans.
- Record expected peak requests, concurrent users, write ratio, and 12-month table growth before sizing. Load-test 2x expected peak with at least 30% capacity headroom; revise targets from evidence.
- Track growth of chat/messages, query embeddings, audit, cards, and history; scheduled retention jobs use indexed bounded batches and owned scopes. Partition only when measured lifecycle/volume makes it necessary.

## 14. Observability and Incident Response

- Attach request/trace IDs across API, RPC, and worker events; log route template, sanitized error class, latency, attempt, and outcome. Do not use user IDs or raw URLs as unbounded metric labels.
- Dashboards cover core availability, p50/p95/p99, 5xx/timeouts, stale/fallback rates, DB pool/locks/storage, auth failures, idempotency conflicts, oldest job age, notification delivery, and model spending.
- Starting alerts: core 5xx > 1% for 5 minutes (with a traffic floor), sustained read p95 > 1 second, queue age > 5 minutes, connection/storage utilization > 80%, and any backup/restore verification failure. Calibrate before paging production.
- Assign an on-call owner and backup, status communication channel, and runbooks. Severity 1 includes integrity/privacy incidents, not only a blank website.
- Incident sequence: detect -> assess data/permission risk -> disable only unsafe writes/jobs -> preserve evidence -> restore safe reads -> rollback/fail over under authorization -> reconcile uncertain operations -> validate invariants -> communicate resolution.
- Never “repair” a live incident by removing constraints/RLS, broadly deleting records, accepting unauthenticated writes, or repeatedly retrying unknown-outcome commands.
- After recovery, reconcile pending idempotency entries, outbox deliveries, expired leases, cache revisions, and any uncertain side effects. Record root cause and regression tests.

## 15. Safe Releases, Backups, and Recovery

- Separate development/staging/production projects and credentials. Keep production-like anonymized test data; no uncontrolled live fixtures or destructive smoke tests.
- Inventory applied migrations, constraints, policies, functions, and RPC signatures before deploying. A file, documentation statement, or successful empty-table read does not establish migration status.
- Use expand -> backfill in resumable batches -> validate -> switch readers/writers -> contract in a later release. Keep old application compatibility until rollback is no longer needed.
- Lock-timeout every DDL step; run concurrent index builds outside explicit transaction blocks where PostgreSQL requires it. Test rollback/forward-fix paths; do not apply a rollback that restores a known unsafe recursive trigger or destroys committed user data.
- Release gates include schema compatibility, source-level checks, API/auth tests, concurrency/failure tests, representative load, and UI failure-state verification for changed screens. Canary and rollback on error-budget or integrity regressions.
- Enable verified managed backups/PITR with a target of 30 days recovery retention, subject to the hosting plan; absence of provider support is a launch blocker or explicit signed risk exception.
- Restore monthly to an isolated environment; measure RTO/RPO, validate row counts/constraints/auth mapping, and run private-access and workflow checks. Also test after major schema changes.
- Recovery includes database, required Auth state, media/storage assets, configuration/secrets access, migrations, and application artifacts. A DB backup alone may not restore all Supabase components.
- Replication is not a backup; file existence is not a tested restore. Record the actual last recoverable point and never promise zero data loss from asynchronous recovery.
- Keep post-restore outbound jobs disabled until duplicate external effects and provider acknowledgements are reconciled. Rebuild derived vectors/caches after authoritative data is verified.

## 16. Required Tests: Prove the Edge Cases

Run mutations in isolated staging/test projects. Before any explicitly authorized live test, record exact run-owned IDs, bounded scope, and recovery plan; recover ambiguous writes by a unique run identifier. Verify cleanup HTTP status and residue. Never purge a whole table or all `qa-*` rows on the assumption they belong to the test.

| Scenario | Pass condition |
|---|---|
| Two admins rerank the same category | One expected-version edit wins, the stale edit conflicts; every observed ranking snapshot is complete; no duplicate/gapped stored ranks. |
| Two admins edit price/specs; failure after child write | No lost update and no partial publication. Old revision remains usable after rollback. |
| Double-click plus lost-response create | Same idempotency key yields one device/card/review/history entry and the same result; altered body conflicts. |
| Two recommendation jobs finish out of order | Old generation cannot replace the newer one; no empty/mixed set is exposed during publication. |
| Two workers claim one alert; crash before/after provider acceptance | One logical event; retry reuses its identity; no false “sent” state; duplicate-delivery limits are explicit. |
| 100 simultaneous helpful votes, including repeats | Count equals unique valid votes; repeated identities do not inflate it. |
| Card expiry, revoke, clock boundary, guessed code, view-write failure | Expired access denied consistently; no PII; view telemetry failure does not break valid lookup. |
| Two chat turns, replay, worker crash, close during generation | Ordered deduplicated turns; no late publication into a closed session; recoverable status. |
| Two first logins and concurrent profile edits | One profile, preserved preferences, conflict instead of silent overwrite. |
| User A uses B's IDs through API and direct PostgREST | Denied for every private table, array reference, view and RPC; privileged columns cannot be self-assigned. |
| User removed with private chats/cards/query embeddings | No formerly private resource becomes anonymously accessible; retention/removal policy honored. |
| Budget/currency boundaries, missing specs, ties, hidden devices, alias duplicates | Honest results, consistent visibility, deterministic ordering, no mixed currencies or duplicate comparison phones. |
| Slow old search response arrives after new filters | UI remains on the newest query; keyboard/error/retry controls remain usable. |
| DB/Auth/AI/cache unavailable, disk/pool saturation, rate limits | Documented degraded mode and deadlines; no fake empty responses or authorization bypass. |
| Rolling deploy, stale browser chunks, backward schema compatibility | Safe navigation and in-flight handling; old/new versions coexist through migration. |
| Restore plus job replay | RTO/RPO measured; authoritative integrity and deduplication verified before outbound delivery resumes. |

Earlier 27/27 smoke and 23/23 admin checks establish only those sequential paths on the previous environment. They do not prove these concurrency, authenticated-success, overload, failover, or restore gates.

## 17. Proposed Additions: Migration Required, Not Existing Tables

Only introduce the following after the database governance gate and explicit implementation scope. Each needs constraints, indexes, grants/RLS, retention, rollback/forward-fix strategy, and tests. Names below are proposed contracts, not available endpoints.

| Addition | Purpose and required key |
|---|---|
| `idempotency_requests` | Unique actor-scope/operation/key; request hash, processing/completed state, result reference, retention; atomic completion with the mutation. |
| `outbox_events` + `background_jobs` | Durable committed event identity, job state, attempts, lease/fencing, next retry, result/error, and deduplication key. |
| `notification_deliveries` | Unique event/channel/recipient; provider reference and acceptance/delivery/failure state, independent of alert trigger state. |
| `review_votes` | Unique review/user with FKs; atomic vote effect and moderation-aware visibility. |
| Revision fields / generation metadata | Optimistic edits and freshness across devices/specs/scores, categories/rules, profiles, recommendations, and embedding sources. |
| Chat turn metadata or `ai_chat_turns` | Unique session/client-turn ID and sequence; pending/running/completed/failed state, lease, and atomic message publication. |
| Card revocation metadata | Durable revocation timestamp/status and owner audit; intentional expiration semantics, without overloading view count. |
| Narrow transactional RPCs | Catalog publication, in-place ranking, recommendation publication, vote changes, alert claim/outbox, and chat finalization; grants restricted by purpose. |

No payment/stock workflow is authorized or implied here. If reserved stock or checkout is later added, first design separate inventory, hold, order, and payment entities: `available -> held(until expiry) -> confirmed`, with atomic conditional claims, server-time expiry, authenticated ownership, idempotent signed payment events, and compensation for late success. A pending hold is **not freely available to another buyer**, and an unverified client payment redirect cannot confirm it. This is a future boundary requirement, not a current RMDU feature.

## 18. Definition of Done and Priority Order

**P0 before concurrent production writes:** atomic catalog/ranking/recommendation/chat workflows; secured write paths and column permissions; idempotency; private-resource/expiry correctness; honest failure responses; real admin identity/audit.

**P1 before availability claims:** health-aware replicas and database recovery plan; bounded timeouts/retries/pools; cache/fallback policy; durable jobs/delivery dedupe; monitoring/on-call; tested rollback and restore.

**P2 as measured demand grows:** indexed vector RPCs, query/count optimization, retention automation, cursor feeds, approved scaling/replicas, and richer freshness/event infrastructure. Any item moves earlier if current traffic requires it.

For every implementation, record:
- [ ] Affected user flow, tables, current contract, and desired state transition.
- [ ] Ownership, visibility, mutable fields, unique constraints, and transaction boundary.
- [ ] Concurrent-request behavior, retry/idempotency contract, and unknown-outcome handling.
- [ ] Cache invalidation, stale limits, external effects, and rollback/recovery behavior.
- [ ] Time/capacity budgets, failure UI, monitoring, privacy and retention consequences.
- [ ] Migration/grant/policy evidence and passing concurrency, failure-injection, and security tests.
- [ ] Task tracker evidence that distinguishes implemented, tested, pending, and uncommitted work.

Documentation completion does not close these implementation gaps. Apply this checklist whenever changing any site behavior or database-backed workflow; record scoped exceptions with an owner, expiry, and compensating control.
