"""Device catalog, detail, reviews and USSD endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status

from core.config import settings
from core.db import DataAccessError, db
from core.deps import CurrentUser, get_current_user, require_feature
from core.errors import APIError
from core.ratelimit import REVIEW_WRITE
from core.utils import (
    as_float,
    clean_search_term,
    identifier_filters,
    in_filter,
    is_uuid,
    offset_for,
    pagination_meta,
    slugify,
)
from schemas.catalog import (
    DeviceCard,
    DeviceDetail,
    DeviceSuggestion,
    HelpfulVoteResponse,
    ReviewCreateRequest,
    ReviewOut,
    ReviewUpdateRequest,
    UssdOut,
)
from schemas.common import Page
from services.audit import log_action
from services.catalog_service import (
    device_select,
    get_device,
    get_device_row,
    shape_device,
    universal_ussd_codes,
)
from services.concurrency import call_rpc
from services.user_service import ensure_user

router = APIRouter(prefix="/devices", tags=["devices"])

SortKey = Literal[
    "relevance", "newest", "price_asc", "price_desc", "name_asc", "name_desc", "score_desc", "featured"
]

SORT_MAP = {
    "relevance": "name.asc",
    "newest": "created_at.desc",
    "price_asc": "price.asc",
    "price_desc": "price.desc",
    "name_asc": "name.asc",
    "name_desc": "name.desc",
    "score_desc": "device_scores(overall_score).desc.nullslast",
    "featured": "is_featured.desc,device_scores(overall_score).desc.nullslast",
}


async def _device_ids_in_category(category: str) -> List[str]:
    row = await db.select_one(
        "categories",
        columns="id,name,slug",
        filters=identifier_filters(category),
    )
    if not row:
        raise APIError(404, "category_not_found", f"No category matches '{category}'.")
    view = await db.select(
        "vw_category_device_ranks",
        columns="device_id",
        filters={"category_id": f"eq.{row['id']}"},
        limit=1000,
    )
    return [item["device_id"] for item in view.rows]


@router.get("", response_model=Page[DeviceCard], summary="List and filter devices")
async def list_devices(
    q: Optional[str] = Query(default=None, max_length=80, description="Free-text name search"),
    brand: Optional[str] = Query(default=None, description="Brand slug or UUID"),
    category: Optional[str] = Query(default=None, description="Category slug or UUID"),
    min_price: Optional[float] = Query(default=None, ge=0),
    max_price: Optional[float] = Query(default=None, ge=0),
    five_g: Optional[bool] = Query(default=None),
    nfc: Optional[bool] = Query(default=None, description="Tap-to-pay / NFC hardware"),
    min_ram_gb: Optional[int] = Query(default=None, ge=1, le=32),
    min_battery_mah: Optional[int] = Query(default=None, ge=1000, le=20000),
    min_refresh_rate: Optional[int] = Query(default=None, ge=30, le=360),
    featured: Optional[bool] = Query(default=None),
    sort: SortKey = Query(default="relevance"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
) -> dict:
    page_size = min(page_size, settings.max_page_size)
    filters: dict = {"is_active": "is.true"}
    inner_specs = False
    inner_brand = False
    inner_scores = False

    term = clean_search_term(q)
    if term:
        filters["or"] = f"(name.ilike.*{term}*,slug.ilike.*{term}*)"
    if brand:
        if is_uuid(brand):
            filters["brands.id"] = f"eq.{brand}"
        else:
            filters["brands.slug"] = f"eq.{slugify(brand)}"
        inner_brand = True
    if category:
        device_ids = await _device_ids_in_category(category)
        if not device_ids:
            return {"items": [], "meta": pagination_meta(page, page_size, 0)}
        filters["id"] = in_filter(device_ids)
    if min_price is not None or max_price is not None:
        price_filters = []
        if min_price is not None:
            price_filters.append(f"gte.{min_price:.2f}")
        if max_price is not None:
            price_filters.append(f"lte.{max_price:.2f}")
        filters["price"] = price_filters
    if five_g is not None:
        filters["device_specs.five_g"] = f"is.{str(five_g).lower()}"
        inner_specs = True
    if nfc is not None:
        filters["device_specs.nfc"] = f"is.{str(nfc).lower()}"
        inner_specs = True
    if min_ram_gb is not None:
        filters["device_specs.ram_gb"] = f"gte.{min_ram_gb}"
        inner_specs = True
    if min_battery_mah is not None:
        filters["device_specs.battery_mah"] = f"gte.{min_battery_mah}"
        inner_specs = True
    if min_refresh_rate is not None:
        filters["device_specs.refresh_rate_hz"] = f"gte.{min_refresh_rate}"
        inner_specs = True
    if featured is not None:
        filters["is_featured"] = f"is.{str(featured).lower()}"
    if sort in ("score_desc", "featured"):
        inner_scores = True

    result = await db.select(
        "devices",
        columns=device_select(
            inner_specs=inner_specs, inner_brand=inner_brand, inner_scores=inner_scores
        ),
        filters=filters,
        order=SORT_MAP[sort],
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {
        "items": [shape_device(row) for row in result.rows],
        "meta": pagination_meta(page, page_size, result.total or 0),
    }


@router.get("/featured", response_model=List[DeviceCard], summary="Featured devices")
async def featured_devices(
    limit: int = Query(default=6, ge=1, le=24)
) -> List[dict]:
    result = await db.select(
        "devices",
        columns=device_select(),
        filters={"is_active": "is.true", "is_featured": "is.true"},
        order="device_scores(overall_score).desc.nullslast",
        limit=limit,
    )
    if not result.rows:
        result = await db.select(
            "devices",
            columns=device_select(),
            filters={"is_active": "is.true"},
            order="device_scores(overall_score).desc.nullslast",
            limit=limit,
        )
    return [shape_device(row) for row in result.rows]


@router.get(
    "/suggest",
    response_model=List[DeviceSuggestion],
    summary="Typeahead search (name and slug prefix match)",
)
async def suggest_devices(
    q: str = Query(min_length=1, max_length=80, description="Partial device name"),
    limit: int = Query(default=6, ge=1, le=10),
) -> List[dict]:
    """Cheap dropdown search that never hydrates specs, scores or reviews.

    Declared before `/{identifier}` so the literal path wins: FastAPI matches
    routes in declaration order, and a path parameter would otherwise swallow
    `/devices/suggest` and answer 404 device_not_found.
    """
    term = clean_search_term(q)
    if not term:
        return []
    result = await db.select(
        "devices",
        columns="id,name,slug,price,currency,image_url,brand:brands(name)",
        filters={"is_active": "is.true", "or": f"(name.ilike.*{term}*,slug.ilike.*{term}*)"},
        order="name.asc",
        limit=limit,
    )
    suggestions: List[dict] = []
    for row in result.rows:
        brand = row.get("brand")
        if isinstance(brand, list):
            brand = brand[0] if brand else {}
        suggestions.append(
            {
                "id": row.get("id"),
                "name": row.get("name"),
                "slug": row.get("slug"),
                "price": as_float(row.get("price")) or 0.0,
                "currency": row.get("currency") or "INR",
                "image_url": row.get("image_url"),
                "brand_name": (brand or {}).get("name"),
            }
        )
    return suggestions


@router.get("/{identifier}", response_model=DeviceDetail, summary="Get full device detail")
async def device_detail(identifier: str) -> dict:
    return await get_device(identifier, detail=True)


@router.get("/{identifier}/similar", response_model=List[DeviceCard])
async def similar_devices(
    identifier: str,
    limit: int = Query(default=4, ge=1, le=12),
) -> List[dict]:
    device = shape_device(await get_device_row(identifier, detail=False))
    price = device["price"] or 0
    filters = {
        "is_active": "is.true",
        "brand_id": f"eq.{device['brand_id']}",
        "id": f"neq.{device['id']}",
    }
    if price:
        filters["price"] = [f"gte.{price * 0.6:.2f}", f"lte.{price * 1.4:.2f}"]
    result = await db.select(
        "devices",
        columns=device_select(),
        filters=filters,
        order="device_scores(overall_score).desc.nullslast",
        limit=limit,
    )
    if len(result.rows) < limit:
        fallback_filters: dict = {
            "is_active": "is.true",
            "id": f"neq.{device['id']}",
        }
        if price:
            fallback_filters["price"] = [
                f"gte.{price * 0.7:.2f}",
                f"lte.{price * 1.3:.2f}",
            ]
        fallback = await db.select(
            "devices",
            columns=device_select(),
            filters=fallback_filters,
            order="device_scores(overall_score).desc.nullslast",
            limit=limit,
        )
        existing = {row["id"] for row in result.rows}
        result.rows.extend(row for row in fallback.rows if row["id"] not in existing)
    return [shape_device(row) for row in result.rows[:limit]]


@router.get("/{identifier}/ussd-codes", response_model=List[UssdOut])
async def device_ussd_codes(identifier: str) -> List[dict]:
    device = await get_device_row(identifier, detail=True)
    return (device.get("device_ussd_codes") or []) + await universal_ussd_codes()


@router.get("/{identifier}/reviews", response_model=Page[ReviewOut])
async def list_reviews(
    identifier: str,
    sort: Literal["newest", "rating", "helpful"] = Query(default="newest"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
) -> dict:
    device = await db.select_one("devices", columns="id", filters=identifier_filters(identifier))
    if not device:
        raise APIError(404, "device_not_found", f"No device matches '{identifier}'.")
    order = {
        "newest": "created_at.desc",
        "rating": "rating.desc,created_at.desc",
        "helpful": "helpful_votes.desc,created_at.desc",
    }[sort]
    result = await db.select(
        "reviews",
        columns=(
            "id,user_id,device_id,rating,title,review_text,verified_owner,"
            "helpful_votes,is_approved,created_at,author:users(id,name,avatar_url)"
        ),
        filters={"device_id": f"eq.{device['id']}", "is_approved": "is.true"},
        order=order,
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {
        "items": result.rows,
        "meta": pagination_meta(page, page_size, result.total or 0),
    }


@router.post(
    "/{identifier}/reviews",
    response_model=ReviewOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(REVIEW_WRITE), Depends(require_feature("feature_reviews"))],
    summary="Create a review (authenticated)",
)
async def create_review(
    identifier: str,
    payload: ReviewCreateRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    device = await db.select_one("devices", columns="id,name", filters=identifier_filters(identifier))
    if not device:
        raise APIError(404, "device_not_found", f"No device matches '{identifier}'.")
    user_row, _ = await ensure_user(user)

    owned = await db.select_one(
        "user_phone_history",
        columns="id",
        filters={"user_id": f"eq.{user.id}", "device_id": f"eq.{device['id']}"},
    )
    try:
        rows = await db.insert(
            "reviews",
            {
                "user_id": user.id,
                "device_id": device["id"],
                "rating": payload.rating,
                "title": payload.title,
                "review_text": payload.review_text,
                "verified_owner": bool(owned),
            },
            columns=(
                "id,user_id,device_id,rating,title,review_text,verified_owner,"
                "helpful_votes,is_approved,created_at"
            ),
        )
    except DataAccessError as exc:
        if exc.status_code == 409:
            raise APIError(
                409, "review_exists", "You have already reviewed this device."
            ) from exc
        raise

    created = rows[0]
    created["author"] = {
        "id": user_row["id"],
        "name": user_row.get("name"),
        "avatar_url": user_row.get("avatar_url"),
    }
    await log_action(
        "review.create",
        target_type="review",
        target_id=created["id"],
        new_value={"device_id": device["id"], "rating": payload.rating},
        ip_address=request.client.host if request.client else None,
        actor_id=user.id,
    )
    return created


@router.patch(
    "/{identifier}/reviews/{review_id}",
    response_model=ReviewOut,
    dependencies=[Depends(REVIEW_WRITE), Depends(require_feature("feature_reviews"))],
    summary="Edit your own review (returns it to moderation)",
)
async def update_review(
    identifier: str,
    review_id: str,
    payload: ReviewUpdateRequest,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Author-only edit.

    `is_approved` is reset to false in the same write: a review that was already
    published must not change its rating behind the moderator's back, so an edit
    re-enters the queue. `verified_owner` is deliberately untouched — ownership
    is a fact about the phone history, not about the words.
    """
    device = await db.select_one("devices", columns="id", filters=identifier_filters(identifier))
    if not device:
        raise APIError(404, "device_not_found", f"No device matches '{identifier}'.")
    review = await db.select_one(
        "reviews",
        columns="id,user_id,device_id,rating,is_approved",
        filters={"id": f"eq.{review_id}", "device_id": f"eq.{device['id']}"},
    )
    if not review:
        raise APIError(404, "review_not_found", "No matching review for this device.")
    if review["user_id"] != user.id:
        raise APIError(403, "review_forbidden", "You can only edit your own review.")

    values: dict = {"is_approved": False, "updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.rating is not None:
        values["rating"] = payload.rating
    if payload.title is not None:
        values["title"] = payload.title
    if payload.review_text is not None:
        values["review_text"] = payload.review_text

    rows = await db.update(
        "reviews",
        {"id": f"eq.{review_id}", "user_id": f"eq.{user.id}"},
        values,
        columns=(
            "id,user_id,device_id,rating,title,review_text,verified_owner,"
            "helpful_votes,is_approved,created_at"
        ),
    )
    if not rows:
        raise APIError(404, "review_not_found", "No matching review for this device.")

    updated = rows[0]
    author = await db.select_one(
        "users", columns="id,name,avatar_url", filters={"id": f"eq.{user.id}"}
    )
    updated["author"] = author or {"id": user.id}
    await log_action(
        "review.update",
        target_type="review",
        target_id=review_id,
        old_value={"rating": review.get("rating"), "is_approved": review.get("is_approved")},
        new_value={"rating": updated.get("rating"), "is_approved": False},
        ip_address=request.client.host if request.client else None,
        actor_id=user.id,
    )
    return updated


@router.delete(
    "/{identifier}/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
    dependencies=[Depends(REVIEW_WRITE), Depends(require_feature("feature_reviews"))],
    summary="Delete your own review",
)
async def delete_review(
    identifier: str,
    review_id: str,
    request: Request,
    user: CurrentUser = Depends(get_current_user),
) -> None:
    """Author-only delete.

    The delete is filtered by `user_id` as well as `id`, so a forged review id
    matches zero rows instead of another person's review. Helpful votes follow
    the row through `review_votes.review_id ... ON DELETE CASCADE`.
    """
    device = await db.select_one("devices", columns="id", filters=identifier_filters(identifier))
    if not device:
        raise APIError(404, "device_not_found", f"No device matches '{identifier}'.")
    review = await db.select_one(
        "reviews",
        columns="id,user_id,rating",
        filters={"id": f"eq.{review_id}", "device_id": f"eq.{device['id']}"},
    )
    if not review:
        raise APIError(404, "review_not_found", "No matching review for this device.")
    if review["user_id"] != user.id:
        raise APIError(403, "review_forbidden", "You can only delete your own review.")
    await db.delete("reviews", {"id": f"eq.{review_id}", "user_id": f"eq.{user.id}"})
    await log_action(
        "review.delete",
        target_type="review",
        target_id=review_id,
        old_value={"rating": review.get("rating"), "device_id": device["id"]},
        ip_address=request.client.host if request.client else None,
        actor_id=user.id,
    )


@router.post(
    "/{identifier}/reviews/{review_id}/helpful",
    response_model=HelpfulVoteResponse,
    dependencies=[Depends(REVIEW_WRITE), Depends(require_feature("feature_reviews"))],
    summary="Mark a review as helpful (authenticated, one vote per account)",
)
async def vote_review_helpful(
    identifier: str,
    review_id: str,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Record one helpful vote for the signed-in account.

    The previous version had no identity and incremented the counter in Python,
    so the same caller could vote any number of times and two concurrent votes
    stored one. `fn_vote_review_helpful` inserts into `review_votes`, whose
    UNIQUE (review_id, voter_id) is the actual guarantee; a repeat vote returns
    `duplicate` with the unchanged count instead of an error.
    """
    device = await db.select_one("devices", columns="id", filters=identifier_filters(identifier))
    if not device:
        raise APIError(404, "device_not_found", f"No device matches '{identifier}'.")
    review = await db.select_one(
        "reviews",
        columns="id,device_id",
        filters={"id": f"eq.{review_id}", "device_id": f"eq.{device['id']}"},
    )
    if not review:
        raise APIError(404, "review_not_found", "No matching review for this device.")

    result = await call_rpc(
        "fn_vote_review_helpful",
        {"p_review_id": review["id"], "p_voter_id": user.id},
        feature="Helpful votes",
    )
    status = result.get("status")
    if status == "not_found":
        # The RPC only counts approved reviews, so an unmoderated review is
        # invisible here rather than votable.
        raise APIError(404, "review_not_found", "No matching review for this device.")
    if status == "self_vote":
        raise APIError(409, "self_vote", "You cannot mark your own review as helpful.")
    return {"id": result.get("id") or review["id"], "helpful_votes": result.get("helpful_votes") or 0}
