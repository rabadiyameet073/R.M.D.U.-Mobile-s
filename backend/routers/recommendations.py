"""Recommendation endpoints (guest engine + personal cache)."""

from __future__ import annotations

from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, Query

from core.deps import CurrentUser, get_current_user, get_optional_user
from core.errors import APIError
from core.utils import as_float
from schemas.recommendation import (
    CachedRecommendationOut,
    PersonalRecommendationRequest,
    RecommendationRequest,
    RecommendationResponse,
    RecommendationRuleOut,
)
from services.recommendation_engine import (
    cached_for_user,
    load_rules,
    recommend,
    recommend_for_user,
)
from services.user_service import ensure_user

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _rule_payload(row: dict) -> dict:
    return {
        "id": row["id"],
        "priority": row["priority"],
        "weights": {
            "performance": as_float(row.get("weight_perf")) or 0,
            "camera": as_float(row.get("weight_camera")) or 0,
            "battery": as_float(row.get("weight_battery")) or 0,
            "display": as_float(row.get("weight_display")) or 0,
            "value": as_float(row.get("weight_value")) or 0,
            "build": as_float(row.get("weight_build")) or 0,
            "software": as_float(row.get("weight_software")) or 0,
        },
        "updated_at": row.get("updated_at"),
    }


@router.get("/rules", response_model=List[RecommendationRuleOut], summary="Scoring weights per priority")
async def recommendation_rules() -> List[dict]:
    rules = await load_rules()
    return [_rule_payload(row) for row in rules.values()]


@router.get("/quick", response_model=RecommendationResponse, summary="Quick picks without a profile")
async def quick_recommendations(
    priority: Literal["gaming", "camera", "battery", "value", "all-rounder"] = Query(
        default="all-rounder"
    ),
    budget_max: float = Query(default=200000, gt=0),
    limit: int = Query(default=5, ge=1, le=20),
) -> dict:
    request = RecommendationRequest(
        budget_min=0,
        budget_max=budget_max,
        primary_priority=priority,
        limit=limit,
    )
    return await recommend(request)


@router.post("", response_model=RecommendationResponse, summary="Generate recommendations")
async def create_recommendations(
    payload: RecommendationRequest,
    user: Optional[CurrentUser] = Depends(get_optional_user),
) -> dict:
    if payload.persist and user is None:
        raise APIError(
            401,
            "authentication_required",
            "Set persist=false for anonymous calls, or send a Bearer token.",
        )
    if user is not None and payload.persist:
        await ensure_user(user)
    return await recommend(
        payload,
        user_id=user.id if user else None,
        persist=payload.persist and user is not None,
    )


@router.post(
    "/personal",
    response_model=RecommendationResponse,
    summary="Generate from the signed-in user's saved profile",
)
async def personal_recommendations(
    payload: PersonalRecommendationRequest,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    await ensure_user(user)
    result = await recommend_for_user(user.id, limit=payload.limit)
    if result is None:
        raise APIError(
            404,
            "profile_missing",
            "No preference profile found. Complete onboarding or PATCH /me/profile first.",
        )
    return result


@router.get(
    "/cached",
    response_model=List[CachedRecommendationOut],
    summary="Read the stored recommendation set for the signed-in user",
)
async def cached_recommendations(
    user: CurrentUser = Depends(get_current_user),
) -> List[dict]:
    return await cached_for_user(user.id)
