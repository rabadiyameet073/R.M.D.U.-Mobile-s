-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 09
-- Target : Removes everything 09_storefront_copy_and_site_settings.sql created.
--
-- WARNING : Dropping `site_settings` deletes every hero/nav/footer section an
--           admin has authored. Export it first if any environment has real
--           content:
--             COPY (SELECT * FROM public.site_settings) TO '/tmp/site_settings.csv' CSV HEADER;
--
-- WARNING : Dropping the category copy columns deletes `subtitle`,
--           `highlights`, `hero_video_url` and `cover_image_url` for every
--           category. Export them first:
--             COPY (SELECT slug, subtitle, highlights, hero_video_url, cover_image_url
--                     FROM public.categories) TO '/tmp/category_copy.csv' CSV HEADER;
--
-- WARNING : A backend build that selects those columns falls back to the base
--           projection on the first failed read, so the storefront keeps
--           rendering — but with the built-in copy defaults, not the stored copy.
--
-- SAFE : `categories.updated_at`, its trigger and the shared trigger function are
--        removed too; nothing that existed before migration 09 is touched.
-- =============================================================================
SET lock_timeout = '3s';

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TRIGGERS + FUNCTION
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_categories_touch   ON public.categories;
DROP TRIGGER IF EXISTS trg_site_settings_touch ON public.site_settings;
DROP FUNCTION IF EXISTS public.fn_touch_site_copy();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SITE SETTINGS
-- ─────────────────────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS public.site_settings;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CATEGORY DISPLAY COPY
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_highlights_is_array;
ALTER TABLE public.categories DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.categories DROP COLUMN IF EXISTS cover_image_url;
ALTER TABLE public.categories DROP COLUMN IF EXISTS hero_video_url;
ALTER TABLE public.categories DROP COLUMN IF EXISTS highlights;
ALTER TABLE public.categories DROP COLUMN IF EXISTS subtitle;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- END OF ROLLBACK 09
-- =============================================================================
