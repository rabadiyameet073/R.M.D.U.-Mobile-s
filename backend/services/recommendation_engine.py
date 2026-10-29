"""Explainable recommendation engine.

Weights come from the `recommendation_rules` table (admin-editable, constraint
enforced to sum to 1.00). Device sub-scores come from `device_scores`. The
engine adds transparent, bounded penalties on top of the weighted score so a
pick can never be justified by raw specs alone.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from core.db import DataAccessError, db
from core.errors import APIError
from core.utils import as_float, in_filter
from schemas.recommendation import RecommendationRequest
from services.catalog_service import device_select, shape_device

logger = logging.getLogger("rmdu.recommendations")

ENGINE_VERSION = "v2.1-api"
PRIORITY_KEYS = ("performance", "camera", "battery", "display", "value", "build", "software")
RULE_COLUMN = {
    "performance": "weight_perf",
    "camera": "weight_camera",
    "battery": "weight_battery",
    "display": "weight_display",
    "value": "weight_value",
    "build": "weight_build",
    "software": "weight_software",
}
SCORE_COLUMN = {
    "performance": "performance_score",
    "camera": "camera_score",
    "battery": "battery_score",
    "display": "display_score",
    "value": "value_score",
    "build": "build_score",
    "software": "software_score",
}
LABELS = {
    "performance": "performance",
    "camera": "camera quality",
    "battery": "battery endurance",
    "display": "display quality",
    "value": "value for money",
    "build": "build quality",
    "software": "software support",
}
HEADLINES = {
    "gaming": "competitive gaming",
    "camera": "photography",
    "battery": "all-day battery use",
    "value": "tight-budget shopping",
    "all-rounder": "everyday use",
}
CANDIDATE_POOL = 500


async def load_rules() -> Dict[str, dict]:
    result = await db.select(
        "recommendation_rules",
        columns=(
            "id,priority,weight_perf,weight_camera,weight_battery,weight_display,"
            "weight_value,weight_build,weight_software,updated_at"
        ),
        order="priority.asc",
        limit=20,
    )
    return {row["priority"]: row for row in result.rows}


def weights_from_rule(rule: dict) -> Dict[str, float]:
    return {
        key: as_float(rule.get(RULE_COLUMN[key])) or 0.0
        for key in PRIORITY_KEYS
    }


def blended_weights(
    rules: Dict[str, dict], primary: str, secondary: Optional[str]
) -> Tuple[Dict[str, float], List[str]]:
    if primary not in rules:
        raise APIError(
            500,
            "recommendation_rule_missing",
            f"No recommendation rule configured for priority '{primary}'.",
        )
    primary_weights = weights_from_rule(rules[primary])
    if not secondary or secondary not in rules or secondary == primary:
        return primary_weights, [primary]
    secondary_weights = weights_from_rule(rules[secondary])
    blended = {
        key: round(primary_weights[key] * 0.75 + secondary_weights[key] * 0.25, 4)
        for key in PRIORITY_KEYS
    }
    return blended, [primary, secondary]


def score_device(
    device: dict,
    weights: Dict[str, float],
    *,
    priority: str,
    budget_max: float,
) -> Tuple[float, dict]:
    """Return (final_score, breakdown) for one device."""
    scores = device.get("scores") or {}
    specs = device.get("specs") or {}
    price = as_float(device.get("price")) or 0.0

    contributions = []
    base = 0.0
    for key in PRIORITY_KEYS:
        raw = as_float(scores.get(SCORE_COLUMN[key])) or 0.0
        weight = weights.get(key, 0.0)
        contribution = raw * weight
        base += contribution
        contributions.append(
            {
                "key": key,
                "score": round(raw, 2),
                "weight": round(weight, 4),
                "contribution": round(contribution, 2),
            }
        )

    penalty = 0.0
    notes: List[str] = []

    if budget_max and price > budget_max:
        overshoot = (price - budget_max) / max(budget_max, 1.0)
        over_penalty = min(30.0, round(60.0 * overshoot, 2))
        penalty += over_penalty
        notes.append(
            f"Price is ₹{price - budget_max:,.0f} above your budget (-{over_penalty:.1f})."
        )

    charging = as_float(specs.get("charging_watt")) or 0.0
    if priority == "battery" and charging and charging < 33:
        penalty += 8.0
        notes.append(f"Charging is only {charging:.0f}W for a battery-first pick (-8).")

    if not specs.get("five_g"):
        notes.append("No 5G radio — future-proofing is limited.")

    final = max(0.0, round(base - penalty, 2))
    breakdown = {
        "base_score": round(base, 2),
        "penalty": round(penalty, 2),
        "final_score": final,
        "contributions": contributions,
        "notes": notes,
    }
    return final, breakdown


def build_reason(
    device: dict,
    contributions: List[dict],
    *,
    priority: str,
    budget_max: float,
) -> str:
    ranked = sorted(contributions, key=lambda item: item["contribution"], reverse=True)
    strongest = [item for item in ranked[:2] if item["contribution"] > 0]
    specs = device.get("specs") or {}
    price = as_float(device.get("price")) or 0.0

    if strongest:
        headline = " and ".join(
            f"{LABELS[item['key']]} ({item['score']:.0f}/100)" for item in strongest
        )
        reason = f"Strong {headline} — a solid fit for {HEADLINES.get(priority, 'everyday use')}."
    else:
        reason = f"Balanced pick for {HEADLINES.get(priority, 'everyday use')}."

    battery = as_float(specs.get("battery_mah"))
    if battery and battery >= 5000:
        reason += f" {battery:.0f} mAh battery keeps it going through a full day."
    if budget_max and price <= budget_max * 0.75:
        reason += " Leaves healthy headroom inside your budget."
    return reason.strip()


def _candidate_filters(request: RecommendationRequest) -> Dict[str, object]:
    filters: Dict[str, object] = {
        "is_active": "is.true",
        "price": [f"gte.{request.budget_min:.2f}", f"lte.{request.budget_max:.2f}"],
    }
    if request.require_five_g:
        filters["device_specs.five_g"] = "is.true"
    if request.require_nfc:
        filters["device_specs.nfc"] = "is.true"
    if request.preferred_os != "any":
        filters["device_specs.os"] = f"ilike.*{request.preferred_os}*"
    if request.min_ram_gb:
        filters["device_specs.ram_gb"] = f"gte.{request.min_ram_gb}"
    if request.preferred_brands:
        filters["brands.name"] = in_filter(request.preferred_brands)
    return filters


async def recommend(
    request: RecommendationRequest,
    *,
    user_id: Optional[str] = None,
    persist: bool = False,
) -> dict:
    rules = await load_rules()
    weights, used_priorities = blended_weights(
        rules, request.primary_priority, request.secondary_priority
    )

    needs_specs = bool(
        request.require_five_g
        or request.require_nfc
        or request.preferred_os != "any"
        or request.min_ram_gb
    )
    needs_brand = bool(request.preferred_brands)

    result = await db.select(
        "devices",
        columns=device_select(
            inner_specs=needs_specs, inner_brand=needs_brand, inner_scores=True
        ),
        filters=_candidate_filters(request),
        order="device_scores(overall_score).desc,price.asc",
        limit=CANDIDATE_POOL,
    )

    scored = []
    for row in result.rows:
        device = shape_device(row)
        final, breakdown = score_device(
            device,
            weights,
            priority=request.primary_priority,
            budget_max=request.budget_max,
        )
        if final <= 0:
            continue
        scored.append(
            {
                "device": device,
                "match_score": final,
                "breakdown": breakdown,
                "reason": build_reason(
                    device,
                    breakdown["contributions"],
                    priority=request.primary_priority,
                    budget_max=request.budget_max,
                ),
            }
        )

    scored.sort(key=lambda item: (item["match_score"], item["device"]["overall_score"] or 0), reverse=True)
    top = scored[: request.limit]
    for index, item in enumerate(top, start=1):
        item["rank"] = index

    if persist and user_id and top:
        await persist_recommendations(user_id, top)

    return {
        "mode": "personal" if user_id and persist else "guest",
        "engine_version": ENGINE_VERSION,
        "generated_at": datetime.now(timezone.utc),
        "weights": weights,
        "budget": {"min": request.budget_min, "max": request.budget_max},
        "priorities": {
            "primary": used_priorities[0],
            "secondary": used_priorities[1] if len(used_priorities) > 1 else None,
        },
        "items": top,
        "candidates_evaluated": len(scored),
    }


async def persist_recommendations(user_id: str, items: List[dict]) -> bool:
    """Replace the cached recommendation set for a user.

    The cache is derived data, so a replace is safe; ranking is recomputed from
    live scores on every generation. Storage is best-effort: the answer is
    already computed, and a read-only database must not turn a recommendation
    request into an error just because the cache row could not be written.
    """
    try:
        await db.delete("recommendations", {"user_id": f"eq.{user_id}"})
        rows = [
            {
                "user_id": user_id,
                "device_id": item["device"]["id"],
                "match_score": item["match_score"],
                "reason": item["reason"],
                "rank": item["rank"],
                "engine_version": ENGINE_VERSION,
                "is_ai_generated": False,
            }
            for item in items
        ]
        if rows:
            await db.insert("recommendations", rows)
    except DataAccessError as exc:
        logger.warning("recommendation cache not stored for %s: %s", user_id, exc)
        return False
    return True


async def recommend_for_user(user_id: str, limit: int = 5) -> Optional[dict]:
    profile = await db.select_one(
        "user_profiles",
        columns=(
            "budget_min,budget_max,primary_priority,secondary_priority,preferred_os,"
            "preferred_brands,onboarding_done"
        ),
        filters={"user_id": f"eq.{user_id}"},
    )
    if not profile:
        return None
    request = RecommendationRequest(
        budget_min=as_float(profile.get("budget_min")) or 0,
        budget_max=as_float(profile.get("budget_max")) or 200000,
        primary_priority=profile.get("primary_priority") or "all-rounder",
        secondary_priority=profile.get("secondary_priority"),
        preferred_os=profile.get("preferred_os") or "any",
        preferred_brands=profile.get("preferred_brands") or [],
        limit=limit,
    )
    return await recommend(request, user_id=user_id, persist=True)


async def cached_for_user(user_id: str, limit: int = 20) -> List[dict]:
    """Read the stored recommendation set, dropping expired rows."""
    columns = (
        "id,match_score,reason,rank,engine_version,is_ai_generated,expires_at,created_at,"
        f"device:devices({device_select()})"
    )
    result = await db.select(
        "recommendations",
        columns=columns,
        filters={"user_id": f"eq.{user_id}"},
        order="rank.asc",
        limit=limit,
    )
    now = datetime.now(timezone.utc)
    payload: List[dict] = []
    for row in result.rows:
        expires_at = row.get("expires_at")
        if expires_at:
            try:
                expiry = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
                if expiry < now:
                    continue
            except ValueError:
                pass
        device_row = row.get("device")
        payload.append(
            {
                "id": row["id"],
                "match_score": as_float(row.get("match_score")) or 0,
                "reason": row.get("reason") or "",
                "rank": row.get("rank") or 0,
                "engine_version": row.get("engine_version") or ENGINE_VERSION,
                "is_ai_generated": row.get("is_ai_generated", False),
                "expires_at": expires_at,
                "created_at": row.get("created_at"),
                "device": shape_device(device_row) if device_row else None,
            }
        )
    return payload
