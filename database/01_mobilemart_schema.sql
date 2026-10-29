-- =============================================================================
-- RMDU MOBILES — INDUSTRY-LEVEL POSTGRESQL DATABASE SCHEMA
-- Version     : 2.1.0  (Supabase-compatible)
-- Created     : 2026-03-23
-- Description : Smart Mobile Recommendation + Reference System
--               Supports: User Intelligence, Device Intelligence,
--               Recommendation Engine, Dynamic Ranking, RAG / GenAI (pgvector)
-- Target      : Supabase (PostgreSQL 15+)
-- =============================================================================

-- ─────────────────────────────────────────────
--  EXTENSIONS (required before any table)
--  Note: In Supabase, enable these via Dashboard → Database → Extensions
--  before running this SQL, OR use CREATE EXTENSION as below.
-- ─────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID primary keys
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- password hashing
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector → RAG / GenAI embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- trigram → fuzzy search

-- =============================================================================
-- 1. USER SYSTEM
-- =============================================================================

-- ─────────────────────────────────────────────
--  1.1  users
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,          -- bcrypt via pgcrypto
    avatar_url      TEXT,
    is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    role            VARCHAR(20) NOT NULL DEFAULT 'user'   -- 'user' | 'admin' | 'editor'
                    CHECK (role IN ('user', 'admin', 'editor')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at   TIMESTAMPTZ
);

COMMENT ON TABLE  users IS 'Core authentication table for all RMDU users.';
COMMENT ON COLUMN users.role IS 'admin = full access, editor = manage devices, user = read + recommendations.';

