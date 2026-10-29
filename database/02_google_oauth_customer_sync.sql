-- =============================================================================
-- RMDU MOBILES — DATABASE MIGRATION 02
-- File        : 02_google_oauth_customer_sync.sql
-- Order       : STEP 2 (Run after 01_mobilemart_schema.sql)
-- Target      : Supabase SQL Editor (PostgreSQL 15+)
-- Description : Integrates Google OAuth Login, Auto-Sync Trigger from Supabase
--               Auth (auth.users) to public.users & public.user_profiles,
--               Customer Intelligence (Taste & History Tracking), and RLS Policies.
-- =============================================================================

-- ─────────────────────────────────────────────
-- 1. ALTER public.users FOR GOOGLE OAUTH
-- ─────────────────────────────────────────────
-- Google OAuth users authenticate via Google and do not have a password_hash
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;

-- Add authentication provider ('email', 'google', etc.)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(30) NOT NULL DEFAULT 'email';

-- Add OAuth ID and metadata store
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS oauth_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS raw_meta JSONB DEFAULT '{}'::jsonb;

-- ─────────────────────────────────────────────
-- 2. AUTOMATIC USER SYNC FUNCTION & TRIGGER
-- When a user logs in with Google, Supabase adds a row to auth.users.
-- This trigger automatically synchronizes their profile to public.users
-- and initializes their customer taste record in public.user_profiles.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_name       VARCHAR(120);
    v_avatar     TEXT;
    v_provider   VARCHAR(30);
BEGIN
    -- Extract customer name from Google OAuth metadata or email prefix
    v_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );

    -- Extract Google profile avatar URL
    v_avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture',
        NULL
    );

    -- Extract authentication provider
    v_provider := COALESCE(
        NEW.raw_app_meta_data->>'provider',
        'google'
    );

    -- 1. Insert or update customer in public.users
    INSERT INTO public.users (
        id,
        name,
        email,
        password_hash,
        avatar_url,
        is_verified,
        is_active,
        role,
        auth_provider,
        oauth_id,
        raw_meta,
        last_login_at,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        v_name,
        NEW.email,
        'oauth:google',
        v_avatar,
        COALESCE(NEW.email_confirmed_at IS NOT NULL, TRUE),
        TRUE,
        'user',
        v_provider,
        NEW.id::TEXT,
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (email) DO UPDATE SET
        avatar_url    = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
        name          = COALESCE(EXCLUDED.name, public.users.name),
        last_login_at = NOW(),
        updated_at    = NOW();

    -- 2. Automatically initialize customer taste profile if not already present
    INSERT INTO public.user_profiles (
        user_id,
        onboarding_done,
        budget_min,
        budget_max,
        primary_priority,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        FALSE,
        0,
        999999,
        'all-rounder',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- ─────────────────────────────────────────────
-- 3. AUTO-UPDATE LAST LOGIN TIMESTAMP
-- Keeps track of returning "old customers"
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_user_login_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
        UPDATE public.users
        SET last_login_at = NEW.last_sign_in_at,
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_login_sync();

-- ─────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS) POLICIES FOR USER DATA
-- Enables logged-in Google customers to read and update their own data
-- ─────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_phone_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparison_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopkeeper_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- 4.1 public.users
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own record') THEN
        CREATE POLICY "Users can view own record" ON public.users FOR SELECT
        USING (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own record') THEN
        CREATE POLICY "Users can update own record" ON public.users FOR UPDATE
        USING (auth.uid() = id);
    END IF;

    -- 4.2 public.user_profiles (Customer Taste & Priorities)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile') THEN
        CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile') THEN
        CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- 4.3 public.user_phone_history (Past Phones Owned)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own phone history') THEN
        CREATE POLICY "Users can view own phone history" ON public.user_phone_history FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own phone history') THEN
        CREATE POLICY "Users can insert own phone history" ON public.user_phone_history FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own phone history') THEN
        CREATE POLICY "Users can delete own phone history" ON public.user_phone_history FOR DELETE
        USING (auth.uid() = user_id);
    END IF;

    -- 4.4 public.comparison_sessions (Past Comparisons)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own comparisons') THEN
        CREATE POLICY "Users can view own comparisons" ON public.comparison_sessions FOR SELECT
        USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert comparisons') THEN
        CREATE POLICY "Users can insert comparisons" ON public.comparison_sessions FOR INSERT
        WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    -- 4.5 public.recommendations (Personalized Match Picks)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own recommendations') THEN
        CREATE POLICY "Users can view own recommendations" ON public.recommendations FOR SELECT
        USING (auth.uid() = user_id);
    END IF;

    -- 4.6 public.shopkeeper_cards (Offline Cards)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own cards') THEN
        CREATE POLICY "Users can view own cards" ON public.shopkeeper_cards FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view cards by short_code') THEN
        CREATE POLICY "Public can view cards by short_code" ON public.shopkeeper_cards FOR SELECT
        USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own cards') THEN
        CREATE POLICY "Users can insert own cards" ON public.shopkeeper_cards FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;

    -- 4.7 public.price_alerts (Target Price Alerts)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own price alerts') THEN
        CREATE POLICY "Users can view own price alerts" ON public.price_alerts FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own price alerts') THEN
        CREATE POLICY "Users can insert own price alerts" ON public.price_alerts FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own price alerts') THEN
        CREATE POLICY "Users can delete own price alerts" ON public.price_alerts FOR DELETE
        USING (auth.uid() = user_id);
    END IF;
END $$;
