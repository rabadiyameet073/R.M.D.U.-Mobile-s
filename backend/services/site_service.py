"""Storefront composition reads.

Every public page is assembled from live tables here, so a row inserted in the
database — or through the admin console — appears on the storefront without a
deploy. Two rules shape the module:

* **One page, few queries.** Category tile copy, the members shown under each
  tile, featured devices, brands and site copy are fetched with grouped reads
  rather than one query per tile.
* **Degrade, never fail.** Migration 09 owns the display-copy columns and the
  `site_settings` table. If it has not been applied, the storefront still
  renders: the probe flag makes the next read skip the failing projection, and
  defaults stand in for absent copy.
"""

from __future__ import annotations

import asyncio
from copy import deepcopy
from typing import Any, Dict, List, Optional

from core.db import DataAccessError, db
from core.errors import APIError
from core.utils import as_float, identifier_filters, in_filter
from services import catalog_service

HOME_DEVICES_PER_CATEGORY = 3
FEATURED_LIMIT = 8
BRAND_LIMIT = 60
RANK_SCAN_LIMIT = 1000

# Copy that must exist before an admin has authored anything. Keys match the
# rows the console writes into `site_settings`, so stored values win per key.
DEFAULT_SETTINGS: Dict[str, Any] = {
    "site": {
        "name": "RMDU Mobiles",
        "tagline": "Find the right phone, not the newest one.",
    },
    "hero": {
        "eyebrow": "Don't Just Upgrade Your Phone",
        "title": "Upgrade Your\nStatement",
        "subtitle": "Honest guidance. Full transparency. Zero bias.",
        "primary_cta": {"label": "Discover More", "href": "#problem"},
    },
    "nav": [],
    "footer": {"note": "Prices and availability are updated from the live catalog."},
}

_settings_state: Optional[bool] = None


def _as_text_list(value: Any) -> List[str]:
    """Coerce a jsonb/text[] column into a list of strings."""
    if isinstance(value, list):
        return [str(item) for item in value if item is not None]
    if isinstance(value, str) and value.strip():
        return [value]
    return []


async def public_settings() -> Dict[str, Any]:
    """Site copy: defaults overlaid with the public rows of `site_settings`."""
    global _settings_state
    merged = deepcopy(DEFAULT_SETTINGS)
    if _settings_state is False:
        return merged
    try:
        result = await db.select(
            "site_settings",
            columns="key,value,is_public",
            filters={"is_public": "is.true"},
            order="key.asc",
            limit=200,
        )
        _settings_state = True
    except DataAccessError:
        # Table absent (migration 09 not applied) or unreadable: ship defaults.
        _settings_state = False
        return merged

    for row in result.rows:
        key = row.get("key")
        if key:
            merged[key] = row.get("value")
    return merged


def _compact(shaped: dict) -> dict:
    """Reduce a full device payload to the fields a grid tile renders."""
    brand = shaped.get("brand") or {}
    return {
        "id": shaped.get("id"),
        "name": shaped.get("name"),
        "slug": shaped.get("slug"),
        "brand_name": brand.get("name"),
        "brand_logo_url": brand.get("logo_url"),
        "image_url": shaped.get("image_url"),
        "price": as_float(shaped.get("price")) or 0.0,
        "currency": shaped.get("currency") or "INR",
        "overall_score": shaped.get("overall_score"),
        "key_specs": shaped.get("key_specs") or {},
        "is_featured": bool(shaped.get("is_featured")),
        "color_options": shaped.get("color_options") or [],
        "launch_date": shaped.get("launch_date"),
    }


def category_card(row: dict) -> dict:
    """Public shape of a category, including the admin-authored display copy."""
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "slug": row.get("slug"),
        "description": row.get("description"),
        "subtitle": row.get("subtitle"),
        "icon": row.get("icon"),
        "color_hex": row.get("color_hex"),
        "display_order": row.get("display_order") or 0,
        "is_active": row.get("is_active", True),
        "hero_video_url": row.get("hero_video_url"),
        "cover_image_url": row.get("cover_image_url"),
        "highlights": _as_text_list(row.get("highlights")),
    }


