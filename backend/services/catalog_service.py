"""Catalog reads and shape-normalisation.

PostgREST returns embedded relations under their table names (to-one objects,
to-many arrays). This module owns the single place where those rows become the
API's stable JSON shape, so every endpoint returns identical device payloads.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, Iterable, List, Optional, Tuple

from core.db import db
from core.errors import APIError
from core.utils import as_float, identifier_filters, in_filter, is_uuid, pagination_meta, slugify
from schemas.catalog import ReviewsSummary

BRAND_COLUMNS = "id,name,logo_url,country,is_active,created_at"

SPEC_COLUMNS = (
    "processor_name,processor_brand,process_node,cpu_cores,cpu_max_freq_ghz,gpu_name,"
    "antutu_score,geekbench_single,geekbench_multi,ram_gb,storage_gb,storage_type,"
    "display_size_inch,display_resolution,display_type,refresh_rate_hz,peak_brightness_nit,"
    "protection,camera_primary_mp,camera_ultra_mp,camera_tele_mp,camera_front_mp,"
    "camera_features,video_max_res,battery_mah,charging_watt,wireless_watt,reverse_watt,"
    "five_g,wifi_standard,bluetooth_version,nfc,usb_type,os,ui_layer,guaranteed_updates,"
    "weight_grams,dimensions,build_material,ip_rating"
)

SCORE_COLUMNS = (
    "performance_score,camera_score,battery_score,display_score,value_score,"
    "build_score,software_score,overall_score,scored_by,updated_at"
)

DEVICE_ROOT_COLUMNS = (
    "id,brand_id,name,model_number,slug,launch_date,price,currency,image_url,"
    "gallery_urls,color_options,is_active,is_featured,version,created_at,updated_at,extra"
)

CATEGORY_JOIN_COLUMNS = (
    "rank,rank_locked,justification,"
    "category:categories(id,name,slug,icon,color_hex)"
)


async def resolve_brand(identifier: str) -> Optional[dict]:
    """Resolve a brand from a UUID, exact name, or slugified name.

    `brands` has no slug column, and brand names contain spaces, so the fallback
    compares in Python over a bounded list instead of building an `or=` filter
    that would break on punctuation.
    """
    if is_uuid(identifier):
        return await db.select_one(
            "brands", columns=BRAND_COLUMNS, filters={"id": f"eq.{identifier}"}
        )
    result = await db.select("brands", columns=BRAND_COLUMNS, order="name.asc", limit=500)
    wanted = slugify(identifier)
    lowered = identifier.strip().lower()
    for row in result.rows:
        if row["name"].lower() == lowered or slugify(row["name"]) == wanted:
            return row
    return None


def device_select(
    *,
    detail: bool = False,
    inner_specs: bool = False,
    inner_brand: bool = False,
    inner_scores: bool = False,
) -> str:
    """Build the select clause for a device payload.

    * `!inner` variants are only used when the query filters on that relation,
      which is what makes PostgREST restrict parent rows.
    """
    specs = "device_specs!inner" if inner_specs else "device_specs"
    brand = "brands!inner" if inner_brand else "brands"
    scores = "device_scores!inner" if inner_scores else "device_scores"
    parts = [
        DEVICE_ROOT_COLUMNS,
        f"{brand}({BRAND_COLUMNS})",
        f"{scores}({SCORE_COLUMNS})",
        f"{specs}({SPEC_COLUMNS})",
    ]
    if detail:
        parts.extend(
            [
                "device_pros_cons(id,type,description,importance,display_order)",
                "device_features(id,feature_name,feature_value,icon,display_order)",
                "device_ussd_codes(id,code,description,category,is_universal)",
                f"device_categories({CATEGORY_JOIN_COLUMNS})",
            ]
        )
    return ",".join(parts)


def detail_filters() -> Dict[str, str]:
    """Related-row ordering for the detail payload."""
    return {
        "device_pros_cons.order": "display_order.asc",
        "device_features.order": "display_order.asc",
        "device_categories.order": "rank.asc",
    }


def _singular(value: Any) -> Dict[str, Any]:
    if isinstance(value, list):
        return value[0] if value else {}
    return value or {}


def _plural(value: Any) -> List[dict]:
    return value if isinstance(value, list) else []


def shape_device(row: dict, *, detail: bool = False) -> dict:
    """Normalise one PostgREST device row into the API device shape."""
    brand = _singular(row.get("brands"))
    scores = _singular(row.get("device_scores"))
    specs = _singular(row.get("device_specs"))

    key_specs: Dict[str, Any] = {}
    for key in (
        "processor_name",
        "ram_gb",
        "storage_gb",
        "battery_mah",
        "charging_watt",
        "display_size_inch",
        "refresh_rate_hz",
        "camera_primary_mp",
        "five_g",
        "os",
        "weight_grams",
        "ip_rating",
    ):
        if specs.get(key) is not None:
            key_specs[key] = specs[key]

    payload: Dict[str, Any] = {
        "id": row.get("id"),
        "brand_id": row.get("brand_id"),
        "name": row.get("name"),
        "slug": row.get("slug"),
        "model_number": row.get("model_number"),
        "launch_date": row.get("launch_date"),
        "price": as_float(row.get("price")) or 0.0,
        "currency": row.get("currency") or "INR",
        "image_url": row.get("image_url"),
        "gallery_urls": row.get("gallery_urls") or [],
        "color_options": row.get("color_options") or [],
        "is_active": row.get("is_active", True),
        "is_featured": row.get("is_featured", False),
        "version": row.get("version") or 1,
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
        "extra": row.get("extra") or {},
        "brand": {
            "id": brand.get("id"),
            "name": brand.get("name"),
            "logo_url": brand.get("logo_url"),
            "country": brand.get("country"),
        }
        if brand
        else None,
        "scores": scores or None,
        "specs": specs or None,
        "overall_score": as_float(scores.get("overall_score")),
        "key_specs": key_specs,
    }

    if detail:
        pros_cons = _plural(row.get("device_pros_cons"))
        payload["pros"] = sorted(
            [item for item in pros_cons if item.get("type") == "pro"],
            key=lambda item: item.get("display_order") or 0,
        )
        payload["cons"] = sorted(
            [item for item in pros_cons if item.get("type") == "con"],
            key=lambda item: item.get("display_order") or 0,
        )
        payload["features"] = _plural(row.get("device_features"))
        payload["ussd_codes"] = _plural(row.get("device_ussd_codes"))
        payload["categories"] = [
            {
                "id": (item.get("category") or {}).get("id"),
                "name": (item.get("category") or {}).get("name"),
                "slug": (item.get("category") or {}).get("slug"),
                "icon": (item.get("category") or {}).get("icon"),
                "color_hex": (item.get("category") or {}).get("color_hex"),
                "rank": item.get("rank"),
                "rank_locked": item.get("rank_locked", False),
                "justification": item.get("justification"),
            }
            for item in _plural(row.get("device_categories"))
            if item.get("category")
        ]
    return payload


async def fetch_devices(
    *,
    filters: Optional[Dict[str, str]] = None,
    select: Optional[str] = None,
    order: str = "created_at.desc",
    limit: int = 20,
    offset: int = 0,
    count: bool = False,
):
    return await db.select(
        "devices",
        columns=select or device_select(),
        filters=filters,
        order=order,
        limit=limit,
        offset=offset,
        count=count,
    )


async def get_device_row(identifier: str, *, detail: bool = True) -> dict:
    filters = identifier_filters(identifier)
    select = device_select(detail=detail)
    if detail:
        filters.update(detail_filters())
    row = await db.select_one("devices", columns=select, filters=filters)
    if not row:
        raise APIError(404, "device_not_found", f"No device matches '{identifier}'.")
    return row


async def get_device(identifier: str, *, detail: bool = True) -> dict:
    row = await get_device_row(identifier, detail=detail)
    payload = shape_device(row, detail=detail)
    if detail:
        payload["reviews_summary"] = (await reviews_summary(payload["id"])).model_dump()
        payload["ussd_codes"] = payload["ussd_codes"] + await universal_ussd_codes()
    return payload


async def universal_ussd_codes() -> List[dict]:
    result = await db.select(
        "device_ussd_codes",
        columns="id,code,description,category,is_universal",
        filters={"is_universal": "is.true", "device_id": "is.null"},
        order="category.asc,code.asc",
        limit=50,
    )
    return result.rows


async def cards_by_ids(device_ids: Iterable[str]) -> Dict[str, dict]:
    ids = [device_id for device_id in device_ids if device_id]
    if not ids:
        return {}
    result = await db.select(
        "devices",
        columns=device_select(),
        filters={"id": in_filter(ids)},
        limit=len(ids),
    )
    return {row["id"]: shape_device(row) for row in result.rows}


async def reviews_summary(device_id: str) -> ReviewsSummary:
    result = await db.select(
        "reviews",
        columns="rating",
        filters={"device_id": f"eq.{device_id}", "is_approved": "is.true"},
        limit=1000,
    )
    ratings = [int(row["rating"]) for row in result.rows if row.get("rating")]
    distribution = {str(star): 0 for star in range(1, 6)}
    for rating in ratings:
        distribution[str(rating)] += 1
    average = round(sum(ratings) / len(ratings), 2) if ratings else None
    return ReviewsSummary(count=len(ratings), average_rating=average, distribution=distribution)


async def category_device_count(category_id: str) -> int:
    result = await db.select(
        "device_categories",
        columns="id",
        filters={"category_id": f"eq.{category_id}"},
        limit=1,
        count=True,
    )
    return result.total or 0


async def categories_with_counts() -> List[dict]:
    result = await db.select(
        "categories",
        columns="id,name,slug,description,icon,color_hex,display_order,is_active,created_at",
        filters={"is_active": "is.true"},
        order="display_order.asc",
        limit=50,
    )
    counts = await asyncio.gather(
        *(category_device_count(row["id"]) for row in result.rows), return_exceptions=True
    )
    payload = []
    for row, count in zip(result.rows, counts):
        row = dict(row)
        row["device_count"] = 0 if isinstance(count, Exception) else count
        payload.append(row)
    return payload


async def ranked_category_devices(
    category: dict,
    *,
    page: int,
    page_size: int,
    ranking: str = "manual",
) -> Tuple[List[dict], dict]:
    """Read the hybrid ranking view, then hydrate device cards in rank order."""
    order = "auto_rank.asc" if ranking == "auto" else "manual_rank.asc"
    view = await db.select(
        "vw_category_device_ranks",
        columns=(
            "category_id,device_id,device_name,device_slug,price,brand_name,"
            "manual_rank,rank_locked,auto_rank,category_score,overall_score"
        ),
        filters={"category_id": f"eq.{category['id']}"},
        order=f"{order},device_name.asc",
        limit=page_size,
        offset=(page - 1) * page_size,
        count=True,
    )
    cards = await cards_by_ids(row["device_id"] for row in view.rows)
    items: List[dict] = []
    for row in view.rows:
        card = cards.get(row["device_id"])
        if not card:
            continue
        items.append(
            {
                "rank": row.get("auto_rank") if ranking == "auto" else row.get("manual_rank"),
                "manual_rank": row.get("manual_rank"),
                "auto_rank": row.get("auto_rank"),
                "rank_locked": row.get("rank_locked", False),
                "category_score": as_float(row.get("category_score")),
                "overall_score": as_float(row.get("overall_score")),
                "device": card,
            }
        )
    return items, pagination_meta(page, page_size, view.total or 0)


async def batch_cards_by_ids(ids: List[str]) -> List[Optional[dict]]:
    """Return cards aligned with the incoming id order."""
    mapping = await cards_by_ids(ids)
    return [mapping.get(device_id) for device_id in ids]
