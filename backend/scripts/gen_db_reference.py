"""Regenerate the field-level table reference for the database API document.

The live PostgREST OpenAPI description is the only honest source for what the
database actually contains right now, so this script reads it rather than the
migration files (which may have drifted from the deployed project).

Usage
    python scripts/gen_db_reference.py               # print the fragment
    python scripts/gen_db_reference.py --write ../database/.field_tables.md

The output is a set of `###` per-table sections with a column table, ready to
paste under "Master Table & Field-Level API Reference" in
database/DYNAMIC_DATABASE_API_REFERENCE.md.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from core.config import settings  # noqa: E402

# PostgREST sorts definitions by name; the document groups them by domain.
DOMAINS = [
    ("Catalog", ["brands", "devices", "device_specs", "device_scores",
                 "device_features", "device_pros_cons", "device_ussd_codes"]),
    ("Categories & Ranking", ["categories", "device_categories",
                              "vw_category_device_ranks"]),
    ("Recommendation & Comparison", ["recommendations", "recommendation_rules",
                                     "comparison_sessions", "shopkeeper_cards"]),
    ("Customer", ["users", "user_profiles", "user_phone_history", "reviews",
                  "price_alerts"]),
    ("AI / RAG", ["device_embeddings", "user_query_embeddings",
                  "rag_knowledge_chunks", "ai_chat_sessions", "ai_chat_messages"]),
    ("Reliability", ["resource_holds", "idempotency_requests", "audit_log"]),
]

TABLE_NOTES = {
    "devices": "Master phone registry. `overall_score` is not here; it is generated on `device_scores`.",
    "device_categories": "Rank is maintained by `trg_shift_category_ranks` (migrations 06 and 08); write ranks through the RPCs.",
    "device_specs": "40+ columns; all nullable so partial imports stay valid.",
    "reviews": "Unique on `(user_id, device_id)`. `helpful_votes` is incremented by `fn_sync_review_helpful_votes`.",
    "shopkeeper_cards": "`short_code` comes from a DB trigger; `view_count` is only ever incremented by `fn_increment_card_view`.",
    "resource_holds": "Holder is a namespaced TEXT key (`user:`, `guest:`, `job:`), not an FK, so any actor can claim a slot.",
    "idempotency_requests": "One row per `(actor_scope, operation, key)`; the first response is replayed for repeats.",
    "audit_log": "Append-only. Admin RPCs write their audit row inside the same transaction as the change.",
    "vw_category_device_ranks": "Read-only view: `manual_rank` from the table, `auto_rank` computed from scores.",
}


def fetch_spec() -> dict:
    base = settings.supabase_url.rstrip("/")
    headers = {
        "apikey": settings.supabase_secret_key,
        "Authorization": f"Bearer {settings.supabase_secret_key}",
        "User-Agent": settings.server_user_agent,
    }
    response = httpx.get(f"{base}/rest/v1/", headers=headers, timeout=30.0)
    response.raise_for_status()
    return response.json()


def type_of(prop: dict) -> str:
    """Collapse the OpenAPI type shape into one readable token."""
    kind = prop.get("type") or ""
    fmt = prop.get("format") or ""
    if kind == "array":
        items = prop.get("items") or {}
        inner = items.get("type") or items.get("format") or "any"
        if items.get("format") and not items.get("type"):
            inner = items["format"]
        return f"{inner}[]"
    if kind in ("integer", "number") or fmt in ("integer", "number"):
        return fmt if fmt in ("integer", "number") else kind
    return fmt or kind or "any"


def describe(prop: dict) -> str:
    """Turn PostgREST's XML-ish column notes into plain prose."""
    raw = str(prop.get("description") or "").strip()
    if "<pk/>" in raw:
        return "primary key"
    if "<fk" in raw:
        match = re.search(r"<fk table='([^']+)' column='([^']+)'", raw)
        if match:
            return f"FK → `{match.group(1)}.{match.group(2)}`"
        return "foreign key"
    return re.sub(r"<[^>]+>", "", raw.replace("Note: ", "")).strip()


def render_table(name: str, definition: dict) -> list[str]:
    props = definition.get("properties") or {}
    required = set(definition.get("required") or [])
    lines = [f"### `{name}`", ""]
    note = TABLE_NOTES.get(name)
    if note:
        lines += [note, ""]
    lines += ["| Column | Type | Null | Default | Notes |", "|---|---|---|---|---|"]
    for column, prop in props.items():
        null = "no" if column in required else "yes"
        default = prop.get("default")
        default_text = "" if default is None else f"`{default}`"
        hints = []
        if prop.get("maxLength"):
            hints.append(f"max {prop['maxLength']} chars")
        if prop.get("enum"):
            hints.append("enum: " + ", ".join(f"`{value}`" for value in prop["enum"]))
        described = describe(prop)
        if described:
            hints.append(described)
        lines.append(
            f"| `{column}` | {type_of(prop)} | {null} | {default_text} | {'; '.join(hints)} |"
        )
    lines.append("")
    return lines


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", help="write the fragment to this path instead of stdout")
    args = parser.parse_args(argv)

    definitions = fetch_spec().get("definitions") or {}
    grouped = {name for _, names in DOMAINS for name in names}
    leftovers = sorted(set(definitions) - grouped)

    out = ["## 3. Master Table & Field-Level API Reference", "",
           "Generated from the live PostgREST OpenAPI description, so this section "
           "always describes the deployed database rather than the migration files.", ""]

    for domain, names in DOMAINS:
        present = [name for name in names if name in definitions]
        if not present:
            continue
        out += [f"### 3.{DOMAINS.index((domain, names)) + 1} {domain}", ""]
        for name in present:
            out += render_table(name, definitions[name])

    if leftovers:
        out += [f"### 3.{len(DOMAINS) + 1} Other objects", ""]
        for name in leftovers:
            out += render_table(name, definitions[name])

    text = "\n".join(out).rstrip() + "\n"
    if args.write:
        path = Path(args.write)
        if not path.is_absolute():
            path = (Path.cwd() / path).resolve()
        path.write_text(text, encoding="utf-8")
        print(f"wrote {path} ({len(text.splitlines())} lines, {len(definitions)} objects)")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
