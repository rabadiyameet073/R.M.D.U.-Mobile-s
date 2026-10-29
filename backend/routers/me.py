"""Signed-in user surface: profile, history, alerts, cards, reviews, recs."""

from __future__ import annotations

from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Response, status

from core.db import db
from core.deps import CurrentUser, get_current_user, require_feature
from core.errors import APIError
from core.utils import as_float, identifier_filters, offset_for, pagination_meta
from schemas.catalog import ReviewOut
from schemas.common import Page
from schemas.compare import ComparisonSessionOut
from schemas.recommendation import CachedRecommendationOut, RecommendationResponse
from schemas.user import (
    HistoryFeed,
    MeOut,
    PhoneHistoryCreate,
    PhoneHistoryOut,
    PriceAlertCreate,
    PriceAlertOut,
    ProfileOut,
    ProfileUpdate,
    ShopkeeperCardOut,
)
from services.catalog_service import cards_by_ids, device_select, shape_device
from services.recommendation_engine import cached_for_user, recommend_for_user
from services.user_service import (
    PROFILE_COLUMNS,
    ensure_user,
    serialize_profile,
    user_stats,
)

router = APIRouter(prefix="/me", tags=["me"])

PHONE_HISTORY_COLUMNS = "id,device_id,usage_years,review,added_at"
ALERT_COLUMNS = "id,device_id,target_price,is_triggered,triggered_at,created_at"
CARD_COLUMNS = (
    "id,user_id,device_id,short_code,reason_summary,avoid_summary,budget_note,"
    "expires_at,view_count,created_at"
)


async def _resolve_device(identifier: str) -> dict:
    device = await db.select_one(
        "devices", columns="id,name", filters=identifier_filters(identifier)
    )
    if not device:
        raise APIError(404, "device_not_found", f"No device matches '{identifier}'.")
    return device


@router.get("", response_model=MeOut, summary="Profile, user record and activity counts")
async def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    user_row, profile_row = await ensure_user(user)
    stats = await user_stats(user.id)
    return {
        "user": user_row,
        "profile": serialize_profile(profile_row),
        "stats": stats,
    }


