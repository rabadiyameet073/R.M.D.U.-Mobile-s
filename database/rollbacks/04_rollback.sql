-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 04
-- Target : Undoes all changes introduced in 04_complete_rls_and_fk_indexes.sql
-- =============================================================================

SET lock_timeout = '3s';

-- 1. Drop RLS Policies created in 04
DROP POLICY IF EXISTS "Public can view brands"                  ON public.brands;
DROP POLICY IF EXISTS "Public can view active devices"          ON public.devices;
DROP POLICY IF EXISTS "Public can view device specs"            ON public.device_specs;
DROP POLICY IF EXISTS "Public can view device scores"           ON public.device_scores;
DROP POLICY IF EXISTS "Public can view device pros cons"        ON public.device_pros_cons;
DROP POLICY IF EXISTS "Public can view device features"         ON public.device_features;
DROP POLICY IF EXISTS "Public can view device ussd codes"       ON public.device_ussd_codes;
DROP POLICY IF EXISTS "Public can view categories"              ON public.categories;
DROP POLICY IF EXISTS "Public can view device categories"       ON public.device_categories;
DROP POLICY IF EXISTS "Public can view recommendation rules"    ON public.recommendation_rules;
DROP POLICY IF EXISTS "Public can view device embeddings"       ON public.device_embeddings;
DROP POLICY IF EXISTS "Public can view rag knowledge chunks"    ON public.rag_knowledge_chunks;

DROP POLICY IF EXISTS "Public can view approved reviews"        ON public.reviews;
DROP POLICY IF EXISTS "Users can insert own reviews"            ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews"            ON public.reviews;
DROP POLICY IF EXISTS "Users can delete own reviews"            ON public.reviews;

DROP POLICY IF EXISTS "Users can view own chat sessions"        ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can insert chat sessions"          ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions"      ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions"      ON public.ai_chat_sessions;

DROP POLICY IF EXISTS "Users can view session messages"         ON public.ai_chat_messages;
DROP POLICY IF EXISTS "Users can insert session messages"       ON public.ai_chat_messages;

DROP POLICY IF EXISTS "Users can view own query embeddings"     ON public.user_query_embeddings;
DROP POLICY IF EXISTS "Users can insert query embeddings"       ON public.user_query_embeddings;

DROP POLICY IF EXISTS "Users can view own audit entries"        ON public.audit_log;

-- 2. Drop Check Constraints
ALTER TABLE public.reviews              DROP CONSTRAINT IF EXISTS chk_reviews_helpful_votes;
ALTER TABLE public.ai_chat_messages     DROP CONSTRAINT IF EXISTS chk_chat_tokens_positive;
ALTER TABLE public.comparison_sessions  DROP CONSTRAINT IF EXISTS chk_comparison_device_count;
ALTER TABLE public.brands               DROP CONSTRAINT IF EXISTS chk_brands_name_not_empty;
ALTER TABLE public.devices              DROP CONSTRAINT IF EXISTS chk_devices_name_not_empty;

-- 3. Drop Foreign Key Indexes
DROP INDEX IF EXISTS public.idx_device_features_device;
DROP INDEX IF EXISTS public.idx_chat_messages_session;
DROP INDEX IF EXISTS public.idx_reviews_user;
DROP INDEX IF EXISTS public.idx_cards_device;
DROP INDEX IF EXISTS public.idx_recommendations_device;
DROP INDEX IF EXISTS public.idx_user_profiles_current_device;
DROP INDEX IF EXISTS public.idx_comparison_winner_device;
DROP INDEX IF EXISTS public.idx_dev_cat_added_by;
DROP INDEX IF EXISTS public.idx_uph_device;
DROP INDEX IF EXISTS public.idx_ai_chat_sessions_user;
DROP INDEX IF EXISTS public.idx_user_query_embeddings_user;
