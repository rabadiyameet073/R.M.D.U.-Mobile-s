-- =============================================================================
-- RMDU MOBILES — DATABASE MIGRATION 03
-- File        : 03_normalization_and_indexes.sql
-- Order       : STEP 3 (Run after 01_mobilemart_schema.sql & 02_google_oauth_customer_sync.sql)
-- Target      : Supabase SQL Editor (PostgreSQL 15+)
-- Description : Complete Database Normalization Enforcements (1NF to BCNF),
--               Data Integrity Checks, Hardware Specification Indexes (cpu_cores, os,
--               ram_gb, storage_gb, refresh_rate, battery, 5G), Composite Indexes,
--               GIN Trigram Search, and Query Planner Optimizations.
-- =============================================================================

-- =============================================================================
-- 1. NORMALIZATION & DOMAIN INTEGRITY CONSTRAINTS
-- Enforces strict mathematical domain bounds to prevent data anomalies
-- =============================================================================

-- 1.1 Ensure device price is strictly non-negative
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_device_price_positive') THEN
        ALTER TABLE public.devices ADD CONSTRAINT chk_device_price_positive CHECK (price >= 0);
    END IF;
END $$;

-- 1.2 Ensure user budget ranges are logically consistent (budget_min <= budget_max)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_budget_range_valid') THEN
        ALTER TABLE public.user_profiles ADD CONSTRAINT chk_budget_range_valid CHECK (budget_min <= budget_max);
    END IF;
END $$;

-- 1.3 Ensure target price in price_alerts is positive
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_price_alerts_positive') THEN
        ALTER TABLE public.price_alerts ADD CONSTRAINT chk_price_alerts_positive CHECK (target_price > 0);
    END IF;
END $$;

