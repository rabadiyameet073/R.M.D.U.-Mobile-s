-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 02
-- Target : Undoes all changes introduced in 02_google_oauth_customer_sync.sql
-- =============================================================================

SET lock_timeout = '3s';

-- 1. Drop User RLS Policies
DROP POLICY IF EXISTS "Users can view own record"            ON public.users;
DROP POLICY IF EXISTS "Users can update own record"          ON public.users;

DROP POLICY IF EXISTS "Users can view own profile"           ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile"         ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile"         ON public.user_profiles;

DROP POLICY IF EXISTS "Users can view own phone history"     ON public.user_phone_history;
DROP POLICY IF EXISTS "Users can insert own phone history"   ON public.user_phone_history;
DROP POLICY IF EXISTS "Users can delete own phone history"   ON public.user_phone_history;

DROP POLICY IF EXISTS "Users can view own comparisons"       ON public.comparison_sessions;
DROP POLICY IF EXISTS "Users can insert comparisons"         ON public.comparison_sessions;

DROP POLICY IF EXISTS "Users can view own recommendations"   ON public.recommendations;

DROP POLICY IF EXISTS "Users can view own cards"             ON public.shopkeeper_cards;
DROP POLICY IF EXISTS "Public can view cards by short_code"  ON public.shopkeeper_cards;
DROP POLICY IF EXISTS "Users can insert own cards"           ON public.shopkeeper_cards;

DROP POLICY IF EXISTS "Users can view own price alerts"      ON public.price_alerts;
DROP POLICY IF EXISTS "Users can insert own price alerts"    ON public.price_alerts;
DROP POLICY IF EXISTS "Users can delete own price alerts"    ON public.price_alerts;

-- 2. Drop auth triggers and sync functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_login   ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();
DROP FUNCTION IF EXISTS public.handle_user_login_sync();

-- 3. Drop OAuth columns from public.users
ALTER TABLE public.users DROP COLUMN IF EXISTS auth_provider;
ALTER TABLE public.users DROP COLUMN IF EXISTS oauth_id;
ALTER TABLE public.users DROP COLUMN IF EXISTS raw_meta;
