-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 06
-- Target : Restores fn_shift_category_ranks() exactly as shipped in
--          01_mobilemart_schema.sql (recursive, no pg_trigger_depth guard).
--
-- WARNING : The restored function re-introduces ERROR 54001 on any real re-rank
--           of a category that already holds more than one device. Only roll
--           back when 01_mobilemart_schema.sql is being re-applied as a whole.
-- =============================================================================

SET lock_timeout = '3s';

BEGIN;

CREATE OR REPLACE FUNCTION fn_shift_category_ranks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Ensure deferred constraint checking so rank UPDATEs don't violate UNIQUE mid-shift
    SET CONSTRAINTS device_categories_rank_unique DEFERRED;

    IF TG_OP = 'INSERT' THEN
        -- Shift all existing rows in same category with rank >= new rank
        UPDATE device_categories
        SET    rank       = rank + 1,
               updated_at = NOW()
        WHERE  category_id = NEW.category_id
          AND  rank        >= NEW.rank
          AND  id          != NEW.id;

    ELSIF TG_OP = 'UPDATE' AND OLD.rank IS DISTINCT FROM NEW.rank THEN
        IF NEW.rank > OLD.rank THEN
            -- Moving DOWN: compress rows between old+1 and new
            UPDATE device_categories
            SET    rank       = rank - 1,
                   updated_at = NOW()
            WHERE  category_id = NEW.category_id
              AND  rank BETWEEN OLD.rank + 1 AND NEW.rank
              AND  id != NEW.id;
        ELSE
            -- Moving UP: expand rows between new and old-1
            UPDATE device_categories
            SET    rank       = rank + 1,
                   updated_at = NOW()
            WHERE  category_id = NEW.category_id
              AND  rank BETWEEN NEW.rank AND OLD.rank - 1
              AND  id != NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMIT;
