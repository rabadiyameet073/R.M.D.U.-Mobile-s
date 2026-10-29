-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 10
-- Target : Reverts 10_rls_hardening.sql to the pre-migration-10 security posture.
--
-- WARNING : Rolling this back REOPENS the privilege-escalation path on
--           public.users (a signed-in customer can set their own `role` to
--           `admin`) and the self-approval path on public.reviews. Only run it
--           if migration 10 itself is broken; fixing forward is safer.
--
-- SAFE     : No customer data is touched. This script only restores grants,
--            policies and drops the two guard triggers.
-- =============================================================================
SET lock_timeout = '3s';

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. USERS
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_guard_user_privileges ON public.users;
DROP FUNCTION IF EXISTS public.fn_guard_user_privileges();

DROP POLICY IF EXISTS "Users can update own display fields" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
    FOR UPDATE USING (auth.uid() = id);

REVOKE UPDATE (name, avatar_url) ON TABLE public.users FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.users TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. REVIEWS
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_guard_review_moderation ON public.reviews;
DROP FUNCTION IF EXISTS public.fn_guard_review_moderation();

DROP POLICY IF EXISTS "Users can edit own review text" ON public.reviews;
CREATE POLICY "Users can update own reviews" ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE INSERT (user_id, device_id, rating, title, review_text) ON TABLE public.reviews FROM authenticated;
REVOKE UPDATE (rating, title, review_text) ON TABLE public.reviews FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reviews TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ANONYMOUS SESSIONS (guest rows readable by user_id IS NULL again)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.ai_chat_sessions;

CREATE POLICY "Users can view own chat sessions" ON public.ai_chat_sessions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert chat sessions" ON public.ai_chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update own chat sessions" ON public.ai_chat_sessions
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_chat_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "Users can view session messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can insert session messages" ON public.ai_chat_messages;

CREATE POLICY "Users can view session messages" ON public.ai_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions s
            WHERE s.id = ai_chat_messages.session_id
              AND (s.user_id = auth.uid() OR s.user_id IS NULL)
        )
    );
CREATE POLICY "Users can insert session messages" ON public.ai_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions s
            WHERE s.id = ai_chat_messages.session_id
              AND (s.user_id = auth.uid() OR s.user_id IS NULL)
        )
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_chat_messages TO anon, authenticated;

DROP POLICY IF EXISTS "Users can view own comparisons" ON public.comparison_sessions;

CREATE POLICY "Users can view own comparisons" ON public.comparison_sessions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert comparisons" ON public.comparison_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.comparison_sessions TO anon, authenticated;

DROP POLICY IF EXISTS "Users can view own query embeddings" ON public.user_query_embeddings;

CREATE POLICY "Users can view own query embeddings" ON public.user_query_embeddings
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert query embeddings" ON public.user_query_embeddings
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_query_embeddings TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SHOPKEEPER CARDS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Public can view cards by short_code" ON public.shopkeeper_cards
    FOR SELECT USING (true);
GRANT SELECT ON TABLE public.shopkeeper_cards TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. INTERNAL AI ASSETS + AUDIT LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Public can view device embeddings" ON public.device_embeddings
    FOR SELECT USING (true);
CREATE POLICY "Public can view rag knowledge chunks" ON public.rag_knowledge_chunks
    FOR SELECT USING (true);
CREATE POLICY "Public can view recommendation rules" ON public.recommendation_rules
    FOR SELECT USING (true);

GRANT SELECT ON TABLE public.device_embeddings    TO anon, authenticated;
GRANT SELECT ON TABLE public.rag_knowledge_chunks TO anon, authenticated;
GRANT SELECT ON TABLE public.recommendation_rules TO anon, authenticated;
GRANT SELECT ON TABLE public.audit_log            TO anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- END OF ROLLBACK 10
-- =============================================================================