async def _ranked_members(category_ids: List[str], per_category: int) -> Dict[str, List[dict]]:
    """First `per_category` members of every category, in ranking order.

    One grouped read over the ranking view plus one hydration read. Grouping in
    Python is what keeps this O(1) in the number of categories instead of one
    pair of queries per tile.
    """
    if not category_ids:
        return {}
    try:
        view = await db.select(
            "vw_category_device_ranks",
            columns=(
                "category_id,device_id,manual_rank,auto_rank,rank_locked,"
                "category_score,overall_score"
            ),
            filters={"category_id": in_filter(category_ids)},
            order="category_id.asc,manual_rank.asc",
            limit=min(RANK_SCAN_LIMIT, max(len(category_ids) * 40, 80)),
        )
    except DataAccessError:
        # The view is optional for a tile: render the category without members.
        return {}

    grouped: Dict[str, List[dict]] = {}
    for row in view.rows:
        bucket = grouped.setdefault(row["category_id"], [])
        if len(bucket) < per_category:
            bucket.append(row)

    cards = await catalog_service.cards_by_ids(
        row["device_id"] for bucket in grouped.values() for row in bucket
    )
    payload: Dict[str, List[dict]] = {}
    for category_id, rows in grouped.items():
        payload[category_id] = [
            {
                "rank": row.get("manual_rank"),
                "auto_rank": row.get("auto_rank"),
                "rank_locked": row.get("rank_locked", False),
                "category_score": as_float(row.get("category_score")),
                "device": cards[row["device_id"]],
            }
            for row in rows
            if row["device_id"] in cards
        ]
    return payload


async def featured_devices(limit: int = FEATURED_LIMIT) -> List[dict]:
    """Admin-flagged devices, falling back to the newest arrivals."""
    select = catalog_service.device_select()
    result = await db.select(
        "devices",
        columns=select,
        filters={"is_active": "is.true", "is_featured": "is.true"},
        order="created_at.desc",
        limit=limit,
    )
    rows = result.rows
    if not rows:
        fallback = await db.select(
            "devices",
            columns=select,
            filters={"is_active": "is.true"},
            order="created_at.desc",
            limit=limit,
        )
        rows = fallback.rows
    return [_compact(catalog_service.shape_device(row)) for row in rows]


async def brand_directory(limit: int = BRAND_LIMIT) -> List[dict]:
    result = await db.select(
        "brands",
        columns="id,name,logo_url,country",
        filters={"is_active": "is.true"},
        order="name.asc",
        limit=limit,
    )
    return result.rows


async def _count(table: str, filters: Optional[Dict[str, str]] = None) -> int:
    result = await db.select(table, columns="id", filters=filters, limit=1, count=True)
    return result.total or 0


async def catalog_stats() -> Dict[str, int]:
    devices, brands, categories = await asyncio.gather(
        _count("devices", {"is_active": "is.true"}),
        _count("brands", {"is_active": "is.true"}),
        _count("categories", {"is_active": "is.true"}),
    )
    return {"devices": devices, "brands": brands, "categories": categories}


async def home_payload() -> dict:
    """Everything the storefront home renders, in one response."""
    categories = await catalog_service.load_active_categories()
    counts = await asyncio.gather(
        *(catalog_service.category_device_count(row["id"]) for row in categories),
        return_exceptions=True,
    )
    members, featured, brands, stats, site = await asyncio.gather(
        _ranked_members([row["id"] for row in categories], HOME_DEVICES_PER_CATEGORY),
        featured_devices(),
        brand_directory(),
        catalog_stats(),
        public_settings(),
    )

    tiles = []
    for row, count in zip(categories, counts):
        tile = category_card(row)
        tile["device_count"] = 0 if isinstance(count, Exception) else count
        tile["devices"] = members.get(row["id"], [])
        tiles.append(tile)

    return {
        "settings": site,
        "categories": tiles,
        "featured": featured,
        "brands": brands,
        "stats": stats,
    }


async def resolve_category(identifier: str) -> dict:
    """An *active* category by uuid or slug, with its copy when present.

    Deactivation is the storefront's delete (`DELETE /admin/categories/{id}`), so
    a deactivated category must stop resolving here; otherwise its page stayed
    reachable by direct link even though the home no longer listed it.
    """
    row = await db.select_one(
        "categories",
        columns=await catalog_service.category_projection(),
        filters={**identifier_filters(identifier), "is_active": "is.true"},
    )
    if not row:
        raise APIError(404, "category_not_found", f"No category matches '{identifier}'.")
    return row


async def category_page(
    identifier: str,
    *,
    page: int,
    page_size: int,
    ranking: str = "manual",
) -> dict:
    """A category header plus one page of its ranked members."""
    row = await resolve_category(identifier)
    items, meta = await catalog_service.ranked_category_devices(
        row, page=page, page_size=page_size, ranking=ranking
    )
    payload = category_card(row)
    payload.update(
        {
            "device_count": meta["total"],
            "devices": items,
            "meta": meta,
            "ranking_mode": ranking,
        }
    )
    return payload
