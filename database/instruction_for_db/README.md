# RMDU Mobiles — Database Instructions & Migration Runbook

> **Target Database:** PostgreSQL 15+ (Hosted on Supabase)  
> **Project URL:** `https://lyoupcrbcloxjpgstzqh.supabase.co`  
> **Target Schema:** `public` + `auth` sync

---

## 1. Quick Start: Execution Order for Supabase SQL Editor

Whenever setting up a new Supabase project or onboarding a new developer, run the SQL migration files in the exact numbered order below:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   CORE DATABASE MIGRATION PIPELINE (SCHEMA)                 │
├─────────┬───────────────────────────────────┬───────────────────────────────┤
│ STEP 01 │ 01_mobilemart_schema.sql          │ Base 24 Tables, Triggers,     │
│         │                                   │ Seed Categories & Views       │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ STEP 02 │ 02_google_oauth_customer_sync.sql │ Google OAuth Support,         │
│         │                                   │ Auto-Sync Trigger & User RLS  │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ STEP 03 │ 03_normalization_and_indexes.sql  │ Normalization Bounds (1NF-BCNF│
│         │                                   │ Hardware Indexes & Trigram    │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ STEP 04 │ 04_complete_rls_and_fk_indexes.sql│ Complete RLS on all 24 tables,│
│         │                                   │ 11 FK Indexes & Domain Checks │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ STEP 06 │ 06_fix_category_rank_trigger.sql  │ Recursion Guard for Rank      │
│         │                                   │ Trigger (fixes error 54001)   │
├─────────┼───────────────────────────────────┼───────────────────────────────┤
│ STEP 07 │ 07_concurrency_holds_and_versions │ Version Columns, re-rank RPC, │
│         │ .sql                              │ Holds & Idempotency Records   │
├─────────┴───────────────────────────────────┴───────────────────────────────┤
│ OPTIONAL (Testing / Demo Data Only - NOT REQUIRED for Production):           │
├─────────┬───────────────────────────────────┬───────────────────────────────┤
│ [OPT] 05│ 05_seed_catalog_phones.sql        │ Sample Demo Phones (Optional) │
└─────────┴───────────────────────────────────┴───────────────────────────────┘
```

---

## 2. Migration Files Breakdown

### Step 1: [`../01_mobilemart_schema.sql`](file:///d:/rmdu%20mobiles/database/01_mobilemart_schema.sql)
* **What it does**:
  1. Installs core extensions: `uuid-ossp`, `pgcrypto`, `vector` (pgvector), and `pg_trgm`.
  2. Creates the core **24 database tables**:
     - **Catalog**: `brands`, `devices`, `device_specs`, `device_scores`, `device_pros_cons`, `device_features`, `device_ussd_codes`.
     - **Dynamic Ranking**: `categories`, `device_categories`.
     - **Recommendation Engine**: `recommendations`, `recommendation_rules`.
     - **Customer**: `users`, `user_profiles`, `user_phone_history`.
     - **Moat Features**: `comparison_sessions`, `shopkeeper_cards`, `reviews`, `price_alerts`.
     - **AI & RAG**: `device_embeddings`, `user_query_embeddings`, `ai_chat_sessions`, `ai_chat_messages`, `rag_knowledge_chunks`.
     - **Security**: `audit_log`.
  3. Deploys automated triggers:
     - `trg_compute_overall_score`: Auto-weights overall device scores (0–100).
     - `trg_shift_category_ranks`: Auto-shifts dense integer ranks in categories.
     - `trg_generate_short_code`: Generates 8-character codes for shopkeeper cards.
     - `trg_*_updated_at`: Automatically timestamps changes.
  4. Deploys hybrid view: `vw_category_device_ranks` (manual and score-computed rankings).
  5. Seeds the 5 core RMDU categories:
     - 💸 `Budget Killer` (`budget-killer`)
     - 🎮 `Gaming Guru` (`gaming-guru`)
     - 📸 `Camera Champ` (`camera-champ`)
     - 🔋 `Battery Boss` (`battery-boss`)
     - 🐐 `GOAT` (`goat`)

---

### Step 2: [`../02_google_oauth_customer_sync.sql`](file:///d:/rmdu%20mobiles/database/02_google_oauth_customer_sync.sql)
* **What it does**:
  1. Relaxes `password_hash` in `public.users` (`DROP NOT NULL`) to support passwordless Google OAuth logins.
  2. Adds `auth_provider` (`'google' | 'email'`), `oauth_id`, and `raw_meta` to `public.users`.
  3. Creates `public.handle_new_auth_user()` trigger on `auth.users`:
     - When a customer clicks "Sign in with Google", Supabase authenticates them and inserts into `auth.users`.
     - This trigger immediately copies their Google Name, Email, and Avatar picture into `public.users`.
     - Initializes their personal taste record in `public.user_profiles` (`onboarding_done = FALSE`).
  4. Creates `public.handle_user_login_sync()` trigger:
     - Automatically updates `last_login_at` whenever returning old customers log back in.
  5. Enables Row Level Security (RLS) on all user tables so each customer can only read and edit their own taste, past phone history, comparisons, and saved cards.

---

### Step 3: [`../03_normalization_and_indexes.sql`](file:///d:/rmdu%20mobiles/database/03_normalization_and_indexes.sql)
* **What it does**:
  1. **Domain Normalization & Integrity Checks (1NF–BCNF)**:
     - Non-negative device prices (`chk_device_price_positive`).
     - Logical budget ranges (`chk_budget_range_valid`: `budget_min <= budget_max`).
     - Positive target price alerts (`chk_price_alerts_positive`).
     - Bounded hardware specs (`cpu_cores BETWEEN 1 AND 32`, `refresh_rate_hz BETWEEN 30 AND 360`, `battery_mah > 0`).
  2. **Hardware Specification Filter Indexes (`device_specs`)**:
     - `idx_specs_os`: Speeds up OS queries ("Android 14", "iOS 17").
     - `idx_specs_cpu_cores`: Speeds up Octa-core/Hexa-core processor filtering.
     - `idx_specs_processor_brand`: Speeds up Snapdragon/Dimensity/Apple chipset filtering.
     - `idx_specs_ram_storage`: Multi-column index on `(ram_gb, storage_gb)` ("12GB + 256GB").
     - `idx_specs_refresh_display`: Multi-column index on `(refresh_rate_hz DESC, display_type)` ("120Hz AMOLED").
     - `idx_specs_battery_charging`: Multi-column index on `(battery_mah DESC, charging_watt DESC)`.
     - `idx_specs_camera_primary`: Sorted index for photography leaderboard queries.
     - `idx_specs_five_g`: Compact partial index for 5G-only device filtering.
  3. **Fuzzy Typo-Tolerant Search (GIN Trigram)**:
     - Instant search on device names (`idx_devices_name_trgm` — searching "galxy s24" finds "Galaxy S24").
     - Instant search on brand names (`idx_brands_name_trgm` — searching "samsng" finds "Samsung").
     - Instant search on processor names (`idx_specs_processor_trgm` — searching "snapdrgn 8 gen 3").
  4. Runs PostgreSQL statistics `ANALYZE` for optimal query execution plans.

---

### Step 4: [`../04_complete_rls_and_fk_indexes.sql`](file:///d:/rmdu%20mobiles/database/04_complete_rls_and_fk_indexes.sql)
* **What it does**:
  1. **Zero-Lockout Protection**: Enforces `SET lock_timeout = '3s';`.
  2. **Foreign Key Indexes**: Eliminates sequential table scans and lock escalation on cascading deletes:
     - `idx_device_features_device`, `idx_chat_messages_session`, `idx_reviews_user`, `idx_cards_device`, `idx_recommendations_device`, `idx_user_profiles_current_device`, `idx_comparison_winner_device`, `idx_dev_cat_added_by`, `idx_uph_device`, `idx_ai_chat_sessions_user`, `idx_user_query_embeddings_user`.
  3. **Enterprise Domain Bounds**:
     - `chk_reviews_helpful_votes`, `chk_chat_tokens_positive`, `chk_comparison_device_count`, `chk_brands_name_not_empty`, `chk_devices_name_not_empty`.
  4. **Universal RLS Enforcement**: Enables Row-Level Security across **all remaining 17 tables** in the public schema with granular SELECT, INSERT, UPDATE, and DELETE policies.

---

### Step 5: [`../05_seed_catalog_phones.sql`](file:///d:/rmdu%20mobiles/database/05_seed_catalog_phones.sql)
* **What it does**:
  1. Seeds top global smartphone brands: Samsung, Apple, OnePlus, Google, Xiaomi, Motorola, Vivo, Realme.
  2. Seeds 7 benchmark production smartphones with real specifications, prices, and high-res imagery:
     - `Samsung Galaxy S24 Ultra` (GOAT #1, Camera Champ #2)
     - `Apple iPhone 15 Pro Max` (GOAT #2)
     - `OnePlus 12R` (Gaming Guru #1, Battery Boss #1)
     - `Vivo X100 Pro 5G` (Camera Champ #1)
     - `Redmi Note 13 Pro+ 5G` (Budget Killer #1)
     - `Motorola Moto G84 5G` (Battery Boss #2, Budget Killer #2)
     - `Realme Narzo 70 Pro 5G` (Budget Killer #3)
  3. Deploys full `device_specs`, detailed `device_scores` (auto-calculating overall score via trigger), curated `device_pros_cons`, and locked dynamic category ranks.

---

### Step 6: [`../06_fix_category_rank_trigger.sql`](file:///d:/rmdu%20mobiles/database/06_fix_category_rank_trigger.sql)
* **Why it exists**: the shipped `fn_shift_category_ranks()` re-fired itself while shifting siblings and aborted real re-ranks with `ERROR: stack depth limit exceeded` (SQLSTATE `54001`).
* **What it does**: makes nested invocations no-ops via `pg_trigger_depth() > 1`, so one statement still shifts siblings without recursing.
* **Required**: migration 07 refuses to run until this guard is present.

---

### Step 7: [`../07_concurrency_holds_and_versions.sql`](file:///d:/rmdu%20mobiles/database/07_concurrency_holds_and_versions.sql)
* **Why it exists**: implements [Module 11](../../instruction/technical-architecture/11_SYSTEM_DESIGN_MASTER_RULES.md) and [Module 12](../../instruction/technical-architecture/12_CONCURRENCY_AND_RESERVATION_RULES.md) — optimistic concurrency, the transactional rank move, and the train-ticket claim table.
* **What it does**:
  1. Adds `version` to `devices`, `user_profiles`, `recommendation_rules`, `categories`, with `fn_bump_row_version()` incrementing it on every UPDATE.
  2. `fn_rerank_device()` replaces the API's delete-then-reinsert ranking: transaction-scoped advisory lock, `FOR NO KEY UPDATE` on the category, expected-revision check, dense sibling shift, audit row — all in one commit.
  3. `resource_holds` (partial unique index = one live claim per slot) plus `fn_claim_slot`, `fn_confirm_slot`, `fn_release_slot`, `fn_slot_status`, `fn_sweep_concurrency_state`.
  4. `idempotency_requests` plus `fn_begin_idempotent` / `fn_complete_idempotent` so retried writes replay their first result.
  5. RLS on, `PUBLIC` execute revoked, `service_role` granted — the API is the only caller.
* **Apply before deploying the backend** that selects `version`; otherwise catalog reads fail on the missing column.
* **Verify**: `python backend/scripts/qa_concurrency.py` (creates and removes `qa-` rows).

---

## 3. How to Execute in Supabase Dashboard (Step-by-Step)

1. Open your browser and navigate to **[Supabase Dashboard](https://supabase.com/dashboard)**.
2. Select your project: **`lyoupcrbcloxjpgstzqh`**.
3. In the left navigation menu, click on the **SQL Editor** icon (`>_`).
4. Click **+ New query**.
5. Paste the contents of `01_mobilemart_schema.sql` and click **Run** (`Ctrl + Enter`).
6. Click **+ New query** again, paste `02_google_oauth_customer_sync.sql`, and click **Run**.
7. Click **+ New query** again, paste `03_normalization_and_indexes.sql`, and click **Run**.
8. Click **+ New query** again, paste `04_complete_rls_and_fk_indexes.sql`, and click **Run**.
9. Paste `06_fix_category_rank_trigger.sql` and click **Run**.
10. Paste `07_concurrency_holds_and_versions.sql` and click **Run** (it aborts with a clear message if step 9 was skipped).
11. All 6 required migrations are now complete! (Step 05 `05_seed_catalog_phones.sql` is strictly optional for demo/testing).

---

## 4. Rollback Scripts

If you ever need to rollback a migration, execute the corresponding script from the [`../rollbacks/`](file:///d:/rmdu%20mobiles/database/rollbacks) directory:
- `rollbacks/07_rollback.sql`: Drops the concurrency objects (holds, idempotency, versions, RPCs). Export both tables first if they hold real claims.
- `rollbacks/06_rollback.sql`: Restores the recursive rank trigger — only when re-applying `01_mobilemart_schema.sql` wholesale.
- `rollbacks/05_rollback.sql`: Cleans out seeded phones and brands (if Step 05 was used).
- `rollbacks/04_rollback.sql`: Drops FK indexes, check constraints, and catalog RLS policies.
- `rollbacks/03_rollback.sql`: Drops normalization bounds, hardware filter indexes, and GIN trigram indexes.
- `rollbacks/02_rollback.sql`: Drops auth triggers and user table RLS policies.
- `rollbacks/01_rollback.sql`: Completely drops all 24 tables, views, and functions.

---

## 5. Verification Queries

Run this validation script in Supabase SQL Editor to confirm all components are active:

```sql
SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS total_public_tables,
    (SELECT COUNT(*) FROM public.categories) AS total_categories,
    (SELECT COUNT(*) FROM public.devices) AS total_devices,
    (SELECT COUNT(*) FROM public.recommendation_rules) AS total_rules,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') AS total_indexes,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = TRUE) AS tables_with_rls,
    (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE 'trg_%' OR tgname LIKE 'on_auth_%') AS total_triggers,
    EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'vw_category_device_ranks') AS has_ranking_view;
