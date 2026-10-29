-- =============================================================================
-- RMDU MOBILES — DATABASE MIGRATION 04
-- File        : 04_complete_rls_and_fk_indexes.sql
-- Order       : STEP 4 (Run after 01_mobilemart_schema.sql, 02_google_oauth_customer_sync.sql,
--               and 03_normalization_and_indexes.sql)
-- Target      : Supabase SQL Editor (PostgreSQL 15+)
-- Description : Complete Row-Level Security (RLS) policies for all remaining 17
--               catalog, review, and AI tables; Indexes for all foreign keys to
--               prevent table lock escalations on cascading deletes; and domain
--               check constraints for enterprise data consistency.
-- Safety      : Fully idempotent (safe to re-run). Protected by 3s lock timeout.
-- =============================================================================

-- 0. Set safety lock timeout (fails fast rather than queueing blocking table locks)
SET lock_timeout = '3s';

-- =============================================================================
-- 1. FOREIGN KEY PERFORMANCE INDEXES
-- In PostgreSQL, foreign keys are NOT indexed automatically. Without these indexes,
-- any DELETE or UPDATE on parent tables (devices, users, sessions) triggers
-- sequential scans and table-level locks on child tables, degrading performance.
-- =============================================================================

-- 1.1 device_features -> devices(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_device_features_device
ON public.device_features (device_id);

-- 1.2 ai_chat_messages -> ai_chat_sessions(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_chat_messages_session
ON public.ai_chat_messages (session_id, created_at ASC);

-- 1.3 reviews -> users(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_reviews_user
ON public.reviews (user_id);

-- 1.4 shopkeeper_cards -> devices(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_cards_device
ON public.shopkeeper_cards (device_id);

-- 1.5 recommendations -> devices(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_recommendations_device
ON public.recommendations (device_id);

-- 1.6 user_profiles -> devices(id) (current_device_id) ON DELETE SET NULL
CREATE INDEX IF NOT EXISTS idx_user_profiles_current_device
ON public.user_profiles (current_device_id)
WHERE current_device_id IS NOT NULL;

-- 1.7 comparison_sessions -> devices(id) (winner_device_id) ON DELETE SET NULL
CREATE INDEX IF NOT EXISTS idx_comparison_winner_device
ON public.comparison_sessions (winner_device_id)
WHERE winner_device_id IS NOT NULL;

-- 1.8 device_categories -> users(id) (added_by) ON DELETE SET NULL
CREATE INDEX IF NOT EXISTS idx_dev_cat_added_by
ON public.device_categories (added_by)
WHERE added_by IS NOT NULL;

-- 1.9 user_phone_history -> devices(id) ON DELETE CASCADE
CREATE INDEX IF NOT EXISTS idx_uph_device
ON public.user_phone_history (device_id);

-- 1.10 ai_chat_sessions -> users(id) ON DELETE SET NULL
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user
ON public.ai_chat_sessions (user_id, created_at DESC)
WHERE user_id IS NOT NULL;

-- 1.11 user_query_embeddings -> users(id) ON DELETE SET NULL
CREATE INDEX IF NOT EXISTS idx_user_query_embeddings_user
ON public.user_query_embeddings (user_id)
WHERE user_id IS NOT NULL;


-- =============================================================================
-- 2. DOMAIN CHECK CONSTRAINTS & DATA INTEGRITY
-- Enforces business invariants at the database engine level
-- =============================================================================

-- 2.1 Reviews helpful_votes must be non-negative
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_reviews_helpful_votes') THEN
        ALTER TABLE public.reviews
        ADD CONSTRAINT chk_reviews_helpful_votes CHECK (helpful_votes >= 0);
    END IF;
END $$;

-- 2.2 AI Chat tokens_used must be non-negative
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_chat_tokens_positive') THEN
        ALTER TABLE public.ai_chat_messages
        ADD CONSTRAINT chk_chat_tokens_positive CHECK (tokens_used IS NULL OR tokens_used >= 0);
    END IF;
END $$;

-- 2.3 Comparison session device array size check (between 1 and 4 devices)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_comparison_device_count') THEN
        ALTER TABLE public.comparison_sessions
        ADD CONSTRAINT chk_comparison_device_count 
        CHECK (array_length(device_ids, 1) BETWEEN 1 AND 4);
    END IF;
END $$;

-- 2.4 Brand & Device names cannot be empty or whitespace only
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_brands_name_not_empty') THEN
        ALTER TABLE public.brands
        ADD CONSTRAINT chk_brands_name_not_empty CHECK (length(trim(name)) > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_devices_name_not_empty') THEN
        ALTER TABLE public.devices
        ADD CONSTRAINT chk_devices_name_not_empty CHECK (length(trim(name)) > 0);
    END IF;
END $$;


-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS) FOR REMAINING 17 TABLES
-- Closes security vulnerabilities on public catalog, user-generated reviews,
-- and AI chat session data.
-- =============================================================================

-- 3.1 Enable RLS on all remaining public catalog tables
ALTER TABLE public.brands               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_specs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_scores        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_pros_cons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_features      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_ussd_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_embeddings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- 3.2 Enable RLS on user-interactive and AI tables
ALTER TABLE public.reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_query_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log            ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS POLICIES SPECIFICATION
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN

    -- 4.1 BRANDS: Public can view active brands
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view brands') THEN
        CREATE POLICY "Public can view brands" ON public.brands
        FOR SELECT USING (is_active = TRUE);
    END IF;

    -- 4.2 DEVICES: Public can view active devices
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view active devices') THEN
        CREATE POLICY "Public can view active devices" ON public.devices
        FOR SELECT USING (is_active = TRUE);
    END IF;

    -- 4.3 DEVICE SPECS: Public can view specifications for active devices
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view device specs') THEN
        CREATE POLICY "Public can view device specs" ON public.device_specs
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.devices d
                WHERE d.id = device_specs.device_id AND d.is_active = TRUE
            )
        );
    END IF;

    -- 4.4 DEVICE SCORES: Public can view scores for active devices
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view device scores') THEN
        CREATE POLICY "Public can view device scores" ON public.device_scores
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.devices d
                WHERE d.id = device_scores.device_id AND d.is_active = TRUE
            )
        );
    END IF;

    -- 4.5 DEVICE PROS & CONS: Public can view pros/cons
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view device pros cons') THEN
        CREATE POLICY "Public can view device pros cons" ON public.device_pros_cons
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.devices d
                WHERE d.id = device_pros_cons.device_id AND d.is_active = TRUE
            )
        );
    END IF;

    -- 4.6 DEVICE FEATURES: Public can view features
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view device features') THEN
        CREATE POLICY "Public can view device features" ON public.device_features
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.devices d
                WHERE d.id = device_features.device_id AND d.is_active = TRUE
            )
        );
    END IF;

    -- 4.7 DEVICE USSD CODES: Public can view USSD codes
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view device ussd codes') THEN
        CREATE POLICY "Public can view device ussd codes" ON public.device_ussd_codes
        FOR SELECT USING (true);
    END IF;

    -- 4.8 CATEGORIES: Public can view active categories
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view categories') THEN
        CREATE POLICY "Public can view categories" ON public.categories
        FOR SELECT USING (is_active = TRUE);
    END IF;

    -- 4.9 DEVICE CATEGORIES: Public can view device category rankings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view device categories') THEN
        CREATE POLICY "Public can view device categories" ON public.device_categories
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.devices d
                WHERE d.id = device_categories.device_id AND d.is_active = TRUE
            )
        );
    END IF;

    -- 4.10 RECOMMENDATION RULES: Public can view scoring rules
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view recommendation rules') THEN
        CREATE POLICY "Public can view recommendation rules" ON public.recommendation_rules
        FOR SELECT USING (true);
    END IF;

    -- 4.11 DEVICE EMBEDDINGS: Public can search embeddings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view device embeddings') THEN
        CREATE POLICY "Public can view device embeddings" ON public.device_embeddings
        FOR SELECT USING (true);
    END IF;

    -- 4.12 RAG KNOWLEDGE CHUNKS: Public can search knowledge base
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view rag knowledge chunks') THEN
        CREATE POLICY "Public can view rag knowledge chunks" ON public.rag_knowledge_chunks
        FOR SELECT USING (true);
    END IF;

    -- 4.13 REVIEWS:
    -- Anyone can read approved reviews or their own pending reviews
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view approved reviews') THEN
        CREATE POLICY "Public can view approved reviews" ON public.reviews
        FOR SELECT USING (is_approved = TRUE OR auth.uid() = user_id);
    END IF;
    -- Authenticated users can insert their own review
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own reviews') THEN
        CREATE POLICY "Users can insert own reviews" ON public.reviews
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    -- Users can update their own reviews
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own reviews') THEN
        CREATE POLICY "Users can update own reviews" ON public.reviews
        FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
    -- Users can delete their own reviews
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own reviews') THEN
        CREATE POLICY "Users can delete own reviews" ON public.reviews
        FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- 4.14 AI CHAT SESSIONS:
    -- Users can view their own sessions or anonymous sessions they created
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own chat sessions') THEN
        CREATE POLICY "Users can view own chat sessions" ON public.ai_chat_sessions
        FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    -- Users can insert chat sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert chat sessions') THEN
        CREATE POLICY "Users can insert chat sessions" ON public.ai_chat_sessions
        FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    -- Users can update own chat sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own chat sessions') THEN
        CREATE POLICY "Users can update own chat sessions" ON public.ai_chat_sessions
        FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    -- Users can delete own chat sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own chat sessions') THEN
        CREATE POLICY "Users can delete own chat sessions" ON public.ai_chat_sessions
        FOR DELETE USING (auth.uid() = user_id);
    END IF;

    -- 4.15 AI CHAT MESSAGES:
    -- Users can view messages belonging to their sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view session messages') THEN
        CREATE POLICY "Users can view session messages" ON public.ai_chat_messages
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.ai_chat_sessions s
                WHERE s.id = ai_chat_messages.session_id
                  AND (s.user_id = auth.uid() OR s.user_id IS NULL)
            )
        );
    END IF;
    -- Users can insert messages into their sessions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert session messages') THEN
        CREATE POLICY "Users can insert session messages" ON public.ai_chat_messages
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.ai_chat_sessions s
                WHERE s.id = ai_chat_messages.session_id
                  AND (s.user_id = auth.uid() OR s.user_id IS NULL)
            )
        );
    END IF;

    -- 4.16 USER QUERY EMBEDDINGS:
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own query embeddings') THEN
        CREATE POLICY "Users can view own query embeddings" ON public.user_query_embeddings
        FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert query embeddings') THEN
        CREATE POLICY "Users can insert query embeddings" ON public.user_query_embeddings
        FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    -- 4.17 AUDIT LOG:
    -- Customers can only view audit entries pertaining to their own actions.
    -- Modifications are strictly restricted to backend service_role / triggers.
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own audit entries') THEN
        CREATE POLICY "Users can view own audit entries" ON public.audit_log
        FOR SELECT USING (auth.uid() = user_id);
    END IF;

END $$;


-- =============================================================================
-- 5. REFRESH QUERY PLANNER STATISTICS
-- Ensures PostgreSQL cost-based optimizer uses the new indexes immediately
-- =============================================================================
ANALYZE public.device_features;
ANALYZE public.ai_chat_messages;
ANALYZE public.ai_chat_sessions;
ANALYZE public.reviews;
ANALYZE public.shopkeeper_cards;
ANALYZE public.recommendations;
ANALYZE public.user_profiles;
ANALYZE public.comparison_sessions;
ANALYZE public.device_categories;
ANALYZE public.user_phone_history;
ANALYZE public.user_query_embeddings;
ANALYZE public.audit_log;

-- =============================================================================
-- END OF MIGRATION 04
-- =============================================================================
