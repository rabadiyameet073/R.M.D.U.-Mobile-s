"""Brand endpoints."""

from __future__ import annotations

import asyncio
from typing import List, Literal

from fastapi import APIRouter, Path, Query

from core.db import db
from core.errors import APIError
from core.utils import offset_for, pagination_meta
from schemas.catalog import BrandOut, DeviceCard
from schemas.common import Page
from services.catalog_service import device_select, resolve_brand, shape_device

router = APIRouter(prefix="/brands", tags=["brands"])


async def _brand_device_count(brand_id: str) -> int:
    result = await db.select(
        "devices",
        columns="id",
        filters={"brand_id": f"eq.{brand_id}", "is_active": "is.true"},
        limit=1,
        count=True,
    )
    return result.total or 0


@router.get("", response_model=List[BrandOut], summary="List active brands")
async def list_brands(include_inactive: bool = Query(default=False)) -> List[dict]:
    filters = {} if include_inactive else {"is_active": "is.true"}
    result = await db.select(
        "brands",
        columns="id,name,logo_url,country,is_active,created_at",
        filters=filters,
        order="name.asc",
        limit=200,
    )
    counts = await asyncio.gather(
        *(_brand_device_count(row["id"]) for row in result.rows), return_exceptions=True
    )
    payload = []
    for row, count in zip(result.rows, counts):
        payload.append({**row, "device_count": 0 if isinstance(count, Exception) else count})
    return payload


@router.get("/{identifier}", response_model=BrandOut, summary="Get one brand")
async def get_brand(identifier: str = Path(description="Brand UUID, name, or name-slug")) -> dict:
    row = await resolve_brand(identifier)
    if not row:
        raise APIError(404, "brand_not_found", f"No brand matches '{identifier}'.")
    row = dict(row)
    row["device_count"] = await _brand_device_count(row["id"])
    return row


@router.get("/{identifier}/devices", response_model=Page[DeviceCard])
async def brand_devices(
    identifier: str,
    sort: Literal["newest", "price_asc", "price_desc", "score_desc", "name_asc"] = "score_desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
) -> dict:
    brand = await resolve_brand(identifier)
    if not brand:
        raise APIError(404, "brand_not_found", f"No brand matches '{identifier}'.")
    order = {
        "newest": "created_at.desc",
        "price_asc": "price.asc",
        "price_desc": "price.desc",
        "score_desc": "device_scores(overall_score).desc",
        "name_asc": "name.asc",
    }[sort]
    result = await db.select(
        "devices",
        columns=device_select(),
        filters={"brand_id": f"eq.{brand['id']}", "is_active": "is.true"},
        order=order,
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {
        "items": [shape_device(row) for row in result.rows],
        "meta": pagination_meta(page, page_size, result.total or 0),
    }
