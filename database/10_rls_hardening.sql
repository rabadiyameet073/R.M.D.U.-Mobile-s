-- =============================================================================
-- RMDU MOBILES — DATABASE MIGRATION 10
-- File        : 10_rls_hardening.sql
-- Order       : STEP 10 (run after 09_storefront_copy_and_site_settings.sql)
-- Target      : Supabase SQL Editor (PostgreSQL 15+)
-- Description : Closes the privilege-escalation and data-exposure paths that the
--               earlier RLS pass left open. Every public table stays readable
--               only where the storefront genuinely needs it; every write path
--               that the backend owns is closed to anon/authenticated.
-- Safety      : Idempotent (safe to re-run). 3s lock timeout. Nothing is
--               dropped that the backend reads through the service role.
-- Rollback    : database/rollbacks/10_rollback.sql
-- =============================================================================

-- Every table in public ships with GRANT ALL to anon/authenticated by default,
-- so "RLS enabled" alone is not a boundary: a policy with a permissive USING
-- clause, or a policy that merely pins a row to the caller, can still be turned
-- into a write by any visitor holding the browser-side anon key. These sections
-- make the grants match the intended surface.

SET lock_timeout = '3s';

-- =============================================================================
-- 1. public.users — stop a signed-in customer from promoting themselves
-- =============================================================================
-- Before: CREATE POLICY ... FOR UPDATE USING (auth.uid() = id). The policy
-- pinned the *row* but not the *columns*, so
--     PATCH /rest/v1/users?id=eq.<own id>  {"role":"admin"}
-- with nothing but the anon key and one ordinary session made the caller an
-- admin. require_admin() reads this column, so the escalation was complete.
--
-- The backend owns every write to this table (me.py / admin_content.py, service
-- role). The browser only needs its own display fields.

DROP POLICY IF EXISTS "Users can update own record" ON public.users;

REVOKE ALL ON TABLE public.users FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.users FROM authenticated;
GRANT SELECT ON TABLE public.users TO authenticated;
-- The only columns a customer may write directly.
GRANT UPDATE (name, avatar_url) ON TABLE public.users TO authenticated;

CREATE POLICY "Users can update own display fields" ON public.users
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Belt and braces: even if a future migration re-grants table-level UPDATE, the
-- row-level trigger refuses to let a customer change anything but their name
-- and avatar. The allow-list form means a column added later is protected
-- without editing this file.
CREATE OR REPLACE FUNCTION public.fn_guard_user_privileges()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        IF (to_jsonb(NEW) - 'name' - 'avatar_url' - 'updated_at')
           IS DISTINCT FROM
           (to_jsonb(OLD) - 'name' - 'avatar_url' - 'updated_at')
        THEN
            RAISE EXCEPTION 'public.users: role, active state, verification and email are server-managed'
                USING ERRCODE = '42501',
                      HINT = 'Customer profile writes go through the backend API.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_privileges ON public.users;
CREATE TRIGGER trg_guard_user_privileges
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_guard_user_privileges();

-- =============================================================================
-- 2. public.reviews — stop self-approval and invented "verified owner" badges
-- =============================================================================
-- Before: an UPDATE policy pinned to the author with no column restriction, so
-- an author could set is_approved = true on their own pending review (skipping
-- moderation entirely), set verified_owner = true, or inflate helpful_votes.
-- The INSERT policy was equally open, so a direct REST insert could publish an
-- approved review with a forged badge.

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;

REVOKE ALL ON TABLE public.reviews FROM anon;
REVOKE TRUNCATE ON TABLE public.reviews FROM authenticated;
GRANT SELECT, DELETE ON TABLE public.reviews TO authenticated;
GRANT INSERT (user_id, device_id, rating, title, review_text) ON TABLE public.reviews TO authenticated;
GRANT UPDATE (rating, title, review_text) ON TABLE public.reviews TO authenticated;

CREATE POLICY "Users can edit own review text" ON public.reviews
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.fn_guard_review_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF current_user IN ('anon', 'authenticated') THEN
        IF TG_OP = 'INSERT' THEN
            -- A customer's review always starts unpublished and unbadged; the
            -- backend promotes it after checking purchase history.
            NEW.is_approved := false;
            NEW.verified_owner := false;
            NEW.helpful_votes := 0;
            RETURN NEW;
        END IF;

        IF (to_jsonb(NEW) - 'rating' - 'title' - 'review_text' - 'updated_at')
           IS DISTINCT FROM
           (to_jsonb(OLD) - 'rating' - 'title' - 'review_text' - 'updated_at')
        THEN
            RAISE EXCEPTION 'public.reviews: moderation fields are server-managed'
                USING ERRCODE = '42501',
                      HINT = 'Edit the review text; approval and votes are not customer-writable.';
        END IF;

        -- An edited review goes back into the queue: the approved text is no
        -- longer the text that was approved.
        IF NEW.rating IS DISTINCT FROM OLD.rating
           OR NEW.title IS DISTINCT FROM OLD.title
           OR NEW.review_text IS DISTINCT FROM OLD.review_text
        THEN
            NEW.is_approved := false;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_review_moderation ON public.reviews;
