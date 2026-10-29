-- =============================================================================
-- RMDU MOBILES — DATABASE SEED MIGRATION 05 [OPTIONAL - TESTING / DEMO ONLY]
-- File        : 05_seed_catalog_phones.sql
-- Status      : OPTIONAL (DO NOT RUN FOR CLEAN PRODUCTION DEPLOYMENT)
-- Description : Optional demo seed data: Top Smartphone Brands, Flagship &
--               Mid-range Devices, Technical Specs, Benchmark Scores,
--               Pros & Cons, and Category Rankings for demo/testing purposes.
-- Safety      : Fully idempotent. Uses ON CONFLICT to avoid duplicate key errors.
-- =============================================================================

SET lock_timeout = '3s';

DO $$
DECLARE
    -- Brand IDs
    v_brand_samsung UUID;
    v_brand_apple   UUID;
    v_brand_oneplus UUID;
    v_brand_google  UUID;
    v_brand_xiaomi  UUID;
    v_brand_moto    UUID;
    v_brand_vivo    UUID;
    v_brand_realme  UUID;

    -- Device IDs
    v_dev_s24u      UUID;
    v_dev_ip15pm    UUID;
    v_dev_op12r     UUID;
    v_dev_vivo_x100 UUID;
    v_dev_rn13pp    UUID;
    v_dev_motog84   UUID;
    v_dev_narzo70   UUID;

    -- Category IDs
    v_cat_budget    UUID;
    v_cat_gaming    UUID;
    v_cat_camera    UUID;
    v_cat_battery   UUID;
    v_cat_goat      UUID;

