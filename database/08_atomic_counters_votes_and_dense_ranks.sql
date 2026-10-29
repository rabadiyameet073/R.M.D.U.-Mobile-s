-- =============================================================================
-- RMDU MOBILES — MIGRATION 08
-- File        : 08_atomic_counters_votes_and_dense_ranks.sql
-- Order       : STEP 8 (run after 07_concurrency_holds_and_versions.sql)
-- Target      : Supabase SQL Editor (PostgreSQL 15+)
-- Implements  : instruction/technical-architecture/10_SYSTEM_DESIGN_AND_RELIABILITY_RULES.md §2, §5
--               instruction/technical-architecture/11_SYSTEM_DESIGN_MASTER_RULES.md §3
--               instruction/technical-architecture/12_CONCURRENCY_AND_RESERVATION_RULES.md
--
-- WHAT THIS MIGRATION ADDS
--   1. `fn_increment_card_view()` — the shopkeeper card view counter becomes a
--      single atomic UPDATE. The old path read `view_count`, added one in Python
--      and wrote it back, so two simultaneous lookups lost one view.
--   2. `review_votes` — one row per (review, voter). "Helpful" was an anonymous
--      counter increment: no identity, no dedupe, unlimited self-votes. The
--      UNIQUE constraint is now the thing that makes one vote one vote.
--   3. `fn_vote_review_helpful()` + a sync trigger that keeps
--      `reviews.helpful_votes` equal to the vote rows without a read-modify-write.
--   4. `fn_remove_category_member()` — deletion previously left a hole in the
--      dense ranks because `fn_shift_category_ranks` had no DELETE branch.
--   5. `fn_rerank_category_batch()` — a whole reorder in one statement, one
--      category revision and one audit row. The previous admin path deleted the
--      memberships and reinserted them, which replaced row identity.
--   6. `fn_shift_category_ranks` is replaced: it now compacts on DELETE and
--      honours a transaction-local `rmdu.rank_shift` switch so batch writers can
--      assign a complete permutation in one statement.
--
-- DEPLOY ORDER
--   Apply this file BEFORE deploying the backend build that calls the four new
--   RPCs. The backend already degrades with `503 migration_required` when they
--   are absent, so the old build keeps working either way.
--
-- SAFETY
--   Idempotent (re-runnable). Nothing is dropped except the trigger, which is
--   immediately recreated with one extra event. `review_votes` starts empty and
--   the sync trigger adds/subtracts rather than recomputing, so existing
--   `helpful_votes` counts survive.
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '60s';

BEGIN;

-- =============================================================================
-- 0. PREFLIGHT
-- =============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public'
           AND p.proname = 'fn_shift_category_ranks'
           AND p.prosrc NOT LIKE '%pg_trigger_depth%'
    ) THEN
        RAISE EXCEPTION
            'fn_shift_category_ranks() is not recursion-guarded. Apply 06_fix_category_rank_trigger.sql first.';
    END IF;

    IF to_regclass('public.device_categories') IS NULL THEN
        RAISE EXCEPTION 'public.device_categories is missing. Apply 01_mobilemart_schema.sql first.';
    END IF;
END $$;

-- =============================================================================
-- 1. RANK TRIGGER — compaction on DELETE + batch switch
-- =============================================================================
-- Three behaviours now live in one function:
--   * `rmdu.rank_shift = 'off'` — a batch writer assigns every rank itself, so
--     the per-row shift must not run. The setting is transaction-local.
--   * DELETE — the removed row's slot is closed by sliding every higher rank
--     down one. Without this branch a deletion left a permanent hole.
--   * INSERT / UPDATE — unchanged dense shift for single-row writes.