CREATE TRIGGER trg_guard_review_moderation
    BEFORE INSERT OR UPDATE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.fn_guard_review_moderation();

-- =============================================================================
-- 3. Anonymous sessions — a NULL owner is not a shared owner
-- =============================================================================
-- Before: `USING (auth.uid() = user_id OR user_id IS NULL)` on chat sessions,
-- their messages, and comparison sessions. Guest rows have user_id NULL, so
-- that clause let *any* visitor read *every* guest conversation — the full text
-- of every message, and every saved comparison. Guest access is a bearer token
-- that the backend validates; it was never meant to be a table policy.

DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can insert chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.ai_chat_sessions;

REVOKE ALL ON TABLE public.ai_chat_sessions FROM anon;
GRANT SELECT, DELETE ON TABLE public.ai_chat_sessions TO authenticated;
GRANT INSERT (user_id) ON TABLE public.ai_chat_sessions TO authenticated;
GRANT UPDATE (is_active, last_message_at) ON TABLE public.ai_chat_sessions TO authenticated;

CREATE POLICY "Users can view own chat sessions" ON public.ai_chat_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat sessions" ON public.ai_chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat sessions" ON public.ai_chat_sessions
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view session messages" ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can insert session messages" ON public.ai_chat_messages;

REVOKE ALL ON TABLE public.ai_chat_messages FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.ai_chat_messages FROM authenticated;
GRANT SELECT ON TABLE public.ai_chat_messages TO authenticated;

CREATE POLICY "Users can view session messages" ON public.ai_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ai_chat_sessions s
            WHERE s.id = ai_chat_messages.session_id AND s.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own comparisons" ON public.comparison_sessions;
DROP POLICY IF EXISTS "Users can insert comparisons" ON public.comparison_sessions;

REVOKE ALL ON TABLE public.comparison_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.comparison_sessions FROM authenticated;
GRANT SELECT ON TABLE public.comparison_sessions TO authenticated;

CREATE POLICY "Users can view own comparisons" ON public.comparison_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own query embeddings" ON public.user_query_embeddings;
DROP POLICY IF EXISTS "Users can insert query embeddings" ON public.user_query_embeddings;

REVOKE ALL ON TABLE public.user_query_embeddings FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.user_query_embeddings FROM authenticated;
GRANT SELECT ON TABLE public.user_query_embeddings TO authenticated;

CREATE POLICY "Users can view own query embeddings" ON public.user_query_embeddings
    FOR SELECT USING (auth.uid() = user_id);

-- =============================================================================
-- 4. public.shopkeeper_cards — a share code is not a table dump
-- =============================================================================
-- Before: `CREATE POLICY "Public can view cards by short_code" ... USING (true)`.
-- A policy cannot be scoped to a WHERE clause, so this published the whole
-- table — customer id, device list, private notes — to anyone with the anon key.
-- A card is shared by its token and served by /api/v1/retail/cards/{token}
-- through the service role, so the policy can go.

DROP POLICY IF EXISTS "Public can view cards by short_code" ON public.shopkeeper_cards;
REVOKE ALL ON TABLE public.shopkeeper_cards FROM anon;

-- =============================================================================
-- 5. Internal AI assets — server-side only
-- =============================================================================
-- Embedding vectors and the RAG knowledge base are the retrieval corpus the
-- backend serves answers from. They carry no customer data, but dumping them
-- hands over the curated knowledge base and the ranking vectors for free.
-- `recommendation_rules` is the scoring configuration, same reasoning.

DROP POLICY IF EXISTS "Public can view device embeddings" ON public.device_embeddings;
DROP POLICY IF EXISTS "Public can view rag knowledge chunks" ON public.rag_knowledge_chunks;
DROP POLICY IF EXISTS "Public can view recommendation rules" ON public.recommendation_rules;

REVOKE ALL ON TABLE public.device_embeddings      FROM anon, authenticated;
REVOKE ALL ON TABLE public.rag_knowledge_chunks   FROM anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_rules   FROM anon, authenticated;
REVOKE ALL ON TABLE public.audit_log              FROM anon;

-- audit_log keeps its own-row read policy, but nothing customer-facing may
-- write, rewrite or erase a trail entry.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.audit_log FROM authenticated;
GRANT SELECT ON TABLE public.audit_log TO authenticated;

-- =============================================================================
-- 6. Verification helpers
-- =============================================================================
-- A quick post-apply check: every public table must have RLS enabled, and the
-- browser roles must hold no write privilege on the backend-owned tables.
-- Uncomment to inspect.
--
-- SELECT c.relname, c.relrowsecurity AS rls_enabled,
--        count(p.polname) FILTER (WHERE p.polcmd IN ('a','w')) AS write_policies
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   LEFT JOIN pg_policy p ON p.polrelid = c.oid
--  WHERE n.nspname = 'public' AND c.relkind = 'r'
--  GROUP BY 1, 2 ORDER BY 1;

ANALYZE public.users;
ANALYZE public.reviews;
ANALYZE public.ai_chat_sessions;
ANALYZE public.ai_chat_messages;
ANALYZE public.comparison_sessions;
ANALYZE public.shopkeeper_cards;

NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- END OF MIGRATION 10
-- =============================================================================
