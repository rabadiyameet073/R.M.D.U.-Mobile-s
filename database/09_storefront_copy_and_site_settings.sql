-- =============================================================================
-- RMDU MOBILES — MIGRATION 09
-- File        : 09_storefront_copy_and_site_settings.sql
-- Order       : STEP 9 (run after 08_atomic_counters_votes_and_dense_ranks.sql)
-- Target      : Supabase SQL Editor (PostgreSQL 15+)
--
-- WHAT THIS MIGRATION ADDS
--   1. Category display copy: `subtitle`, `highlights`, `hero_video_url`,
--      `cover_image_url` and `updated_at`. Until now the five category tiles
--      carried their copy inside the React bundle.
--   2. `site_settings` — key/value rows (JSONB) for hero, navigation and footer
--      copy, with `is_public` deciding what the storefront endpoint may return.
--   3. Server-stamped `updated_at` (trigger) so the console can show a truthful
--      "last edited" without trusting the client clock.
--   4. RLS + policies + grants: the anon role may read active categories and
--      public settings, and nothing else.
--
-- WHY
--   The storefront must render whatever the database contains. Copy that lives
--   in the bundle cannot be edited from the console, and a console edit could
--   never reach the site. After this migration both directions touch the same
--   rows: admin -> table -> site, and SQL -> site + console.
--
-- DEPLOY ORDER
--   Safe to apply before or after the backend build. The API probes for these
--   columns once and falls back to the base projection, so an un-migrated
--   database keeps serving the catalog with built-in copy defaults.
--
-- SAFETY
--   Idempotent (re-runnable). No existing column is altered or dropped; every
--   addition uses IF NOT EXISTS. `site_settings` starts from the four rows the
--   frontend already renders, and the category copy is written only where it is
--   still empty, so re-running never overwrites an admin edit.
-- =============================================================================
SET lock_timeout = '3s';

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CATEGORY DISPLAY COPY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS subtitle        VARCHAR(160);
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS highlights      JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS hero_video_url  TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.categories.subtitle        IS 'One-line promise printed under the tile title.';
COMMENT ON COLUMN public.categories.highlights      IS 'Ordered JSON array of short strings shown as chips on the category page.';
COMMENT ON COLUMN public.categories.hero_video_url  IS 'Background video for the category hero (site-relative or absolute URL).';
COMMENT ON COLUMN public.categories.cover_image_url IS 'Poster image used while the hero video loads or on slow connections.';

-- `highlights` is rendered as a list by both surfaces; a JSON scalar would
-- break every consumer, so the shape is enforced in the database too.
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_highlights_is_array;
ALTER TABLE public.categories
    ADD CONSTRAINT categories_highlights_is_array
    CHECK (jsonb_typeof(highlights) = 'array');


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SITE SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(80)  NOT NULL UNIQUE,
    value       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    is_public   BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     INTEGER      NOT NULL DEFAULT 1
);

COMMENT ON TABLE  public.site_settings             IS 'Admin-editable site copy (hero, navigation, footer). One row per section.';
COMMENT ON COLUMN public.site_settings.key         IS 'Section name: site | hero | nav | footer | any future section.';
COMMENT ON COLUMN public.site_settings.value       IS 'Arbitrary JSON for that section; the console edits it as structured JSON.';
COMMENT ON COLUMN public.site_settings.is_public   IS 'FALSE keeps a section server-side (never returned by /site/settings).';
COMMENT ON COLUMN public.site_settings.version     IS 'Optimistic-concurrency revision; the console sends the value it read.';

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_key_format;
ALTER TABLE public.site_settings
    ADD CONSTRAINT site_settings_key_format
    CHECK (key ~ '^[a-z][a-z0-9_]{1,79}$');

ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_value_is_object;
ALTER TABLE public.site_settings
    ADD CONSTRAINT site_settings_value_is_object
    CHECK (jsonb_typeof(value) IN ('object', 'array'));

CREATE INDEX IF NOT EXISTS idx_site_settings_public
    ON public.site_settings (key)
    WHERE is_public = TRUE;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SERVER-STAMPED UPDATED_AT
--    One trigger function, attached to both tables, so no writer can backdate.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_touch_site_copy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_site_settings_touch ON public.site_settings;
CREATE TRIGGER trg_site_settings_touch
    BEFORE UPDATE ON public.site_settings
    FOR EACH ROW EXECUTE FUNCTION public.fn_touch_site_copy();