@router.patch("/profile", response_model=ProfileOut, summary="Update taste profile")
async def update_profile(
    payload: ProfileUpdate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    _, profile_row = await ensure_user(user)
    updates = payload.model_dump(exclude_unset=True)
    # `version` is a precondition, not a column to write; the DB trigger bumps it.
    expected_version = updates.pop("version", None)

    if "current_device_id" in updates and updates["current_device_id"]:
        await _resolve_device(updates["current_device_id"])

    budget_min = updates.get("budget_min", as_float(profile_row.get("budget_min")) or 0)
    budget_max = updates.get(
        "budget_max", as_float(profile_row.get("budget_max")) or 999999
    )
    if float(budget_max) < float(budget_min):
        raise APIError(
            422, "invalid_budget", "budget_max must be greater than or equal to budget_min."
        )

    if not updates:
        return serialize_profile(profile_row)

    filters = {"user_id": f"eq.{user.id}"}
    if expected_version is not None:
        filters["version"] = f"eq.{expected_version}"
    updated = await db.update(
        "user_profiles",
        filters,
        updates,
        columns=PROFILE_COLUMNS,
    )
    if not updated:
        current = await db.select_one(
            "user_profiles",
            columns="user_id,version",
            filters={"user_id": f"eq.{user.id}"},
        )
        if current and expected_version is not None:
            raise APIError(
                409,
                "version_conflict",
                f"Another tab already saved version {current['version']} of your profile; "
                "reload and retry.",
                {"current_version": current["version"]},
            )
        raise APIError(404, "profile_missing", "No profile row for this user.")
    return serialize_profile(updated[0])


@router.get("/history", response_model=Page[PhoneHistoryOut], summary="Phones the user owned")
async def phone_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    result = await db.select(
        "user_phone_history",
        columns=f"{PHONE_HISTORY_COLUMNS},device:devices({device_select()})",
        filters={"user_id": f"eq.{user.id}"},
        order="added_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    items = []
    for row in result.rows:
        device_row = row.get("device")
        items.append(
            {**row, "device": shape_device(device_row) if device_row else None}
        )
    return {"items": items, "meta": pagination_meta(page, page_size, result.total or 0)}


@router.post(
    "/history",
    response_model=PhoneHistoryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Add a phone to the user's history",
)
async def add_phone_history(
    payload: PhoneHistoryCreate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    await ensure_user(user)
    device = await _resolve_device(payload.device_id)
    rows = await db.insert(
        "user_phone_history",
        {
            "user_id": user.id,
            "device_id": device["id"],
            "usage_years": payload.usage_years,
            "review": payload.review,
        },
        columns=PHONE_HISTORY_COLUMNS,
    )
    created = rows[0]
    created["device"] = (await cards_by_ids([device["id"]])).get(device["id"])
    return created


@router.delete(
    "/history/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_phone_history(
    entry_id: str, user: CurrentUser = Depends(get_current_user)
) -> None:
    removed = await db.delete(
        "user_phone_history", {"id": f"eq.{entry_id}", "user_id": f"eq.{user.id}"}
    )
    if not removed:
        raise APIError(404, "history_not_found", "No history entry with that id belongs to you.")


async def _hydrate_alerts(rows: List[dict]) -> List[dict]:
    mapping = await cards_by_ids({row["device_id"] for row in rows})
    payload = []
    for row in rows:
        device = mapping.get(row["device_id"])
        target = as_float(row.get("target_price")) or 0
        payload.append(
            {
                **row,
                "device": device,
                "price_gap": round((device["price"] - target), 2) if device else None,
            }
        )
    return payload


@router.get("/price-alerts", response_model=Page[PriceAlertOut], summary="My price alerts")
async def list_price_alerts(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    result = await db.select(
        "price_alerts",
        columns=ALERT_COLUMNS,
        filters={"user_id": f"eq.{user.id}"},
        order="created_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {
        "items": await _hydrate_alerts(result.rows),
        "meta": pagination_meta(page, page_size, result.total or 0),
    }


@router.post(
    "/price-alerts",
    response_model=PriceAlertOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("feature_price_alerts"))],
    summary="Create or update a price alert",
)
async def upsert_price_alert(
    payload: PriceAlertCreate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    await ensure_user(user)
    device = await _resolve_device(payload.device_id)
    rows = await db.insert(
        "price_alerts",
        {
            "user_id": user.id,
            "device_id": device["id"],
            "target_price": payload.target_price,
        },
        columns=ALERT_COLUMNS,
        upsert=True,
        on_conflict="user_id,device_id",
    )
    return (await _hydrate_alerts(rows))[0]


@router.delete(
    "/price-alerts/{alert_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def delete_price_alert(
    alert_id: str, user: CurrentUser = Depends(get_current_user)
) -> None:
    removed = await db.delete(
        "price_alerts", {"id": f"eq.{alert_id}", "user_id": f"eq.{user.id}"}
    )
    if not removed:
        raise APIError(404, "alert_not_found", "No price alert with that id belongs to you.")


@router.get("/comparisons", response_model=Page[ComparisonSessionOut])
async def my_comparisons(
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
    mapping = await cards_by_ids(all_ids)
    items = [
        {
            **row,
            "devices": [
                mapping[device_id]
                for device_id in (row.get("device_ids") or [])
                if device_id in mapping
            ],
        }
        for row in result.rows
    ]
    return {"items": items, "meta": pagination_meta(page, page_size, result.total or 0)}


@router.get("/cards", response_model=Page[ShopkeeperCardOut], summary="My shopkeeper cards")
async def my_cards(
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
    mapping = await cards_by_ids({row["device_id"] for row in result.rows})
    now = datetime.now(timezone.utc)

    def _expired(value: Optional[str]) -> bool:
        if not value:
            return False
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")) < now
        except ValueError:
            return False

    items = [
        {
            **row,
            "device": mapping.get(row["device_id"]),
            "is_expired": _expired(row.get("expires_at")),
        }
        for row in result.rows
    ]
    return {"items": items, "meta": pagination_meta(page, page_size, result.total or 0)}


@router.get("/reviews", response_model=Page[ReviewOut], summary="My reviews")
async def my_reviews(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    result = await db.select(
        "reviews",
        columns=(
            "id,user_id,device_id,rating,title,review_text,verified_owner,"
            "helpful_votes,is_approved,created_at"
        ),
        filters={"user_id": f"eq.{user.id}"},
        order="created_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {"items": result.rows, "meta": pagination_meta(page, page_size, result.total or 0)}


@router.get(
    "/recommendations",
    response_model=List[CachedRecommendationOut],
    summary="My stored recommendation set",
)
async def my_recommendations(
    user: CurrentUser = Depends(get_current_user),
) -> List[dict]:
    return await cached_for_user(user.id)


@router.post(
    "/recommendations",
    response_model=RecommendationResponse,
    summary="Regenerate recommendations from my profile",
)
async def regenerate_recommendations(
    limit: int = Query(default=5, ge=1, le=20),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    await ensure_user(user)
    result = await recommend_for_user(user.id, limit=limit)
    if result is None:
        raise APIError(
            404, "profile_missing", "Complete your profile before generating recommendations."
        )
    return result


@router.get("/feed", response_model=HistoryFeed, summary="Unified recent activity")
async def activity_feed(
    limit: int = Query(default=20, ge=1, le=50),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Merge recent reviews, alerts and comparisons into one chronological feed."""
    reviews, alerts, comparisons = (
        await db.select(
            "reviews",
            columns="id,device_id,rating,title,created_at",
            filters={"user_id": f"eq.{user.id}"},
            order="created_at.desc",
            limit=limit,
        ),
        await db.select(
            "price_alerts",
            columns="id,device_id,target_price,created_at",
            filters={"user_id": f"eq.{user.id}"},
            order="created_at.desc",
            limit=limit,
        ),
        await db.select(
            "comparison_sessions",
            columns="id,device_ids,created_at",
            filters={"user_id": f"eq.{user.id}"},
            order="created_at.desc",
            limit=limit,
        ),
    )
    items = []
    for row in reviews.rows:
        items.append(
            {
                "id": row["id"],
                "type": "review",
                "title": row.get("title") or f"Rated {row.get('rating')}/5",
                "device_id": row.get("device_id"),
                "created_at": row.get("created_at"),
                "detail": {"rating": row.get("rating")},
            }
        )
    for row in alerts.rows:
        items.append(
            {
                "id": row["id"],
                "type": "price_alert",
                "title": f"Alert at ₹{float(row.get('target_price') or 0):,.0f}",
                "device_id": row.get("device_id"),
                "created_at": row.get("created_at"),
                "detail": {"target_price": as_float(row.get("target_price"))},
            }
        )
    for row in comparisons.rows:
        items.append(
            {
                "id": row["id"],
                "type": "comparison",
                "title": "Device comparison",
                "device_id": (row.get("device_ids") or [None])[0],
                "created_at": row.get("created_at"),
                "detail": {"device_ids": row.get("device_ids") or []},
            }
        )
    items.sort(key=lambda item: item.get("created_at") or "", reverse=True)
    return {"items": items[:limit]}