-- 1.4 Normalize hardware specifications domain bounds (cpu_cores, refresh_rate, battery, ram)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_specs_battery_positive') THEN
        ALTER TABLE public.device_specs ADD CONSTRAINT chk_specs_battery_positive 
        CHECK (battery_mah IS NULL OR battery_mah > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_specs_ram_positive') THEN
        ALTER TABLE public.device_specs ADD CONSTRAINT chk_specs_ram_positive 
        CHECK (ram_gb IS NULL OR ram_gb > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_specs_cpu_cores_range') THEN
        ALTER TABLE public.device_specs ADD CONSTRAINT chk_specs_cpu_cores_range 
        CHECK (cpu_cores IS NULL OR cpu_cores BETWEEN 1 AND 32);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_specs_refresh_rate_range') THEN
        ALTER TABLE public.device_specs ADD CONSTRAINT chk_specs_refresh_rate_range 
        CHECK (refresh_rate_hz IS NULL OR refresh_rate_hz BETWEEN 30 AND 360);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_specs_charging_positive') THEN
        ALTER TABLE public.device_specs ADD CONSTRAINT chk_specs_charging_positive 
        CHECK (charging_watt IS NULL OR charging_watt >= 0);
    END IF;
END $$;

-- =============================================================================
-- 2. HARDWARE SPECIFICATION FILTER INDEXES (device_specs)
-- Eliminates Sequential Scans when users filter by RAM, OS, CPU, Battery, 5G, etc.
-- =============================================================================

-- 2.1 OS & Software Platform Filtering (e.g. "Android 14", "iOS 17")
CREATE INDEX IF NOT EXISTS idx_specs_os 
ON public.device_specs (os);

CREATE INDEX IF NOT EXISTS idx_specs_os_trgm 
ON public.device_specs USING gin(os gin_trgm_ops);

-- 2.2 CPU Cores & Processor Architecture (e.g. 8 cores, Octa-core)
CREATE INDEX IF NOT EXISTS idx_specs_cpu_cores 
ON public.device_specs (cpu_cores);

-- 2.3 Processor Brand Chipset (Snapdragon, MediaTek Dimensity, Apple A-series)
CREATE INDEX IF NOT EXISTS idx_specs_processor_brand 
ON public.device_specs (processor_brand);

-- 2.4 RAM & Storage Memory Matrix (e.g. "12GB RAM + 256GB Storage")
CREATE INDEX IF NOT EXISTS idx_specs_ram_storage 
ON public.device_specs (ram_gb, storage_gb);

-- 2.5 Display Refresh Rate & Panel Tech (e.g. "120Hz" + "AMOLED")
CREATE INDEX IF NOT EXISTS idx_specs_refresh_display 
ON public.device_specs (refresh_rate_hz DESC, display_type);

-- 2.6 Battery Endurance & Wired Fast Charging Speed
CREATE INDEX IF NOT EXISTS idx_specs_battery_charging 
ON public.device_specs (battery_mah DESC, charging_watt DESC);

-- 2.7 Primary Camera Resolution (e.g. ">= 50 MP", ">= 108 MP", ">= 200 MP")
CREATE INDEX IF NOT EXISTS idx_specs_camera_primary 
ON public.device_specs (camera_primary_mp DESC);

-- 2.8 5G Network Readiness (Partial Index: only indexes 5G devices for compact speed)
CREATE INDEX IF NOT EXISTS idx_specs_five_g 
ON public.device_specs (device_id) 
WHERE five_g = TRUE;

-- =============================================================================
-- 3. ADVANCED COMPOSITE & PARTIAL PERFORMANCE INDEXES
-- Accelerates real-time catalog browsing, comparisons & category rankings
-- =============================================================================

-- 3.1 Composite Filtered Index: Active Catalog Browsing (brand + price)
CREATE INDEX IF NOT EXISTS idx_devices_active_brand_price 
ON public.devices (brand_id, price) 
WHERE is_active = TRUE;

-- 3.2 Composite Partial Index: Featured Active Phones on Homepage
CREATE INDEX IF NOT EXISTS idx_devices_featured_active 
ON public.devices (price ASC) 
WHERE is_active = TRUE AND is_featured = TRUE;

-- 3.3 Composite Index: Category Dynamic Ranking Lookups
CREATE INDEX IF NOT EXISTS idx_dev_cat_composite 
ON public.device_categories (category_id, rank ASC, device_id);

-- 3.4 Partial Index: Approved Reviews by Device & Rating
CREATE INDEX IF NOT EXISTS idx_reviews_approved_feed 
ON public.reviews (device_id, rating DESC, created_at DESC) 
WHERE is_approved = TRUE;

-- 3.5 Composite Index: Shopkeeper Cards Short Code & Expiry Lookup
CREATE INDEX IF NOT EXISTS idx_shopkeeper_active_lookup 
ON public.shopkeeper_cards (short_code, expires_at DESC);

-- 3.6 Partial Index: Untriggered Price Alerts (for Background Monitoring)
CREATE INDEX IF NOT EXISTS idx_price_alerts_untriggered 
ON public.price_alerts (device_id, target_price) 
WHERE is_triggered = FALSE;

-- 3.7 Composite Index: User Phone History Fast Timeline
CREATE INDEX IF NOT EXISTS idx_uph_user_device_time 
ON public.user_phone_history (user_id, added_at DESC);

-- 3.8 Composite Index: Comparison Sessions Analytics
CREATE INDEX IF NOT EXISTS idx_comparison_user_time 
ON public.comparison_sessions (user_id, created_at DESC);

-- 3.9 Customer Taste Profile Lookup Index
CREATE INDEX IF NOT EXISTS idx_user_profiles_priority_budget 
ON public.user_profiles (primary_priority, budget_min, budget_max);

-- =============================================================================
-- 4. FUZZY AUTO-COMPLETE & SEARCH INDEXES (GIN Trigram)
-- Enables instant typo-tolerant search across devices, brands, and chipsets
-- =============================================================================

-- Typo-tolerant search on device name (e.g. searching "galxy s24" finds "Galaxy S24")
CREATE INDEX IF NOT EXISTS idx_devices_name_trgm 
ON public.devices USING gin(name gin_trgm_ops);

-- Typo-tolerant search on brand name (e.g. searching "samsng" finds "Samsung")
CREATE INDEX IF NOT EXISTS idx_brands_name_trgm 
ON public.brands USING gin(name gin_trgm_ops);

-- Typo-tolerant search on chipset name (e.g. "snapdrgn 8 gen 3")
CREATE INDEX IF NOT EXISTS idx_specs_processor_trgm 
ON public.device_specs USING gin(processor_name gin_trgm_ops);

-- =============================================================================
-- 5. VACUUM & QUERY PLANNER STATS REFRESH
-- Updates PostgreSQL internal statistics for optimal query plans
-- =============================================================================
ANALYZE public.brands;
ANALYZE public.devices;
ANALYZE public.device_specs;
ANALYZE public.device_scores;
ANALYZE public.categories;
ANALYZE public.device_categories;
ANALYZE public.users;
ANALYZE public.user_profiles;
ANALYZE public.user_phone_history;
ANALYZE public.recommendations;
ANALYZE public.reviews;
ANALYZE public.shopkeeper_cards;
