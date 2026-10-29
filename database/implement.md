# RMDU Database — Implementation Guide
> Version 2.0.0 | PostgreSQL 15+ | pgvector required

---

## Quick Setup

```bash
# 1. Create the database
createdb rmdu_mobiles

# 2. Install pgvector extension (once per server)
sudo apt install postgresql-15-pgvector   # Ubuntu/Debian
# OR: brew install pgvector               # macOS

# 3. Apply the schema in numbered order:
# Step 1: Base Schema (Devices, Specs, Scores, Categories)
psql -U postgres -d rmdu_mobiles -f 01_mobilemart_schema.sql

# Step 2: Google OAuth Sync, Customer History Tracking & RLS Policies
psql -U postgres -d rmdu_mobiles -f 02_google_oauth_customer_sync.sql

# Step 3: Normalization Checks, Advanced Composite Indexes & GIN Trigram Search
psql -U postgres -d rmdu_mobiles -f 03_normalization_and_indexes.sql

# Step 4: Universal RLS Enforcement, 11 Foreign Key Indexes & Domain Checks
psql -U postgres -d rmdu_mobiles -f 04_complete_rls_and_fk_indexes.sql

# Step 5: Recursion guard for the rank trigger (required — fixes error 54001)
psql -U postgres -d rmdu_mobiles -f 06_fix_category_rank_trigger.sql

# Step 6: Version columns, transactional re-rank RPC, resource holds, idempotency
# Apply BEFORE deploying the backend that selects devices.version
psql -U postgres -d rmdu_mobiles -f 07_concurrency_holds_and_versions.sql

# Step 7: Atomic card views, one-vote-per-account, dense-rank compaction and
# batch reorder. Apply BEFORE deploying the backend that calls those RPCs.
psql -U postgres -d rmdu_mobiles -f 08_atomic_counters_votes_and_dense_ranks.sql

# Step 8 (Optional - Demo Testing Only): Sample phones, specs & category rankings
# NOTE: 05_seed_catalog_phones.sql still targets brands.slug, which the live schema
# does not have — it aborts on the first INSERT. Seed through POST /admin/brands and
# POST /admin/devices instead until the seed is reconciled.
# psql -U postgres -d rmdu_mobiles -f 05_seed_catalog_phones.sql

# 4. Verify
psql -U postgres -d rmdu_mobiles -c "\dt"

# Or let the backend check itself (names the migration you are missing):
cd ../backend
python scripts/apply_sql.py --check
```