CREATE OR REPLACE FUNCTION fn_shift_category_ranks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF coalesce(current_setting('rmdu.rank_shift', true), 'on') = 'off' THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    -- Guard against recursion: sibling shifts issued below must not re-enter.
    IF pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    -- Deferred so an intermediate duplicate (category_id, rank) is legal.
    SET CONSTRAINTS device_categories_rank_unique DEFERRED;

    IF TG_OP = 'DELETE' THEN
        -- Close the hole left by the removed member.
        UPDATE public.device_categories
        SET    rank       = rank - 1,
               updated_at = NOW()
        WHERE  category_id = OLD.category_id
          AND  rank        > OLD.rank
          AND  id         != OLD.id;

        RETURN OLD;

    ELSIF TG_OP = 'INSERT' THEN
        -- Make room: everything at or below the new rank slides down one slot.
        UPDATE public.device_categories
        SET    rank       = rank + 1,
               updated_at = NOW()
        WHERE  category_id = NEW.category_id
          AND  rank        >= NEW.rank
          AND  id          != NEW.id;

    ELSIF TG_OP = 'UPDATE' AND OLD.rank IS DISTINCT FROM NEW.rank THEN
        IF NEW.rank > OLD.rank THEN
            -- Moving DOWN: rows in (old, new] slide up one slot.
            UPDATE public.device_categories
            SET    rank       = rank - 1,
                   updated_at = NOW()
            WHERE  category_id = NEW.category_id
              AND  rank BETWEEN OLD.rank + 1 AND NEW.rank
              AND  id != NEW.id;
        ELSE
            -- Moving UP: rows in [new, old) slide down one slot.
            UPDATE public.device_categories
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
    'Keeps device_categories.rank dense on insert, re-rank and delete. Batch writers set rmdu.rank_shift=off.';

DROP TRIGGER IF EXISTS trg_shift_category_ranks ON public.device_categories;

CREATE TRIGGER trg_shift_category_ranks
BEFORE INSERT OR UPDATE OF rank OR DELETE ON public.device_categories
FOR EACH ROW EXECUTE FUNCTION fn_shift_category_ranks();

-- =============================================================================
-- 2. SHOPKEEPER CARD VIEWS — fn_increment_card_view()
-- =============================================================================
-- One statement means the reported count and the stored count are the same
-- read, and no concurrent lookup can overwrite another's increment. The payload
-- is the public projection: `user_id` and any owner identity never leave here.

CREATE OR REPLACE FUNCTION fn_increment_card_view(p_short_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_row public.shopkeeper_cards%ROWTYPE;
BEGIN
    IF coalesce(length(trim(p_short_code)), 0) = 0 THEN
        RAISE EXCEPTION 'short code is required' USING ERRCODE = 'PT422';
    END IF;

    UPDATE public.shopkeeper_cards
    SET    view_count = view_count + 1
    WHERE  short_code = upper(trim(p_short_code))
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
        RETURN jsonb_build_object('status', 'not_found');
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'is_expired', (v_row.expires_at IS NOT NULL AND v_row.expires_at <= NOW()),
        'card', jsonb_build_object(
            'id',             v_row.id,
            'device_id',      v_row.device_id,
            'short_code',     v_row.short_code,
            'reason_summary', v_row.reason_summary,
            'avoid_summary',  v_row.avoid_summary,
            'budget_note',    v_row.budget_note,
            'expires_at',     v_row.expires_at,
            'view_count',     v_row.view_count,
            'created_at',     v_row.created_at
        )
    );
END;
$$;

COMMENT ON FUNCTION fn_increment_card_view(text) IS
    'Atomic view counter + public card projection. Counting a view can never fail the display.';

-- =============================================================================
-- 3. REVIEW VOTES — one row per voter
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.review_votes (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id  UUID        NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
    voter_id   UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT review_votes_unique UNIQUE (review_id, voter_id)
);

COMMENT ON TABLE public.review_votes IS
    'One row per (review, voter). UNIQUE is what makes one person one vote; the counter is derived.';

CREATE INDEX IF NOT EXISTS idx_review_votes_review
    ON public.review_votes (review_id);

CREATE INDEX IF NOT EXISTS idx_review_votes_voter
    ON public.review_votes (voter_id, created_at DESC);

