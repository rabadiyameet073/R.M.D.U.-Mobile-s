"""Comparison endpoints."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from core.db import db
from core.deps import CurrentUser, get_current_user, get_optional_user
from core.utils import offset_for, pagination_meta
from schemas.common import Page
from schemas.compare import CompareRequest, ComparisonResponse, ComparisonSessionOut
from services.catalog_service import batch_cards_by_ids
from services.compare_service import compare_devices

router = APIRouter(prefix="/compare", tags=["compare"])


@router.post("", response_model=ComparisonResponse, summary="Compare 2-4 devices")
async def compare(
    payload: CompareRequest,
    user: Optional[CurrentUser] = Depends(get_optional_user),
) -> dict:
    return await compare_devices(
        payload.devices,
        priority=payload.priority,
        user_id=user.id if user else None,
        save_session=payload.save_session,
    )


@router.get("/history", response_model=Page[ComparisonSessionOut])
async def comparison_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    result = await db.select(
        "comparison_sessions",
        columns="id,user_id,device_ids,winner_device_id,created_at",
        filters={"user_id": f"eq.{user.id}"},
        order="created_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    all_ids = {device_id for row in result.rows for device_id in (row.get("device_ids") or [])}
    mapping = {
        card["id"]: card for card in await batch_cards_by_ids(list(all_ids)) if card
    }
    items = []
    for row in result.rows:
        items.append(
            {
                **row,
                "devices": [
                    mapping[device_id]
                    for device_id in (row.get("device_ids") or [])
                    if device_id in mapping
                ],
            }
        )
    return {"items": items, "meta": pagination_meta(page, page_size, result.total or 0)}