> [!IMPORTANT]
> pgvector must be installed on the OS **before** running the schema.
> The `CREATE EXTENSION IF NOT EXISTS "vector"` line will fail silently if not installed.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      RMDU DATABASE                       │
├──────────────┬──────────────┬───────────┬────────────────┤
│  USER SYSTEM │DEVICE SYSTEM │ CATEGORY  │ RAG / GenAI    │
│              │              │ RANKING   │                │
│  users       │ brands       │categories │device_embeddings│
│  user_profiles│ devices     │device_    │rag_knowledge_  │
│  user_phone_ │ device_specs │categories │chunks          │
│  history     │ device_scores│(trigger)  │user_query_     │
│              │ device_pros_ │           │embeddings      │
│              │ cons         │           │ai_chat_sessions│
│              │ device_ussd  │           │ai_chat_messages│
├──────────────┴──────────────┴───────────┴────────────────┤
│     RECOMMENDATION ENGINE │ COMPARISON │ SHOPKEEPER CARD │
│  recommendations           │comparison_ │shopkeeper_cards │
│  recommendation_rules      │sessions    │                 │
│  fn_compute_match_score()  │            │                 │
│  fn_get_top_recommendations│            │                 │
├─────────────────────────────────────────────────────────┤
│         REVIEWS │ PRICE ALERTS │ AUDIT LOG               │
│  reviews        │price_alerts  │audit_log               │
└─────────────────────────────────────────────────────────┘
```

---

## Table Reference

| Table | Purpose | Key Column |
|---|---|---|
| `users` | Auth — every account | `email` (unique) |
| `user_profiles` | Preferences, budget, priority | `primary_priority` |
| `user_phone_history` | Last 2–3 phones owned | `device_id`, `usage_years` |
| `brands` | Phone manufacturers | `name` |
| `devices` | Master phone registry | `slug`, `price`, `embedding` |
| `device_specs` | Full technical specs | 40+ columns |
| `device_scores` | 0–100 scores, auto-computed `overall_score` | `overall_score` (generated) |
| `device_pros_cons` | Pros & cons per phone | `type` ('pro'\|'con') |
| `device_features` | Key-value highlights | `feature_name`, `feature_value` |
| `device_ussd_codes` | USSD + hidden codes | `code`, `is_universal` |
| `categories` | 5 signature categories | `slug` |
| `device_categories` | Dynamic ranked list | `rank` (trigger-managed) |
| `recommendations` | Pre-computed picks per user | `match_score`, `rank` |
| `recommendation_rules` | Score weights per priority | `weight_*` columns |
| `comparison_sessions` | Tracks compare events | `device_ids[]` |
| `shopkeeper_cards` | Shareable offline card | `short_code` (8-char) |
| `reviews` | Owner reviews | `rating`, `verified_owner` |
| `price_alerts` | Target price notifications | `target_price` |
| `audit_log` | Immutable admin action log | `action`, `old_value`, `new_value` |
| `device_embeddings` | RAG: device semantic vectors | `embedding VECTOR(1536)` |
| `user_query_embeddings` | RAG: user query cache | `embedding VECTOR(1536)` |
| `rag_knowledge_chunks` | RAG: chunked knowledge base | `source_type`, `chunk_text` |
| `ai_chat_sessions` | AI chat session tracker | `session_token` |
| `ai_chat_messages` | Full conversation history | `role`, `content`, `embedding` |

Added by the concurrency and atomicity migrations (not part of the original 24):

| Table | Migration | Purpose | Invariant |
|---|---|---|---|
| `resource_holds` | 07 | Expiring claims on a scarce slot | one live (`held`/`confirmed`) row per `resource_key` |
| `idempotency_requests` | 07 | First response per `(actor_scope, operation, key)` | replayed instead of re-executed |
| `review_votes` | 08 | One helpful vote per account per review | `UNIQUE (review_id, voter_id)` |

---

## Dynamic Ranking System

### How It Works

Ranks are stored as **dense integers** (1, 2, 3...) in `device_categories.rank`.

When you insert a device at rank 3, the trigger **automatically shifts** all existing rows ≥ 3 upward:

```sql
-- This is handled automatically by trg_shift_category_ranks
INSERT INTO device_categories (device_id, category_id, rank)
VALUES ('uuid-of-phone', 'uuid-of-gaming-guru', 3);
-- Result: old rank 3 → 4, old rank 4 → 5, etc.
```

### Moving a Device Up/Down

```sql
-- Move a device to rank 1 (top spot)
UPDATE device_categories
SET rank = 1
WHERE device_id = 'uuid' AND category_id = 'uuid-gaming-guru';
-- Trigger handles all other shifts automatically
```

> [!WARNING]
> Do not drive a **whole** reorder from the client one `UPDATE` at a time. Each of
> those statements fights the shift trigger, and the deferrable unique constraint only
> protects you when the entire permutation lands in one statement. Use the RPCs:
>
> ```sql
> -- Reorder every member of a category in one transaction
> SELECT fn_rerank_category_batch(
>     'category-uuid',
>     ARRAY['device-a-uuid', 'device-b-uuid']::uuid[],
>     7                          -- expected categories.version, NULL to skip the check
> );
>
> -- Remove one member; the trigger compacts the ranks behind it
> SELECT fn_remove_category_member('category-uuid', 'device-uuid', 7);
> ```
>
> Both return a JSONB status (`ok`, `version_conflict`, `busy`, `unknown_members`) and
> write their audit row in the same transaction. The HTTP mapping for each status is
> documented in `DYNAMIC_DATABASE_API_REFERENCE.md` §8.2.

### What the Trigger Does Now (migrations 06 + 08)

| Event | Behaviour |
|---|---|
| `INSERT` / `UPDATE OF rank` | shifts siblings out of the target position |
| `DELETE` | compacts the gap the deleted row leaves |
| Own sibling updates | ignored (`pg_trigger_depth() > 1`) — this is what fixed error 54001 |
| Inside `fn_rerank_category_batch` | suppressed entirely via `set_config('rmdu.rank_shift','off', true)` |

### Dynamic (Score-Based) Ranking

Use the view when you want **auto-ranking by score** instead of manual order:

```sql
SELECT * FROM vw_category_device_ranks
WHERE  category_slug = 'gaming-guru'
ORDER BY auto_rank;
```

| Column | Meaning |
|---|---|
| `manual_rank` | Admin-set position (trigger-managed) |
| `auto_rank` | Score-based position (computed on-the-fly) |
| `category_score` | Relevant score for that category |

> [!TIP]
> Use `manual_rank` for your curated homepage. Use `auto_rank` for API endpoints that need to stay current with score updates.

---

## Recommendation Engine

### Scoring Formula (configurable per priority)

```
match_score =
  performance_score × weight_perf   +
  camera_score      × weight_camera +
  battery_score     × weight_battery +
  display_score     × weight_display +
  value_score       × weight_value  +
  build_score       × weight_build  +
  software_score    × weight_software
