-- =============================================================================
-- RMDU MOBILES — MIGRATION 07
-- File        : 07_concurrency_holds_and_versions.sql
-- Order       : STEP 7 (run after 06_fix_category_rank_trigger.sql)
-- Target      : Supabase SQL Editor (PostgreSQL 15+)
-- Implements  : instruction/technical-architecture/11_SYSTEM_DESIGN_MASTER_RULES.md
--               instruction/technical-architecture/12_CONCURRENCY_AND_RESERVATION_RULES.md
--               instruction/state of agent/rules/06-claim-integrity.md
--
-- WHAT THIS MIGRATION ADDS
--   1. `version` columns + auto-bump trigger on devices, user_profiles,
--      recommendation_rules and categories (optimistic concurrency).
--   2. `fn_rerank_device()` — one transactional re-rank: advisory lock, category
--      row lock, expected-version check, dense sibling shift, audit row. Replaces
--      the delete-then-reinsert ranking path in the admin API.
--   3. `resource_holds` — the train-ticket table. A slot is either free, `held`
--      by exactly one holder until `expires_at`, or `confirmed`. The partial
--      unique index is what makes double-booking impossible, not application code.
--   4. `fn_claim_slot` / `fn_confirm_slot` / `fn_release_slot` / `fn_slot_status`
--      / `fn_sweep_concurrency_state`.
--   5. `idempotency_requests` + `fn_begin_idempotent` / `fn_complete_idempotent`
--      so a retried write replays its first result instead of running twice.
--
-- DEPLOY ORDER
--   Apply this file BEFORE deploying the backend that selects `version`.
--   Until it is applied, `devices`, `user_profiles` and `recommendation_rules`
--   do not expose that column and catalog reads will fail.
--
-- SAFETY
--   Idempotent (re-runnable). Every statement is additive; nothing is dropped or
--   rewritten. `lock_timeout` keeps DDL from queueing behind a long transaction.
-- =============================================================================

SET lock_timeout = '3s';
SET statement_timeout = '60s';

BEGIN;

-- =============================================================================
-- 0. PREFLIGHT — refuse to build ranking logic on the recursive trigger
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
END $$;

-- =============================================================================
-- 1. OPTIMISTIC CONCURRENCY — version columns
-- =============================================================================
-- A writer sends the version it read; the UPDATE only matches that row while the
-- version is unchanged. Zero rows = someone else wrote first = reload and retry.
-- The trigger bumps the number so no caller has to remember to do it.

CREATE OR REPLACE FUNCTION fn_bump_row_version()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Respect an explicit increment from the writer; otherwise bump here.
    IF NEW.version IS NOT DISTINCT FROM OLD.version THEN
        NEW.version := OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_bump_row_version() IS
    'Increments `version` on every UPDATE so conditional updates can detect lost writes.';

ALTER TABLE public.devices              ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.user_profiles        ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.recommendation_rules ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.categories           ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.devices.version              IS 'Optimistic-concurrency revision; compared in the UPDATE predicate.';
COMMENT ON COLUMN public.user_profiles.version        IS 'Optimistic-concurrency revision; compared in the UPDATE predicate.';
COMMENT ON COLUMN public.recommendation_rules.version IS 'Optimistic-concurrency revision; compared in the UPDATE predicate.';
COMMENT ON COLUMN public.categories.version           IS 'Re-rank revision; incremented on every applied ranking change.';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_devices_version') THEN
        CREATE TRIGGER trg_devices_version
            BEFORE UPDATE ON public.devices
            FOR EACH ROW EXECUTE FUNCTION fn_bump_row_version();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_profiles_version') THEN
        CREATE TRIGGER trg_user_profiles_version
            BEFORE UPDATE ON public.user_profiles
            FOR EACH ROW EXECUTE FUNCTION fn_bump_row_version();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_recommendation_rules_version') THEN
        CREATE TRIGGER trg_recommendation_rules_version
            BEFORE UPDATE ON public.recommendation_rules
            FOR EACH ROW EXECUTE FUNCTION fn_bump_row_version();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_categories_version') THEN
        CREATE TRIGGER trg_categories_version
            BEFORE UPDATE ON public.categories
            FOR EACH ROW EXECUTE FUNCTION fn_bump_row_version();
    END IF;