DROP TRIGGER IF EXISTS trg_categories_touch ON public.categories;
CREATE TRIGGER trg_categories_touch
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.fn_touch_site_copy();


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
--    The backend reads with the service role and is unaffected; these policies
--    govern the anon/authenticated roles used by supabase-js.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND policyname = 'Public can view public site settings'
    ) THEN
        CREATE POLICY "Public can view public site settings" ON public.site_settings
            FOR SELECT USING (is_public = TRUE);
    END IF;
END $$;

-- No INSERT/UPDATE/DELETE policy exists for anon or authenticated: writes are
-- only reachable through the X-Admin-Key surface, which uses the service role.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'GRANT SELECT ON public.site_settings TO anon';
        EXECUTE 'GRANT SELECT ON public.categories TO anon';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT SELECT ON public.site_settings TO authenticated';
        EXECUTE 'GRANT SELECT ON public.categories TO authenticated';
    END IF;
END $$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SEED — the copy the bundle currently hardcodes, now editable
--    Every write is conditional, so re-running this file never overwrites an
--    admin edit and never touches a category that already has copy.
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.categories c
   SET subtitle       = v.subtitle,
       highlights     = v.highlights,
       hero_video_url = v.hero_video_url
  FROM (
        VALUES
            ('budget-killer',
             'Best value picks under tight budgets with balanced real-world performance.',
             '["Performance per rupee","Display quality in budget tier","Thermals under sustained load","Software and update policy"]'::jsonb,
             '/media/budgetkiller.mp4'),
            ('gaming-guru',
             'High FPS consistency, thermal control, and low-latency touch for competitive play.',
             '["Sustained FPS stability","Vapor chamber and cooling efficiency","Touch sampling and response rate","Battery drain during extended gaming"]'::jsonb,
             '/media/gaming guru.mp4'),
            ('camera-champ',
             'Balanced photography systems with true-to-life color, dynamic range, and detail.',
             '["Main sensor consistency","Low-light and night capture","Portrait edge detection","Video stabilization and audio"]'::jsonb,
             '/media/camera.mp4'),
            ('battery-boss',
             'Endurance-focused devices made for heavy users and all-day confidence.',
             '["Screen-on time under mixed use","Standby drain efficiency","Charging speed consistency","Battery health management"]'::jsonb,
             '/media/battry.mp4'),
            ('goat',
             'Flagship-grade excellence with no compromise across performance, camera, and build.',
             '["Flagship chip and sustained speed","Best-in-class imaging","Display and haptics quality","Long-term software support"]'::jsonb,
             '/media/goat.mp4')
       ) AS v(slug, subtitle, highlights, hero_video_url)
 WHERE c.slug = v.slug
   AND c.subtitle IS NULL
   AND c.highlights = '[]'::jsonb;

INSERT INTO public.site_settings (key, value, description, is_public) VALUES
    ('site',
     '{"name":"RMDU Mobiles","tagline":"Find the right phone, not the newest one."}'::jsonb,
     'Site name and tagline used in the header, footer and page titles.', TRUE),
    ('hero',
     '{"eyebrow":"Don''t Just Upgrade Your Phone","title":"Upgrade Your\nStatement","subtitle":"Honest guidance. Full transparency. Zero bias.","primary_cta":{"label":"Discover More","href":"#problem"}}'::jsonb,
     'Home hero: eyebrow, title, subtitle and the primary call to action. A backslash-n inside the title is a deliberate line break.', TRUE),
    ('nav',
     '[]'::jsonb,
     'Optional navigation overrides. An empty array means the menu is built from active categories.', TRUE),
    ('footer',
     '{"note":"Prices and availability are updated from the live catalog."}'::jsonb,
     'Footer note and optional contact/social blocks.', TRUE)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. REFRESH POSTGREST CACHE
-- ─────────────────────────────────────────────────────────────────────────────
ANALYZE public.categories;
ANALYZE public.site_settings;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
--   SELECT slug, subtitle, jsonb_array_length(highlights) AS chips, hero_video_url
--     FROM public.categories ORDER BY display_order;
--   SELECT key, is_public, version, updated_at FROM public.site_settings ORDER BY key;
--
-- END OF MIGRATION 09
-- =============================================================================
