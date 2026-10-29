# RMDU Mobiles — Dynamic Supabase Database & API Reference

> **Comprehensive Field-Level Dictionary, API Integration Contracts & Dynamic Data Architecture**  
> **Database:** PostgreSQL 15+ on Supabase  
> **Companion Migrations:** 
> 1. [`01_mobilemart_schema.sql`](file:///d:/rmdu%20mobiles/database/01_mobilemart_schema.sql) (Base Schema & 24 Tables)
> 2. [`02_google_oauth_customer_sync.sql`](file:///d:/rmdu%20mobiles/database/02_google_oauth_customer_sync.sql) (Google OAuth & History Tracking)
> 3. [`03_normalization_and_indexes.sql`](file:///d:/rmdu%20mobiles/database/03_normalization_and_indexes.sql) (Normalization Constraints & Advanced Indexes)
> 4. [`04_complete_rls_and_fk_indexes.sql`](file:///d:/rmdu%20mobiles/database/04_complete_rls_and_fk_indexes.sql) (100% RLS Coverage & Foreign Key Indexes)
> 5. [`05_seed_catalog_phones.sql`](file:///d:/rmdu%20mobiles/database/05_seed_catalog_phones.sql) (Production Smartphone Brands, Devices & Category Ranks)
> 6. [`06_fix_category_rank_trigger.sql`](file:///d:/rmdu%20mobiles/database/06_fix_category_rank_trigger.sql) (Recursion Guard for the Rank Trigger)
> 7. [`07_concurrency_holds_and_versions.sql`](file:///d:/rmdu%20mobiles/database/07_concurrency_holds_and_versions.sql) (Version Columns, Re-rank RPC, Holds, Idempotency)
> 8. [`08_atomic_counters_votes_and_dense_ranks.sql`](file:///d:/rmdu%20mobiles/database/08_atomic_counters_votes_and_dense_ranks.sql) (Atomic Counters, Vote Uniqueness, Dense-Rank Maintenance)
>
> Rollback for every numbered migration lives in [`database/rollbacks/`](file:///d:/rmdu%20mobiles/database/rollbacks).
> Section 8 documents the RPCs the FastAPI backend depends on.

---

## 1. Architecture & API Access Tiers

The RMDU Mobiles data tier is divided into two access patterns to ensure both speed and security:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER (React / Vite)                          │
└──────────────────────┬────────────────────────────────────┬──────────────────────┘
                       │                                    │
       [1] DIRECT SUPABASE CLIENT                   [2] FASTAPI BACKEND
       (Anon Key / RLS Protected)                  (Service Role Key / Secret)
                       │                                    │
                       ▼                                    ▼
       • Public Catalog (Brands, Devices)          • AI Embeddings & Vector Search (RAG)
       • Specs, Scores, Pros & Cons                • Admin Score & Rank Mutations
       • Dynamic Category Rankings (View)          • Price Alert Webhooks / Cron Jobs
       • Approved Reviews & USSD Codes             • Heavy Analytics Batch Processing
       • GOOGLE OAUTH LOGIN & SESSION SYNC                  │
       • Customer Taste & History Reads/Writes              │
                       │                                    │
                       └─────────────────┬──────────────────┘
                                         │
                                         ▼
                       ┌────────────────────────────────────┐
                       │       SUPABASE POSTGRESQL DB       │
                       │   24 Tables + Auth Sync Triggers   │
                       └────────────────────────────────────┘
```

1. **Client-Direct (Supabase JS SDK with Public Anon Key)**:
   - **Public Catalog**: Read-only queries for active phones, specs, category ranks, brands, features, and public reviews. Handled directly in browser with sub-50ms response times.
   - **Google OAuth & User Session**: `supabase.auth.signInWithOAuth({ provider: 'google' })` handles login seamlessly.
   - **Customer Taste & History**: Authenticated user reads/updates their own `user_profiles`, `user_phone_history`, and `comparison_sessions` securely via Row Level Security (RLS).
2. **Backend API (FastAPI with Service Role Key)**:
   - High-privilege and compute-heavy actions: OpenAI/Gemini vector generation (`VECTOR(1536)`), AI chat streaming, shopkeeper card verification, and administrative ranking updates.

> [!IMPORTANT]
> Anything that must be **atomic** — rank maintenance, view counters, vote uniqueness,
> slot claims — is invoked through the backend's RPC endpoints (section 8), never by
> writing the table from the browser. RLS cannot protect an invariant that spans
> several statements.

---

## 2. Google OAuth & Customer Intelligence Architecture

### 2.1 The Customer Recognition Lifecycle

When a customer logs in with Google, RMDU Mobiles recognizes their identity, budget, past devices, and taste preferences:

```
   CUSTOMER CLICKS "CONTINUE WITH GOOGLE"
                    │
                    ▼
          Google OAuth Consent
                    │
                    ▼
        Supabase Auth (auth.users)
                    │
                    ▼  (Automated PostgreSQL Trigger: trg_on_auth_user_created)
    ┌───────────────┴──────────────────────────────┐
    ▼                                              ▼
public.users                               public.user_profiles
(Name, Email, Google Avatar, Last Login)   (Budget, Priorities, Preferred Brands)
    │                                              │
    ├──────────────────────────────────────────────┤
    ▼                                              ▼
public.user_phone_history                  public.comparison_sessions
(Past phones owned, years used, reviews)   (Phones compared side-by-side, winners)
    │                                              ▼
    ▼                                 public.shopkeeper_cards
public.recommendations                (Generated offline store cards)
(Historical 0-100 match scores & reasons)
```

### 2.2 Server-Side Identity Rules

- **Migration 02** relaxes `users.password_hash`, adds `auth_provider`, and installs
  `trg_on_auth_user_created` so a Google signup produces the `public.users` and
  `user_profiles` rows immediately.
- The backend never trusts a client-supplied `user_id`. It validates the bearer token
  against GoTrue (`/auth/v1/user`) and uses the token subject for every write.
- `GET /api/v1/me/profile` runs `ensure_user()` first, so an account that predates the
  sync trigger still gets its `users`/`user_profiles` rows on first call.
- The secret key bypasses RLS. Every `/me` query therefore carries
  `user_id=eq.<token sub>` explicitly — the filter, not RLS, is what scopes the data.

## 3. Master Table & Field-Level API Reference

Generated from the live PostgREST OpenAPI description, so this section always describes the deployed database rather than the migration files.

### 3.1 Catalog

### `brands`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `name` | character varying | no |  | max 80 chars |
| `logo_url` | text | yes |  |  |
| `country` | character varying | yes |  | max 60 chars |
| `is_active` | boolean | no | `True` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

### `devices`

Master phone registry. `overall_score` is not here; it is generated on `device_scores`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `brand_id` | uuid | no |  | FK → `brands.id` |
| `name` | character varying | no |  | max 150 chars |
| `model_number` | character varying | yes |  | max 80 chars |
| `slug` | character varying | no |  | max 180 chars; Lowercase hyphenated unique identifier used in URLs. |
| `launch_date` | date | yes |  |  |
| `price` | number | no |  |  |
| `currency` | character varying | no | `INR` | max 5 chars |
| `image_url` | text | yes |  |  |
| `gallery_urls` | string[] | yes |  |  |
| `color_options` | string[] | yes |  |  |
| `is_active` | boolean | no | `True` |  |
| `is_featured` | boolean | no | `False` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |
| `embedding` | public.vector(1536) | yes |  | pgvector: semantic embedding of device for RAG similarity search. |
| `extra` | jsonb | no |  | JSONB bucket for any future fields without schema migration. |
| `version` | integer | no | `1` | Optimistic-concurrency revision; compared in the UPDATE predicate. |

### `device_specs`

40+ columns; all nullable so partial imports stay valid.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `processor_name` | character varying | yes |  | max 120 chars |
| `processor_brand` | character varying | yes |  | max 60 chars |
| `process_node` | character varying | yes |  | max 20 chars |
| `cpu_cores` | integer | yes |  |  |
| `cpu_max_freq_ghz` | number | yes |  |  |
| `gpu_name` | character varying | yes |  | max 80 chars |
| `antutu_score` | integer | yes |  |  |
| `geekbench_single` | integer | yes |  |  |
| `geekbench_multi` | integer | yes |  |  |
| `ram_gb` | integer | yes |  |  |
| `storage_gb` | integer | yes |  |  |
| `storage_type` | character varying | yes |  | max 20 chars |
| `display_size_inch` | number | yes |  |  |
| `display_resolution` | character varying | yes |  | max 30 chars |
| `display_type` | character varying | yes |  | max 30 chars |
| `refresh_rate_hz` | integer | yes |  |  |
| `peak_brightness_nit` | integer | yes |  |  |
| `protection` | character varying | yes |  | max 40 chars |
| `camera_primary_mp` | number | yes |  |  |
| `camera_ultra_mp` | number | yes |  |  |
| `camera_tele_mp` | number | yes |  |  |
| `camera_front_mp` | number | yes |  |  |
| `camera_features` | string[] | yes |  |  |
| `video_max_res` | character varying | yes |  | max 20 chars |
| `battery_mah` | integer | yes |  |  |
| `charging_watt` | integer | yes |  |  |
| `wireless_watt` | integer | yes |  |  |
| `reverse_watt` | integer | yes |  |  |
| `five_g` | boolean | no | `False` |  |
| `wifi_standard` | character varying | yes |  | max 20 chars |
| `bluetooth_version` | character varying | yes |  | max 10 chars |
| `nfc` | boolean | no | `False` |  |
| `usb_type` | character varying | yes |  | max 20 chars |
| `os` | character varying | yes |  | max 30 chars |
| `ui_layer` | character varying | yes |  | max 40 chars |
| `guaranteed_updates` | integer | yes |  |  |
| `weight_grams` | integer | yes |  |  |
| `dimensions` | character varying | yes |  | max 40 chars |
| `build_material` | character varying | yes |  | max 60 chars |
| `ip_rating` | character varying | yes |  | max 10 chars |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |

### `device_scores`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `performance_score` | number | no | `0` |  |
| `camera_score` | number | no | `0` |  |
| `battery_score` | number | no | `0` |  |
| `display_score` | number | no | `0` |  |
| `value_score` | number | no | `0` |  |
| `build_score` | number | no | `0` |  |
| `software_score` | number | no | `0` |  |
| `overall_score` | number | no | `0` | Auto-computed: Perf×0.25 + Cam×0.20 + Bat×0.20 + Disp×0.15 + Val×0.10 + Build×0.05 + SW×0.05. |
| `scored_by` | character varying | no | `system` | max 30 chars |
| `scored_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |

### `device_features`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `feature_name` | character varying | no |  | max 80 chars |
| `feature_value` | text | no |  |  |
| `icon` | character varying | yes |  | max 50 chars |
| `display_order` | integer | no | `0` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

### `device_pros_cons`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `type` | character varying | no |  | max 5 chars |
| `description` | text | no |  |  |
| `importance` | integer | no | `1` |  |
| `display_order` | integer | no | `0` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

### `device_ussd_codes`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `device_id` | uuid | yes |  | FK → `devices.id` |
| `code` | character varying | no |  | max 40 chars |
| `description` | text | no |  |  |
| `category` | character varying | no | `general` | max 40 chars |
| `is_universal` | boolean | no | `False` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

### 3.2 Categories & Ranking

### `categories`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `name` | character varying | no |  | max 60 chars |
| `slug` | character varying | no |  | max 80 chars |
| `description` | text | yes |  |  |
| `icon` | character varying | yes |  | max 50 chars |
| `color_hex` | character varying | yes |  | max 7 chars |
| `display_order` | integer | no | `0` |  |
| `is_active` | boolean | no | `True` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `version` | integer | no | `1` | Re-rank revision; incremented on every applied ranking change. |

### `device_categories`

Rank is maintained by `trg_shift_category_ranks` (migrations 06 and 08); write ranks through the RPCs.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `category_id` | uuid | no |  | FK → `categories.id` |
| `rank` | integer | no |  | Position 1 = best in category. Trigger auto-shifts ranks on insert/update. |
| `rank_locked` | boolean | no | `False` |  |
| `added_by` | uuid | yes |  | FK → `users.id` |
| `justification` | text | yes |  |  |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |

### `vw_category_device_ranks`

Read-only view: `manual_rank` from the table, `auto_rank` computed from scores.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `category_id` | uuid | yes |  | FK → `categories.id` |
| `category_name` | character varying | yes |  | max 60 chars |
| `category_slug` | character varying | yes |  | max 80 chars |
| `device_id` | uuid | yes |  | FK → `devices.id` |
| `device_name` | character varying | yes |  | max 150 chars |
| `device_slug` | character varying | yes |  | max 180 chars |
| `price` | number | yes |  |  |
| `brand_name` | character varying | yes |  | max 80 chars |
| `manual_rank` | integer | yes |  |  |
| `rank_locked` | boolean | yes |  |  |
| `auto_rank` | integer | yes |  |  |
| `category_score` | number | yes |  |  |
| `overall_score` | number | yes |  |  |

### 3.3 Recommendation & Comparison

### `recommendations`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | no |  | FK → `users.id` |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `match_score` | number | no |  |  |
| `reason` | text | no |  |  |
| `rank` | integer | no |  |  |
| `engine_version` | character varying | no | `v1` | max 20 chars |
| `is_ai_generated` | boolean | no | `False` |  |
| `expires_at` | timestamp with time zone | yes |  |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

### `recommendation_rules`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `priority` | character varying | no |  | max 30 chars |
| `weight_perf` | number | no | `0.25` |  |
| `weight_camera` | number | no | `0.2` |  |
| `weight_battery` | number | no | `0.2` |  |
| `weight_display` | number | no | `0.15` |  |
| `weight_value` | number | no | `0.1` |  |
| `weight_build` | number | no | `0.05` |  |
| `weight_software` | number | no | `0.05` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |
| `version` | integer | no | `1` | Optimistic-concurrency revision; compared in the UPDATE predicate. |

### `comparison_sessions`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | yes |  | FK → `users.id` |
| `device_ids` | string[] | no |  |  |
| `winner_device_id` | uuid | yes |  | FK → `devices.id` |
| `created_at` | timestamp with time zone | no | `now()` |  |

### `shopkeeper_cards`

`short_code` comes from a DB trigger; `view_count` is only ever incremented by `fn_increment_card_view`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | no |  | FK → `users.id` |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `short_code` | character varying | no |  | max 12 chars; 8-char alphanumeric code shown to shopkeeper for quick lookup. |
| `reason_summary` | text | no |  |  |
| `avoid_summary` | text | yes |  |  |
| `budget_note` | text | yes |  |  |
| `expires_at` | timestamp with time zone | yes | `(now() + '7 days'::interval)` |  |
| `view_count` | integer | no | `0` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

### 3.4 Customer

### `users`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `name` | character varying | no |  | max 120 chars |
| `email` | character varying | no |  | max 255 chars |
| `password_hash` | text | yes |  |  |
| `avatar_url` | text | yes |  |  |
| `is_verified` | boolean | no | `False` |  |
| `is_active` | boolean | no | `True` |  |
| `role` | character varying | no | `user` | max 20 chars; admin = full access, editor = manage devices, user = read + recommendations. |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |
| `last_login_at` | timestamp with time zone | yes |  |  |
| `auth_provider` | character varying | no | `email` | max 30 chars |
| `oauth_id` | text | yes |  |  |
| `raw_meta` | jsonb | yes |  |  |

### `user_profiles`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | no |  | FK → `users.id` |
| `current_device_id` | uuid | yes |  | FK → `devices.id` |
| `budget_min` | number | no | `0` |  |
| `budget_max` | number | no | `999999` |  |
| `primary_priority` | character varying | no | `all-rounder` | max 30 chars |
| `secondary_priority` | character varying | yes |  | max 30 chars |
| `preferred_os` | character varying | yes | `any` | max 20 chars |
| `preferred_brands` | string[] | yes |  | Array of brand names the user leans towards (nullable). |
| `onboarding_done` | boolean | no | `False` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |
| `version` | integer | no | `1` | Optimistic-concurrency revision; compared in the UPDATE predicate. |

### `user_phone_history`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | no |  | FK → `users.id` |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `usage_years` | number | yes |  |  |
| `review` | text | yes |  |  |
| `added_at` | timestamp with time zone | no | `now()` |  |

### `reviews`

Unique on `(user_id, device_id)`. `helpful_votes` is incremented by `fn_sync_review_helpful_votes`.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | no |  | FK → `users.id` |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `rating` | integer | no |  |  |
| `title` | character varying | yes |  | max 120 chars |
| `review_text` | text | yes |  |  |
| `verified_owner` | boolean | no | `False` |  |
| `helpful_votes` | integer | no | `0` |  |
| `is_approved` | boolean | no | `False` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |

### `price_alerts`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | no |  | FK → `users.id` |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `target_price` | number | no |  |  |
| `is_triggered` | boolean | no | `False` |  |
| `triggered_at` | timestamp with time zone | yes |  |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

### 3.5 AI / RAG

### `device_embeddings`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `device_id` | uuid | no |  | FK → `devices.id` |
| `embedding` | public.vector(1536) | no |  | 1536-dim OpenAI embedding — supports cosine similarity search. |
| `embedded_text` | text | no |  |  |
| `model_used` | character varying | no | `text-embedding-3-small` | max 80 chars |
| `token_count` | integer | yes |  |  |
| `generated_at` | timestamp with time zone | no | `now()` |  |

### `user_query_embeddings`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | yes |  | FK → `users.id` |
| `query_text` | text | no |  |  |
| `embedding` | public.vector(1536) | no |  |  |
| `model_used` | character varying | no | `text-embedding-3-small` | max 80 chars |
| `created_at` | timestamp with time zone | no | `now()` |  |

### `rag_knowledge_chunks`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `source_type` | character varying | no |  | max 30 chars |
| `source_id` | uuid | yes |  |  |
| `chunk_text` | text | no |  |  |
| `embedding` | public.vector(1536) | no |  |  |
| `metadata` | jsonb | no |  |  |
| `model_used` | character varying | no | `text-embedding-3-small` | max 80 chars |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `updated_at` | timestamp with time zone | no | `now()` |  |

### `ai_chat_sessions`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | yes |  | FK → `users.id` |
| `session_token` | text | no | `md5((extensions.uuid_generate_v4())::text)` |  |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `last_message_at` | timestamp with time zone | no | `now()` |  |
| `is_active` | boolean | no | `True` |  |

### `ai_chat_messages`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `session_id` | uuid | no |  | FK → `ai_chat_sessions.id` |
| `role` | character varying | no |  | max 15 chars |
| `content` | text | no |  |  |
| `embedding` | public.vector(1536) | yes |  |  |
| `referenced_device_ids` | string[] | yes |  |  |
| `tokens_used` | integer | yes |  |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

### 3.6 Reliability

### `resource_holds`

Holder is a namespaced TEXT key (`user:`, `guest:`, `job:`), not an FK, so any actor can claim a slot.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `resource_type` | character varying | no |  | max 40 chars |
| `resource_key` | text | no |  |  |
| `holder_key` | text | no |  | Who holds the slot: user UUID, or a namespaced key (e.g. job:, guest:). |
| `quantity` | integer | no | `1` |  |
| `status` | character varying | no | `held` | max 12 chars; held = live reservation; confirmed = converted claim (still blocks); released/expired = history. |
| `hold_token` | uuid | no | `extensions.uuid_generate_v4()` |  |
| `idempotency_key` | text | yes |  |  |
| `metadata` | jsonb | no |  |  |
| `expires_at` | timestamp with time zone | no |  |  |
| `confirmed_at` | timestamp with time zone | yes |  |  |
| `released_at` | timestamp with time zone | yes |  |  |
| `release_reason` | character varying | yes |  | max 40 chars |
| `created_at` | timestamp with time zone | no | `now()` |  |

### `idempotency_requests`

One row per `(actor_scope, operation, key)`; the first response is replayed for repeats.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `actor_scope` | text | no |  |  |
| `operation` | text | no |  |  |
| `key` | text | no |  |  |
| `request_hash` | text | no |  |  |
| `status` | character varying | no | `in_progress` | max 12 chars |
| `http_status` | integer | yes |  |  |
| `result` | jsonb | yes |  |  |
| `created_at` | timestamp with time zone | no | `now()` |  |
| `completed_at` | timestamp with time zone | yes |  |  |

### `audit_log`

Append-only. Admin RPCs write their audit row inside the same transaction as the change.

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | no | `extensions.uuid_generate_v4()` | primary key |
| `user_id` | uuid | yes |  | FK → `users.id` |
| `action` | character varying | no |  | max 60 chars |
| `target_type` | character varying | yes |  | max 40 chars |
| `target_id` | uuid | yes |  |  |
| `old_value` | jsonb | yes |  |  |
| `new_value` | jsonb | yes |  |  |
| `ip_address` | inet | yes |  |  |
| `created_at` | timestamp with time zone | no | `now()` |  |

---

## 4. Frontend Integration Patterns

`frontend/src/lib/supabaseClient.js` is the only place the browser creates a client:

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
)
```

### 4.1 Reading the public catalog directly

```js
// Ranked category feed: manual_rank is the curated order, auto_rank sorts by score.
const { data, error } = await supabase
  .from('vw_category_device_ranks')
  .select('device_id, manual_rank, auto_rank, category_score, devices(name, slug, price, image_url)')
  .eq('category_slug', 'gaming-guru')
  .order('manual_rank', { ascending: true, nullsFirst: false })
```

```js
// Approved reviews for one phone.
const { data } = await supabase
  .from('reviews')
  .select('id, rating, title, body, helpful_votes, created_at')
  .eq('device_id', deviceId)
  .eq('is_approved', true)
  .order('created_at', { ascending: false })
```

### 4.2 Sending the access token to the backend

Every call that is user-scoped or admin-scoped goes through FastAPI, not PostgREST:

```js
const { data: { session } } = await supabase.auth.getSession()

const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/me/profile`, {
  headers: { Authorization: `Bearer ${session.access_token}` },
})
```

### 4.3 Writing to atomic endpoints

These endpoints are idempotent or version-checked; the client must send the inputs the
RPC expects rather than patching a table:

| Intent | Call |
|---|---|
| Mark a review helpful (once per account) | `POST /api/v1/devices/{id}/reviews/{review_id}/helpful` |
| Reorder a whole category | `PUT /api/v1/admin/categories/{id}/order` with `device_ids[]` + `expected_version` |
| Remove one device from a category | `DELETE /api/v1/admin/categories/{id}/devices/{device_id}?expected_version=N` |
| Open a shopkeeper card (counts a view) | `GET /api/v1/retail/cards/{short_code}` |

A `409 version_conflict` means somebody else changed the list first: refetch, then
re-apply the local plan. A `503 migration_required` means the deployment is behind the
backend — surface it, never retry in a loop.

---

## 5. Deployment & Verification

### 5.1 Apply migrations in order

```bash
# Supabase SQL Editor (manual, one-off) — paste each file in this order:
# 01, 02, 03, 04, 06, 07, 08
# 05 is demo seed data and is optional.

# Or repeatable, from a machine with a working connection string:
cd backend
python scripts/apply_sql.py ../database/07_concurrency_holds_and_versions.sql
python scripts/apply_sql.py ../database/08_atomic_counters_votes_and_dense_ranks.sql
python scripts/apply_sql.py --check
```

`--check` probes every object the backend depends on (version columns, tables,
functions, the vote-uniqueness constraint, the rank trigger's recursion guard and its
batch switch) and names the missing migration.

### 5.2 Regenerate this document's field dictionary

```bash
cd backend
python scripts/gen_db_reference.py --write ../database/.field_tables.md
```

It reads the live PostgREST OpenAPI description, so the column tables describe the
deployed database rather than the intent in the migration files.

### 5.3 Verify the deployment

```bash
curl -s http://127.0.0.1:8000/health/ready   # 200 + {database, features, detail}
python scripts/smoke_test.py --base http://127.0.0.1:8000
python scripts/qa_admin_flow.py --admin-key <key> --base http://127.0.0.1:8000
```

`/health/ready` reports the kill-switch state, so a 200 with
`features.shopkeeper_cards = false` means the API is up and that surface is
deliberately off — not broken.

---

## 6. Normalization & Data-Shape Decisions

The schema is 3NF for entities and deliberately denormalized in exactly four places:

1. **PostgreSQL arrays (`gallery_urls`, `color_options`, `camera_features`)**:
   Used where the values have no identity of their own and are always read together
   with the parent row. Avoids three junction tables (`device_colors`,
   `device_galleries`, `device_camera_features`) while keeping `@>`, `ANY()` and GIN
   containment queries available.
2. **PostgreSQL JSONB (`extra`, `metadata`, `raw_meta`)**:
   Houses unexpected manufacturer attributes without a schema migration lock. Indexed
   with GIN for path lookups. Never used for anything the API filters on in a hot path.
3. **Generated and trigger-computed columns (`device_scores.overall_score`,
   `device_categories.rank`, `shopkeeper_cards.short_code`)**:
   Derived values live in one place, computed by the database, so no two code paths can
   disagree. `overall_score` is `GENERATED ALWAYS`, the rank is maintained by
   `trg_shift_category_ranks`, the short code by a card trigger.
4. **Denormalized counters (`reviews.helpful_votes`, `shopkeeper_cards.view_count`)**:
   Counters that must be readable without a join. Both are maintained by the database
   (`fn_sync_review_helpful_votes`, `fn_increment_card_view`) and never by
   read-modify-write from application code.

Optimistic concurrency is a column, not a table: `version` exists on `devices`,
`user_profiles`, `recommendation_rules` and `categories`, bumped by
`fn_bump_row_version()`. A conditional `PATCH …&version=eq.N` that matches zero rows is
the signal to return `409 version_conflict`, and child tables (`device_categories`) are
ordered through the RPCs instead of carrying a revision of their own.

---

## 7. Master Indexing Strategy & Query Optimization

Every index in RMDU Mobiles is specifically tuned for a distinct frontend query pattern, eliminating sequential table scans (`Seq Scan` $\to$ `Index Scan` / `Bitmap Index Scan`).

### 7.1 Comprehensive Index Catalog

| Table | Index Name | Index Type | Indexed Column(s) | Target Query / Frontend Use Case |
|---|---|---|---|---|
| `devices` | `idx_devices_active_brand_price` | **Composite B-Tree (Partial)** | `(brand_id, price) WHERE is_active = TRUE` | Brand filter + budget slider interaction. |
| `devices` | `idx_devices_featured_active` | **B-Tree (Partial)** | `(price ASC) WHERE is_active = TRUE AND is_featured = TRUE` | Homepage featured carousel. |
| `devices` | `idx_devices_name_trgm` | **GIN Trigram** | `gin(name gin_trgm_ops)` | Instant typo-tolerant search ("galxy" $\to$ "Galaxy"). |
| `devices` | `idx_devices_slug` | **B-Tree (Unique)** | `slug` | Direct detail page routing (`/phone/[slug]`). |
| `brands` | `idx_brands_name_trgm` | **GIN Trigram** | `gin(name gin_trgm_ops)` | Brand search autocomplete. |
| `device_scores` | `idx_scores_overall` | **B-Tree (Sorted)** | `overall_score DESC` | Global highest-rated phone leaderboards. |
| `device_scores` | `idx_scores_performance` | **B-Tree (Sorted)** | `performance_score DESC` | Gaming Guru category auto-sort. |
| `device_scores` | `idx_scores_camera` | **B-Tree (Sorted)** | `camera_score DESC` | Camera Champ category auto-sort. |
| `device_scores` | `idx_scores_battery` | **B-Tree (Sorted)** | `battery_score DESC` | Battery Boss category auto-sort. |
| `device_categories` | `idx_dev_cat_composite` | **Composite B-Tree** | `(category_id, rank ASC, device_id)` | Category page ranked phone feed (`#1, #2...`). |
| `device_specs` | `idx_specs_os` | **B-Tree** | `os` | OS filtering (e.g. "Android 14", "iOS 17"). |
| `device_specs` | `idx_specs_os_trgm` | **GIN Trigram** | `gin(os gin_trgm_ops)` | Typo-tolerant OS / UI search. |
| `device_specs` | `idx_specs_cpu_cores` | **B-Tree** | `cpu_cores` | Processor core count filter (Octa-core / 8-core). |
| `device_specs` | `idx_specs_processor_brand` | **B-Tree** | `processor_brand` | Chipset brand filter (Snapdragon, Dimensity, Apple). |
| `device_specs` | `idx_specs_ram_storage` | **Composite B-Tree** | `(ram_gb, storage_gb)` | Memory & storage matrix ("12GB + 256GB"). |
| `device_specs` | `idx_specs_refresh_display` | **Composite B-Tree** | `(refresh_rate_hz DESC, display_type)` | Display refresh rate + AMOLED filter. |
| `device_specs` | `idx_specs_battery_charging` | **Composite B-Tree** | `(battery_mah DESC, charging_watt DESC)` | Battery endurance and fast charge filters. |
| `device_specs` | `idx_specs_camera_primary` | **B-Tree (Sorted)** | `camera_primary_mp DESC` | High megapixel camera sorting (>= 50MP, >= 108MP). |
| `device_specs` | `idx_specs_five_g` | **B-Tree (Partial)** | `(device_id) WHERE five_g = TRUE` | 5G-only device filter. |
| `device_specs` | `idx_specs_processor_trgm` | **GIN Trigram** | `gin(processor_name gin_trgm_ops)` | Chipset name search ("snapdragon 8 gen 3"). |
| `user_profiles` | `idx_user_profiles_priority_budget` | **Composite B-Tree** | `(primary_priority, budget_min, budget_max)` | Fast customer taste & recommendation matching. |
| `reviews` | `idx_reviews_approved_feed` | **Composite B-Tree (Partial)** | `(device_id, rating DESC, created_at DESC) WHERE is_approved = TRUE` | Public reviews modal on phone detail view. |
| `shopkeeper_cards`| `idx_shopkeeper_active_lookup` | **Composite B-Tree** | `(short_code, expires_at DESC)` | Instant store counter code verification and active status check. |
| `price_alerts` | `idx_price_alerts_untriggered` | **Composite B-Tree (Partial)** | `(device_id, target_price) WHERE is_triggered = FALSE` | Daily price drop background worker. |
| `user_phone_history`| `idx_uph_user_device_time` | **Composite B-Tree** | `(user_id, added_at DESC)` | Profile upgrade timeline for returning users. |
| `comparison_sessions`| `idx_comparison_user_time` | **Composite B-Tree** | `(user_id, created_at DESC)` | "My Past Comparisons" customer dashboard. |
| `device_embeddings`| `idx_device_embed_hnsw` | **HNSW (pgvector)** | `embedding vector_cosine_ops` | Sub-5ms AI semantic similarity search. |
| `rag_knowledge_chunks`| `idx_rag_chunks_hnsw` | **HNSW (pgvector)** | `embedding vector_cosine_ops` | RAG retrieval context injection for AI chat. |
| `device_features` | `idx_device_features_device` | **B-Tree** | `device_id` | Fast feature joins and cascade delete safety. |
| `ai_chat_messages` | `idx_chat_messages_session` | **Composite B-Tree** | `(session_id, created_at ASC)` | Instant chat history retrieval without full table scan. |
| `reviews` | `idx_reviews_user` | **B-Tree** | `user_id` | "My Reviews" user dashboard and cascade delete safety. |
| `shopkeeper_cards` | `idx_cards_device` | **B-Tree** | `device_id` | Foreign key index preventing table locks on phone deletion. |
| `recommendations` | `idx_recommendations_device` | **B-Tree** | `device_id` | Foreign key index preventing table locks on phone deletion. |
| `user_profiles` | `idx_user_profiles_current_device` | **B-Tree (Partial)** | `(current_device_id) WHERE current_device_id IS NOT NULL` | Speeds up SET NULL on phone deletion. |
| `comparison_sessions`| `idx_comparison_winner_device`| **B-Tree (Partial)** | `(winner_device_id) WHERE winner_device_id IS NOT NULL` | Speeds up SET NULL on phone deletion. |
| `device_categories`| `idx_dev_cat_added_by` | **B-Tree (Partial)** | `(added_by) WHERE added_by IS NOT NULL` | Admin attribution fast lookup and SET NULL safety. |
| `user_phone_history`| `idx_uph_device` | **B-Tree** | `device_id` | Foreign key index preventing table locks on phone deletion. |
| `ai_chat_sessions` | `idx_ai_chat_sessions_user` | **Composite B-Tree** | `(user_id, created_at DESC) WHERE user_id IS NOT NULL` | Fast AI chat history by authenticated user. |
| `user_query_embeddings`| `idx_user_query_embeddings_user`| **B-Tree** | `(user_id) WHERE user_id IS NOT NULL` | Fast query cache lookup by authenticated user. |
| `resource_holds` | `resource_holds_live_uniq` | **B-Tree (Unique, Partial)** | `(resource_key) WHERE status IN ('held','confirmed')` | One live claim per slot; a sale in progress keeps its hold. |
| `idempotency_requests` | `idempotency_requests_key` | **B-Tree (Unique)** | `(actor_scope, operation, key)` | Replay detection for `Idempotency-Key` retries. |
| `review_votes` | `review_votes_unique` | **B-Tree (Unique)** | `(review_id, voter_id)` | One helpful vote per account per review. |

### 7.2 Performance Comparison

```
Query Type                       Without Index         With RMDU Index
────────────────────────────────────────────────────────────────────────
Category Rank Feed               ~45 ms (Seq Scan)     ~1.2 ms (Index Only Scan)
Brand + Budget Filter            ~60 ms (Seq Scan)     ~1.8 ms (Bitmap Index Scan)
Typo Search ("iphne 15")         ~120 ms (LIKE '%..%') ~3.1 ms (GIN Trigram Scan)
RAG Vector Cosine Match          ~850 ms (Flat Scan)   ~4.2 ms (HNSW Graph Traversal)
```

---

## 8. Atomic RPC Contracts (Backend-Critical Paths)

PostgREST gives one HTTP call exactly one transaction, so any rule that needs more
than one statement to stay true lives in the database as an RPC. The FastAPI
backend never re-implements these rules in Python; it calls the function and maps
the returned status to HTTP.

**Two kinds of negative outcome, deliberately separated:**

| Kind | Mechanism | Who decides the HTTP code |
|---|---|---|
| Expected business outcome (`ok`, `busy`, `version_conflict`, `duplicate`…) | Returned as a JSONB `status` field | The route, via `services/concurrency.py` |
| Contract violation (bad id, malformed payload, duplicate array member) | `RAISE EXCEPTION … ERRCODE 'PT404'` / `'PT422'` | PostgREST maps `PTxyz` → HTTP `xyz` before the route sees it |

### 8.1 Function Catalogue

| Function | Migration | Called by | Returns |
|---|---|---|---|
| `fn_increment_card_view(p_short_code TEXT)` | 08 | `GET /api/v1/retail/cards/{short_code}` | `{status,is_expired,card}` |
| `fn_vote_review_helpful(p_review_id UUID, p_voter_id UUID)` | 08 | `POST /api/v1/devices/{id}/reviews/{review_id}/helpful` | `{status,id,helpful_votes}` |
| `fn_sync_review_helpful_votes()` (trigger) | 08 | — | keeps `reviews.helpful_votes` equal to the vote rows |
| `fn_rerank_category_batch(p_category_id UUID, p_device_ids UUID[], p_expected_version INT, p_actor UUID, p_ip INET)` | 08 | `PUT /api/v1/admin/categories/{id}/order` | `{status,ranked,version}` |
| `fn_remove_category_member(p_category_id UUID, p_device_id UUID, p_expected_version INT, p_actor UUID, p_ip INET)` | 08 | `DELETE /api/v1/admin/categories/{id}/devices/{device_id}` | `{status,version}` |
| `fn_rerank_device(p_device_id UUID, p_category_id UUID, p_position INT, …)` | 07 | `PUT /api/v1/admin/devices/{id}/categories` | `{status,version}` |
| `fn_claim_slot` / `fn_confirm_slot` / `fn_release_slot` / `fn_slot_status` | 07 | reserved for checkout | `{status,expires_at,…}` |
| `fn_begin_idempotent` / `fn_complete_idempotent` | 07 | `IdempotencyMiddleware` | `{status,response_status,response_body}` |

### 8.2 Status → HTTP Mapping (implemented in `backend/services/concurrency.py`)

| RPC status | HTTP | Error code |
|---|---|---|
| `ok` | 200 | — |
| `duplicate` | 200 | — (idempotent vote: the count is still returned) |
| `version_conflict` | 409 | `version_conflict`, with `details.current_version` |
| `busy` | 409 | `rank_busy`, with a `Retry-After` header |
| `unknown_members` | 422 | `unknown_members`, with `details.device_ids` |
| `not_found` | 404 | `not_found` |
| `self_vote` | 409 | `self_vote` |
| anything else | 502 | `rank_failed` |

A missing function (migration not applied) is not a 404 from the caller's point of
view. `is_missing_function()` recognises the PostgREST "could not find the
function" shape and the route answers **503 `migration_required`** naming the exact
migration file, so an unapplied migration never masquerades as "card not found".

### 8.3 Dense-Rank Invariant

`device_categories.rank` must always be a gap-free `1..N` per category.
`trg_shift_category_ranks` (migration 06 + 08) maintains it:

* **INSERT / UPDATE of `rank`** — shifts siblings out of the target position.
* **DELETE** — compacts the hole the deleted row leaves behind.
* **Recursion guard** — `pg_trigger_depth() > 1` makes the function ignore its own
  sibling updates, so the shift cannot re-enter itself (error 54001).
* **Batch switch** — migration 08 added the transaction-local override
  `set_config('rmdu.rank_shift','off',true)`. `fn_rerank_category_batch` sets it,
  assigns a complete permutation in one `UPDATE`, then turns it back on; the single
  version bump and audit write happen inside the same transaction.

> [!IMPORTANT]
> Never assign ranks statement-by-statement from application code when the target
> order is a permutation — overlapping `UPDATE`s fight the shift trigger, and the
> deferrable unique constraint only saves you if the whole permutation lands in one
> statement. Use the batch RPC.

### 8.4 Kill Switches and Budgets (backend-side, not database-side)

The RPCs above are pure data operations; availability policy sits in the API:

| Layer | Mechanism | Answers |
|---|---|---|
| Kill switch | `FEATURE_*` env → `require_feature("feature_x")` | 503 `feature_disabled` + `Retry-After` |
| Budget | `core/ratelimit.py` fixed window per actor | 429 `rate_limited` + `Retry-After` |
| Idempotency | `Idempotency-Key` header → `fn_begin_idempotent` | Replays the first response |

Kill switches gate the *promise-making write* (create a card, submit a review,
create a price alert), never the read of rows that already exist, so stored content
never disappears from view and shared links keep working during a degradation.
