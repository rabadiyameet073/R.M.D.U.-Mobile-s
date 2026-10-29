-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 07
-- Target : Removes everything 07_concurrency_holds_and_versions.sql created.
--
-- WARNING : Dropping `resource_holds` or `idempotency_requests` destroys claim
--           and replay history. Export both tables first if any environment has
--           used them in production:
--             COPY (SELECT * FROM public.resource_holds) TO '/tmp/holds.csv' CSV HEADER;
--             COPY (SELECT * FROM public.idempotency_requests) TO '/tmp/idempotency.csv' CSV HEADER;
--
-- WARNING : Dropping the `version` columns breaks any backend build that selects
--           them. Roll the API back to a build without version support first.
--
-- NOTE    : 06_fix_category_rank_trigger.sql is intentionally left in place.
--           Restoring the recursive trigger would re-introduce ERROR 54001.
-- =============================================================================

SET lock_timeout = '3s';

BEGIN;

-- 1. RPCs that only read/write the dropped tables go first.
DROP FUNCTION IF EXISTS fn_sweep_concurrency_state(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS fn_complete_idempotent(TEXT, TEXT, TEXT, SMALLINT, JSONB, TEXT);
DROP FUNCTION IF EXISTS fn_begin_idempotent(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_slot_status(TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_release_slot(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS fn_confirm_slot(UUID, TEXT);
DROP FUNCTION IF EXISTS fn_claim_slot(TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, JSONB);
DROP FUNCTION IF EXISTS fn_rerank_device(UUID, UUID, INTEGER, INTEGER, BOOLEAN, TEXT, UUID, INET);

-- 2. Tables.
DROP TABLE IF EXISTS public.idempotency_requests;
DROP TABLE IF EXISTS public.resource_holds;

-- 3. Version triggers, then the shared function, then the columns.
DROP TRIGGER IF EXISTS trg_devices_version              ON public.devices;
DROP TRIGGER IF EXISTS trg_user_profiles_version        ON public.user_profiles;
DROP TRIGGER IF EXISTS trg_recommendation_rules_version ON public.recommendation_rules;
DROP TRIGGER IF EXISTS trg_categories_version           ON public.categories;

DROP FUNCTION IF EXISTS fn_bump_row_version();

ALTER TABLE public.devices              DROP COLUMN IF EXISTS version;
ALTER TABLE public.user_profiles        DROP COLUMN IF EXISTS version;
ALTER TABLE public.recommendation_rules DROP COLUMN IF EXISTS version;
ALTER TABLE public.categories           DROP COLUMN IF EXISTS version;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VERIFICATION (run manually after rolling back)
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema = 'public'
--      AND table_name IN ('devices', 'user_profiles', 'recommendation_rules', 'categories')
--      AND column_name = 'version';            -- expect 0 rows
--   SELECT to_regclass('public.resource_holds');        -- expect NULL
--   SELECT to_regclass('public.idempotency_requests');  -- expect NULL
-- =============================================================================
