# RMDU Mobiles — Pre-Implementation Checklist & Database Governance Gate

> **Target Database Engine:** PostgreSQL 15+ (Hosted on Supabase)  
> **Mandatory Policy:** Every developer, engineer, and AI subagent **MUST** complete and verify this checklist **BEFORE** creating tables, executing DDL migrations, writing backend queries, or modifying existing schema.

---

## 1. The Pre-Implementation Gate: 6 Questions to Answer First

Before writing a single line of SQL or application schema code, document the answers to these six architectural questions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRE-IMPLEMENTATION ANALYSIS                           │
├─────────────────────────┬───────────────────────────────────────────────────┤
│ 1. Access Pattern       │ Is this table read-heavy (90/10) or write-heavy?  │
│                         │ Which exact columns will appear in WHERE/JOIN?    │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 2. Volume & Growth      │ How many rows today? How many in 12 months?       │
│                         │ Will table exceed 100,000 rows?                   │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 3. Latency Target       │ What is the maximum acceptable latency?           │
│                         │ (Standard: p95 < 10ms for OLTP queries).          │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 4. Consistency Model    │ Does this require immediate ACID correctness, or  │
│                         │ can it tolerate eventual consistency/caching?     │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 5. Failure Blast Radius │ If this table or query fails, does it take down   │
│                         │ the entire app, or degrade gracefully?            │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ 6. Data Classification  │ Is this public catalog data or private customer   │
│                         │ PII (Subject to RLS and data minimization)?       │
└─────────────────────────┴───────────────────────────────────────────────────┘
```

---

## 2. DDL & Schema Migration Pre-Flight Checklist

Before running any migration file (`.sql`) in Supabase:

### A. Keys & Relational Structure
- [ ] **UUID Primary Key**: Does the table use `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`?
- [ ] **No Auto-Increment IDs**: Ensure no sequential `SERIAL` or `BIGSERIAL` integers are exposed in client APIs.
- [ ] **Explicit Foreign Keys**: Are all foreign keys explicitly defined with `ON DELETE CASCADE`, `ON DELETE SET NULL`, or `ON DELETE RESTRICT`?
- [ ] **Candidate Natural Keys**: Are natural unique keys enforced (e.g. `devices.slug UNIQUE`, `brands.name UNIQUE`)?

### B. Normalization & Data Integrity
- [ ] **1NF Compliance**: Are all attributes atomic? Have repeating groups (like past phones or multi-value specs) been extracted into child tables?
- [ ] **2NF Compliance**: In junction tables (e.g. `device_categories`), do non-key fields depend on the entire composite key?
- [ ] **3NF Compliance**: Are transitive dependencies removed (e.g. `devices` references `brand_id`, not brand metadata)?
- [ ] **BCNF Compliance**: Is every functional determinant a candidate key?
- [ ] **Domain Constraints**: Have `CHECK` constraints been applied for:
  - Prices / Budgets $\ge 0$?
  - Budget ranges valid (`budget_min <= budget_max`)?
  - Scores bounded (0 to 100)?
  - Ratings bounded (1 to 5)?
- [ ] **Data Types**:
  - `NUMERIC(10,2)` used for monetary values (NEVER `FLOAT`/`REAL`).
  - `TIMESTAMPTZ` used for all date-times (NEVER timezone-naive `TIMESTAMP`).
  - `SMALLINT` used for bounded integers (cores, RAM, ratings).

### C. Row Level Security (RLS) & Access Control
- [ ] **RLS Enabled**: Is `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` included in the migration?
- [ ] **Public Read Policies**: If public catalog data, is `SELECT` policy granted to `anon` and `authenticated` with `USING (is_active = true)`?
- [ ] **Customer Data Isolation**: If customer data, is policy restricted to `auth.uid() = user_id` for `SELECT`, `INSERT`, `UPDATE`, and `DELETE`?
- [ ] **Service Role Bypass**: Documented that backend FastAPI service uses `service_role` secret to bypass RLS for administrative actions only.

---

## 3. Query & Performance Pre-Flight Checklist

Before deploying any SQL query or Supabase JS client call to the application:

### A. Sargability & Predicate Hygiene
- [ ] **No Functions on Indexed Columns**: Ensure `WHERE` clauses do not wrap indexed columns (e.g. use `WHERE slug = 'samsung-s24'`, NEVER `WHERE LOWER(slug) = '...'`).
- [ ] **Arithmetic on Constants**: Write `WHERE price > 50000`, NEVER `WHERE price + 5000 > 55000`.
- [ ] **Wildcard Starts**: Avoid leading wildcards like `LIKE '%s24'` (which defeats B-Tree indexes). Use GIN Trigram indexes (`gin_trgm_ops`) instead.

### B. Index Design & Ordering
- [ ] **Composite Index Ordering**: Equality filters placed first, Range/Sort filters placed second.
- [ ] **Partial Indexes Applied**: If queries frequently filter on static flags (`is_active = TRUE`, `is_approved = TRUE`), is a partial index used?
- [ ] **Immutable Predicates**: Verified that no non-immutable functions (`NOW()`, `CURRENT_DATE`) exist inside index `WHERE` clauses.

### C. Execution Plan Inspection (`EXPLAIN ANALYZE`)
- [ ] Query tested with `EXPLAIN (ANALYZE, BUFFERS)` in Supabase SQL Editor.
- [ ] Verified that execution uses **Index Scan**, **Index Only Scan**, or **Bitmap Index Scan**.
- [ ] Verified that **Seq Scan** is NOT used on tables with more than 1,000 rows.
- [ ] Buffer cache hit ratio verified: execution reads from shared buffer memory, minimizing disk reads.

### D. Concurrency & Network Roundtrips
- [ ] **N+1 Loops Prevented**: Are all child relations fetched in a single query using joins or JSON aggregation?
- [ ] **Cursor Pagination**: Large feeds use keyset pagination (`WHERE (created_at, id) < (...) LIMIT 20`), avoiding slow `OFFSET`.

---

## 4. Transaction Safety & Migration Runbook

### A. Transaction Boundaries
- [ ] **No External Network Calls Inside Transactions**: Ensure external APIs (OpenAI embeddings, Gemini inference, payment webhooks) are executed **BEFORE** the `BEGIN` block.
- [ ] **Lock Timeouts Configured**: DDL migrations must set a lock timeout to prevent queueing table locks:
  ```sql
  SET lock_timeout = '3s';
  ```
- [ ] **Concurrent Index Creation**: On production tables with live traffic, use:
  ```sql
  CREATE INDEX CONCURRENTLY IF NOT EXISTS ...
  ```

### B. Rollback Plan
- [ ] Every migration file (`0X_name.sql`) has a corresponding, tested rollback script (`0X_name_rollback.sql`) in case of unexpected failure during deployment.

---

## 5. Emergency Incident Runbook

### 5.1 Detecting Active Locks & Blocked Queries
If Supabase API requests freeze or timeout:
```sql
-- Find queries waiting on locks:
SELECT 
    pid, 
    now() - pg_stat_activity.query_start AS duration, 
    query, 
    state
FROM pg_stat_activity
WHERE wait_event_type IS NOT NULL 
  AND state != 'idle'
ORDER BY duration DESC;
```

### 5.2 Terminating a Rogue or Deadlocked Query
```sql
-- Safely cancel query without dropping connection:
SELECT pg_cancel_backend(PID_NUMBER);

-- Forcefully terminate connection if cancel fails:
SELECT pg_terminate_backend(PID_NUMBER);
```

### 5.3 Resetting Table Statistics After Heavy Batch Writes
Whenever inserting or updating thousands of device rows:
```sql
ANALYZE public.devices;
ANALYZE public.device_specs;
ANALYZE public.device_scores;
ANALYZE public.device_categories;
```