-- Keep `reviews.helpful_votes` in step with the vote rows. Increment/decrement
-- rather than recompute so pre-existing counter values are not zeroed.
CREATE OR REPLACE FUNCTION fn_sync_review_helpful_votes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.reviews
           SET helpful_votes = helpful_votes + 1
         WHERE id = NEW.review_id;
    ELSE
        UPDATE public.reviews
           SET helpful_votes = GREATEST(helpful_votes - 1, 0)
         WHERE id = OLD.review_id;
    END IF;

    RETURN NULL;  -- AFTER trigger: return value is ignored
END;
$$;

COMMENT ON FUNCTION fn_sync_review_helpful_votes() IS
    'Derives reviews.helpful_votes from review_votes so no caller can double-count.';

DROP TRIGGER IF EXISTS trg_sync_review_helpful_votes ON public.review_votes;

CREATE TRIGGER trg_sync_review_helpful_votes
AFTER INSERT OR DELETE ON public.review_votes
FOR EACH ROW EXECUTE FUNCTION fn_sync_review_helpful_votes();

CREATE OR REPLACE FUNCTION fn_vote_review_helpful(
    p_review_id UUID,
    p_voter_id  UUID
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_author   UUID;
    v_inserted INTEGER;
    v_votes    INTEGER;
BEGIN
    IF p_voter_id IS NULL THEN
        RAISE EXCEPTION 'voter identity is required' USING ERRCODE = 'PT422';
    END IF;

    -- Only approved reviews are public, so only approved reviews are votable.
    SELECT user_id INTO v_author
      FROM public.reviews
     WHERE id = p_review_id
       AND is_approved = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found');
    END IF;

    IF v_author = p_voter_id THEN
        RETURN jsonb_build_object('status', 'self_vote');
    END IF;

    INSERT INTO public.review_votes (review_id, voter_id)
    VALUES (p_review_id, p_voter_id)
    ON CONFLICT ON CONSTRAINT review_votes_unique DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    SELECT helpful_votes INTO v_votes
      FROM public.reviews
     WHERE id = p_review_id;

    RETURN jsonb_build_object(
        'status', CASE WHEN v_inserted > 0 THEN 'ok' ELSE 'duplicate' END,
        'id', p_review_id,
        'created', v_inserted > 0,
        'helpful_votes', coalesce(v_votes, 0)
    );
END;
$$;

COMMENT ON FUNCTION fn_vote_review_helpful(uuid, uuid) IS
    'Idempotent helpful vote: ok | duplicate | not_found | self_vote. Never raises for a repeat vote.';

-- =============================================================================
-- 4. RANKING — removal and batch reorder
-- =============================================================================
-- Both functions follow the Module 11 §3 order: namespaced advisory lock, then
-- the stable parent (`categories`) row lock, then expected-version, then child
-- rows. Availability expectations are 1s lock / 3s statement (Module 10 §5.1).

CREATE OR REPLACE FUNCTION fn_remove_category_member(
    p_category_id      UUID,
    p_device_id        UUID,
    p_expected_version INTEGER DEFAULT NULL,
    p_actor            UUID    DEFAULT NULL,
    p_ip               INET    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_version INTEGER;
    v_rank    INTEGER;
BEGIN
    IF NOT pg_try_advisory_xact_lock(hashtextextended('rank:' || p_category_id::text, 0)) THEN
        RETURN jsonb_build_object('status', 'busy', 'retry_after', 1);
    END IF;

    SELECT version INTO v_version
      FROM public.categories
     WHERE id = p_category_id
       FOR NO KEY UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'category not found' USING ERRCODE = 'PT404';
    END IF;

    IF p_expected_version IS NOT NULL AND p_expected_version <> v_version THEN
        RETURN jsonb_build_object(
            'status', 'version_conflict',
            'current_version', v_version
        );
    END IF;

    SELECT rank INTO v_rank
      FROM public.device_categories
     WHERE category_id = p_category_id
       AND device_id   = p_device_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'not_found');
    END IF;

    -- The DELETE branch of fn_shift_category_ranks closes the gap.
    DELETE FROM public.device_categories
     WHERE category_id = p_category_id
       AND device_id   = p_device_id;

    UPDATE public.categories
       SET version = version + 1
     WHERE id = p_category_id
    RETURNING version INTO v_version;

    INSERT INTO public.audit_log
        (user_id, action, target_type, target_id, old_value, new_value, ip_address)
    VALUES
        (p_actor, 'rank.remove', 'category', p_category_id,
         jsonb_build_object('device_id', p_device_id, 'rank', v_rank),
         jsonb_build_object('removed', TRUE),
         p_ip);

    RETURN jsonb_build_object(
        'status', 'ok',
        'category_id', p_category_id,
        'device_id', p_device_id,
        'removed_rank', v_rank,
        'category_version', v_version
    );
END;
$$;

COMMENT ON FUNCTION fn_remove_category_member(uuid, uuid, integer, uuid, inet) IS
    'Removes one ranked device and keeps the category ranks dense, in one transaction.';

CREATE OR REPLACE FUNCTION fn_rerank_category_batch(
    p_category_id      UUID,
    p_device_ids       UUID[],
    p_expected_version INTEGER DEFAULT NULL,
    p_actor            UUID    DEFAULT NULL,
    p_ip               INET    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_version  INTEGER;
    v_unknown  UUID[];
    v_applied  INTEGER;
BEGIN
    IF p_device_ids IS NULL OR coalesce(array_length(p_device_ids, 1), 0) = 0 THEN
        RAISE EXCEPTION 'device list must not be empty' USING ERRCODE = 'PT422';
    END IF;

    IF array_position(p_device_ids, NULL) IS NOT NULL THEN
        RAISE EXCEPTION 'device list must not contain nulls' USING ERRCODE = 'PT422';
    END IF;

    IF array_length(p_device_ids, 1) <> (SELECT count(DISTINCT x) FROM unnest(p_device_ids) AS x) THEN
        RAISE EXCEPTION 'device list must not contain duplicates' USING ERRCODE = 'PT422';
    END IF;

    IF NOT pg_try_advisory_xact_lock(hashtextextended('rank:' || p_category_id::text, 0)) THEN
        RETURN jsonb_build_object('status', 'busy', 'retry_after', 1);
    END IF;

    SELECT version INTO v_version
      FROM public.categories
     WHERE id = p_category_id
       FOR NO KEY UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'category not found' USING ERRCODE = 'PT404';
    END IF;

    IF p_expected_version IS NOT NULL AND p_expected_version <> v_version THEN
        RETURN jsonb_build_object(
            'status', 'version_conflict',
            'current_version', v_version
        );
    END IF;

    -- A reorder moves existing members; it never invents membership. Unknown ids
    -- are reported instead of being silently dropped from the sequence.
    SELECT array_agg(x.id) INTO v_unknown
      FROM unnest(p_device_ids) AS x(id)
     WHERE NOT EXISTS (
         SELECT 1
           FROM public.device_categories dc
          WHERE dc.category_id = p_category_id
            AND dc.device_id   = x.id
     );

    IF v_unknown IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'unknown_members',
            'device_ids', to_jsonb(v_unknown)
        );
    END IF;

    -- Hold the whole membership so a concurrent single re-rank cannot interleave.
    PERFORM 1
       FROM public.device_categories
      WHERE category_id = p_category_id
        FOR UPDATE;

    -- The requested order takes ranks 1..n; every other member is pushed below
    -- it, keeping its existing relative order. One statement, one revision.
    PERFORM set_config('rmdu.rank_shift', 'off', true);

    WITH listed AS (
        SELECT l.device_id, l.ord::INTEGER AS new_rank
          FROM unnest(p_device_ids) WITH ORDINALITY AS l(device_id, ord)
    ), rest AS (
        SELECT dc.device_id,
               (SELECT count(*) FROM listed)
                 + row_number() OVER (ORDER BY dc.rank, dc.device_id) AS new_rank
          FROM public.device_categories dc
         WHERE dc.category_id = p_category_id
           AND dc.device_id  <> ALL (p_device_ids)
    ), target AS (
        SELECT device_id, new_rank FROM listed
        UNION ALL
        SELECT device_id, new_rank FROM rest
    )
    UPDATE public.device_categories dc
       SET rank       = t.new_rank,
           updated_at = NOW()
      FROM target t
     WHERE dc.category_id = p_category_id
       AND dc.device_id   = t.device_id
       AND dc.rank       <> t.new_rank;

    GET DIAGNOSTICS v_applied = ROW_COUNT;

    PERFORM set_config('rmdu.rank_shift', 'on', true);

    UPDATE public.categories
       SET version = version + 1
     WHERE id = p_category_id
    RETURNING version INTO v_version;

    INSERT INTO public.audit_log
        (user_id, action, target_type, target_id, old_value, new_value, ip_address)
    VALUES
        (p_actor, 'rank.reorder', 'category', p_category_id,
         NULL,
         jsonb_build_object(
             'device_ids', to_jsonb(p_device_ids),
             'applied', v_applied
         ),
         p_ip);

    RETURN jsonb_build_object(
        'status', 'ok',
        'category_id', p_category_id,
        'applied', v_applied,
        'category_version', v_version
    );
END;
$$;

COMMENT ON FUNCTION fn_rerank_category_batch(uuid, uuid[], integer, uuid, inet) IS
    'Whole-category reorder in one statement: ranks 1..n for the given ids, others pushed below, one revision.';

-- =============================================================================
-- 5. PRIVILEGES
-- =============================================================================
-- `review_votes` is server-side only: the API reaches it with the service-role
-- key. RLS with no policy plus explicit revokes keeps anon/authenticated out
-- even where default grants exist.

ALTER TABLE public.review_votes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON public.review_votes FROM anon;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON public.review_votes FROM authenticated;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON public.review_votes TO service_role;
    END IF;
END $$;

REVOKE ALL ON FUNCTION fn_increment_card_view(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_vote_review_helpful(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_remove_category_member(UUID, UUID, INTEGER, UUID, INET) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_rerank_category_batch(UUID, UUID[], INTEGER, UUID, INET) FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT EXECUTE ON FUNCTION fn_increment_card_view(TEXT) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_vote_review_helpful(UUID, UUID) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_remove_category_member(UUID, UUID, INTEGER, UUID, INET) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_rerank_category_batch(UUID, UUID[], INTEGER, UUID, INET) TO service_role;
    END IF;
END $$;

-- Make the new table/RPCs visible to PostgREST immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VERIFICATION (run manually after applying)
--
-- 0. Everything landed — expect new_table=1, new_functions=6:
--    SELECT
--      (SELECT count(*) FROM information_schema.tables
--        WHERE table_schema = 'public' AND table_name = 'review_votes') AS new_table,
--      (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--        WHERE n.nspname = 'public' AND p.proname IN (
--          'fn_increment_card_view','fn_vote_review_helpful',
--          'fn_remove_category_member','fn_rerank_category_batch',
--          'fn_sync_review_helpful_votes','fn_shift_category_ranks')) AS new_functions;
--
-- 1. The delete branch compacts:
--    SELECT device_id, rank FROM device_categories
--     WHERE category_id = '<uuid>' ORDER BY rank;          -- 1,2,3,4
--    SELECT fn_remove_category_member('<uuid>', '<device-uuid>');
--    SELECT device_id, rank FROM device_categories
--     WHERE category_id = '<uuid>' ORDER BY rank;          -- 1,2,3 (no hole)
--
-- 2. Batch reorder is dense and versioned:
--    SELECT fn_rerank_category_batch('<uuid>', ARRAY['<dev-c>','<dev-a>']::uuid[]);
--    -- expect ranks 1=<dev-c>, 2=<dev-a>, 3=the remaining member
--
-- 3. One voter, one vote:
--    SELECT fn_vote_review_helpful('<review-uuid>', '<voter-uuid>');  -- ok
--    SELECT fn_vote_review_helpful('<review-uuid>', '<voter-uuid>');  -- duplicate
--
-- 4. Card views are atomic (run two sessions in parallel; the final count is
--    exactly the number of calls):
--    SELECT fn_increment_card_view('AB12CD34');
--
-- 5. Cleanup of QA rows:
--    DELETE FROM review_votes WHERE review_id = '<review-uuid>';
-- =============================================================================
