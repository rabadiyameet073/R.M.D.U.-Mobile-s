# RMDU Mobiles — Production Database Engineering Standards & Governance

> **Target Database Engine:** PostgreSQL 15+ (Hosted on Supabase)  
> **Primary Authority:** [`SQL_Database_and_System_Design_Master_Notes.md`](file:///d:/rmdu%20mobiles/SQL_Database_and_System_Design_Master_Notes.md)  
> **Status:** Mandatory Production Standard for all Engineers, Subagents & Migrations

---

## 1. Architectural Philosophy: The Production Standard

A production database is not merely a data store; it is the **authoritative system of record** that guarantees correctness, durability, performance, and security across the entire application lifecycle.

Every schema modification, query, and migration executed against RMDU Mobiles must satisfy the five pillars of database engineering:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   THE 5 PILLARS OF DATABASE GOVERNANCE                      │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ 1. Correctness    │ Invariants enforced by database constraints (PK, FK,    │
│                   │ UNIQUE, CHECK, NOT NULL), never solely application code.│
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 2. Durability     │ ACID guarantees, WAL archiving, point-in-time recovery  │
│                   │ (PITR), and tested recovery runbooks.                   │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 3. Performance    │ Sargable queries, composite index ordering, sub-5ms     │
│                   │ p95 latency, and zero sequential scans on core paths.   │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 4. Security       │ Least privilege, Row-Level Security (RLS) on all tables,│
│                   │ parameterized SQL, and encrypted transport (TLS 1.3).   │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ 5. Operability    │ Zero-downtime migrations (Expand-Migrate-Contract), lock│
│                   │ timeouts, and query telemetry via pg_stat_statements.   │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

---

## 2. Rule 1: Relational Modeling & Schema Standards

### 2.1 Primary & Foreign Keys
1. **Surrogate UUID Keys**: Every entity table must use a UUID surrogate primary key (`id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`). Never expose auto-incrementing integer IDs (`1, 2, 3...`) in public APIs or client URLs to prevent resource enumeration attacks.
2. **Explicit Foreign Key Cascades**: Every foreign key must explicitly declare its deletion behavior (`ON DELETE CASCADE`, `ON DELETE SET NULL`, or `ON DELETE RESTRICT`). Never leave foreign key deletion unstated.
   - Child records that cannot exist without parent (e.g. `device_specs`, `device_scores` $\to$ `devices`): Use `ON DELETE CASCADE`.
   - Independent reference entities (e.g. `devices` $\to$ `brands`): Use `ON DELETE RESTRICT` to prevent accidental deletion of a brand that has active devices.
   - Audit / Attribution links (e.g. `device_categories.added_by` $\to$ `users`): Use `ON DELETE SET NULL`.

### 2.2 Data Types & Domain Boundaries
1. **Financial Values**: Always use `NUMERIC(10,2)` for prices, budgets, and monetary figures. Never use floating-point types (`FLOAT`, `REAL`, `DOUBLE PRECISION`) for prices due to IEEE 754 precision rounding errors.
2. **Timestamps**: Always use `TIMESTAMPTZ` (`timestamp with time zone`). Never use timezone-naive `TIMESTAMP`. All internal logic must compute in UTC (`NOW()`).
3. **Strings**: 
   - Use `VARCHAR(N)` when there is a clear business maximum (e.g. `slug VARCHAR(180)`, `country VARCHAR(60)`).
   - Use `TEXT` for free-form multi-line content (e.g. `review`, `description`, `justification`).
4. **Compact Integers**: Use `SMALLINT` (-32,768 to 32,767) for small bounded quantities such as ratings (1–5), CPU cores (1–32), RAM (1–64 GB), and display refresh rate (30–360 Hz) to save disk page space and maximize memory buffer cache density.

### 2.3 Database Constraints First
Never rely solely on frontend or backend validation to guarantee data integrity. Express all business invariants in the database schema:
```sql
-- Examples of Mandatory Constraints:
ALTER TABLE public.devices ADD CONSTRAINT chk_device_price_positive CHECK (price >= 0);
ALTER TABLE public.user_profiles ADD CONSTRAINT chk_budget_range_valid CHECK (budget_min <= budget_max);
ALTER TABLE public.device_scores ADD CONSTRAINT chk_score_bounds CHECK (overall_score BETWEEN 0 AND 100);
```

---

## 3. Rule 2: Normalization Standards (1NF through BCNF)

### 3.1 Normal Forms Hierarchy & RMDU Compliance
* **First Normal Form (1NF)**:
  - Each field contains atomic values.
  - Primary key uniquely identifies every tuple.
  - No repeating groups. E.g., user phone ownership history is normalized into `user_phone_history`, not columns `phone_1`, `phone_2` on `users`.
* **Second Normal Form (2NF)**:
  - Table is in 1NF.
  - Every non-key attribute is fully functionally dependent on the entire candidate key.
  - In `device_categories`, attributes `rank`, `rank_locked`, and `justification` depend on the composite key `(device_id, category_id)`, not just one part.
* **Third Normal Form (3NF)**:
  - Table is in 2NF.
  - No transitive functional dependencies ($X \to Y$ and $Y \to Z$).
  - `devices` does not store brand logo or manufacturer country; it references `brand_id $\to$ brands(id)`.
  - Hardware specifications are vertically decomposed into `device_specs`, scores into `device_scores`, and vectors into `device_embeddings`.
* **Boyce-Codd Normal Form (BCNF)**:
  - For every functional dependency $X \to Y$, $X$ must be a superkey.
  - In `device_categories`, dynamic rank position within a category is unique:
    `CONSTRAINT device_categories_rank_unique UNIQUE (category_id, rank) DEFERRABLE INITIALLY DEFERRED`.

### 3.2 Controlled Denormalization & Modern Relational Trade-offs
To prevent **Join Explosion** (joining 6+ tables on high-traffic mobile feeds) while retaining transactional integrity:
1. **PostgreSQL Native Arrays (`TEXT[]`)**: Allowed only for simple, fixed attribute lists tied to the entity lifecycle: `gallery_urls`, `color_options`, `camera_features`. Avoids 3 separate join tables.
2. **PostgreSQL JSONB (`extra`, `metadata`, `raw_meta`)**: Allowed for polymorphic, evolving manufacturer attributes without requiring full DDL schema migration locks.
3. **Derived Overall Score**: Computed via database trigger `fn_compute_overall_score()` and persisted on `device_scores.overall_score` to allow high-speed index sorting (`ORDER BY overall_score DESC`) without evaluating math on millions of rows at query time.

---

## 4. Rule 3: Performance, Indexing & Sargability

### 4.1 Indexing Policy
1. **No Index Without a Measured Access Pattern**: Never add indexes speculatively. Every index costs storage space and adds write latency to `INSERT`, `UPDATE`, and `DELETE`.
2. **Composite Index Column Ordering Rule**:
   - Place **Equality filter** columns first (`WHERE brand_id = $1`).
   - Place **Range/Sorting filter** columns second (`WHERE price BETWEEN $2 AND $3 ORDER BY price`).
   ```sql
   -- Correct composite index for brand + price catalog filter:
   CREATE INDEX idx_devices_active_brand_price ON devices (brand_id, price) WHERE is_active = TRUE;
   ```
3. **Partial / Filtered Indexes**: If a query always filters by a static flag (e.g. `is_active = TRUE`, `is_approved = TRUE`, `is_triggered = FALSE`), always create a partial index:
   ```sql
   -- Compact: Indexes only 5G phones instead of the entire catalog:
   CREATE INDEX idx_specs_five_g ON device_specs (device_id) WHERE five_g = TRUE;
   ```
4. **Never Use Non-Immutable Functions in Index Predicates**:
   - `NOW()`, `CURRENT_TIMESTAMP`, and `CURRENT_DATE` change over time and are non-immutable.
   - Use composite indexes `(short_code, expires_at DESC)` instead of `WHERE expires_at > NOW()`.

### 4.2 Sargability (Search Argument Ability)
A query is **sargable** if the query optimizer can use an index to evaluate the filter.
* ❌ **Non-Sargable (Triggers Full Table Scan)**:
  ```sql
  -- Applying a function to an indexed column disables standard B-Tree index:
  SELECT * FROM devices WHERE LOWER(name) = 'samsung galaxy s24';
  SELECT * FROM devices WHERE price + 1000 > 50000;
  SELECT * FROM devices WHERE name LIKE '%galaxy%';
  ```
* ✅ **Sargable Alternative**:
  ```sql
  -- Uses GIN Trigram index:
  SELECT * FROM devices WHERE name = 'Samsung Galaxy S24';
  -- Or use trigram operator supported by GIN index:
  SELECT * FROM devices WHERE name % 'galxy s24';
  SELECT * FROM devices WHERE price > 49000;
  ```

### 4.3 Query Plan Verification (`EXPLAIN ANALYZE`)
Before any query is deployed to production:
1. Run `EXPLAIN (ANALYZE, BUFFERS)` in Supabase SQL Editor.
2. Confirm that high-frequency tables use **Index Scan**, **Index Only Scan**, or **Bitmap Index Scan**.
3. Any query performing a **Seq Scan** on a table with more than 1,000 rows must be rejected and reviewed.

---

## 5. Rule 4: Transactions, ACID & Concurrency Control

### 5.1 ACID Guarantees in RMDU
* **Atomicity**: Multi-table business events (e.g. creating a device, inserting its specs, computing its scores, and assigning category ranks) must execute in a single transaction block (`BEGIN ... COMMIT;`). If any step fails, the entire transaction rolls back.
* **Consistency**: Invariants (e.g. weights sum to 1.00 in `recommendation_rules`) are validated at commit time.
* **Isolation**: Supabase PostgreSQL operates in `READ COMMITTED` by default. For critical financial or inventory operations, use explicit locking or `REPEATABLE READ`.
* **Durability**: Committed data is written to PostgreSQL Write-Ahead Logs (WAL) before transaction acknowledgement.

### 5.2 Concurrency & Locking Best Practices
1. **Keep Transactions Short**: Acquire locks as late as possible. Never perform external network calls, email sends, or AI vector generation inside an open database transaction.
   ```
   ❌ WRONG:  BEGIN -> INSERT -> Call OpenAI API (2000ms lock) -> UPDATE -> COMMIT
   ✅ RIGHT:  Call OpenAI API -> BEGIN -> INSERT data & vectors -> COMMIT (< 5ms)
   ```
2. **Consistent Lock Acquisition Order**: To prevent deadlocks, always update parent/child records in the same sequence across all endpoints (e.g. always lock `devices` before `device_categories`).
3. **Pessimistic Locking**: Use `SELECT ... FOR UPDATE` only when concurrent writes to the same row are expected and race conditions must be eliminated (e.g., reserving limited stock).
4. **Optimistic Concurrency**: For user profile updates, use timestamp or version checking:
   ```sql
   UPDATE user_profiles 
   SET budget_max = 50000, updated_at = NOW() 
   WHERE user_id = $1 AND updated_at = $2;
   ```

---

## 6. Rule 5: Security, Access Control & Privacy by Design

### 6.1 Least Privilege Architecture
Database access is divided into three distinct privilege tiers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CREDENTIAL ISOLATION TIERS                         │
├────────────────────┬────────────────────┬───────────────────────────────────┤
│ Tier               │ Identity           │ Permissions                       │
├────────────────────┼────────────────────┼───────────────────────────────────┤
│ 1. Public Client   │ Anon Public Key    │ SELECT only on public catalog     │
│    (Browser)       │ (RLS enforced)     │ via Row Level Security (RLS).     │
├────────────────────┼────────────────────┼───────────────────────────────────┤
│ 2. Authenticated   │ Supabase User JWT  │ SELECT/UPDATE on own records;     │
│    Customer        │ (auth.uid())       │ No access to other users' data.   │
├────────────────────┼────────────────────┼───────────────────────────────────┤
│ 3. Backend Service │ Service Role Secret│ Full access; bypasses RLS; strictly│
│    (FastAPI)       │ (Never in browser) │ restricted to secure server APIs. │
└────────────────────┴────────────────────┴───────────────────────────────────┘
```

### 6.2 Row Level Security (RLS) Mandate
* **Rule**: Every single table created in the `public` schema **MUST** have Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
* A table without RLS policies exposes data to unauthorized public read/write via the PostgREST API.
* Customer tables (`users`, `user_profiles`, `user_phone_history`, `price_alerts`, `shopkeeper_cards`) must enforce `auth.uid() = user_id`.

### 6.3 SQL Injection Prevention
* All dynamic queries must use **parameterized queries** (`$1`, `$2` in raw SQL, or Supabase client query builder `.eq('id', id)`).
* Never concatenate untrusted client strings into SQL queries:
  ```python
  # ❌ CRITICAL SECURITY FLAW:
  cursor.execute(f"SELECT * FROM devices WHERE slug = '{slug}'")

  # ✅ SECURE PARAMETERIZED STATEMENT:
  cursor.execute("SELECT * FROM devices WHERE slug = %s", (slug,))
  ```

---

## 7. Rule 6: Connection Management & Scalability

### 7.1 Connection Pooling
1. **Transaction Pooling (Port 6543 via PgBouncer)**:
   - Used by serverless backend functions and FastAPI instances.
   - Reuses database connections immediately after a transaction completes.
   - Prevents backend instances from exhausting PostgreSQL's `max_connections`.
2. **Direct Connection (Port 5432)**:
   - Used exclusively for DDL schema migrations, database setup scripts, and long-running batch admin jobs.

### 7.2 N+1 Query Prevention
Never execute a database query inside an application loop:
* ❌ **N+1 Anti-Pattern**: Query 20 devices, then run a separate query for each device to fetch its specifications (21 roundtrips).
* ✅ **Solution**: Use Supabase deep joins or PostgreSQL JSON aggregation to fetch everything in a single roundtrip:
  ```javascript
  const { data } = await supabase
    .from('devices')
    .select('id, name, price, brand:brands(name), specs:device_specs(*)');
  ```

### 7.3 Keyset / Cursor Pagination
For large feeds and mobile scroll views, prefer keyset pagination over `LIMIT / OFFSET`:
* `OFFSET 10000` forces the database engine to scan 10,020 rows, discard 10,000, and return 20.
* Keyset pagination uses the index directly:
  ```sql
  SELECT * FROM devices 
  WHERE (created_at, id) < ($last_created_at, $last_id) 
  ORDER BY created_at DESC, id DESC 
  LIMIT 20;
  ```

---

## 8. Rule 7: Zero-Downtime Migration Policy

### 8.1 Expand-Migrate-Contract Pattern
Never perform a breaking schema change in a single all-at-once migration. If renaming or restructuring a column:
1. **Phase 1 (Expand)**: Add the new column as nullable. Application reads from old, writes to both old and new.
2. **Phase 2 (Migrate)**: Run a background batch script to backfill historical data into the new column.
3. **Phase 3 (Contract)**: Update application to read and write exclusively from new column. Once verified, drop old column and add `NOT NULL` constraint.

### 8.2 Non-Blocking DDL
1. **Always Set Lock Timeouts**: DDL commands take exclusive table locks (`ACCESS EXCLUSIVE`). Always set a lock timeout so a migration fails fast rather than queuing traffic and taking down the website:
   ```sql
   SET lock_timeout = '3s';
   ```
2. **Concurrently Create Indexes**: On large production tables, create indexes using `CONCURRENTLY` to avoid locking read and write traffic during index build:
   ```sql
   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_devices_slug ON devices(slug);
   ```

---

## 9. Rule 8: High Availability, Durability & Disaster Recovery

1. **Replication is NOT a Backup**:
   - Replicas mirror live data. If a table is dropped or malicious SQL is executed, the deletion replicates instantly to all replicas.
   - Maintain continuous Point-in-Time Recovery (PITR) with WAL archiving.
2. **RTO & RPO Commitments**:
   - **RTO (Recovery Time Objective)**: Service must be restorable within **under 60 minutes** following a primary database outage.
   - **RPO (Recovery Point Objective)**: Maximum permissible data loss is **under 15 minutes** of transactions.
3. **Tested Restores**: Backups are unverified assumptions until a restore has been executed and validated in an isolated staging environment.
