"""Comparison endpoints."""

from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query

from core.db import db
from core.deps import CurrentUser, get_current_user, get_optional_user
from core.errors import APIError
from core.utils import is_uuid, offset_for, pagination_meta
from schemas.common import Page
from schemas.compare import (
    CompareRequest,
    ComparisonResponse,
    ComparisonSessionOut,
    SavedComparisonResponse,
)
from services.catalog_service import batch_cards_by_ids
from services.compare_service import compare_devices

router = APIRouter(prefix="/compare", tags=["compare"])

Priority = Literal["gaming", "camera", "battery", "value", "all-rounder"]


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


@router.get(
    "/{session_id}",
    response_model=SavedComparisonResponse,
    summary="Re-open a saved comparison",
)
async def saved_comparison(
    session_id: str,
    priority: Priority = Query(default="all-rounder"),
    user: Optional[CurrentUser] = Depends(get_optional_user),
) -> dict:
    """Replay one stored session through the current engine.

    Ownership: a session that carries a `user_id` is readable only by that
    account. An anonymous session (`user_id IS NULL`) stays readable by whoever
    holds its UUID — the same capability `POST /compare` handed out — so a
    shared link keeps working without exposing anyone's history.

    The matrix is rebuilt rather than replayed verbatim: prices, scores and the
    scoring weights may have moved since `saved_at`, and serving the stale
    snapshot would quietly contradict the live catalog.
    """
    if not is_uuid(session_id):
        raise APIError(404, "comparison_not_found", f"No comparison matches '{session_id}'.")
    session = await db.select_one(
        "comparison_sessions",
        columns="id,user_id,device_ids,winner_device_id,created_at",
        filters={"id": f"eq.{session_id}"},
    )
    if not session:
        raise APIError(404, "comparison_not_found", f"No comparison matches '{session_id}'.")
    owner = session.get("user_id")
    if owner and (user is None or user.id != owner):
        raise APIError(403, "comparison_forbidden", "This comparison belongs to another user.")

    device_ids = list(session.get("device_ids") or [])
    if len(device_ids) < 2:
        raise APIError(
            409,
            "comparison_incomplete",
            "The stored comparison no longer holds two devices to compare.",
        )

    result = await compare_devices(
        device_ids, priority=priority, user_id=None, save_session=False
    )
    return {
        **result,
        "session_id": session["id"],
        "saved_at": session.get("created_at"),
        "saved_winner_device_id": session.get("winner_device_id"),
    }