```

### Expected Output (Core Production Schema):
| Field | Expected Value | Status |
|---|:---:|:---:|
| `total_public_tables` | `24` |  All 24 Core Tables Present |
| `total_categories` | `5` |  All 5 RMDU Categories Seeded |
| `total_devices` | `0` |  Clean Production Database Ready |
| `total_rules` | `5` |  Default Priority Weights Configured |
| `total_indexes` | `50+` |  B-Tree, Partial, Trigram, Vector & FK Indexes |
| `tables_with_rls` | `24` |  100% RLS Coverage Across Public Schema |
| `total_triggers` | `10+` |  Ranking, Scoring, Codes, and Auth Sync Active |
| `has_ranking_view` | `true` |  Dynamic Category Ranking View Operational |

---

## 5. Google OAuth Setup Checklist

To activate Google login with project `lyoupcrbcloxjpgstzqh`:

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com/)):
   - Go to **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - Application Type: **Web application**.
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5100
     ```
   - **Authorized redirect URIs**:
     ```
     https://lyoupcrbcloxjpgstzqh.supabase.co/auth/v1/callback
     ```
   - Copy your **Client ID** and **Client Secret**.

2. **Supabase Dashboard**:
   - Go to **Authentication** → **Providers** → click **Google**.
   - Toggle **Enable Google provider**.
   - Paste your **Client ID** and **Client Secret**.
   - Click **Save**.