END $$;

-- =============================================================================
-- 2. RANKING — fn_rerank_device()
-- =============================================================================
-- `device_categories` holds a capacity-1 slot per (category, rank). Two admins
-- re-ranking at the same moment must not interleave: the advisory lock serialises
-- the workflow, the category row lock serialises revision checks, and the
-- trigger moves siblings inside the same transaction. One commit = one ranking.
--
-- Returns (never raises for expected outcomes):
--   {"status":"ok", ...,"category_version":N}
--   {"status":"version_conflict","current_version":N}
--   {"status":"busy","retry_after":1}
-- Raises PT404 for a missing category/device and PT422 for an invalid rank.

CREATE OR REPLACE FUNCTION fn_rerank_device(
    p_category_id      UUID,
    p_device_id        UUID,
    p_new_rank         INTEGER,
    p_expected_version INTEGER DEFAULT NULL,
    p_rank_locked      BOOLEAN DEFAULT NULL,
    p_justification    TEXT    DEFAULT NULL,
    p_actor            UUID    DEFAULT NULL,
    p_ip               INET    DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_version       INTEGER;
    v_count         INTEGER;
    v_applied       INTEGER;
    v_previous      INTEGER;
    v_locked        BOOLEAN;
    v_justification TEXT;
    v_membership    public.device_categories%ROWTYPE;
    v_changed       BOOLEAN := FALSE;
BEGIN
    IF p_new_rank IS NULL OR p_new_rank < 1 THEN
        RAISE EXCEPTION 'new rank must be an integer >= 1' USING ERRCODE = 'PT422';
    END IF;

    -- Namespaced transaction-scoped lock: released on COMMIT/ROLLBACK, never
    -- leaked back into a pooled session.
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

    IF NOT EXISTS (SELECT 1 FROM public.devices WHERE id = p_device_id) THEN
        RAISE EXCEPTION 'device not found' USING ERRCODE = 'PT404';
    END IF;

    SELECT * INTO v_membership
      FROM public.device_categories
     WHERE category_id = p_category_id
       AND device_id   = p_device_id;

    SELECT count(*) INTO v_count
      FROM public.device_categories
     WHERE category_id = p_category_id;

    IF v_membership.id IS NULL THEN
        -- New membership: clamp so a stale position never leaves a gap.
        v_previous      := NULL;
        v_applied       := LEAST(p_new_rank, v_count + 1);
        v_locked        := COALESCE(p_rank_locked, FALSE);
        v_justification := p_justification;

        INSERT INTO public.device_categories
            (device_id, category_id, rank, rank_locked, added_by, justification)
        VALUES
            (p_device_id, p_category_id, v_applied, v_locked, p_actor, v_justification);

        v_changed := TRUE;
    ELSE
        v_previous      := v_membership.rank;
        v_applied       := LEAST(p_new_rank, v_count);
        v_locked        := COALESCE(p_rank_locked, v_membership.rank_locked);
        v_justification := COALESCE(p_justification, v_membership.justification);

        IF v_applied = v_membership.rank
           AND v_locked = v_membership.rank_locked
           AND v_justification IS NOT DISTINCT FROM v_membership.justification THEN
            -- Nothing to write; do not burn a revision on a no-op.
            v_changed := FALSE;
        ELSE
            UPDATE public.device_categories
               SET rank          = v_applied,
                   rank_locked   = v_locked,
                   justification = v_justification,
                   added_by      = COALESCE(p_actor, added_by),
                   updated_at    = NOW()
             WHERE id = v_membership.id;

            v_changed := TRUE;
        END IF;
    END IF;

    IF v_changed THEN
        UPDATE public.categories
           SET version = version + 1
         WHERE id = p_category_id
        RETURNING version INTO v_version;

        -- Audited inside the same transaction: a rank without its audit row
        -- cannot commit, and an audit row without the rank cannot either.
        INSERT INTO public.audit_log
            (user_id, action, target_type, target_id, old_value, new_value, ip_address)
        VALUES
            (p_actor, 'rank.update', 'category', p_category_id,
             jsonb_build_object('device_id', p_device_id, 'rank', v_previous),
             jsonb_build_object(
                 'device_id', p_device_id,
                 'rank', v_applied,
                 'rank_locked', v_locked,
                 'justification', v_justification
             ),
             p_ip);
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'changed', v_changed,
        'category_id', p_category_id,
        'device_id', p_device_id,
        'rank', v_applied,
        'previous_rank', v_previous,
        'category_version', v_version
    );
