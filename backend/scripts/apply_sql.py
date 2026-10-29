"""Apply a SQL file to the project database (repeatable migration runner).

The Supabase SQL Editor stays the manual path for a one-off. This script is the
repeatable one: staging resets, CI, and "did the migration actually land?"
checks. It sends the file over the simple query protocol (what `psql -f` uses),
so the file's own `BEGIN`/`COMMIT`/`SET` statements behave exactly as they do in
the editor, and the first error aborts with the file's transaction rolled back.

Usage
    python scripts/apply_sql.py --check
    python scripts/apply_sql.py ../../database/07_concurrency_holds_and_versions.sql
    python scripts/apply_sql.py ../../database/08_atomic_counters_votes_and_dense_ranks.sql
    python scripts/apply_sql.py ../../database/rollbacks/08_rollback.sql

Connection string: DATABASE_URL, else DATABASE_POOLED_URL — from the environment,
then from the repository `.env`. The password is never printed.

`DB_READ_ONLY=true` (the same switch the API honours) makes every non-`--check`
run refuse to connect, so the database cannot be changed by accident.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg
from psycopg import pq

REPO_ROOT = Path(__file__).resolve().parents[2]

# (label, schema, name, kind) — what a fully migrated database must contain.
EXPECTED = [
    ("devices.version",              "public", "devices",              "column"),
    ("user_profiles.version",        "public", "user_profiles",        "column"),
    ("categories.version",           "public", "categories",           "column"),
    ("recommendation_rules.version", "public", "recommendation_rules", "column"),
    ("trg_devices_version",          "public", "trg_devices_version",  "trigger"),
    ("resource_holds",               "public", "resource_holds",       "table"),
    ("resource_holds_live_uniq",     "public", "resource_holds_live_uniq", "index"),
    ("idempotency_requests",         "public", "idempotency_requests", "table"),
    ("fn_rerank_device",             "public", "fn_rerank_device",     "function"),
    ("fn_claim_slot",                "public", "fn_claim_slot",        "function"),
    ("fn_confirm_slot",              "public", "fn_confirm_slot",      "function"),
    ("fn_release_slot",              "public", "fn_release_slot",      "function"),
    ("fn_slot_status",               "public", "fn_slot_status",       "function"),
    ("fn_begin_idempotent",          "public", "fn_begin_idempotent",  "function"),
    ("fn_complete_idempotent",       "public", "fn_complete_idempotent", "function"),
    ("fn_sweep_concurrency_state",   "public", "fn_sweep_concurrency_state", "function"),
    # Migration 08: atomic counters, vote uniqueness, dense rank maintenance.
    ("review_votes",                 "public", "review_votes",         "table"),
    ("review_votes_unique",          "public", "review_votes_unique",  "constraint"),
    ("fn_sync_review_helpful_votes", "public", "fn_sync_review_helpful_votes", "function"),
    ("fn_increment_card_view",       "public", "fn_increment_card_view", "function"),
    ("fn_vote_review_helpful",       "public", "fn_vote_review_helpful", "function"),
    ("fn_remove_category_member",    "public", "fn_remove_category_member", "function"),
    ("fn_rerank_category_batch",     "public", "fn_rerank_category_batch", "function"),
    # Migration 09: storefront copy lives in the database, not the bundle.
    ("categories.subtitle",          "public", "categories.subtitle",        "col"),
    ("categories.highlights",        "public", "categories.highlights",      "col"),
    ("categories.hero_video_url",    "public", "categories.hero_video_url",  "col"),
    ("categories.cover_image_url",   "public", "categories.cover_image_url", "col"),
    ("categories.updated_at",        "public", "categories.updated_at",      "col"),
    ("site_settings",                "public", "site_settings",              "table"),
    ("idx_site_settings_public",     "public", "idx_site_settings_public",   "index"),
    ("fn_touch_site_copy",           "public", "fn_touch_site_copy",         "function"),
    # Migration 10: RLS hardening (privilege escalation + moderation bypass).
    ("fn_guard_user_privileges",     "public", "fn_guard_user_privileges",   "function"),
    ("trg_guard_user_privileges",    "public", "trg_guard_user_privileges",  "trigger"),
    ("fn_guard_review_moderation",   "public", "fn_guard_review_moderation", "function"),
    ("trg_guard_review_moderation",  "public", "trg_guard_review_moderation", "trigger"),
    ("users: update own display fields", "public", "Users can update own display fields", "policy"),
    ("reviews: edit own review text",    "public", "Users can edit own review text",      "policy"),
    # The two policies migration 10 removed. Present again = the hole is back.
    ("users: update own record",     "public", "Users can update own record", "no_policy"),
    ("cards: public dump policy",    "public", "Public can view cards by short_code", "no_policy"),
]

PROBES = {
    "column": """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = %(schema)s
               AND table_name   = %(name)s
               AND column_name  = 'version'
        )
    """,
    # `name` arrives as "table.column" so a single row can pin one column.
    "col": """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = %(schema)s
               AND table_name   = split_part(%(name)s, '.', 1)
               AND column_name  = split_part(%(name)s, '.', 2)
        )
    """,
    "table": """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
             WHERE table_schema = %(schema)s AND table_name = %(name)s
        )
    """,
    "index": """
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes
             WHERE schemaname = %(schema)s AND indexname = %(name)s
        )
    """,
    "function": """
        SELECT EXISTS (
            SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = %(schema)s AND p.proname = %(name)s
        )
    """,
    "trigger": """
        SELECT EXISTS (
            SELECT 1 FROM pg_trigger
             WHERE tgname = %(name)s AND NOT tgisinternal
        )
    """,
    "constraint": """
        SELECT EXISTS (
            SELECT 1 FROM pg_constraint c
              JOIN pg_namespace n ON n.oid = c.connamespace
             WHERE n.nspname = %(schema)s AND c.conname = %(name)s
        )
    """,
    "policy": """
        SELECT EXISTS (
            SELECT 1 FROM pg_policies
             WHERE schemaname = %(schema)s AND policyname = %(name)s
        )
    """,
    # Inverted probe: a present policy here means a closed hole was reopened.
    "no_policy": """
        SELECT NOT EXISTS (
            SELECT 1 FROM pg_policies
             WHERE schemaname = %(schema)s AND policyname = %(name)s
        )
    """,
}

RANK_TRIGGER_GUARDED = """
SELECT prosrc LIKE '%pg_trigger_depth%'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'fn_shift_category_ranks'
"""

# Migration 08 taught fn_shift_category_ranks a transaction-local off switch so a
# bulk reorder can assign a whole permutation in one statement.
RANK_TRIGGER_BATCHABLE = """
SELECT prosrc LIKE '%rmdu.rank_shift%'
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname = 'fn_shift_category_ranks'
"""


def load_env() -> None:
    """Fill os.environ from the repository .env without overriding real env vars."""
    env_file = REPO_ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


# Query parameters Supabase puts in its copy-paste URLs that libpq does not know.
LIBPQ_IGNORED_PARAMS = {"pgbouncer", "connection_limit", "pool_mode", "supa"}


def sanitize(conninfo: str) -> str:
    """Drop Supabase-only query flags (e.g. `?pgbouncer=true`) libpq rejects.

    Deliberately string-only: `urlsplit` validates the netloc and raises on
    passwords containing non-host characters such as `[` or `]`. Nothing before
    the `?` is parsed, so the credentials reach libpq byte-for-byte.
    """
    base, marker, query = conninfo.partition("?")
    if not marker:
        return conninfo
    kept = [
        pair
        for pair in query.split("&")
        if pair and pair.split("=", 1)[0].lower() not in LIBPQ_IGNORED_PARAMS
    ]
    return f"{base}?{'&'.join(kept)}" if kept else base


def connect() -> psycopg.Connection:
    """Try DATABASE_URL, then DATABASE_POOLED_URL.

    Supabase stopped handing out IPv4 addresses for direct connections, so
    `db.<ref>.supabase.co` frequently fails to resolve on a normal network while
    the pooler hostname still works. Both accept DDL.
    """
    candidates = [
        (key, os.environ[key])
        for key in ("DATABASE_URL", "DATABASE_POOLED_URL")
        if os.environ.get(key)
    ]
    if not candidates:
        raise SystemExit("DATABASE_URL / DATABASE_POOLED_URL is not set (env or .env).")

    failures = []
    for key, conninfo in candidates:
        try:
            conn = psycopg.connect(sanitize(conninfo), connect_timeout=15, autocommit=True)
        except (psycopg.OperationalError, psycopg.ProgrammingError) as exc:
            first_line = str(exc).strip().splitlines()[0] if str(exc).strip() else "?"
            failures.append(f"{key}: {first_line}")
            continue

        print(f"connected via {key}")
        # Show the migration's own RAISE NOTICE lines, like the SQL Editor does.
        try:
            conn.add_notice_handler(lambda diag: print(f"  NOTICE  {diag.message_primary}"))
        except Exception:  # noqa: BLE001 - older psycopg without notice handlers
            pass
        return conn

    raise SystemExit("cannot connect to the database:\n  " + "\n  ".join(failures))


def check(conn: psycopg.Connection) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT current_database(), current_user, version()")
        database, user, version = cur.fetchone()
        print(f"database : {database}")
        print(f"user     : {user}")
        print(f"server   : {version.split(',')[0]}")
        print()

        missing = []
        for label, schema, name, kind in EXPECTED:
            cur.execute(PROBES[kind], {"schema": schema, "name": name})
            present = cur.fetchone()[0]
            print(f"  {'OK  ' if present else 'MISS'}  {label}")
            if not present:
                missing.append(label)

        cur.execute(RANK_TRIGGER_GUARDED)
        row = cur.fetchone()
        guarded = bool(row[0]) if row else None
        print(f"  {'OK  ' if guarded else 'MISS'}  fn_shift_category_ranks recursion guard"
              f"{'' if guarded is not None else '  (migration 06 not applied)'}")
        if not guarded:
            missing.append("fn_shift_category_ranks guard")

        cur.execute(RANK_TRIGGER_BATCHABLE)
        row = cur.fetchone()
        batchable = bool(row[0]) if row else None
        print(f"  {'OK  ' if batchable else 'MISS'}  fn_shift_category_ranks batch switch"
              f"{'' if batchable is not None else '  (migration 08 not applied)'}")
        if not batchable:
            missing.append("fn_shift_category_ranks batch switch")

    print()
    if missing:
        print(f"{len(missing)} object(s) missing: {', '.join(missing)}")
        print("Apply, in order: database/06_fix_category_rank_trigger.sql, "
              "database/07_concurrency_holds_and_versions.sql, "
              "database/08_atomic_counters_votes_and_dense_ranks.sql, "
              "database/09_storefront_copy_and_site_settings.sql, "
              "database/10_rls_hardening.sql.")
        return False
    print("all expected objects present")
    return True


def apply(conn: psycopg.Connection, path: Path) -> int:
    sql = path.read_text(encoding="utf-8")
    print(f"applying {path.name} ({len(sql.splitlines())} lines)…")
    result = conn.pgconn.exec_(sql.encode())
    if result.status not in (pq.ExecStatus.COMMAND_OK, pq.ExecStatus.TUPLES_OK):
        message = result.error_message.decode(errors="replace").strip()
        print(f"\nFAILED {path.name}\n{message}")
        return 1
    print(f"applied {path.name}")
    return 0


def main(argv: list[str]) -> int:
    load_env()
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0

    if argv[0] != "--check" and os.getenv("DB_READ_ONLY", "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        print(
            "DB_READ_ONLY is set: this database must not be changed. "
            "Nothing was connected to or applied. Unset it to run a migration; "
            "`--check` stays available because it only reads."
        )
        return 1

    with connect() as conn:
        if argv[0] == "--check":
            return 0 if check(conn) else 1

        for raw in argv:
            path = Path(raw)
            if not path.is_absolute():
                path = (Path.cwd() / path).resolve()
            if not path.exists():
                print(f"no such file: {path}")
                return 1
            code = apply(conn, path)
            if code:
                return code

        print()
        check(conn)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