---

## 6. Production Governance & Architecture Documents

* [**`01_DATABASE_ENGINEERING_STANDARDS_AND_RULES.md`**](file:///d:/rmdu%20mobiles/database/instruction_for_db/01_DATABASE_ENGINEERING_STANDARDS_AND_RULES.md): The mandatory engineering standards derived from [`SQL_Database_and_System_Design_Master_Notes.md`](file:///d:/rmdu%20mobiles/SQL_Database_and_System_Design_Master_Notes.md) covering the 5 Pillars of Governance, 1NF–BCNF normalization, composite index ordering, ACID transactions, and connection management.
* [**`02_PRE_IMPLEMENTATION_CHECKLIST_AND_GOVERNANCE.md`**](file:///d:/rmdu%20mobiles/database/instruction_for_db/02_PRE_IMPLEMENTATION_CHECKLIST_AND_GOVERNANCE.md): The pre-flight checklist that every developer must complete before running DDL, creating new tables, writing complex queries, or altering production schema.
* [**`DYNAMIC_DATABASE_API_REFERENCE.md`**](file:///d:/rmdu%20mobiles/database/DYNAMIC_DATABASE_API_REFERENCE.md): Complete field-by-field dictionary, API contracts, normalization proofs (1NF–BCNF), and React fetching snippets.
* [**`implement.md`**](file:///d:/rmdu%20mobiles/database/implement.md): Architecture overview, scoring algorithms, RAG similarity search, and shopkeeper card flow.
* [**`SQL_Database_and_System_Design_Master_Notes.md`**](file:///d:/rmdu%20mobiles/SQL_Database_and_System_Design_Master_Notes.md): The project's root theoretical master reference for system design, distributed data, and high availability.