```

Default weights in `recommendation_rules`:

| Priority | Perf | Camera | Battery | Display | Value |
|---|---|---|---|---|---|
| gaming | **0.40** | 0.10 | 0.20 | 0.15 | 0.05 |
| camera | 0.15 | **0.40** | 0.15 | 0.15 | 0.05 |
| battery | 0.15 | 0.10 | **0.45** | 0.10 | 0.10 |
| value | 0.20 | 0.15 | 0.20 | 0.15 | **0.20** |
| all-rounder | 0.25 | 0.20 | 0.20 | 0.15 | 0.10 |

> [!IMPORTANT]
> Weights **must sum to exactly 1.00** — enforced by a CHECK constraint.
> Admins can update weights in `recommendation_rules` without any code change.

### Get Top Picks for a User (SQL)

```sql
SELECT * FROM fn_get_top_recommendations('user-uuid-here', 5);
```

### Get Match Score for One Device

```sql
SELECT fn_compute_match_score('user-uuid', 'device-uuid');
```

---

## RAG / GenAI Integration

### Architecture

```
User Query (text)
       │
       ▼
  Embed query → VECTOR(1536)   [OpenAI / local model]
       │
       ▼
  Cosine similarity search on:
  ├── device_embeddings         (full device profile vectors)
  └── rag_knowledge_chunks      (chunked specs, reviews, FAQs)
       │
       ▼
  Top-K relevant chunks retrieved
       │
       ▼
  Injected as context into LLM prompt  →  Answer
```

### Similarity Search Query

```sql
-- Find top 5 devices most similar to "best phone for PUBG on budget"
SELECT
    d.name,
    d.price,
    1 - (de.embedding <=> $1::vector) AS similarity
FROM   device_embeddings de
JOIN   devices d ON d.id = de.device_id
ORDER BY de.embedding <=> $1::vector  -- cosine distance (ANN via HNSW)
LIMIT  5;
-- $1 = the query embedding (1536-dim float array from your embedding API)
```

### RAG Knowledge Chunk Search

```sql
-- Retrieve most relevant knowledge chunks for a user query
SELECT chunk_text, metadata, source_type
FROM   rag_knowledge_chunks
ORDER BY embedding <=> $1::vector
LIMIT  10;
```

### Embedding Models Supported

| Model | Dimensions | Notes |
|---|---|---|
| `text-embedding-3-small` | 1536 | ✅ Default — cheap, fast |
| `text-embedding-3-large` | 3072 | Better quality, change VECTOR dim |
| `sentence-transformers/all-MiniLM-L6-v2` | 384 | Free, local, change VECTOR dim |

> [!NOTE]
> If you switch models, change `VECTOR(1536)` to match the new dimension in `device_embeddings`, `user_query_embeddings`, `rag_knowledge_chunks`, and `ai_chat_messages`.

---

## Seeding Your First Phone (Step-by-Step)

```sql
BEGIN;

