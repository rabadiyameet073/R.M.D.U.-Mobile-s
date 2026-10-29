-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 01
-- Target : Undoes all changes introduced in 01_mobilemart_schema.sql
-- WARNING: This will drop all 24 RMDU Mobiles tables, views, and functions.
-- =============================================================================

SET lock_timeout = '3s';

-- 1. Drop Views
DROP VIEW IF EXISTS public.vw_category_device_ranks CASCADE;

-- 2. Drop Functions and Triggers
DROP FUNCTION IF EXISTS public.fn_shift_category_ranks() CASCADE;
DROP FUNCTION IF EXISTS public.fn_compute_overall_score() CASCADE;
DROP FUNCTION IF EXISTS public.fn_generate_card_short_code() CASCADE;
DROP FUNCTION IF EXISTS public.fn_compute_match_score(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_top_recommendations(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.fn_set_updated_at() CASCADE;

-- 3. Drop Tables (in reverse dependency order)
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.price_alerts CASCADE;
DROP TABLE IF EXISTS public.rag_knowledge_chunks CASCADE;
DROP TABLE IF EXISTS public.ai_chat_messages CASCADE;
DROP TABLE IF EXISTS public.ai_chat_sessions CASCADE;
DROP TABLE IF EXISTS public.user_query_embeddings CASCADE;
DROP TABLE IF EXISTS public.device_embeddings CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.shopkeeper_cards CASCADE;
DROP TABLE IF EXISTS public.comparison_sessions CASCADE;
DROP TABLE IF EXISTS public.recommendation_rules CASCADE;
DROP TABLE IF EXISTS public.recommendations CASCADE;
DROP TABLE IF EXISTS public.device_categories CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.device_ussd_codes CASCADE;
DROP TABLE IF EXISTS public.device_features CASCADE;
DROP TABLE IF EXISTS public.device_pros_cons CASCADE;
DROP TABLE IF EXISTS public.device_scores CASCADE;
DROP TABLE IF EXISTS public.device_specs CASCADE;
DROP TABLE IF EXISTS public.devices CASCADE;
DROP TABLE IF EXISTS public.brands CASCADE;
DROP TABLE IF EXISTS public.user_phone_history CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
