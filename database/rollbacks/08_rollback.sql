-- =============================================================================
-- RMDU MOBILES — ROLLBACK SCRIPT 08
-- Target : Removes everything 08_atomic_counters_votes_and_dense_ranks.sql created.
--
-- WARNING : Dropping `review_votes` deletes every recorded helpful vote. Export
--           the table first if any environment has real votes:
--             COPY (SELECT * FROM public.review_votes) TO '/tmp/review_votes.csv' CSV HEADER;
--
-- WARNING : Restoring the 06 form of `fn_shift_category_ranks` removes the
--           DELETE branch. Ranks of categories that lost a member after this
--           migration will keep the hole. Re-compact them before rolling back:
--             WITH ordered AS (
--                 SELECT id, row_number() OVER (
--                            PARTITION BY category_id ORDER BY rank) AS new_rank
--                   FROM public.device_categories
--             )
--             UPDATE public.device_categories dc
--                SET rank = ordered.new_rank
--               FROM ordered
--              WHERE dc.id = ordered.id AND dc.rank <> ordered.new_rank;
--
-- WARNING : The backend build that calls `fn_increment_card_view`,
--           `fn_vote_review_helpful`, `fn_remove_category_member` or
--           `fn_rerank_category_batch` answers 503 `migration_required` until it
--           is rolled back to a build without those calls.
-- =============================================================================

SET lock_timeout = '3s';

BEGIN;

-- 1. RPCs that only touch the tables below go first.
DROP FUNCTION IF EXISTS fn_rerank_category_batch(UUID, UUID[], INTEGER, UUID, INET);
DROP FUNCTION IF EXISTS fn_remove_category_member(UUID, UUID, INTEGER, UUID, INET);
DROP FUNCTION IF EXISTS fn_vote_review_helpful(UUID, UUID);
DROP FUNCTION IF EXISTS fn_increment_card_view(TEXT);

-- 2. Vote table and its sync trigger.
DROP TRIGGER IF EXISTS trg_sync_review_helpful_votes ON public.review_votes;
DROP FUNCTION IF EXISTS fn_sync_review_helpful_votes();
DROP TABLE IF EXISTS public.review_votes;

-- 3. Restore the migration 06 trigger contract (INSERT / UPDATE only).
DROP TRIGGER IF EXISTS trg_shift_category_ranks ON public.device_categories;

CREATE OR REPLACE FUNCTION fn_shift_category_ranks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    SET CONSTRAINTS device_categories_rank_unique DEFERRED;

    IF TG_OP = 'INSERT' THEN
        UPDATE device_categories
        SET    rank        = rank + 1,
               updated_at  = NOW()
        WHERE  category_id = NEW.category_id
          AND  rank        >= NEW.rank
          AND  id          != NEW.id;

    ELSIF TG_OP = 'UPDATE' AND OLD.rank IS DISTINCT FROM NEW.rank THEN
        IF NEW.rank > OLD.rank THEN
            UPDATE device_categories
            SET    rank       = rank - 1,
                   updated_at = NOW()
            WHERE  category_id = NEW.category_id
              AND  rank BETWEEN OLD.rank + 1 AND NEW.rank
              AND  id != NEW.id;
        ELSE
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

CREATE TRIGGER trg_shift_category_ranks
BEFORE INSERT OR UPDATE OF rank ON public.device_categories
FOR EACH ROW EXECUTE FUNCTION fn_shift_category_ranks();

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VERIFICATION after rollback — expect 0 rows:
--   SELECT proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--    WHERE n.nspname = 'public'
--      AND proname IN ('fn_increment_card_view','fn_vote_review_helpful',
--                      'fn_remove_category_member','fn_rerank_category_batch',
--                      'fn_sync_review_helpful_votes');
--   SELECT to_regclass('public.review_votes');
-- =============================================================================
