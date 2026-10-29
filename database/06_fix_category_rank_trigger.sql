-- =============================================================================
-- RMDU MOBILES — MIGRATION 06
-- Target : Fix infinite recursion in trg_shift_category_ranks
-- Depends: 01_mobilemart_schema.sql (device_categories + fn_shift_category_ranks)
--
-- PROBLEM
--   fn_shift_category_ranks() is a BEFORE INSERT OR UPDATE OF rank trigger that
--   issues UPDATEs on its own table. Those sibling updates re-fire the same
--   trigger, and because BEFORE triggers read the not-yet-written row, the two
--   statements keep pushing the same rows back and forth until PostgreSQL aborts
--   the transaction with:
--       ERROR: stack depth limit exceeded   (SQLSTATE 54001)
--   Any real re-rank of an existing category therefore fails.
--
-- FIX
--   Nested invocations are no-ops (pg_trigger_depth() > 1). The outermost
--   statement still performs the shift; sibling rows updated by that statement
--   no longer recurse. This keeps the original semantics for the single-row
--   writes the API performs.
--
--   Note: shifting is intentionally defined for one row per statement. Bulk
--   re-orders must be written as retract-then-insert-ascending (which the admin
--   API already does) because a single multi-row UPDATE cannot describe a
--   consistent shift order on its own.
-- =============================================================================

SET lock_timeout = '3s';

BEGIN;

CREATE OR REPLACE FUNCTION fn_shift_category_ranks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Guard against recursion: sibling shifts issued below must not re-enter.
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Deferred so the intermediate duplicate (category_id, rank) is legal.
    SET CONSTRAINTS device_categories_rank_unique DEFERRED;

    IF TG_OP = 'INSERT' THEN
        -- Make room: everything at or below the new rank slides down one slot.
        UPDATE device_categories
        SET    rank       = rank + 1,
               updated_at = NOW()
        WHERE  category_id = NEW.category_id
          AND  rank        >= NEW.rank
          AND  id          != NEW.id;

    ELSIF TG_OP = 'UPDATE' AND OLD.rank IS DISTINCT FROM NEW.rank THEN
        IF NEW.rank > OLD.rank THEN
            -- Moving DOWN: rows in (old, new] slide up one slot.
            UPDATE device_categories
            SET    rank       = rank - 1,
                   updated_at = NOW()
            WHERE  category_id = NEW.category_id
              AND  rank BETWEEN OLD.rank + 1 AND NEW.rank
              AND  id != NEW.id;
        ELSE
            -- Moving UP: rows in [new, old) slide down one slot.
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

COMMENT ON FUNCTION fn_shift_category_ranks() IS
    'Keeps device_categories.rank dense on single-row insert/re-rank. Recursion-guarded via pg_trigger_depth().';

COMMIT;

-- =============================================================================
-- VERIFICATION (run manually after applying)
--   -- 1. Two devices in one category, ranks 1 and 2 → move the first to 2.
--   --    Expected: the other device takes rank 1, no 54001 error.
--   SELECT device_id, rank FROM device_categories
--   WHERE category_id = '<uuid>' ORDER BY rank;
-- =============================================================================
