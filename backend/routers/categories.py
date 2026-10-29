"""Category endpoints backed by the dynamic ranking view."""

from __future__ import annotations

from typing import List, Literal

from fastapi import APIRouter, Query

from core.db import db
from core.errors import APIError
from core.utils import identifier_filters
from schemas.catalog import CategoryDetail, CategoryOut, RankedDeviceOut
from schemas.common import Page
from services.catalog_service import (
    categories_with_counts,
    category_projection,
    ranked_category_devices,
)

router = APIRouter(prefix="/categories", tags=["categories"])


async def _resolve_category(identifier: str) -> dict:
    # The projection is probed, not guessed: it includes the admin-authored copy
    # when migration 09 is applied, and the base columns when it is not, so the
    # public category header and the console share one read. Deactivated rows do
    # not resolve: `DELETE /admin/categories/{id}` is the storefront's delete.
    row = await db.select_one(
        "categories",
        columns=await category_projection(),
        filters={**identifier_filters(identifier), "is_active": "is.true"},
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
        "meta": meta,
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


@router.get(
    "/{identifier}/meta",
    response_model=CategoryOut,
    summary="Category header without the device payload",
)
async def category_meta(identifier: str) -> dict:
    """Lightweight category header for nav, breadcrumbs and thin-page checks.

    Listed in the schema because the SEO rule the frontend implements — a page
    with fewer than three devices must render `noindex, follow` — needs this
    count before it decides what to render.
    """
    category = await _resolve_category(identifier)
    total = await db.select(
        "device_categories",
        columns="id",
        filters={"category_id": f"eq.{category['id']}"},
        limit=1,
        count=True,
    )
    return {**category, "device_count": total.total or 0}
