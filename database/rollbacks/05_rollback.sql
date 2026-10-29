-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 05
-- Target : Undoes all seeded phones and brands introduced in 05_seed_catalog_phones.sql
-- =============================================================================

SET lock_timeout = '3s';

-- 1. Remove seeded devices (cascades to specs, scores, pros/cons, device_categories)
DELETE FROM public.devices
WHERE slug IN (
    'samsung-galaxy-s24-ultra',
    'apple-iphone-15-pro-max',
    'oneplus-12r',
    'vivo-x100-pro-5g',
    'redmi-note-13-pro-plus-5g',
    'motorola-moto-g84-5g',
    'realme-narzo-70-pro-5g'
);

-- 2. Remove seeded brands
DELETE FROM public.brands
WHERE slug IN (
    'samsung',
    'apple',
    'oneplus',
    'google',
    'xiaomi',
    'motorola',
    'vivo',
    'realme'
);
