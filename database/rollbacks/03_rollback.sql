-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 03
-- Target : Undoes all changes introduced in 03_normalization_and_indexes.sql
-- =============================================================================

SET lock_timeout = '3s';

-- 1. Drop Normalization Check Constraints
ALTER TABLE public.devices       DROP CONSTRAINT IF EXISTS chk_device_price_positive;
ALTER TABLE public.user_profiles  DROP CONSTRAINT IF EXISTS chk_budget_range_valid;
ALTER TABLE public.price_alerts   DROP CONSTRAINT IF EXISTS chk_price_alerts_positive;
ALTER TABLE public.device_specs   DROP CONSTRAINT IF EXISTS chk_specs_battery_positive;
ALTER TABLE public.device_specs   DROP CONSTRAINT IF EXISTS chk_specs_ram_positive;
ALTER TABLE public.device_specs   DROP CONSTRAINT IF EXISTS chk_specs_cpu_cores_range;
ALTER TABLE public.device_specs   DROP CONSTRAINT IF EXISTS chk_specs_refresh_rate_range;
ALTER TABLE public.device_specs   DROP CONSTRAINT IF EXISTS chk_specs_charging_positive;

-- 2. Drop Hardware Specification Filter Indexes
DROP INDEX IF EXISTS public.idx_specs_os;
DROP INDEX IF EXISTS public.idx_specs_os_trgm;
DROP INDEX IF EXISTS public.idx_specs_cpu_cores;
DROP INDEX IF EXISTS public.idx_specs_processor_brand;
DROP INDEX IF EXISTS public.idx_specs_ram_storage;
DROP INDEX IF EXISTS public.idx_specs_refresh_display;
DROP INDEX IF EXISTS public.idx_specs_battery_charging;
DROP INDEX IF EXISTS public.idx_specs_camera_primary;
DROP INDEX IF EXISTS public.idx_specs_five_g;

-- 3. Drop Advanced Composite & Partial Indexes
DROP INDEX IF EXISTS public.idx_devices_active_brand_price;
DROP INDEX IF EXISTS public.idx_devices_featured_active;
DROP INDEX IF EXISTS public.idx_dev_cat_composite;
DROP INDEX IF EXISTS public.idx_reviews_approved_feed;
DROP INDEX IF EXISTS public.idx_shopkeeper_active_lookup;
DROP INDEX IF EXISTS public.idx_price_alerts_untriggered;
DROP INDEX IF EXISTS public.idx_uph_user_device_time;
DROP INDEX IF EXISTS public.idx_comparison_user_time;
DROP INDEX IF EXISTS public.idx_user_profiles_priority_budget;

-- 4. Drop GIN Trigram Search Indexes
DROP INDEX IF EXISTS public.idx_devices_name_trgm;
DROP INDEX IF EXISTS public.idx_brands_name_trgm;
DROP INDEX IF EXISTS public.idx_specs_processor_trgm;