-- Step 1: Add brand
INSERT INTO brands (name, country) VALUES ('Samsung', 'South Korea')
RETURNING id;  -- copy the uuid

-- Step 2: Add device
INSERT INTO devices (brand_id, name, slug, price)
VALUES ('brand-uuid', 'Samsung Galaxy S24', 'samsung-galaxy-s24', 79999)
RETURNING id;  -- copy the uuid

-- Step 3: Add specs
INSERT INTO device_specs (device_id, processor_name, ram_gb, battery_mah, ...)
VALUES ('device-uuid', 'Snapdragon 8 Gen 3', 8, 4000, ...);

-- Step 4: Add scores
INSERT INTO device_scores (device_id, performance_score, camera_score, battery_score,
                           display_score, value_score, build_score, software_score)
VALUES ('device-uuid', 92, 88, 75, 90, 65, 95, 85);

-- Step 5: Add to a category at rank 1
INSERT INTO device_categories (device_id, category_id, rank)
VALUES ('device-uuid', 'goat-category-uuid', 1);
-- Trigger shifts any existing rank 1 → 2 automatically

-- Step 6: Add pros/cons
INSERT INTO device_pros_cons (device_id, type, description, importance)
VALUES
  ('device-uuid', 'pro', 'Best-in-class display with 2600 nit peak brightness', 5),
  ('device-uuid', 'con', 'Heating under sustained gaming load', 4);

COMMIT;
```

---

## Performance Tuning

### Key Indexes Already in Schema

| Index | Purpose |
|---|---|
| `idx_scores_overall` | Fast `ORDER BY overall_score DESC` |
| `idx_dev_cat_category` | Fast category + rank lookups |
| `idx_device_embed_hnsw` | HNSW ANN search for RAG (cosine) |
| `idx_rag_chunks_hnsw` | HNSW ANN search on knowledge chunks |
| `idx_devices_fts` | Full-text search on device names |
| `idx_devices_trgm` | Fuzzy slug search (typo-tolerant) |

### Future Scaling

```bash
# Add Redis for caching top recommendations
# (invalidate on device_scores update or user_profile change)

# Add ElasticSearch for advanced faceted search
# (price range + brand filter + spec filter simultaneously)
```

---

## Shopkeeper Card Flow

```
1. User completes onboarding → gets top recommendation
2. User clicks "Generate Shopkeeper Card"
3. Backend creates shopkeeper_cards row with short_code (e.g. "A3F9B2C1")
4. Card shows: phone name, reason, "avoid if", budget note
5. User shows short_code in store
6. Shopkeeper opens rmdu.app/card/A3F9B2C1 → sees full card
```

---

## Environment Variables Required (Backend)

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/rmdu_mobiles
OPENAI_API_KEY=sk-...          # for embeddings + AI chat
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

---

## Checklist Before Going Live

- [ ] `pgvector` extension installed on production server
- [ ] All `recommendation_rules` seeded (done in schema)
- [ ] All `categories` seeded (done in schema)
- [ ] At least 20 devices seeded with scores
- [ ] Device embeddings generated via embedding API
- [ ] RAG knowledge chunks created for all devices
- [ ] `users.password_hash` using bcrypt (min 12 rounds)
- [ ] `VECTOR` dimension matches your chosen embedding model
- [ ] Redis caching connected to `recommendations` table
- [ ] Admin role user created (`role = 'admin'`)