-- ─────────────────────────────────────────────
--  1.2  user_profiles  (1-to-1 with users)
-- ─────────────────────────────────────────────
CREATE TABLE user_profiles (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_device_id   UUID,                       -- FK added below after devices table
    budget_min          NUMERIC(10,2) NOT NULL DEFAULT 0,
    budget_max          NUMERIC(10,2) NOT NULL DEFAULT 999999,
    primary_priority    VARCHAR(30) NOT NULL DEFAULT 'all-rounder'
                        CHECK (primary_priority IN (
                            'gaming', 'camera', 'battery', 'value', 'all-rounder'
                        )),
    secondary_priority  VARCHAR(30)
                        CHECK (secondary_priority IS NULL OR secondary_priority IN (
                            'gaming', 'camera', 'battery', 'value', 'all-rounder'
                        )),
    preferred_os        VARCHAR(20) DEFAULT 'any'   -- 'android' | 'ios' | 'any'
                        CHECK (preferred_os IN ('android', 'ios', 'any')),
    preferred_brands    TEXT[],                     -- ['Samsung', 'Xiaomi']
    onboarding_done     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  user_profiles IS 'Extended preference profile used by the recommendation engine.';
COMMENT ON COLUMN user_profiles.preferred_brands IS 'Array of brand names the user leans towards (nullable).';

-- ─────────────────────────────────────────────
--  1.3  user_phone_history  (up to last N phones)
-- ─────────────────────────────────────────────
CREATE TABLE user_phone_history (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id   UUID        NOT NULL,               -- FK added below
    usage_years NUMERIC(3,1),                       -- e.g. 1.5 years
    review      TEXT,
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_phone_history IS 'Stores last 2–3 phones per user to infer upgrade patterns.';

-- =============================================================================
-- 2. DEVICE SYSTEM
-- =============================================================================

-- ─────────────────────────────────────────────
--  2.1  brands
-- ─────────────────────────────────────────────
CREATE TABLE brands (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(80) NOT NULL UNIQUE,
    logo_url    TEXT,
    country     VARCHAR(60),
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  2.2  devices  (master phone registry)
-- ─────────────────────────────────────────────
CREATE TABLE devices (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id        UUID        NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
    name            VARCHAR(150) NOT NULL,
    model_number    VARCHAR(80),
    slug            VARCHAR(180) NOT NULL UNIQUE,   -- URL-safe identifier e.g. 'samsung-galaxy-s24'
    launch_date     DATE,
    price           NUMERIC(10,2) NOT NULL,
    currency        VARCHAR(5)  NOT NULL DEFAULT 'INR',
    image_url       TEXT,
    gallery_urls    TEXT[],                         -- multiple images
    color_options   TEXT[],
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    is_featured     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ── RAG / GenAI: dense vector embedding of device profile (1536-dim for OpenAI)
    embedding       VECTOR(1536),

    -- ── Flexible overflow for future fields
    extra           JSONB       NOT NULL DEFAULT '{}'
);

COMMENT ON TABLE  devices  IS 'Central device registry — every phone in the system lives here.';
COMMENT ON COLUMN devices.slug IS 'Lowercase hyphenated unique identifier used in URLs.';
COMMENT ON COLUMN devices.embedding IS 'pgvector: semantic embedding of device for RAG similarity search.';
COMMENT ON COLUMN devices.extra IS 'JSONB bucket for any future fields without schema migration.';

-- ─────────────────────────────────────────────
--  2.3  device_specs
-- ─────────────────────────────────────────────
CREATE TABLE device_specs (
    id                  UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id           UUID    NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,

    -- Processor
    processor_name      VARCHAR(120),
    processor_brand     VARCHAR(60),
    process_node        VARCHAR(20),    -- e.g. '4nm', '3nm'
    cpu_cores           SMALLINT,
    cpu_max_freq_ghz    NUMERIC(4,2),
    gpu_name            VARCHAR(80),
    antutu_score        INTEGER,        -- benchmark
    geekbench_single    INTEGER,
    geekbench_multi     INTEGER,

    -- Memory
    ram_gb              SMALLINT,
    storage_gb          SMALLINT,
    storage_type        VARCHAR(20),   -- 'UFS 3.1' | 'UFS 4.0' | 'NVMe'

    -- Display
    display_size_inch   NUMERIC(4,2),
    display_resolution  VARCHAR(30),   -- '2400x1080'
    display_type        VARCHAR(30),   -- 'AMOLED' | 'LCD' | 'LTPO AMOLED'
    refresh_rate_hz     SMALLINT,
    peak_brightness_nit INTEGER,
    protection          VARCHAR(40),   -- 'Gorilla Glass Victus 2'

    -- Camera
    camera_primary_mp   NUMERIC(6,2),
    camera_ultra_mp     NUMERIC(6,2),
    camera_tele_mp      NUMERIC(6,2),
    camera_front_mp     NUMERIC(6,2),
    camera_features     TEXT[],        -- ['OIS', 'Night Mode', '8K Video']
    video_max_res       VARCHAR(20),   -- '8K@30fps'

    -- Battery
    battery_mah         INTEGER,
    charging_watt       SMALLINT,      -- wired fast charge
    wireless_watt       SMALLINT,
    reverse_watt        SMALLINT,

    -- Connectivity
    five_g              BOOLEAN NOT NULL DEFAULT FALSE,
    wifi_standard       VARCHAR(20),   -- 'Wi-Fi 7'
    bluetooth_version   VARCHAR(10),
    nfc                 BOOLEAN NOT NULL DEFAULT FALSE,
    usb_type            VARCHAR(20),   -- 'USB-C 3.2'

    -- OS
    os                  VARCHAR(30),   -- 'Android 14'
    ui_layer            VARCHAR(40),   -- 'One UI 6.1'
    guaranteed_updates  SMALLINT,      -- years of OS updates

    -- Build
    weight_grams        SMALLINT,
    dimensions          VARCHAR(40),   -- '163.3 x 78.1 x 7.6 mm'
    build_material      VARCHAR(60),   -- 'Aluminium frame + Glass back'
    ip_rating           VARCHAR(10),   -- 'IP68'

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE device_specs IS 'Full technical specification sheet per device.';

-- ─────────────────────────────────────────────
--  2.4  device_scores  (THE core of recommendation engine)
-- ─────────────────────────────────────────────
CREATE TABLE device_scores (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id           UUID        NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,

    -- Sub-scores (0.00 – 100.00)
    performance_score   NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (performance_score BETWEEN 0 AND 100),
    camera_score        NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (camera_score BETWEEN 0 AND 100),
    battery_score       NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (battery_score BETWEEN 0 AND 100),
    display_score       NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (display_score BETWEEN 0 AND 100),
    value_score         NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (value_score BETWEEN 0 AND 100),
    build_score         NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (build_score BETWEEN 0 AND 100),
    software_score      NUMERIC(5,2) NOT NULL DEFAULT 0
                        CHECK (software_score BETWEEN 0 AND 100),

    -- Overall score: auto-computed by trigger (Supabase-safe)
    overall_score       NUMERIC(5,2) NOT NULL DEFAULT 0,

    scored_by           VARCHAR(30) NOT NULL DEFAULT 'system'
                        CHECK (scored_by IN ('system', 'admin', 'ai')),
    scored_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to auto-compute overall_score (replaces GENERATED ALWAYS AS — Supabase compatible)
CREATE OR REPLACE FUNCTION fn_compute_overall_score()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.overall_score := ROUND(
        NEW.performance_score * 0.25 +
        NEW.camera_score      * 0.20 +
        NEW.battery_score     * 0.20 +
        NEW.display_score     * 0.15 +
        NEW.value_score       * 0.10 +
        NEW.build_score       * 0.05 +
        NEW.software_score    * 0.05,
    2);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_compute_overall_score
BEFORE INSERT OR UPDATE OF performance_score, camera_score, battery_score,
    display_score, value_score, build_score, software_score
ON device_scores
FOR EACH ROW EXECUTE FUNCTION fn_compute_overall_score();

COMMENT ON TABLE  device_scores IS 'Weighted 0-100 scores powering the recommendation + ranking engine.';
COMMENT ON COLUMN device_scores.overall_score IS 'Auto-computed: Perf×0.25 + Cam×0.20 + Bat×0.20 + Disp×0.15 + Val×0.10 + Build×0.05 + SW×0.05.';

-- ─────────────────────────────────────────────
--  2.5  device_pros_cons
-- ─────────────────────────────────────────────
CREATE TABLE device_pros_cons (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id   UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    type        VARCHAR(5)  NOT NULL CHECK (type IN ('pro', 'con')),
    description TEXT        NOT NULL,
    importance  SMALLINT    NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),  -- 5 = most critical
    display_order SMALLINT  NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE device_pros_cons IS 'Curated pros & cons shown on phone detail page for trust-building.';

-- ─────────────────────────────────────────────
--  2.6  device_features  (key-value store for highlights)
-- ─────────────────────────────────────────────
CREATE TABLE device_features (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id       UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    feature_name    VARCHAR(80) NOT NULL,
    feature_value   TEXT        NOT NULL,
    icon            VARCHAR(50),
    display_order   SMALLINT    NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
--  2.7  device_ussd_codes  (RMDU unique feature)
-- ─────────────────────────────────────────────
CREATE TABLE device_ussd_codes (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id       UUID        REFERENCES devices(id) ON DELETE CASCADE,   -- NULL = universal
    code            VARCHAR(40) NOT NULL,    -- '*#06#'
    description     TEXT        NOT NULL,
    category        VARCHAR(40) NOT NULL DEFAULT 'general'
                    CHECK (category IN ('general', 'battery', 'imei', 'network', 'display', 'secret')),
    is_universal    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  device_ussd_codes IS 'USSD + hidden codes — unique RMDU feature that builds trust.';
COMMENT ON COLUMN device_ussd_codes.device_id IS 'NULL when the code applies to all devices of same brand/OS.';

-- =============================================================================
-- 3. CATEGORY SYSTEM  (with DYNAMIC RANKING)
-- =============================================================================

-- ─────────────────────────────────────────────
--  3.1  categories
-- ─────────────────────────────────────────────
CREATE TABLE categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(60) NOT NULL UNIQUE,   -- 'Budget Killer', 'Gaming Guru', etc.
    slug        VARCHAR(80) NOT NULL UNIQUE,   -- 'budget-killer'
    description TEXT,
    icon        VARCHAR(50),                   -- emoji or icon class
    color_hex   VARCHAR(7),                    -- '#FF6B35'
    display_order SMALLINT  NOT NULL DEFAULT 0,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE categories IS 'The 5 signature RMDU categories: Budget Killer, Gaming Guru, Camera Champ, Battery Boss, GOAT.';

-- ─────────────────────────────────────────────
--  3.2  device_categories  (DYNAMIC RANKING ENGINE)
-- ─────────────────────────────────────────────
--  This table stores the MANUAL / ADMIN-SET rank per category.
--  Ranks are DENSE integers starting at 1.
--  When a new device is inserted at rank N, ALL ranks >= N are shifted +1
--  via the trigger below — no manual SQL needed.
-- ─────────────────────────────────────────────
CREATE TABLE device_categories (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id   UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    category_id UUID        NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    rank        INTEGER     NOT NULL CHECK (rank >= 1),
    rank_locked BOOLEAN     NOT NULL DEFAULT FALSE, -- if true, AI/auto-rank won't touch it
    added_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
    justification TEXT,                             -- why this rank was set
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT device_categories_unique UNIQUE (device_id, category_id),
    -- DEFERRABLE: allows the ranking trigger to temporarily violate uniqueness
    -- during rank-shifting, then re-checks at transaction COMMIT.
    CONSTRAINT device_categories_rank_unique UNIQUE (category_id, rank)
        DEFERRABLE INITIALLY DEFERRED
);

COMMENT ON TABLE  device_categories IS 'Dynamic ranked list of devices per category. Rank shifts are handled by trigger.';
COMMENT ON COLUMN device_categories.rank IS 'Position 1 = best in category. Trigger auto-shifts ranks on insert/update.';

-- ─────────────────────────────────────────────
--  3.3  TRIGGER: auto-shift ranks on insert / update
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_shift_category_ranks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Ensure deferred constraint checking so rank UPDATEs don't violate UNIQUE mid-shift
    SET CONSTRAINTS device_categories_rank_unique DEFERRED;

    IF TG_OP = 'INSERT' THEN
        -- Shift all existing rows in same category with rank >= new rank
        UPDATE device_categories
        SET    rank       = rank + 1,
               updated_at = NOW()
        WHERE  category_id = NEW.category_id
          AND  rank        >= NEW.rank
          AND  id          != NEW.id;

    ELSIF TG_OP = 'UPDATE' AND OLD.rank IS DISTINCT FROM NEW.rank THEN
        IF NEW.rank > OLD.rank THEN
            -- Moving DOWN: compress rows between old+1 and new
            UPDATE device_categories
            SET    rank       = rank - 1,
                   updated_at = NOW()
            WHERE  category_id = NEW.category_id
              AND  rank BETWEEN OLD.rank + 1 AND NEW.rank
              AND  id != NEW.id;
        ELSE
            -- Moving UP: expand rows between new and old-1
            UPDATE device_categories
            SET    rank       = rank + 1,
                   updated_at = NOW()
            WHERE  category_id = NEW.category_id
              AND  rank BETWEEN NEW.rank AND OLD.rank - 1
              AND  id != NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_shift_category_ranks
BEFORE INSERT OR UPDATE OF rank ON device_categories
FOR EACH ROW EXECUTE FUNCTION fn_shift_category_ranks();

-- ─────────────────────────────────────────────
--  3.4  VIEW: Dynamic score-based ranking (no manual rank needed)
--  Use this when you want AUTO-ranking by scores, not manual order.
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_category_device_ranks AS
SELECT
    dc.category_id,
    c.name          AS category_name,
    c.slug          AS category_slug,
    dc.device_id,
    d.name          AS device_name,
    d.slug          AS device_slug,
    d.price,
    b.name          AS brand_name,
    -- Manual rank (admin-set)
    dc.rank         AS manual_rank,
    dc.rank_locked,
    -- Auto-computed rank within category based on relevant score
    DENSE_RANK() OVER (
        PARTITION BY dc.category_id
        ORDER BY
            CASE c.slug
                WHEN 'budget-killer'  THEN ds.value_score
                WHEN 'gaming-guru'    THEN ds.performance_score
                WHEN 'camera-champ'   THEN ds.camera_score
                WHEN 'battery-boss'   THEN ds.battery_score
                WHEN 'goat'           THEN ds.overall_score
                ELSE                       ds.overall_score
            END DESC
    ) AS auto_rank,
    -- Relevant score for that category
    CASE c.slug
        WHEN 'budget-killer'  THEN ds.value_score
        WHEN 'gaming-guru'    THEN ds.performance_score
        WHEN 'camera-champ'   THEN ds.camera_score
        WHEN 'battery-boss'   THEN ds.battery_score
        WHEN 'goat'           THEN ds.overall_score
        ELSE                       ds.overall_score
    END AS category_score,
    ds.overall_score
FROM   device_categories dc
JOIN   categories         c  ON c.id = dc.category_id
JOIN   devices            d  ON d.id = dc.device_id
JOIN   brands             b  ON b.id = d.brand_id
LEFT JOIN device_scores   ds ON ds.device_id = dc.device_id
WHERE  d.is_active = TRUE;

COMMENT ON VIEW vw_category_device_ranks IS 'Hybrid view: shows both manual rank and auto score-based rank per category.';

-- =============================================================================
-- 4. RECOMMENDATION ENGINE
-- =============================================================================

-- ─────────────────────────────────────────────
--  4.1  recommendations  (pre-computed cache)
-- ─────────────────────────────────────────────
CREATE TABLE recommendations (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    match_score     NUMERIC(5,2) NOT NULL CHECK (match_score BETWEEN 0 AND 100),
    reason          TEXT        NOT NULL,   -- human-readable e.g. "Best for gaming within your budget"
    rank            SMALLINT    NOT NULL,   -- 1 = top pick
    engine_version  VARCHAR(20) NOT NULL DEFAULT 'v1',
    is_ai_generated BOOLEAN     NOT NULL DEFAULT FALSE,
    expires_at      TIMESTAMPTZ,            -- NULL = does not expire
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT recommendations_user_device_unique UNIQUE (user_id, device_id)
);

COMMENT ON TABLE  recommendations IS 'Pre-computed recommendation results keyed by user. Regenerated on profile change.';

-- ─────────────────────────────────────────────
--  4.2  recommendation_rules  (scoring formula config)
-- ─────────────────────────────────────────────
CREATE TABLE recommendation_rules (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    priority        VARCHAR(30) NOT NULL UNIQUE,  -- 'gaming', 'camera', etc.
    weight_perf     NUMERIC(4,2) NOT NULL DEFAULT 0.25,
    weight_camera   NUMERIC(4,2) NOT NULL DEFAULT 0.20,
    weight_battery  NUMERIC(4,2) NOT NULL DEFAULT 0.20,
    weight_display  NUMERIC(4,2) NOT NULL DEFAULT 0.15,
    weight_value    NUMERIC(4,2) NOT NULL DEFAULT 0.10,
    weight_build    NUMERIC(4,2) NOT NULL DEFAULT 0.05,
    weight_software NUMERIC(4,2) NOT NULL DEFAULT 0.05,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure weights sum to 1.00
    CONSTRAINT weights_sum_to_one CHECK (
        ROUND(weight_perf + weight_camera + weight_battery +
              weight_display + weight_value + weight_build + weight_software, 2) = 1.00
    )
);

COMMENT ON TABLE recommendation_rules IS 'Admin-configurable score weights per priority type — changes the recommendation formula without code.';

-- Seed default rules
INSERT INTO recommendation_rules
    (priority, weight_perf, weight_camera, weight_battery, weight_display, weight_value, weight_build, weight_software)
VALUES
    ('gaming',      0.40, 0.10, 0.20, 0.15, 0.05, 0.05, 0.05),
    ('camera',      0.15, 0.40, 0.15, 0.15, 0.05, 0.05, 0.05),
    ('battery',     0.15, 0.10, 0.45, 0.10, 0.10, 0.05, 0.05),
    ('value',       0.20, 0.15, 0.20, 0.15, 0.20, 0.05, 0.05),
    ('all-rounder', 0.25, 0.20, 0.20, 0.15, 0.10, 0.05, 0.05);

-- =============================================================================
-- 5. COMPARISON SYSTEM  (no extra table — uses device_specs + device_scores)
-- =============================================================================

-- ─────────────────────────────────────────────
--  5.1  comparison_sessions  (track what users compared)
-- ─────────────────────────────────────────────
CREATE TABLE comparison_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,   -- NULL = anonymous
    device_ids      UUID[]      NOT NULL,     -- array of 2–3 device UUIDs
    winner_device_id UUID       REFERENCES devices(id) ON DELETE SET NULL, -- which one was chosen
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE comparison_sessions IS 'Tracks user compare sessions for analytics and personalisation.';

-- =============================================================================
-- 6. SHOPKEEPER CARD  (RMDU genius feature)
-- =============================================================================

CREATE TABLE shopkeeper_cards (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    short_code      VARCHAR(12) NOT NULL UNIQUE,   -- generated by app layer or trigger below
    reason_summary  TEXT        NOT NULL,     -- "Best for gaming + long battery"
    avoid_summary   TEXT,                     -- "Avoid if you need great low-light photos"
    budget_note     TEXT,                     -- "Within your ₹25,000 budget"
    expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    view_count      INTEGER     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-generate short_code if not provided (Supabase-safe)
CREATE OR REPLACE FUNCTION fn_generate_short_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.short_code IS NULL OR NEW.short_code = '' THEN
        NEW.short_code := UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8));
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_short_code
BEFORE INSERT ON shopkeeper_cards
FOR EACH ROW EXECUTE FUNCTION fn_generate_short_code();

COMMENT ON TABLE  shopkeeper_cards IS 'Printable/shareable card for offline store visits — unique RMDU moat.';
COMMENT ON COLUMN shopkeeper_cards.short_code IS '8-char alphanumeric code shown to shopkeeper for quick lookup.';

-- =============================================================================
-- 7. REVIEWS SYSTEM  (future scale)
-- =============================================================================

CREATE TABLE reviews (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    rating          SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(120),
    review_text     TEXT,
    verified_owner  BOOLEAN     NOT NULL DEFAULT FALSE,
    helpful_votes   INTEGER     NOT NULL DEFAULT 0,
    is_approved     BOOLEAN     NOT NULL DEFAULT FALSE,  -- admin moderation
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT reviews_user_device_unique UNIQUE (user_id, device_id)
);

COMMENT ON TABLE reviews IS 'Real owner reviews. verified_owner flag set when device is in user_phone_history.';

-- =============================================================================
-- 8. RAG / GenAI SYSTEM  (pgvector)
-- =============================================================================

-- ─────────────────────────────────────────────
--  8.1  device_embeddings  (RAG: semantic search)
-- ─────────────────────────────────────────────
CREATE TABLE device_embeddings (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id       UUID        NOT NULL UNIQUE REFERENCES devices(id) ON DELETE CASCADE,

    -- Full semantic embedding of device profile text
    -- 1536-dim = OpenAI text-embedding-3-small
    -- 768-dim  = sentence-transformers (open-source)
    -- 3072-dim = OpenAI text-embedding-3-large
    embedding       VECTOR(1536) NOT NULL,

    -- Source text that was embedded (for auditability)
    embedded_text   TEXT        NOT NULL,
    model_used      VARCHAR(80) NOT NULL DEFAULT 'text-embedding-3-small',
    token_count     INTEGER,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  device_embeddings IS 'RAG: Dense vector embeddings for semantic "best phone for PUBG" queries.';
COMMENT ON COLUMN device_embeddings.embedding IS '1536-dim OpenAI embedding — supports cosine similarity search.';

-- ─────────────────────────────────────────────
--  8.2  user_query_embeddings  (RAG: user question cache)
-- ─────────────────────────────────────────────
CREATE TABLE user_query_embeddings (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    query_text      TEXT        NOT NULL,
    embedding       VECTOR(1536) NOT NULL,
    model_used      VARCHAR(80) NOT NULL DEFAULT 'text-embedding-3-small',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_query_embeddings IS 'Caches user natural-language query embeddings for faster repeated searches.';

-- ─────────────────────────────────────────────
--  8.3  ai_chat_sessions  (Conversational AI)
-- ─────────────────────────────────────────────
CREATE TABLE ai_chat_sessions (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
    session_token   TEXT        NOT NULL UNIQUE DEFAULT MD5(uuid_generate_v4()::TEXT),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ─────────────────────────────────────────────
--  8.4  ai_chat_messages
-- ─────────────────────────────────────────────
CREATE TABLE ai_chat_messages (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id      UUID        NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(15) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT        NOT NULL,
    -- Store embedding of message for conversation context retrieval
    embedding       VECTOR(1536),
    -- Referenced devices in this message (for RAG retrieval log)
    referenced_device_ids UUID[],
    tokens_used     INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_chat_messages IS 'Full conversation history with per-message embeddings for retrieval-augmented generation.';

-- ─────────────────────────────────────────────
--  8.5  rag_knowledge_chunks  (static knowledge base)
-- ─────────────────────────────────────────────
CREATE TABLE rag_knowledge_chunks (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_type     VARCHAR(30) NOT NULL
                    CHECK (source_type IN ('device_spec', 'review', 'comparison', 'ussd', 'guide', 'faq')),
    source_id       UUID,                    -- optional FK to device, review, etc.
    chunk_text      TEXT        NOT NULL,    -- the actual text chunk
    embedding       VECTOR(1536) NOT NULL,   -- vectorized chunk
    metadata        JSONB       NOT NULL DEFAULT '{}',  -- {device_id, brand, category, etc.}
    model_used      VARCHAR(80) NOT NULL DEFAULT 'text-embedding-3-small',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE rag_knowledge_chunks IS 'Chunked knowledge base for RAG — all device info split into retrievable pieces.';

-- =============================================================================
-- 9. PRICE ALERTS  (future feature)
-- =============================================================================

CREATE TABLE price_alerts (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id       UUID        NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    target_price    NUMERIC(10,2) NOT NULL,
    is_triggered    BOOLEAN     NOT NULL DEFAULT FALSE,
    triggered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT price_alerts_user_device_unique UNIQUE (user_id, device_id)
);

COMMENT ON TABLE price_alerts IS 'User sets target price; backend triggers notification when device price drops.';

-- =============================================================================
-- 10. AUDIT / ADMIN LOG
-- =============================================================================

CREATE TABLE audit_log (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(60) NOT NULL,   -- 'device.create', 'rank.update', 'user.ban'
    target_type VARCHAR(40),            -- 'device', 'user', 'category'
    target_id   UUID,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_log IS 'Immutable admin action log for debugging and security compliance.';

-- =============================================================================
-- DEFERRED FOREIGN KEYS  (added after both tables exist)
-- =============================================================================

ALTER TABLE user_profiles     ADD CONSTRAINT fk_current_device
    FOREIGN KEY (current_device_id) REFERENCES devices(id) ON DELETE SET NULL;

ALTER TABLE user_phone_history ADD CONSTRAINT fk_device_history
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE;

-- =============================================================================
-- INDEXES  (performance critical)
-- =============================================================================

-- Users
CREATE INDEX idx_users_email              ON users(email);
CREATE INDEX idx_users_role               ON users(role);

-- Devices
CREATE INDEX idx_devices_brand            ON devices(brand_id);
CREATE INDEX idx_devices_price            ON devices(price);
CREATE INDEX idx_devices_slug             ON devices(slug);
CREATE INDEX idx_devices_is_active        ON devices(is_active);
CREATE INDEX idx_devices_is_featured      ON devices(is_featured);

-- Scores — most queried columns
CREATE INDEX idx_scores_overall           ON device_scores(overall_score DESC);
CREATE INDEX idx_scores_performance       ON device_scores(performance_score DESC);
CREATE INDEX idx_scores_camera            ON device_scores(camera_score DESC);
CREATE INDEX idx_scores_battery           ON device_scores(battery_score DESC);
CREATE INDEX idx_scores_value             ON device_scores(value_score DESC);

-- Category ranking
CREATE INDEX idx_dev_cat_category         ON device_categories(category_id, rank);
CREATE INDEX idx_dev_cat_device           ON device_categories(device_id);

-- Recommendations
CREATE INDEX idx_reco_user                ON recommendations(user_id, rank);

-- Pros/Cons
CREATE INDEX idx_pros_cons_device_type    ON device_pros_cons(device_id, type);

-- Reviews
CREATE INDEX idx_reviews_device_rating    ON reviews(device_id, rating DESC);
CREATE INDEX idx_reviews_approved         ON reviews(is_approved, created_at DESC);

-- USSD
CREATE INDEX idx_ussd_device              ON device_ussd_codes(device_id);
CREATE INDEX idx_ussd_universal           ON device_ussd_codes(is_universal) WHERE is_universal = TRUE;

-- Shopkeeper cards
CREATE INDEX idx_cards_user               ON shopkeeper_cards(user_id);
CREATE INDEX idx_cards_short_code         ON shopkeeper_cards(short_code);

-- Price alerts
CREATE INDEX idx_price_alerts_device      ON price_alerts(device_id, is_triggered);

-- Audit log
CREATE INDEX idx_audit_target             ON audit_log(target_type, target_id);
CREATE INDEX idx_audit_user               ON audit_log(user_id, created_at DESC);

-- ── RAG / Vector indexes (HNSW — best for ANN search in pgvector)
CREATE INDEX idx_device_embed_hnsw        ON device_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_rag_chunks_hnsw          ON rag_knowledge_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_user_query_embed_hnsw    ON user_query_embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_chat_msg_embed_hnsw      ON ai_chat_messages USING hnsw (embedding vector_cosine_ops)
    WHERE embedding IS NOT NULL;

-- ── Full-text search on device name + brand
CREATE INDEX idx_devices_fts              ON devices USING gin(to_tsvector('english', name));
CREATE INDEX idx_devices_trgm             ON devices USING gin(slug gin_trgm_ops);

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- ─────────────────────────────────────────────
--  fn_compute_match_score: recommendation engine core logic
--  Returns a 0–100 match score for a user-device pair
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_compute_match_score(
    p_user_id   UUID,
    p_device_id UUID
) RETURNS NUMERIC LANGUAGE plpgsql AS $$
DECLARE
    v_priority      VARCHAR(30);
    v_budget_min    NUMERIC;
    v_budget_max    NUMERIC;
    v_device_price  NUMERIC;
    v_score         NUMERIC := 0;
    v_rule          recommendation_rules%ROWTYPE;
    v_ds            device_scores%ROWTYPE;
BEGIN
    -- Get user preferences
    SELECT primary_priority, budget_min, budget_max
    INTO   v_priority, v_budget_min, v_budget_max
    FROM   user_profiles
    WHERE  user_id = p_user_id;

    IF NOT FOUND THEN RETURN 0; END IF;

    -- Get device price
    SELECT price INTO v_device_price FROM devices WHERE id = p_device_id;

    -- Budget exclusion: hard cut-off
    IF v_device_price < v_budget_min OR v_device_price > v_budget_max THEN
        RETURN 0;
    END IF;

    -- Get scoring weights for this priority
    SELECT * INTO v_rule FROM recommendation_rules WHERE priority = COALESCE(v_priority, 'all-rounder');

    -- Get device scores
    SELECT * INTO v_ds FROM device_scores WHERE device_id = p_device_id;
    IF NOT FOUND THEN RETURN 0; END IF;

    -- Weighted score
    v_score :=
        v_ds.performance_score * v_rule.weight_perf     +
        v_ds.camera_score      * v_rule.weight_camera   +
        v_ds.battery_score     * v_rule.weight_battery  +
        v_ds.display_score     * v_rule.weight_display  +
        v_ds.value_score       * v_rule.weight_value    +
        v_ds.build_score       * v_rule.weight_build    +
        v_ds.software_score    * v_rule.weight_software;

    RETURN ROUND(v_score, 2);
END;
$$;

COMMENT ON FUNCTION fn_compute_match_score IS 'Core recommendation engine: returns 0-100 match score for a user-device pair based on profile weights.';

-- ─────────────────────────────────────────────
--  fn_get_top_recommendations: returns top N devices for a user
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_get_top_recommendations(
    p_user_id UUID,
    p_limit   INTEGER DEFAULT 5
)
RETURNS TABLE (
    device_id       UUID,
    device_name     VARCHAR,
    brand_name      VARCHAR,
    price           NUMERIC,
    match_score     NUMERIC,
    overall_score   NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
    v_budget_min NUMERIC;
    v_budget_max NUMERIC;
BEGIN
    SELECT budget_min, budget_max INTO v_budget_min, v_budget_max
    FROM   user_profiles WHERE user_id = p_user_id;

    RETURN QUERY
    SELECT
        d.id,
        d.name,
        br.name,
        d.price,
        fn_compute_match_score(p_user_id, d.id),
        ds.overall_score
    FROM   devices       d
    JOIN   brands        br ON br.id = d.brand_id
    JOIN   device_scores ds ON ds.device_id = d.id
    WHERE  d.is_active = TRUE
      AND  d.price BETWEEN COALESCE(v_budget_min, 0) AND COALESCE(v_budget_max, 9999999)
    ORDER BY fn_compute_match_score(p_user_id, d.id) DESC
    LIMIT  p_limit;
END;
$$;

COMMENT ON FUNCTION fn_get_top_recommendations IS 'Returns top N devices for a user, scored and ranked by the recommendation engine.';

-- ─────────────────────────────────────────────
--  fn_updated_at_trigger: auto-update updated_at column
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Attach to all tables with updated_at
CREATE TRIGGER trg_users_updated_at              BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_user_profiles_updated_at      BEFORE UPDATE ON user_profiles      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_devices_updated_at            BEFORE UPDATE ON devices            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_device_specs_updated_at       BEFORE UPDATE ON device_specs       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_device_scores_updated_at      BEFORE UPDATE ON device_scores      FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_device_categories_updated_at  BEFORE UPDATE ON device_categories  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_reviews_updated_at            BEFORE UPDATE ON reviews            FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_rag_chunks_updated_at         BEFORE UPDATE ON rag_knowledge_chunks FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();
CREATE TRIGGER trg_recommendation_rules_updated  BEFORE UPDATE ON recommendation_rules FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- =============================================================================
-- SEED DATA  (categories)
-- =============================================================================

INSERT INTO categories (name, slug, description, icon, color_hex, display_order) VALUES
    ('Budget Killer',  'budget-killer',  'Best value picks under tight budgets with balanced real-world performance.',         '💸', '#22C55E', 1),
    ('Gaming Guru',    'gaming-guru',    'High FPS, thermal control, and low-latency touch for competitive play.',             '🎮', '#8B5CF6', 2),
    ('Camera Champ',   'camera-champ',   'Balanced photography systems with true-to-life color and dynamic range.',            '📸', '#EC4899', 3),
    ('Battery Boss',   'battery-boss',   'Endurance-focused devices made for heavy users and all-day confidence.',             '🔋', '#F59E0B', 4),
    ('GOAT',           'goat',           'Flagship-grade excellence with no compromise across performance, camera, and build.', '🐐', '#EF4444', 5);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
