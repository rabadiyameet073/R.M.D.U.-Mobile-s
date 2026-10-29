"""Shopkeeper card endpoints (shareable, short-code based retail lookup)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response, status

from core.db import db
from core.deps import CurrentUser, get_current_user, require_feature
from core.errors import APIError
from core.ratelimit import CARD_CREATE, CARD_LOOKUP
from core.utils import identifier_filters, offset_for, pagination_meta
from schemas.common import Page
from schemas.user import PublicShopkeeperCardOut, ShopkeeperCardCreate, ShopkeeperCardOut
from services.catalog_service import cards_by_ids
from services.concurrency import call_rpc
from services.user_service import ensure_user

logger = logging.getLogger("rmdu.retail")

router = APIRouter(prefix="/retail", tags=["retail"])

CARD_COLUMNS = (
    "id,user_id,device_id,short_code,reason_summary,avoid_summary,budget_note,"
    "expires_at,view_count,created_at"
)


def _is_expired(expires_at: Optional[str]) -> bool:
    """Local fallback used only for cards read outside the public lookup.

    An expiry that cannot be parsed cannot be proven valid, so the card is
    presented as expired. Failing open — the previous behaviour — meant a
    malformed timestamp silently produced a card with no expiry at all.
    """
    if not expires_at:
        return False
    try:
        expiry = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
    except ValueError:
        logger.warning("unparseable card expiry %r; treating the card as expired", expires_at)
        return True
    return expiry < datetime.now(timezone.utc)


async def _hydrate(cards: List[dict]) -> List[dict]:
    mapping = await cards_by_ids({card["device_id"] for card in cards})
    payload = []
    for card in cards:
        # The database decides expiry for the public path; only fall back to the
        # local parse when the row did not carry a verdict.
        expired = card["is_expired"] if "is_expired" in card else _is_expired(card.get("expires_at"))
        payload.append(
            {
                **card,
                "device": mapping.get(card["device_id"]),
                "is_expired": bool(expired),
            }
        )
    return payload


@router.get(
    "/cards/{short_code}",
    response_model=PublicShopkeeperCardOut,
    dependencies=[Depends(CARD_LOOKUP)],
    summary="Public card lookup by short code (increments the view count atomically)",
)
async def public_card(short_code: str) -> dict:
    """Look up one card and count the view in the same statement.

    The counter used to be read here, incremented in Python and written back, so
    two simultaneous lookups stored one view. `fn_increment_card_view` does the
    increment and the projection in one UPDATE: the count returned is the count
    stored, and the row it returns never contains the owner.
    """
    code = short_code.strip().upper()
    result = await call_rpc(
        "fn_increment_card_view",
        {"p_short_code": code},
        feature="Shopkeeper card lookup",
    )
    if result.get("status") != "ok" or not result.get("card"):
        raise APIError(404, "card_not_found", f"No shopkeeper card matches '{code}'.")
    card = {**result["card"], "user_id": None, "is_expired": result.get("is_expired")}
    return (await _hydrate([card]))[0]


@router.post(
    "/cards",
    response_model=ShopkeeperCardOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(CARD_CREATE), Depends(require_feature("feature_shopkeeper_cards"))],
    summary="Create a shopkeeper card (authenticated)",
)
async def create_card(
    payload: ShopkeeperCardCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    await ensure_user(user)
    device = await db.select_one(
        "devices", columns="id,name", filters=identifier_filters(payload.device_id)
    )
    if not device:
        raise APIError(404, "device_not_found", f"No device matches '{payload.device_id}'.")

    expires_at = (
        datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days)
    ).isoformat()
    rows = await db.insert(
        "shopkeeper_cards",
        {
            "user_id": user.id,
            "device_id": device["id"],
            "reason_summary": payload.reason_summary,
            "avoid_summary": payload.avoid_summary,
            "budget_note": payload.budget_note,
            "expires_at": expires_at,
        },
        columns=CARD_COLUMNS,
    )
    return (await _hydrate([rows[0]]))[0]


@router.get("/cards", response_model=Page[ShopkeeperCardOut], summary="My shopkeeper cards")
async def list_my_cards(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    result = await db.select(
        "shopkeeper_cards",
        columns=CARD_COLUMNS,
        filters={"user_id": f"eq.{user.id}"},
        order="created_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {
        "items": await _hydrate(result.rows),
        "meta": pagination_meta(page, page_size, result.total or 0),
    }


@router.delete(
    "/cards/{card_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_card(card_id: str, user: CurrentUser = Depends(get_current_user)) -> None:
    card = await db.select_one(
        "shopkeeper_cards",
        columns="id",
        filters={"id": f"eq.{card_id}", "user_id": f"eq.{user.id}"},
    )
    if not card:
        raise APIError(404, "card_not_found", "No card with that id belongs to you.")
    await db.delete(
        "shopkeeper_cards", {"id": f"eq.{card_id}", "user_id": f"eq.{user.id}"}
    )
