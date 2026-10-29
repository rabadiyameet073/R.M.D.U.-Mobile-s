"""Category endpoints backed by the dynamic ranking view."""

from __future__ import annotations

from typing import List, Literal

from fastapi import APIRouter, Query

from core.db import db
from core.errors import APIError
from core.utils import identifier_filters
from schemas.catalog import CategoryDetail, CategoryOut, RankedDeviceOut
from schemas.common import Page
from services.catalog_service import categories_with_counts, ranked_category_devices

router = APIRouter(prefix="/categories", tags=["categories"])

CATEGORY_COLUMNS = "id,name,slug,description,icon,color_hex,display_order,is_active"


async def _resolve_category(identifier: str) -> dict:
    row = await db.select_one(
        "categories", columns=CATEGORY_COLUMNS, filters=identifier_filters(identifier)
    )
    if not row:
        raise APIError(404, "category_not_found", f"No category matches '{identifier}'.")
    return row


@router.get("", response_model=List[CategoryOut], summary="List categories")
async def list_categories() -> List[dict]:
    return await categories_with_counts()


@router.get("/{identifier}", response_model=CategoryDetail, summary="Category with ranked devices")
async def category_detail(
    identifier: str,
    ranking: Literal["manual", "auto"] = Query(default="manual"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
) -> dict:
    category = await _resolve_category(identifier)
    items, meta = await ranked_category_devices(
        category, page=page, page_size=page_size, ranking=ranking
    )
    return {
        **category,
        "device_count": meta["total"],
        "devices": items,
        "ranking_mode": ranking,
    }


@router.get("/{identifier}/devices", response_model=Page[RankedDeviceOut])
async def category_devices(
    identifier: str,
    ranking: Literal["manual", "auto"] = Query(default="manual"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
) -> dict:
    category = await _resolve_category(identifier)
    items, meta = await ranked_category_devices(
        category, page=page, page_size=page_size, ranking=ranking
    )
    return {"items": items, "meta": meta}


@router.get("/{identifier}/meta", response_model=dict, include_in_schema=False)
async def category_meta(identifier: str) -> dict:
    """Lightweight category header (no device payload)."""
    category = await _resolve_category(identifier)
    total = await db.select(
        "device_categories",
        columns="id",
        filters={"category_id": f"eq.{category['id']}"},
        limit=1,
        count=True,
    )
    return {**category, "device_count": total.total or 0}