END;
$$;

COMMENT ON FUNCTION fn_rerank_device(uuid, uuid, integer, integer, boolean, text, uuid, inet) IS
    'Transactional single-row re-rank: advisory lock + category row lock + expected version + dense shift + audit.';

-- =============================================================================
-- 3. RESOURCE HOLDS — the train-ticket table
-- =============================================================================
-- One row per claim attempt. Only `held` and `confirmed` count as occupied;
-- `released` and `expired` rows stay as history. The partial unique index
-- `resource_holds_live_uniq` is the actual guarantee that a slot cannot be
-- claimed twice — application checks are advisory only.

CREATE TABLE IF NOT EXISTS public.resource_holds (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type   VARCHAR(40) NOT NULL CHECK (length(trim(resource_type)) > 0),
    resource_key    TEXT        NOT NULL CHECK (length(trim(resource_key)) > 0),
    holder_key      TEXT        NOT NULL CHECK (length(trim(holder_key)) > 0),
    quantity        INTEGER     NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    status          VARCHAR(12) NOT NULL DEFAULT 'held'
                    CHECK (status IN ('held', 'confirmed', 'released', 'expired')),
    hold_token      UUID        NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    idempotency_key TEXT,
    metadata        JSONB       NOT NULL DEFAULT '{}',
    expires_at      TIMESTAMPTZ NOT NULL,
    confirmed_at    TIMESTAMPTZ,
    released_at     TIMESTAMPTZ,
    release_reason  VARCHAR(40),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_holds_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE  public.resource_holds IS
    'Expiring claims on capacity-1 resources (category ranks today, stock when commerce exists).';
COMMENT ON COLUMN public.resource_holds.holder_key IS
    'Who holds the slot: user UUID, or a namespaced key (e.g. job:<id>, guest:<hash>).';
COMMENT ON COLUMN public.resource_holds.status IS
    'held = live reservation; confirmed = converted claim (still blocks); released/expired = history.';

CREATE UNIQUE INDEX IF NOT EXISTS resource_holds_live_uniq
    ON public.resource_holds (resource_type, resource_key)
    WHERE status IN ('held', 'confirmed');

CREATE UNIQUE INDEX IF NOT EXISTS resource_holds_idempotency_uniq
    ON public.resource_holds (holder_key, resource_type, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_holds_expiry
    ON public.resource_holds (expires_at)
    WHERE status = 'held';

CREATE INDEX IF NOT EXISTS idx_holds_holder
    ON public.resource_holds (holder_key, status);

CREATE INDEX IF NOT EXISTS idx_holds_resource
    ON public.resource_holds (resource_type, resource_key, status);

-- =============================================================================
-- 4. HOLDS — claim / confirm / release / status / sweep
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_claim_slot(
    p_resource_type   TEXT,
    p_resource_key    TEXT,
    p_holder_key      TEXT,
    p_quantity        INTEGER DEFAULT 1,
    p_ttl_seconds     INTEGER DEFAULT 300,
    p_idempotency_key TEXT    DEFAULT NULL,
    p_metadata        JSONB   DEFAULT '{}'
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_ttl       INTEGER;
    v_now       TIMESTAMPTZ := clock_timestamp();
    v_expires   TIMESTAMPTZ;
    v_existing  public.resource_holds%ROWTYPE;
    v_live      INTEGER;
    v_retry     INTEGER;
    v_hold_id   UUID;
    v_token     UUID;
BEGIN
    IF COALESCE(length(trim(p_resource_type)), 0) = 0
       OR COALESCE(length(trim(p_resource_key)), 0) = 0
       OR COALESCE(length(trim(p_holder_key)), 0) = 0 THEN
        RAISE EXCEPTION 'resource_type, resource_key and holder_key are required'
            USING ERRCODE = 'PT422';
    END IF;

    IF p_quantity IS NULL OR p_quantity < 1 THEN
        RAISE EXCEPTION 'quantity must be >= 1' USING ERRCODE = 'PT422';
    END IF;

    -- A hold is a short promise, never a lock. 30s floor stops a client from
    -- claiming a slot for a single round-trip; 15min ceiling stops squatting.
    v_ttl     := LEAST(GREATEST(COALESCE(p_ttl_seconds, 300), 30), 900);
    v_expires := v_now + make_interval(secs => v_ttl);

    -- 4.1 Idempotent replay: the same key returns the original decision.
    IF p_idempotency_key IS NOT NULL THEN
        SELECT * INTO v_existing
          FROM public.resource_holds
         WHERE holder_key      = p_holder_key
           AND resource_type   = p_resource_type
           AND idempotency_key = p_idempotency_key
         LIMIT 1;

        IF FOUND THEN
            IF v_existing.status = 'held' AND v_existing.expires_at <= v_now THEN
                UPDATE public.resource_holds
                   SET status = 'expired', released_at = v_now, release_reason = 'expired'
                 WHERE id = v_existing.id;
                RETURN jsonb_build_object(
                    'status', 'expired', 'replayed', TRUE,
                    'hold_token', v_existing.hold_token,
                    'expires_at', v_existing.expires_at
                );
            END IF;

            RETURN jsonb_build_object(
                'status', v_existing.status, 'replayed', TRUE,
                'hold_token', v_existing.hold_token,
                'expires_at', v_existing.expires_at
            );
        END IF;
    END IF;

    -- 4.2 Reclaim anything already past its deadline for this slot.
    UPDATE public.resource_holds
       SET status = 'expired', released_at = v_now, release_reason = 'expired'
     WHERE resource_type = p_resource_type
       AND resource_key  = p_resource_key
       AND status        = 'held'
       AND expires_at   <= v_now;

    -- 4.3 Already yours? Return the live claim instead of counting it against you.
    SELECT * INTO v_existing
      FROM public.resource_holds
     WHERE resource_type = p_resource_type
       AND resource_key  = p_resource_key
       AND status IN ('held', 'confirmed');

    IF v_existing.id IS NOT NULL AND v_existing.holder_key = p_holder_key THEN
        RETURN jsonb_build_object(
            'status', v_existing.status, 'replayed', TRUE,
            'hold_token', v_existing.hold_token,
            'expires_at', v_existing.expires_at
        );
    END IF;

    -- 4.4 Fairness: one holder may not fence off the whole board.
    SELECT count(*), CEIL(EXTRACT(epoch FROM (MIN(expires_at) - v_now)))::INTEGER
      INTO v_live, v_retry
      FROM public.resource_holds
     WHERE holder_key = p_holder_key
       AND status     = 'held'
       AND expires_at > v_now;

    IF v_live >= 2 THEN
        RETURN jsonb_build_object(
            'status', 'limited',
            'retry_after', GREATEST(COALESCE(v_retry, 1), 1),
            'reason', 'holder_hold_limit'
        );
    END IF;

    -- 4.5 The claim itself: one insert, one winner. No read-then-write window.
    INSERT INTO public.resource_holds
        (resource_type, resource_key, holder_key, quantity, status,
         idempotency_key, metadata, expires_at)
    VALUES
        (p_resource_type, p_resource_key, p_holder_key, p_quantity, 'held',
         p_idempotency_key, COALESCE(p_metadata, '{}'::jsonb), v_expires)
    ON CONFLICT DO NOTHING
    RETURNING id, hold_token INTO v_hold_id, v_token;

    IF v_hold_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'held', 'replayed', FALSE,
            'hold_token', v_token, 'expires_at', v_expires
        );
    END IF;

    -- 4.6 Lost the race: report the winner's deadline without revealing who.
    SELECT * INTO v_existing
      FROM public.resource_holds
     WHERE resource_type = p_resource_type
       AND resource_key  = p_resource_key
       AND status IN ('held', 'confirmed');

    IF v_existing.id IS NULL THEN
        RETURN jsonb_build_object('status', 'busy', 'retry_after', 1);
    END IF;

    IF v_existing.holder_key = p_holder_key THEN
        RETURN jsonb_build_object(
            'status', v_existing.status, 'replayed', TRUE,
            'hold_token', v_existing.hold_token,
            'expires_at', v_existing.expires_at
        );
    END IF;

    RETURN jsonb_build_object(
        'status', 'taken',
        'expires_at', v_existing.expires_at,
        'retry_after', GREATEST(
            1, CEIL(EXTRACT(epoch FROM (v_existing.expires_at - v_now)))::INTEGER
        )
    );
END;
$$;

COMMENT ON FUNCTION fn_claim_slot(text, text, text, integer, integer, text, jsonb) IS
    'Claims one slot for p_ttl_seconds. Returns held | taken | limited | expired | busy | confirmed.';

CREATE OR REPLACE FUNCTION fn_confirm_slot(
    p_hold_token UUID,
    p_holder_key TEXT
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_hold public.resource_holds%ROWTYPE;
    v_now  TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT * INTO v_hold
      FROM public.resource_holds
     WHERE hold_token = p_hold_token
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'unknown');
    END IF;

    IF v_hold.holder_key <> p_holder_key THEN
        RETURN jsonb_build_object('status', 'forbidden');
    END IF;

    IF v_hold.status = 'confirmed' THEN
        -- Repeat-safe: a retried confirm never double-applies the claim.
        RETURN jsonb_build_object(
            'status', 'confirmed', 'replayed', TRUE,
            'expires_at', v_hold.expires_at, 'confirmed_at', v_hold.confirmed_at
        );
    END IF;

    IF v_hold.status IN ('released', 'expired') THEN
        RETURN jsonb_build_object('status', v_hold.status);
    END IF;

    IF v_hold.expires_at <= v_now THEN
        UPDATE public.resource_holds
           SET status = 'expired', released_at = v_now, release_reason = 'expired'
         WHERE id = v_hold.id;
        RETURN jsonb_build_object(
            'status', 'expired', 'expires_at', v_hold.expires_at
        );
    END IF;

    UPDATE public.resource_holds
       SET status = 'confirmed', confirmed_at = v_now, release_reason = NULL
     WHERE id = v_hold.id;

    RETURN jsonb_build_object(
        'status', 'confirmed', 'replayed', FALSE,
        'expires_at', v_hold.expires_at, 'confirmed_at', v_now
    );
END;
$$;

COMMENT ON FUNCTION fn_confirm_slot(uuid, text) IS
    'Converts a live hold into a confirmed claim. Refuses expired holds; repeat-safe.';

CREATE OR REPLACE FUNCTION fn_release_slot(
    p_hold_token UUID,
    p_holder_key TEXT,
    p_reason     TEXT DEFAULT 'released'
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_hold public.resource_holds%ROWTYPE;
    v_now  TIMESTAMPTZ := clock_timestamp();
BEGIN
    SELECT * INTO v_hold
      FROM public.resource_holds
     WHERE hold_token = p_hold_token
       FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('status', 'unknown');
    END IF;

    IF v_hold.holder_key <> p_holder_key THEN
        RETURN jsonb_build_object('status', 'forbidden');
    END IF;

    IF v_hold.status IN ('released', 'expired') THEN
        RETURN jsonb_build_object('status', v_hold.status, 'replayed', TRUE);
    END IF;

    UPDATE public.resource_holds
       SET status = 'released',
           released_at = v_now,
           release_reason = LEFT(COALESCE(NULLIF(trim(p_reason), ''), 'released'), 40)
     WHERE id = v_hold.id;

    RETURN jsonb_build_object('status', 'released', 'replayed', FALSE);
END;
$$;

COMMENT ON FUNCTION fn_release_slot(uuid, text, text) IS
    'Frees a held or confirmed claim. Idempotent; never deletes history.';

CREATE OR REPLACE FUNCTION fn_slot_status(
    p_resource_type TEXT,
    p_resource_key  TEXT
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_hold public.resource_holds%ROWTYPE;
    v_now  TIMESTAMPTZ := clock_timestamp();
BEGIN
    UPDATE public.resource_holds
       SET status = 'expired', released_at = v_now, release_reason = 'expired'
     WHERE resource_type = p_resource_type
       AND resource_key  = p_resource_key
       AND status        = 'held'
       AND expires_at   <= v_now;

    SELECT * INTO v_hold
      FROM public.resource_holds
     WHERE resource_type = p_resource_type
       AND resource_key  = p_resource_key
       AND status IN ('held', 'confirmed');

    IF v_hold.id IS NULL THEN
        RETURN jsonb_build_object('status', 'available');
    END IF;

    IF v_hold.status = 'confirmed' THEN
        RETURN jsonb_build_object('status', 'confirmed', 'expires_at', v_hold.expires_at);
    END IF;

    RETURN jsonb_build_object(
        'status', 'held',
        'expires_at', v_hold.expires_at,
        'retry_after', GREATEST(
            1, CEIL(EXTRACT(epoch FROM (v_hold.expires_at - v_now)))::INTEGER
        )
    );
END;
$$;

COMMENT ON FUNCTION fn_slot_status(text, text) IS
    'Public-safe availability for one slot: available | held | confirmed. Never exposes the holder.';

-- =============================================================================
-- 5. IDEMPOTENCY RECORDS
-- =============================================================================
-- The caller sends `Idempotency-Key`. First request wins the insert and runs;
-- every retry either sees `in_progress` (409, retry after 1s) or `replay`
-- (return the stored status + body). Same key with a different body is a
-- client bug, reported as `mismatch`.

CREATE TABLE IF NOT EXISTS public.idempotency_requests (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_scope   TEXT        NOT NULL,   -- 'user:<uuid>' | 'admin:<key-id>' | 'guest:<hash>'
    operation     TEXT        NOT NULL,   -- 'device.create', 'hold.claim', ...
    key           TEXT        NOT NULL,
    request_hash  TEXT        NOT NULL,   -- SHA-256 of the canonical request body
    status        VARCHAR(12) NOT NULL DEFAULT 'in_progress'
                  CHECK (status IN ('in_progress', 'completed', 'failed')),
    http_status   SMALLINT,
    result        JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,

    CONSTRAINT idempotency_requests_scope_unique UNIQUE (actor_scope, operation, key)
);

COMMENT ON TABLE public.idempotency_requests IS
    'Durable Idempotency-Key records so a retried write replays its first result instead of running twice.';

CREATE INDEX IF NOT EXISTS idx_idempotency_created
    ON public.idempotency_requests (created_at);

CREATE OR REPLACE FUNCTION fn_begin_idempotent(
    p_actor_scope  TEXT,
    p_operation    TEXT,
    p_key          TEXT,
    p_request_hash TEXT
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_row public.idempotency_requests%ROWTYPE;
BEGIN
    IF COALESCE(length(trim(p_actor_scope)), 0) = 0
       OR COALESCE(length(trim(p_operation)), 0) = 0
       OR COALESCE(length(trim(p_key)), 0) = 0 THEN
        RAISE EXCEPTION 'actor_scope, operation and key are required'
            USING ERRCODE = 'PT422';
    END IF;

    INSERT INTO public.idempotency_requests
        (actor_scope, operation, key, request_hash)
    VALUES
        (p_actor_scope, p_operation, p_key, p_request_hash)
    ON CONFLICT ON CONSTRAINT idempotency_requests_scope_unique DO NOTHING
    RETURNING * INTO v_row;

    IF v_row.id IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'started');
    END IF;

    SELECT * INTO v_row
      FROM public.idempotency_requests
     WHERE actor_scope = p_actor_scope
       AND operation   = p_operation
       AND key         = p_key;

    IF v_row.request_hash <> p_request_hash THEN
        RETURN jsonb_build_object('status', 'mismatch');
    END IF;

    IF v_row.status = 'completed' THEN
        RETURN jsonb_build_object(
            'status', 'replay',
            'http_status', v_row.http_status,
            'result', v_row.result,
            'completed_at', v_row.completed_at
        );
    END IF;

    IF v_row.status = 'failed' THEN
        -- A failed attempt may be retried with the same key.
        UPDATE public.idempotency_requests
           SET status = 'in_progress',
               request_hash = p_request_hash,
               http_status = NULL,
               result = NULL,
               completed_at = NULL,
               created_at = NOW()
         WHERE id = v_row.id;

        RETURN jsonb_build_object('status', 'started', 'retried', TRUE);
    END IF;

    RETURN jsonb_build_object('status', 'in_progress', 'retry_after', 1);
END;
$$;

COMMENT ON FUNCTION fn_begin_idempotent(text, text, text, text) IS
    'Returns started | replay | in_progress | mismatch for one request identity.';

CREATE OR REPLACE FUNCTION fn_complete_idempotent(
    p_actor_scope TEXT,
    p_operation   TEXT,
    p_key         TEXT,
    p_http_status SMALLINT,
    p_result      JSONB,
    p_status      TEXT DEFAULT 'completed'
) RETURNS JSONB
LANGUAGE plpgsql AS $$
DECLARE
    v_updated INTEGER;
BEGIN
    IF p_status NOT IN ('completed', 'failed') THEN
        RAISE EXCEPTION 'status must be completed or failed' USING ERRCODE = 'PT422';
    END IF;

    UPDATE public.idempotency_requests
       SET status = p_status,
           http_status = p_http_status,
           result = p_result,
           completed_at = NOW()
     WHERE actor_scope = p_actor_scope
       AND operation   = p_operation
       AND key         = p_key
       AND status      = 'in_progress';

    GET DIAGNOSTICS v_updated = ROW_COUNT;

    RETURN jsonb_build_object(
        'status', CASE WHEN v_updated > 0 THEN 'recorded' ELSE 'missing' END
    );
END;
$$;

COMMENT ON FUNCTION fn_complete_idempotent(text, text, text, smallint, jsonb, text) IS
    'Stores the first result for a key so retries replay it. Only completes an in_progress record.';

-- =============================================================================
-- 6. SWEEP — one cron entry point for expiry and retention
-- =============================================================================
-- LANGUAGE sql, not plpgsql: the body is a data-modifying CTE whose top-level
-- statement is `WITH … SELECT`. PL/pgSQL cannot execute a bare query (it needs
-- RETURN QUERY, which requires a set-returning function), so it must be SQL.

CREATE OR REPLACE FUNCTION fn_sweep_concurrency_state(
    p_hold_limit              INTEGER DEFAULT 500,
    p_idempotency_retention_h INTEGER DEFAULT 24
) RETURNS JSONB
LANGUAGE sql AS $$
WITH expired AS (
    UPDATE public.resource_holds
       SET status = 'expired', released_at = NOW(), release_reason = 'expired'
     WHERE id IN (
         SELECT id
           FROM public.resource_holds
          WHERE status = 'held'
            AND expires_at <= NOW()
          ORDER BY expires_at
          LIMIT GREATEST(COALESCE(p_hold_limit, 500), 1)
     )
     RETURNING 1
), purged AS (
    DELETE FROM public.idempotency_requests
     WHERE id IN (
         SELECT id
           FROM public.idempotency_requests
          WHERE created_at < NOW() - make_interval(hours => GREATEST(COALESCE(p_idempotency_retention_h, 24), 1))
          ORDER BY created_at
          LIMIT GREATEST(COALESCE(p_hold_limit, 500), 1)
     )
     RETURNING 1
)
SELECT jsonb_build_object(
    'expired_holds', (SELECT count(*) FROM expired),
    'purged_idempotency', (SELECT count(*) FROM purged)
);
$$;

COMMENT ON FUNCTION fn_sweep_concurrency_state(integer, integer) IS
    'Cron entry point: expires overdue holds and purges idempotency records past retention.';

-- =============================================================================
-- 7. PRIVILEGES
-- =============================================================================
-- Both tables and every RPC are server-side internals: the API reaches them with
-- the service-role key. RLS is enabled with no policy, so anon/authenticated get
-- nothing even if default grants exist. Functions are revoked from PUBLIC because
-- PostgreSQL grants EXECUTE to PUBLIC by default.

ALTER TABLE public.resource_holds       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON public.resource_holds, public.idempotency_requests FROM anon;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON public.resource_holds, public.idempotency_requests FROM authenticated;
    END IF;
END $$;

REVOKE ALL ON FUNCTION fn_rerank_device(uuid, uuid, integer, integer, boolean, text, uuid, inet) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_claim_slot(text, text, text, integer, integer, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_confirm_slot(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_release_slot(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_slot_status(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_sweep_concurrency_state(integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_begin_idempotent(text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION fn_complete_idempotent(text, text, text, smallint, jsonb, text) FROM PUBLIC;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON public.resource_holds, public.idempotency_requests TO service_role;
        GRANT EXECUTE ON FUNCTION fn_rerank_device(uuid, uuid, integer, integer, boolean, text, uuid, inet) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_claim_slot(text, text, text, integer, integer, text, jsonb) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_confirm_slot(uuid, text) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_release_slot(uuid, text, text) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_slot_status(text, text) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_sweep_concurrency_state(integer, integer) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_begin_idempotent(text, text, text, text) TO service_role;
        GRANT EXECUTE ON FUNCTION fn_complete_idempotent(text, text, text, smallint, jsonb, text) TO service_role;
    END IF;
END $$;

-- Make the new tables/RPCs visible to PostgREST immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =============================================================================
-- VERIFICATION (run manually after applying)
--
-- 0. Everything landed — expect version_columns=4, new_tables=2, new_functions=9:
--    SELECT
--      (SELECT count(*) FROM information_schema.columns
--        WHERE table_schema = 'public' AND column_name = 'version'
--          AND table_name IN ('devices','user_profiles','categories','recommendation_rules'))
--        AS version_columns,
--      (SELECT count(*) FROM information_schema.tables
--        WHERE table_schema = 'public'
--          AND table_name IN ('resource_holds','idempotency_requests'))
--        AS new_tables,
--      (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--        WHERE n.nspname = 'public' AND p.proname IN (
--          'fn_bump_row_version','fn_rerank_device','fn_claim_slot','fn_confirm_slot',
--          'fn_release_slot','fn_slot_status','fn_begin_idempotent',
--          'fn_complete_idempotent','fn_sweep_concurrency_state'))
--        AS new_functions;
--
-- 1. Versions exist and bump:
--    UPDATE devices SET price = price WHERE id = '<uuid>' RETURNING version;
--
-- 2. Ranking is dense and versioned:
--    SELECT rank, device_id FROM device_categories
--     WHERE category_id = '<uuid>' ORDER BY rank;
--    SELECT version FROM categories WHERE id = '<uuid>';
--
-- 3. One slot, two holders — exactly one `held`:
--    SELECT fn_claim_slot('qa', 'slot-1', 'user:a', 1, 60);
--    SELECT fn_claim_slot('qa', 'slot-1', 'user:b', 1, 60);   -- status=taken
--
-- 4. Expiry frees the slot:
--    SELECT fn_claim_slot('qa', 'slot-2', 'user:a', 1, 1);    -- wait ~2s
--    SELECT fn_slot_status('qa', 'slot-2');                    -- available
--
-- 5. Idempotent replay:
--    SELECT fn_begin_idempotent('admin:x', 'device.create', 'k1', 'hash1');
--    SELECT fn_begin_idempotent('admin:x', 'device.create', 'k1', 'hash1'); -- in_progress
--
-- 6. Cleanup of QA holds:
--    DELETE FROM resource_holds WHERE resource_type = 'qa';
--    DELETE FROM idempotency_requests WHERE actor_scope = 'admin:x';
-- =============================================================================