BEGIN
    -- ─────────────────────────────────────────────────────────────────────────
    -- 1. SEED BRANDS
    -- ─────────────────────────────────────────────────────────────────────────
    INSERT INTO public.brands (name, slug, country, logo_url, is_active)
    VALUES 
        ('Samsung',   'samsung',   'South Korea',   'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=128&auto=format&fit=crop&q=80', TRUE),
        ('Apple',     'apple',     'United States', 'https://images.unsplash.com/photo-1621768216002-5ac171876625?w=128&auto=format&fit=crop&q=80', TRUE),
        ('OnePlus',   'oneplus',   'China',         'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=128&auto=format&fit=crop&q=80', TRUE),
        ('Google',    'google',    'United States', 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?w=128&auto=format&fit=crop&q=80', TRUE),
        ('Xiaomi',    'xiaomi',    'China',         'https://images.unsplash.com/photo-1511707171634-5f897ff02560?w=128&auto=format&fit=crop&q=80', TRUE),
        ('Motorola',  'motorola',  'United States', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=128&auto=format&fit=crop&q=80', TRUE),
        ('Vivo',      'vivo',      'China',         'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=128&auto=format&fit=crop&q=80', TRUE),
        ('Realme',    'realme',    'China',         'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=128&auto=format&fit=crop&q=80', TRUE)
    ON CONFLICT (slug) DO UPDATE SET is_active = TRUE;

    SELECT id INTO v_brand_samsung FROM public.brands WHERE slug = 'samsung';
    SELECT id INTO v_brand_apple   FROM public.brands WHERE slug = 'apple';
    SELECT id INTO v_brand_oneplus FROM public.brands WHERE slug = 'oneplus';
    SELECT id INTO v_brand_google  FROM public.brands WHERE slug = 'google';
    SELECT id INTO v_brand_xiaomi  FROM public.brands WHERE slug = 'xiaomi';
    SELECT id INTO v_brand_moto    FROM public.brands WHERE slug = 'motorola';
    SELECT id INTO v_brand_vivo    FROM public.brands WHERE slug = 'vivo';
    SELECT id INTO v_brand_realme  FROM public.brands WHERE slug = 'realme';

    -- ─────────────────────────────────────────────────────────────────────────
    -- 2. FETCH SIGNATURE CATEGORIES
    -- ─────────────────────────────────────────────────────────────────────────
    SELECT id INTO v_cat_budget  FROM public.categories WHERE slug = 'budget-killer';
    SELECT id INTO v_cat_gaming  FROM public.categories WHERE slug = 'gaming-guru';
    SELECT id INTO v_cat_camera  FROM public.categories WHERE slug = 'camera-champ';
    SELECT id INTO v_cat_battery FROM public.categories WHERE slug = 'battery-boss';
    SELECT id INTO v_cat_goat    FROM public.categories WHERE slug = 'goat';


    -- ─────────────────────────────────────────────────────────────────────────
    -- 3. SEED DEVICES
    -- ─────────────────────────────────────────────────────────────────────────

    -- 3.1 Samsung Galaxy S24 Ultra
    INSERT INTO public.devices (brand_id, name, slug, price, release_date, image_url, color_options, is_featured, is_active)
    VALUES (
        v_brand_samsung,
        'Samsung Galaxy S24 Ultra',
        'samsung-galaxy-s24-ultra',
        129999.00,
        '2024-01-24',
        'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=600&auto=format&fit=crop&q=80',
        ARRAY['Titanium Gray', 'Titanium Black', 'Titanium Violet', 'Titanium Yellow'],
        TRUE,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

    -- 3.2 Apple iPhone 15 Pro Max
    INSERT INTO public.devices (brand_id, name, slug, price, release_date, image_url, color_options, is_featured, is_active)
    VALUES (
        v_brand_apple,
        'Apple iPhone 15 Pro Max',
        'apple-iphone-15-pro-max',
        159900.00,
        '2023-09-22',
        'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&auto=format&fit=crop&q=80',
        ARRAY['Natural Titanium', 'Blue Titanium', 'White Titanium', 'Black Titanium'],
        TRUE,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

    -- 3.3 OnePlus 12R
    INSERT INTO public.devices (brand_id, name, slug, price, release_date, image_url, color_options, is_featured, is_active)
    VALUES (
        v_brand_oneplus,
        'OnePlus 12R',
        'oneplus-12r',
        39999.00,
        '2024-02-06',
        'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=600&auto=format&fit=crop&q=80',
        ARRAY['Cool Blue', 'Iron Gray'],
        TRUE,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

    -- 3.4 Vivo X100 Pro
    INSERT INTO public.devices (brand_id, name, slug, price, release_date, image_url, color_options, is_featured, is_active)
    VALUES (
        v_brand_vivo,
        'Vivo X100 Pro 5G',
        'vivo-x100-pro-5g',
        89999.00,
        '2024-01-04',
        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=600&auto=format&fit=crop&q=80',
        ARRAY['Asteroid Black', 'Sunset Orange'],
        TRUE,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

    -- 3.5 Redmi Note 13 Pro+ 5G
    INSERT INTO public.devices (brand_id, name, slug, price, release_date, image_url, color_options, is_featured, is_active)
    VALUES (
        v_brand_xiaomi,
        'Redmi Note 13 Pro+ 5G',
        'redmi-note-13-pro-plus-5g',
        29999.00,
        '2024-01-10',
        'https://images.unsplash.com/photo-1511707171634-5f897ff02560?w=600&auto=format&fit=crop&q=80',
        ARRAY['Fusion Black', 'Fusion White', 'Fusion Purple'],
        TRUE,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

    -- 3.6 Motorola Moto G84 5G
    INSERT INTO public.devices (brand_id, name, slug, price, release_date, image_url, color_options, is_featured, is_active)
    VALUES (
        v_brand_moto,
        'Motorola Moto G84 5G',
        'motorola-moto-g84-5g',
        17999.00,
        '2023-09-08',
        'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=600&auto=format&fit=crop&q=80',
        ARRAY['Viva Magenta', 'Marshmallow Blue', 'Midnight Blue'],
        TRUE,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

    -- 3.7 Realme Narzo 70 Pro 5G
    INSERT INTO public.devices (brand_id, name, slug, price, release_date, image_url, color_options, is_featured, is_active)
    VALUES (
        v_brand_realme,
        'Realme Narzo 70 Pro 5G',
        'realme-narzo-70-pro-5g',
        19999.00,
        '2024-03-19',
        'https://images.unsplash.com/photo-1567581935884-3349723552ca?w=600&auto=format&fit=crop&q=80',
        ARRAY['Glass Green', 'Glass Gold'],
        TRUE,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

    -- Guarantee all device IDs are loaded into variables
    SELECT id INTO v_dev_s24u      FROM public.devices WHERE slug = 'samsung-galaxy-s24-ultra';
    SELECT id INTO v_dev_ip15pm    FROM public.devices WHERE slug = 'apple-iphone-15-pro-max';
    SELECT id INTO v_dev_op12r     FROM public.devices WHERE slug = 'oneplus-12r';
    SELECT id INTO v_dev_vivo_x100 FROM public.devices WHERE slug = 'vivo-x100-pro-5g';
    SELECT id INTO v_dev_rn13pp    FROM public.devices WHERE slug = 'redmi-note-13-pro-plus-5g';
    SELECT id INTO v_dev_motog84   FROM public.devices WHERE slug = 'motorola-moto-g84-5g';
    SELECT id INTO v_dev_narzo70   FROM public.devices WHERE slug = 'realme-narzo-70-pro-5g';


    -- ─────────────────────────────────────────────────────────────────────────
    -- 4. SEED DETAILED HARDWARE SPECS (device_specs)
    -- Matched exactly with 01_mobilemart_schema.sql column definitions
    -- ─────────────────────────────────────────────────────────────────────────

    -- Specs: Galaxy S24 Ultra
    INSERT INTO public.device_specs (
        device_id, processor_name, processor_brand, process_node, cpu_cores, gpu_name, antutu_score,
        ram_gb, storage_gb, storage_type, display_size_inch, display_resolution, display_type,
        refresh_rate_hz, peak_brightness_nit, protection, camera_primary_mp, camera_ultra_mp,
        camera_tele_mp, camera_front_mp, camera_features, video_max_res, battery_mah, charging_watt,
        wireless_watt, five_g, nfc, os, ui_layer, guaranteed_updates, weight_grams, ip_rating
    ) VALUES (
        v_dev_s24u, 'Snapdragon 8 Gen 3 for Galaxy', 'Qualcomm', '4nm', 8, 'Adreno 750', 1850000,
        12, 256, 'UFS 4.0', 6.8, '3120x1440', 'LTPO AMOLED',
        120, 2600, 'Gorilla Armor', 200, 12, 50, 12, ARRAY['OIS', '5x Optical Zoom', '8K Video', 'Laser AF'],
        '8K@30fps', 5000, 45, 15, TRUE, TRUE, 'Android 14', 'One UI 6.1', 7, 232, 'IP68'
    ) ON CONFLICT (device_id) DO UPDATE SET antutu_score = EXCLUDED.antutu_score;

    -- Specs: iPhone 15 Pro Max
    INSERT INTO public.device_specs (
        device_id, processor_name, processor_brand, process_node, cpu_cores, gpu_name, antutu_score,
        ram_gb, storage_gb, storage_type, display_size_inch, display_resolution, display_type,
        refresh_rate_hz, peak_brightness_nit, protection, camera_primary_mp, camera_ultra_mp,
        camera_tele_mp, camera_front_mp, camera_features, video_max_res, battery_mah, charging_watt,
        wireless_watt, five_g, nfc, os, ui_layer, guaranteed_updates, weight_grams, ip_rating
    ) VALUES (
        v_dev_ip15pm, 'Apple A17 Pro', 'Apple', '3nm', 6, 'Apple GPU 6-core', 1550000,
        8, 256, 'NVMe', 6.7, '2796x1290', 'LTPO Super Retina OLED',
        120, 2000, 'Ceramic Shield', 48, 12, 12, 12, ARRAY['Sensor-shift OIS', '5x Tetraprism Zoom', 'ProRes 4K60', 'Action Button'],
        '4K@60fps', 4422, 27, 15, TRUE, TRUE, 'iOS 17', 'iOS', 5, 221, 'IP68'
    ) ON CONFLICT (device_id) DO UPDATE SET antutu_score = EXCLUDED.antutu_score;

    -- Specs: OnePlus 12R
    INSERT INTO public.device_specs (
        device_id, processor_name, processor_brand, process_node, cpu_cores, gpu_name, antutu_score,
        ram_gb, storage_gb, storage_type, display_size_inch, display_resolution, display_type,
        refresh_rate_hz, peak_brightness_nit, protection, camera_primary_mp, camera_ultra_mp,
        camera_tele_mp, camera_front_mp, camera_features, video_max_res, battery_mah, charging_watt,
        five_g, nfc, os, ui_layer, guaranteed_updates, weight_grams, ip_rating
    ) VALUES (
        v_dev_op12r, 'Snapdragon 8 Gen 2', 'Qualcomm', '4nm', 8, 'Adreno 740', 1380000,
        16, 256, 'UFS 3.1', 6.78, '2780x1264', 'LTPO4 AMOLED',
        120, 4500, 'Gorilla Glass Victus 2', 50, 8, 2, 16, ARRAY['OIS', 'Sony IMX890', '4K Video'],
        '4K@60fps', 5500, 100, TRUE, TRUE, 'Android 14', 'OxygenOS 14', 4, 207, 'IP64'
    ) ON CONFLICT (device_id) DO UPDATE SET antutu_score = EXCLUDED.antutu_score;

    -- Specs: Vivo X100 Pro
    INSERT INTO public.device_specs (
        device_id, processor_name, processor_brand, process_node, cpu_cores, gpu_name, antutu_score,
        ram_gb, storage_gb, storage_type, display_size_inch, display_resolution, display_type,
        refresh_rate_hz, peak_brightness_nit, protection, camera_primary_mp, camera_ultra_mp,
        camera_tele_mp, camera_front_mp, camera_features, video_max_res, battery_mah, charging_watt,
        wireless_watt, five_g, nfc, os, ui_layer, guaranteed_updates, weight_grams, ip_rating
    ) VALUES (
        v_dev_vivo_x100, 'MediaTek Dimensity 9300', 'MediaTek', '4nm', 8, 'Immortalis-G720', 2100000,
        16, 512, 'UFS 4.0', 6.78, '2800x1260', 'LTPO AMOLED',
        120, 3000, 'Armor Glass', 50, 50, 50, 32, ARRAY['1-inch Sony IMX989', 'Zeiss APO Telephoto', 'OIS', '8K Video'],
        '8K@30fps', 5400, 100, 50, TRUE, TRUE, 'Android 14', 'Funtouch OS 14', 3, 225, 'IP68'
    ) ON CONFLICT (device_id) DO UPDATE SET antutu_score = EXCLUDED.antutu_score;

    -- Specs: Redmi Note 13 Pro+
    INSERT INTO public.device_specs (
        device_id, processor_name, processor_brand, process_node, cpu_cores, gpu_name, antutu_score,
        ram_gb, storage_gb, storage_type, display_size_inch, display_resolution, display_type,
        refresh_rate_hz, peak_brightness_nit, protection, camera_primary_mp, camera_ultra_mp,
        camera_tele_mp, camera_front_mp, camera_features, video_max_res, battery_mah, charging_watt,
        five_g, nfc, os, ui_layer, guaranteed_updates, weight_grams, ip_rating
    ) VALUES (
        v_dev_rn13pp, 'MediaTek Dimensity 7200 Ultra', 'MediaTek', '4nm', 8, 'Mali-G610 MC4', 750000,
        8, 256, 'UFS 3.1', 6.67, '2712x1220', 'Curved AMOLED',
        120, 1800, 'Gorilla Glass Victus', 200, 8, 2, 16, ARRAY['200MP ISOCELL HP3', 'OIS', '4K Video'],
        '4K@30fps', 5000, 120, TRUE, TRUE, 'Android 13', 'MIUI 14', 3, 204, 'IP68'
    ) ON CONFLICT (device_id) DO UPDATE SET antutu_score = EXCLUDED.antutu_score;

    -- Specs: Moto G84 5G
    INSERT INTO public.device_specs (
        device_id, processor_name, processor_brand, process_node, cpu_cores, gpu_name, antutu_score,
        ram_gb, storage_gb, storage_type, display_size_inch, display_resolution, display_type,
        refresh_rate_hz, peak_brightness_nit, protection, camera_primary_mp, camera_ultra_mp,
        camera_front_mp, camera_features, video_max_res, battery_mah, charging_watt,
        five_g, nfc, os, ui_layer, guaranteed_updates, weight_grams, ip_rating
    ) VALUES (
        v_dev_motog84, 'Snapdragon 695 5G', 'Qualcomm', '6nm', 8, 'Adreno 619', 425000,
        12, 256, 'UFS 2.2', 6.55, '2400x1080', 'pOLED 10-bit',
        120, 1300, 'Panda Glass', 50, 8, 16, ARRAY['50MP OIS', 'Ultra-pixel tech'],
        '1080p@60fps', 5000, 33, TRUE, TRUE, 'Android 13', 'MyUX', 2, 168, 'IP54'
    ) ON CONFLICT (device_id) DO UPDATE SET antutu_score = EXCLUDED.antutu_score;

    -- Specs: Realme Narzo 70 Pro 5G
    INSERT INTO public.device_specs (
        device_id, processor_name, processor_brand, process_node, cpu_cores, gpu_name, antutu_score,
        ram_gb, storage_gb, storage_type, display_size_inch, display_resolution, display_type,
        refresh_rate_hz, peak_brightness_nit, protection, camera_primary_mp, camera_ultra_mp,
        camera_front_mp, camera_features, video_max_res, battery_mah, charging_watt,
        five_g, os, ui_layer, guaranteed_updates, weight_grams, ip_rating
    ) VALUES (
        v_dev_narzo70, 'MediaTek Dimensity 7050', 'MediaTek', '6nm', 8, 'Mali-G68 MC4', 590000,
        8, 128, 'UFS 3.1', 6.67, '2400x1080', 'AMOLED',
        120, 2000, 'DT-Star2 Glass', 50, 8, 16, ARRAY['Sony IMX890', 'OIS', 'Air Gestures'],
        '4K@30fps', 5000, 67, TRUE, 'Android 14', 'Realme UI 5.0', 3, 195, 'IP54'
    ) ON CONFLICT (device_id) DO UPDATE SET antutu_score = EXCLUDED.antutu_score;


    -- ─────────────────────────────────────────────────────────────────────────
    -- 5. SEED SCORES (Auto-computes overall_score via trg_compute_overall_score)
    -- ─────────────────────────────────────────────────────────────────────────
    INSERT INTO public.device_scores (
        device_id, performance_score, camera_score, battery_score, display_score, value_score, build_score, software_score
    ) VALUES
        (v_dev_s24u,      96.0, 95.0, 88.0, 97.0, 78.0, 98.0, 94.0),
        (v_dev_ip15pm,    97.0, 96.0, 86.0, 96.0, 72.0, 98.0, 95.0),
        (v_dev_op12r,     91.0, 76.0, 94.0, 93.0, 95.0, 88.0, 86.0),
        (v_dev_vivo_x100, 95.0, 98.0, 90.0, 94.0, 82.0, 91.0, 84.0),
        (v_dev_rn13pp,    78.0, 84.0, 86.0, 89.0, 92.0, 87.0, 80.0),
        (v_dev_motog84,   68.0, 72.0, 89.0, 85.0, 96.0, 82.0, 88.0),
        (v_dev_narzo70,   74.0, 81.0, 87.0, 86.0, 94.0, 83.0, 82.0)
    ON CONFLICT (device_id) DO UPDATE SET
        performance_score = EXCLUDED.performance_score,
        camera_score = EXCLUDED.camera_score;


    -- ─────────────────────────────────────────────────────────────────────────
    -- 6. SEED PROS & CONS
    -- ─────────────────────────────────────────────────────────────────────────
    INSERT INTO public.device_pros_cons (device_id, type, text, display_order) VALUES
        (v_dev_s24u, 'pro', 'Industry-best flat anti-reflective Gorilla Armor display', 1),
        (v_dev_s24u, 'pro', '7 years of guaranteed OS and security upgrades', 2),
        (v_dev_s24u, 'con', 'Large 232g titanium chassis feels hefty in single-hand use', 1),
        (v_dev_s24u, 'con', '45W charging remains slower than Chinese flagship competitors', 2),

        (v_dev_op12r, 'pro', 'Massive 5500 mAh battery with blistering 100W fast charging', 1),
        (v_dev_op12r, 'pro', 'Top-tier Snapdragon 8 Gen 2 gaming performance under ₹40,000', 2),
        (v_dev_op12r, 'con', 'Secondary ultra-wide and macro cameras are mediocre', 1),
        (v_dev_op12r, 'con', 'Lacks wireless charging and full IP68 water rating', 2),

        (v_dev_rn13pp, 'pro', 'Premium IP68 curved glass design under ₹30,000', 1),
        (v_dev_rn13pp, 'pro', 'Ultra-sharp 200MP Samsung ISOCELL HP3 camera with OIS', 2),
        (v_dev_rn13pp, 'con', 'Pre-installed bloatware requires initial clean-up', 1),

        (v_dev_motog84, 'pro', 'Clean bloat-free near-stock Android software experience', 1),
        (v_dev_motog84, 'pro', 'Ultra-lightweight 168g body with vegan leather back', 2),
        (v_dev_motog84, 'con', 'Only 1 guaranteed major Android OS version upgrade', 1)
    ON CONFLICT DO NOTHING;


    -- ─────────────────────────────────────────────────────────────────────────
    -- 7. SEED SIGNATURE CATEGORY RANKINGS
    -- ─────────────────────────────────────────────────────────────────────────
    -- GOAT (Flagship Leaders)
    INSERT INTO public.device_categories (device_id, category_id, rank, rank_locked, justification)
    VALUES 
        (v_dev_s24u,   v_cat_goat, 1, TRUE, 'Unrivaled productivity with S-Pen, 7yr OS commitment, and anti-glare display.'),
        (v_dev_ip15pm, v_cat_goat, 2, TRUE, 'Exceptional A17 Pro gaming graphics, 4K60 ProRes video, and premium titanium fit.')
    ON CONFLICT (device_id, category_id) DO UPDATE SET justification = EXCLUDED.justification;

    -- Camera Champ
    INSERT INTO public.device_categories (device_id, category_id, rank, rank_locked, justification)
    VALUES 
        (v_dev_vivo_x100, v_cat_camera, 1, TRUE, '1-inch Sony sensor with Zeiss APO telephoto produces breathtaking portrait optics.'),
        (v_dev_s24u,      v_cat_camera, 2, TRUE, '200MP primary and dual telephoto provide unmatched optical zoom range.')
    ON CONFLICT (device_id, category_id) DO UPDATE SET justification = EXCLUDED.justification;

    -- Gaming Guru
    INSERT INTO public.device_categories (device_id, category_id, rank, rank_locked, justification)
    VALUES 
        (v_dev_op12r, v_cat_gaming, 1, TRUE, 'Cryo-Velocity vapor cooling paired with Snapdragon 8 Gen 2 yields steady 90 FPS.'),
        (v_dev_s24u,  v_cat_gaming, 2, TRUE, 'Peak ray-tracing fidelity and high brightness outdoor visibility.')
    ON CONFLICT (device_id, category_id) DO UPDATE SET justification = EXCLUDED.justification;

    -- Battery Boss
    INSERT INTO public.device_categories (device_id, category_id, rank, rank_locked, justification)
    VALUES 
        (v_dev_op12r,   v_cat_battery, 1, TRUE, '5500 mAh capacity combined with 100W SUPERVOOC recharges 1-100% in 26 minutes.'),
        (v_dev_motog84, v_cat_battery, 2, TRUE, 'Power-efficient 6nm architecture delivers nearly 2 days of mixed lightweight usage.')
    ON CONFLICT (device_id, category_id) DO UPDATE SET justification = EXCLUDED.justification;

    -- Budget Killer
    INSERT INTO public.device_categories (device_id, category_id, rank, rank_locked, justification)
    VALUES 
        (v_dev_rn13pp,  v_cat_budget, 1, TRUE, 'IP68 water resistance, 120W charging, and curved 1.5K screen redefined the ₹30K segment.'),
        (v_dev_motog84, v_cat_budget, 2, TRUE, '12GB RAM, 256GB storage, and vibrant 120Hz pOLED at an unbeatable sub-₹18K price point.'),
        (v_dev_narzo70, v_cat_budget, 3, TRUE, 'Sony IMX890 flagship sensor brings flagship-grade low light shots under ₹20,000.')
    ON CONFLICT (device_id, category_id) DO UPDATE SET justification = EXCLUDED.justification;

END $$;

-- Refresh statistics for seeded data
ANALYZE public.brands;
ANALYZE public.devices;
ANALYZE public.device_specs;
ANALYZE public.device_scores;
ANALYZE public.device_pros_cons;
ANALYZE public.device_categories;

-- =============================================================================
-- END OF SEED MIGRATION 05
-- =============================================================================
