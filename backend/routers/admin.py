"""Admin write surface, gated by the X-Admin-Key shared secret.

Every mutation is audited. Devices are soft-deleted (is_active=false) because
referential history (reviews, recommendations, cards) must survive.
"""

from __future__ import annotations

import asyncio
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status

from core.config import settings
from core.db import DataAccessError, db
from core.deps import require_admin, require_admin_write
from core.errors import APIError
from core.ratelimit import ADMIN_MUTATION
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
from schemas.admin import (
    AuditLogOut,
    BrandCreate,
    BrandUpdate,
    CategoryAssignment,
    CategoryAssignmentsRequest,
    DeviceCreate,
    DeviceScoresResponse,
    DeviceUpdate,
    PriceAlertScanResult,
    RuleOut,
    RuleUpsertRequest,
    ScoresIn,
    StatsOut,
)
from schemas.catalog import BrandOut, DeviceCard, DeviceDetail, ReviewOut
from schemas.catalog import ReviewModerationRequest
from schemas.common import Page
from services.audit import log_action
from services.catalog_service import (
    category_device_count,
    device_select,
    get_device,
    get_device_row,
    shape_device,
)
from services.concurrency import call_rpc, interpret_rank
from services.vector_search import embed_text

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)

# Every mutation carries the kill switch and the 60/min admin allowance; reads
# carry neither, so an operator can always inspect a disabled deployment.
WRITE = [Depends(require_admin_write), Depends(ADMIN_MUTATION)]

COUNT_TABLES = [
    "brands",
    "devices",
    "device_specs",
    "device_scores",
    "device_pros_cons",
    "device_features",
    "device_ussd_codes",
    "categories",
    "device_categories",
    "users",
    "user_profiles",
    "user_phone_history",
    "reviews",
    "recommendations",
    "recommendation_rules",
    "price_alerts",
    "comparison_sessions",
    "shopkeeper_cards",
    "device_embeddings",
    "rag_knowledge_chunks",
    "user_query_embeddings",
    "ai_chat_sessions",
    "ai_chat_messages",
    "audit_log",
]


def _ip(request: Request) -> Optional[str]:
    if request.client and request.client.host:
        return request.client.host
    return None


def _jsonable(values: Dict[str, Any]) -> Dict[str, Any]:
    """httpx cannot serialise date/datetime, so normalise before writing."""
    for key, value in list(values.items()):
        if isinstance(value, (date, datetime)):
            values[key] = value.isoformat()
    return values


async def _resolve_brand(
    *, brand_id: Optional[str], brand_name: Optional[str], create: bool
) -> dict:
    if brand_id:
        row = await db.select_one("brands", columns="id,name", filters={"id": f"eq.{brand_id}"})
        if not row:
            raise APIError(404, "brand_not_found", f"No brand with id '{brand_id}'.")
        return row
    name = (brand_name or "").strip()
    if not name:
        raise APIError(422, "brand_required", "brand_id or brand_name is required.")
    row = await db.select_one("brands", columns="id,name", filters={"name": f"ilike.{name}"})
    if row:
        return row
    if not create:
        raise APIError(404, "brand_not_found", f"No brand named '{name}'.")
    created = await db.insert("brands", {"name": name}, columns="id,name")
    return created[0]


async def _resolve_category(assignment: CategoryAssignment) -> str:
    if assignment.category_id:
        row = await db.select_one(
            "categories", columns="id", filters={"id": f"eq.{assignment.category_id}"}
        )
    else:
        row = await db.select_one(
            "categories", columns="id", filters={"slug": f"eq.{assignment.category_slug}"}
        )
    if not row:
        raise APIError(
            404,
            "category_not_found",
            f"No category matches '{assignment.category_id or assignment.category_slug}'.",
        )
    return row["id"]


async def _upsert_category_rank(
    device_id: str,
    assignment: CategoryAssignment,
    *,
    actor_id: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> dict:
    """Place a device at a 1-based position through `fn_rerank_device`.

    The RPC takes a transaction-scoped advisory lock, row-locks the category,
    verifies the caller's expected revision and shifts siblings in the same
    transaction. The old delete-then-reinsert rewrite is gone: two admins
    re-ranking at once could interleave and leave a sparse or duplicated list.

    Status mapping (the RPC returns business outcomes instead of raising; the
    mapping lives in `services.concurrency.interpret_rank` so every ranking
    route answers the same way):
      ok               → applied
      version_conflict → 409, the ranking moved after the caller read it
      busy             → 409, another writer holds the rank lock
    """
    category_id = await _resolve_category(assignment)
    result = await call_rpc(
        "fn_rerank_device",
        {
            "p_category_id": category_id,
            "p_device_id": device_id,
            "p_new_rank": assignment.rank,
            "p_expected_version": assignment.expected_version,
            "p_rank_locked": assignment.rank_locked,
            "p_justification": assignment.justification,
            "p_actor": actor_id,
            "p_ip": ip_address,
        },
        feature="Category ranking",
    )
    return interpret_rank(result)


@router.get("/stats", response_model=StatsOut, summary="Row counts and catalog health")
async def admin_stats() -> dict:
    counts = await asyncio.gather(
        *(
            db.select(table, columns="id", limit=1, count=True)
            for table in COUNT_TABLES
        ),
        return_exceptions=True,
    )
    payload = {
        table: (0 if isinstance(result, Exception) else (result.total or 0))
        for table, result in zip(COUNT_TABLES, counts)
    }
    active_devices = await db.select(
        "devices", columns="id", filters={"is_active": "is.true"}, limit=1, count=True
    )
    featured = await db.select(
        "devices", columns="id", filters={"is_featured": "is.true"}, limit=1, count=True
    )
    categories = await db.select(
        "categories",
        columns="id,name,slug",
        order="display_order.asc",
        limit=20,
    )
    category_counts = await asyncio.gather(
        *(category_device_count(row["id"]) for row in categories.rows),
        return_exceptions=True,
    )
    return {
        "generated_at": datetime.now(timezone.utc),
        "counts": payload,
        "catalog": {
            "active_devices": active_devices.total or 0,
            "featured_devices": featured.total or 0,
            "categories": [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "slug": row["slug"],
                    "device_count": 0 if isinstance(count, Exception) else count,
                }
                for row, count in zip(categories.rows, category_counts)
            ],
            "ai_enabled": settings.ai_enabled,
        },
    }


@router.get("/audit-log", response_model=Page[AuditLogOut])
async def audit_log(
    action: Optional[str] = Query(default=None, max_length=60),
    target_type: Optional[str] = Query(default=None, max_length=40),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> dict:
    filters: Dict[str, str] = {}
    if action:
        filters["action"] = f"eq.{action}"
    if target_type:
        filters["target_type"] = f"eq.{target_type}"
    result = await db.select(
        "audit_log",
        columns=(
            "id,user_id,action,target_type,target_id,old_value,new_value,"
            "ip_address,created_at"
        ),
        filters=filters,
        order="created_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {"items": result.rows, "meta": pagination_meta(page, page_size, result.total or 0)}


# ── brands ─────────────────────────────────────────────────────
@router.get(
    "/brands",
    response_model=List[BrandOut],
    summary="Every brand, including deactivated ones",
)
async def list_brands(
    q: Optional[str] = Query(default=None, max_length=80),
    is_active: Optional[bool] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
) -> List[dict]:
    """Admin brand list with device counts.

    The public `/brands` feed hides deactivated rows, so the console had no way
    to find a brand it had switched off. Counts are fetched in parallel — one
    HEAD-style count per brand — which keeps this a fixed number of round trips
    instead of one per rendered row.
    """
    filters: dict = {}
    if is_active is not None:
        filters["is_active"] = f"is.{str(is_active).lower()}"
    term = (q or "").strip()
    if term:
        filters["name"] = f"ilike.*{term}*"
    result = await db.select(
        "brands",
        columns="id,name,logo_url,country,is_active,created_at",
        filters=filters or None,
        order="name.asc",
        limit=limit,
    )
    counts = await asyncio.gather(
        *(
            db.select("devices", columns="id", filters={"brand_id": f"eq.{row['id']}"}, limit=1, count=True)
            for row in result.rows
        ),
        return_exceptions=True,
    )
    payload: List[dict] = []
    for row, count in zip(result.rows, counts):
        row = dict(row)
        row["device_count"] = 0 if isinstance(count, Exception) else (count.total or 0)
        payload.append(row)
    return payload


@router.post(
    "/brands",
    response_model=BrandOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=WRITE,
    summary="Create a brand",
)
async def create_brand(payload: BrandCreate, request: Request) -> dict:
    try:
        rows = await db.insert(
            "brands",
            payload.model_dump(),
            columns="id,name,logo_url,country,is_active,created_at",
        )
    except DataAccessError as exc:
        if exc.status_code == 409:
            raise APIError(409, "brand_exists", "A brand with that name already exists.") from exc
        raise
    await log_action(
        "brand.create",
        target_type="brand",
        target_id=rows[0]["id"],
        new_value=payload.model_dump(),
        ip_address=_ip(request),
    )
    return rows[0]


@router.patch(
    "/brands/{brand_id}",
    response_model=BrandOut,
    dependencies=WRITE,
    summary="Update a brand",
)
async def update_brand(brand_id: str, payload: BrandUpdate, request: Request) -> dict:
    existing = await db.select_one(
        "brands",
        columns="id,name,logo_url,country,is_active,created_at",
        filters={"id": f"eq.{brand_id}"},
    )
    if not existing:
        raise APIError(404, "brand_not_found", "No brand with that id.")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return existing
    rows = await db.update(
        "brands",
        {"id": f"eq.{brand_id}"},
        updates,
        columns="id,name,logo_url,country,is_active,created_at",
    )
    await log_action(
        "brand.update",
        target_type="brand",
        target_id=brand_id,
        old_value=existing,
        new_value=updates,
        ip_address=_ip(request),
    )
    return rows[0]


@router.delete(
    "/brands/{brand_id}",
    response_model=BrandOut,
    dependencies=WRITE,
    summary="Deactivate a brand (devices keep their brand reference)",
)
async def deactivate_brand(brand_id: str, request: Request) -> dict:
    """Deactivate rather than delete.

    `devices.brand_id` restricts deletion, so a hard delete simply fails once any
    device exists. Deactivation is the supported removal: the brand leaves the
    public navigation (reads filter `is_active`) while every device keeps the
    reference it was published with.
    """
    existing = await db.select_one(
        "brands",
        columns="id,name,logo_url,country,is_active,created_at",
        filters={"id": f"eq.{brand_id}"},
    )
    if not existing:
        raise APIError(404, "brand_not_found", "No brand with that id.")
    if not existing["is_active"]:
        return existing
    rows = await db.update(
        "brands",
        {"id": f"eq.{brand_id}"},
        {"is_active": False},
        columns="id,name,logo_url,country,is_active,created_at",
    )
    await log_action(
        "brand.deactivate",
        target_type="brand",
        target_id=brand_id,
        old_value={"is_active": True},
        new_value={"is_active": False},
        ip_address=_ip(request),
    )
    return rows[0]


# ── devices ────────────────────────────────────────────────────
@router.get(
    "/devices",
    response_model=Page[DeviceCard],
    summary="Every device, including deactivated ones",
)
async def list_devices(
    q: Optional[str] = Query(default=None, max_length=80),
    brand: Optional[str] = Query(default=None, description="Brand UUID or name"),
    category: Optional[str] = Query(default=None, description="Category UUID or slug"),
    is_active: Optional[bool] = Query(default=None),
    featured: Optional[bool] = Query(default=None),
    sort: Literal[
        "updated", "newest", "price_asc", "price_desc", "name_asc", "score_desc"
    ] = Query(default="updated"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> dict:
    """Catalog console feed.

    `GET /devices` is the storefront: it pins `is_active=true` so an unpublished
    row can never leak. The console needs the opposite — to find the draft it is
    about to publish — so this route carries no implicit active filter and
    defaults to `updated_at desc`, which surfaces the row just edited.
    """
    filters: dict = {}
    inner_brand = False
    inner_scores = False

    term = clean_search_term(q)
    if term:
        filters["or"] = f"(name.ilike.*{term}*,slug.ilike.*{term}*)"
    if brand:
        if is_uuid(brand):
            filters["brands.id"] = f"eq.{brand}"
        else:
            filters["brands.name"] = f"ilike.*{brand.strip()}*"
        inner_brand = True
    if is_active is not None:
        filters["is_active"] = f"is.{str(is_active).lower()}"
    if featured is not None:
        filters["is_featured"] = f"is.{str(featured).lower()}"
    if category:
        category_row = await db.select_one(
            "categories", columns="id", filters=identifier_filters(category)
        )
        if not category_row:
            raise APIError(404, "category_not_found", f"No category matches '{category}'.")
        view = await db.select(
            "vw_category_device_ranks",
            columns="device_id",
            filters={"category_id": f"eq.{category_row['id']}"},
            limit=1000,
        )
        device_ids = [item["device_id"] for item in view.rows]
        if not device_ids:
            return {"items": [], "meta": pagination_meta(page, page_size, 0)}
        filters["id"] = in_filter(device_ids)

    order = {
        "updated": "updated_at.desc",
        "newest": "created_at.desc",
        "price_asc": "price.asc",
        "price_desc": "price.desc",
        "name_asc": "name.asc",
        "score_desc": "device_scores(overall_score).desc.nullslast",
    }[sort]
    if sort == "score_desc":
        inner_scores = True

    result = await db.select(
        "devices",
        columns=device_select(inner_brand=inner_brand, inner_scores=inner_scores),
        filters=filters or None,
        order=order,
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {
        "items": [shape_device(row) for row in result.rows],
        "meta": pagination_meta(page, page_size, result.total or 0),
    }


@router.post(
    "/devices",
    response_model=DeviceDetail,
    status_code=status.HTTP_201_CREATED,
    dependencies=WRITE,
    summary="Create a device with specs, scores and category ranks",
)
async def create_device(payload: DeviceCreate, request: Request) -> dict:
    brand = await _resolve_brand(
        brand_id=payload.brand_id, brand_name=payload.brand_name, create=True
    )
    values = _jsonable(
        {
            "brand_id": brand["id"],
            "name": payload.name,
            "slug": payload.slug or slugify(payload.name),
            "model_number": payload.model_number,
            "launch_date": payload.launch_date,
            "price": payload.price,
            "currency": payload.currency,
            "image_url": payload.image_url,
            "gallery_urls": payload.gallery_urls,
            "color_options": payload.color_options,
            "is_featured": payload.is_featured,
            "is_active": payload.is_active,
            "extra": payload.extra,
        }
    )
    try:
        rows = await db.insert("devices", values, columns="id")
    except DataAccessError as exc:
        if exc.status_code == 409:
            raise APIError(
                409,
                "device_exists",
                "A device with that slug or name already exists.",
            ) from exc
        raise
    device_id = rows[0]["id"]

    if payload.specs:
        await db.insert(
            "device_specs",
            {"device_id": device_id, **payload.specs.model_dump(exclude_none=True)},
            columns="id",
        )
    if payload.scores:
        await db.insert(
            "device_scores",
            {"device_id": device_id, **payload.scores.model_dump()},
            columns="id",
        )
    for assignment in payload.categories:
        # Audited by fn_rerank_device inside the ranking transaction.
        await _upsert_category_rank(device_id, assignment, ip_address=_ip(request))

    await log_action(
        "device.create",
        target_type="device",
        target_id=device_id,
        new_value={"name": payload.name, "price": payload.price, "brand": brand["name"]},
        ip_address=_ip(request),
    )
    return await get_device(device_id, detail=True)


@router.patch(
    "/devices/{device_id}",
    response_model=DeviceDetail,
    dependencies=WRITE,
    summary="Update a device",
)
async def update_device(device_id: str, payload: DeviceUpdate, request: Request) -> dict:
    existing = await get_device_row(device_id, detail=False)
    updates = _jsonable(payload.model_dump(exclude_unset=True))
    # `version` is a precondition, not a column to write; the DB trigger bumps it.
    expected_version = updates.pop("version", None)
    if "brand_id" in updates or "brand_name" in updates:
        brand = await _resolve_brand(
            brand_id=payload.brand_id,
            brand_name=payload.brand_name,
            create=False,
        )
        updates.pop("brand_name", None)
        updates["brand_id"] = brand["id"]
    if not updates:
        return await get_device(existing["id"], detail=True)
    filters = {"id": f"eq.{existing['id']}"}
    if expected_version is not None:
        filters["version"] = f"eq.{expected_version}"
    rows = await db.update("devices", filters, updates, columns="id")
    if not rows:
        current = await db.select_one(
            "devices", columns="id,version", filters={"id": f"eq.{existing['id']}"}
        )
        if current and expected_version is not None:
            raise APIError(
                409,
                "version_conflict",
                f"Another writer already moved this device to version {current['version']}; "
                "reload and retry.",
                {"current_version": current["version"]},
            )
        raise APIError(404, "device_not_found", "No device with that id.")
    await log_action(
        "device.update",
        target_type="device",
        target_id=existing["id"],
        old_value={"name": existing.get("name"), "price": existing.get("price")},
        new_value=updates,
        ip_address=_ip(request),
    )
    return await get_device(existing["id"], detail=True)


@router.delete(
    "/devices/{device_id}",
    response_model=DeviceDetail,
    dependencies=WRITE,
    summary="Soft-delete a device",
)
async def deactivate_device(device_id: str, request: Request) -> dict:
    existing = await get_device_row(device_id, detail=False)
    await db.update("devices", {"id": f"eq.{device_id}"}, {"is_active": False}, columns="id")
    await log_action(
        "device.deactivate",
        target_type="device",
        target_id=device_id,
        old_value={"is_active": existing.get("is_active")},
        new_value={"is_active": False},
        ip_address=_ip(request),
    )
    return await get_device(device_id, detail=True)


@router.put(
    "/devices/{device_id}/scores",
    response_model=DeviceScoresResponse,
    dependencies=WRITE,
    summary="Upsert device scores (overall is recomputed by a DB trigger)",
)
async def upsert_scores(device_id: str, payload: ScoresIn, request: Request) -> dict:
    existing = await get_device_row(device_id, detail=False)
    values = payload.model_dump()
    rows = await db.insert(
        "device_scores",
        {"device_id": device_id, **values},
        columns=(
            "performance_score,camera_score,battery_score,display_score,value_score,"
            "build_score,software_score,overall_score,scored_by,updated_at"
        ),
        upsert=True,
        on_conflict="device_id",
    )
    await log_action(
        "scores.update",
        target_type="device",
        target_id=existing["id"],
        new_value=values,
        ip_address=_ip(request),
    )
    return {"device_id": device_id, "scores": rows[0]}


@router.put(
    "/devices/{device_id}/categories",
    response_model=DeviceDetail,
    dependencies=WRITE,
    summary="Set category ranks (DB trigger shifts siblings)",
)
async def assign_categories(
    device_id: str, payload: CategoryAssignmentsRequest, request: Request
) -> dict:
    existing = await get_device_row(device_id, detail=False)
    for assignment in payload.categories:
        # The RPC writes the audit row in the same transaction as the rank.
        await _upsert_category_rank(
            existing["id"], assignment, ip_address=_ip(request)
        )
    return await get_device(existing["id"], detail=True)


# ── reviews ────────────────────────────────────────────────────
@router.get("/reviews", response_model=Page[ReviewOut], summary="Moderation queue")
async def moderation_queue(
    is_approved: Optional[bool] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> dict:
    filters: Dict[str, str] = {}
    if is_approved is not None:
        filters["is_approved"] = f"is.{str(is_approved).lower()}"
    result = await db.select(
        "reviews",
        columns=(
            "id,user_id,device_id,rating,title,review_text,verified_owner,"
            "helpful_votes,is_approved,created_at,author:users(id,name,avatar_url)"
        ),
        filters=filters,
        order="created_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {"items": result.rows, "meta": pagination_meta(page, page_size, result.total or 0)}


@router.patch(
    "/reviews/{review_id}",
    response_model=ReviewOut,
    dependencies=WRITE,
    summary="Approve or reject a review",
)
async def moderate_review(
    review_id: str, payload: ReviewModerationRequest, request: Request
) -> dict:
    existing = await db.select_one(
        "reviews",
        columns="id,is_approved,device_id,rating",
        filters={"id": f"eq.{review_id}"},
    )
    if not existing:
        raise APIError(404, "review_not_found", "No review with that id.")
    rows = await db.update(
        "reviews",
        {"id": f"eq.{review_id}"},
        {"is_approved": payload.is_approved},
        columns=(
            "id,user_id,device_id,rating,title,review_text,verified_owner,"
            "helpful_votes,is_approved,created_at"
        ),
    )
    await log_action(
        "review.moderate",
        target_type="review",
        target_id=review_id,
        old_value={"is_approved": existing.get("is_approved")},
        new_value={"is_approved": payload.is_approved},
        ip_address=_ip(request),
    )
    return rows[0]


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
    dependencies=WRITE,
    summary="Remove a review permanently",
)
async def delete_review(review_id: str, request: Request) -> None:
    """Moderation removes the row; its votes cascade with it.

    Deleting is a different decision from rejecting: a rejected review stays
    visible to its author and can be re-approved, a deleted one is gone. The
    audit entry is written first so the evidence survives the row.
    """
    existing = await db.select_one(
        "reviews",
        columns="id,device_id,user_id,rating,title",
        filters={"id": f"eq.{review_id}"},
    )
    if not existing:
        raise APIError(404, "review_not_found", "No review with that id.")
    await log_action(
        "review.delete",
        target_type="review",
        target_id=review_id,
        old_value=existing,
        ip_address=_ip(request),
    )
    await db.delete("reviews", {"id": f"eq.{review_id}"})


# ── recommendation rules ───────────────────────────────────────
RULE_COLUMNS = (
    "id,priority,weight_perf,weight_camera,weight_battery,weight_display,"
    "weight_value,weight_build,weight_software,updated_at"
)


@router.get("/rules", response_model=List[RuleOut], summary="List scoring rules")
async def list_rules() -> List[dict]:
    result = await db.select(
        "recommendation_rules", columns=RULE_COLUMNS, order="priority.asc", limit=20
    )
    return result.rows


@router.put(
    "/rules",
    response_model=RuleOut,
    dependencies=WRITE,
    summary="Create or replace a scoring rule",
)
async def upsert_rule(payload: RuleUpsertRequest, request: Request) -> dict:
    values = payload.model_dump()
    rows = await db.insert(
        "recommendation_rules",
        values,
        columns=RULE_COLUMNS,
        upsert=True,
        on_conflict="priority",
    )
    await log_action(
        "rule.upsert",
        target_type="recommendation_rule",
        target_id=rows[0]["id"],
        new_value=values,
        ip_address=_ip(request),
    )
    return rows[0]


# ── operations ─────────────────────────────────────────────────
@router.post(
    "/price-alerts/scan",
    response_model=PriceAlertScanResult,
    dependencies=WRITE,
    summary="Mark alerts whose target price has been reached",
)
async def scan_price_alerts(request: Request) -> dict:
    result = await db.select(
        "price_alerts",
        columns="id,user_id,device_id,target_price,devices(id,name,slug,price,currency)",
        filters={"is_triggered": "is.false"},
        order="created_at.asc",
        limit=500,
    )
    triggered: List[dict] = []
    errors: List[dict] = []
    now = datetime.now(timezone.utc).isoformat()
    for row in result.rows:
        device = row.get("devices") or {}
        price = as_float(device.get("price"))
        target = as_float(row.get("target_price"))
        if price is None or target is None or price > target:
            continue
        try:
            await db.update(
                "price_alerts",
                {"id": f"eq.{row['id']}"},
                {"is_triggered": True, "triggered_at": now},
                columns="id",
            )
            triggered.append(
                {
                    "alert_id": row["id"],
                    "user_id": row.get("user_id"),
                    "device_id": row.get("device_id"),
                    "device_name": device.get("name"),
                    "price": price,
                    "target_price": target,
                }
            )
        except DataAccessError as exc:
            errors.append({"alert_id": row["id"], "message": exc.message})
    await log_action(
        "price_alerts.scan",
        target_type="price_alert",
        new_value={"scanned": len(result.rows), "triggered": len(triggered)},
        ip_address=_ip(request),
    )
    return {"scanned": len(result.rows), "triggered": triggered, "errors": errors}


def _embedding_text(device: dict) -> str:
    specs = device.get("specs") or {}
    scores = device.get("scores") or {}
    brand = (device.get("brand") or {}).get("name") or ""
    parts = [
        f"{brand} {device['name']} smartphone.",
        f"Price ₹{float(device.get('price') or 0):,.0f}.",
        f"Processor: {specs.get('processor_name')}.",
        f"RAM {specs.get('ram_gb')}GB, storage {specs.get('storage_gb')}GB.",
        f"Display {specs.get('display_size_inch')} inch {specs.get('display_type')} at "
        f"{specs.get('refresh_rate_hz')}Hz.",
        f"Main camera {specs.get('camera_primary_mp')}MP, selfie {specs.get('camera_front_mp')}MP.",
        f"Battery {specs.get('battery_mah')}mAh with {specs.get('charging_watt')}W charging.",
        f"5G: {'yes' if specs.get('five_g') else 'no'}. OS: {specs.get('os')}.",
        f"RMDU scores — performance {scores.get('performance_score')}, camera "
        f"{scores.get('camera_score')}, battery {scores.get('battery_score')}, "
        f"overall {scores.get('overall_score')}.",
    ]
    return " ".join(part for part in parts if part and "None" not in part)


@router.post(
    "/embeddings/{device_id}",
    dependencies=WRITE,
    summary="Generate and store one device embedding",
)
async def generate_embedding(device_id: str, request: Request) -> dict:
    if not settings.ai_enabled:
        raise APIError(
            503,
            "ai_disabled",
            "Embeddings require OPENAI_API_KEY on the server.",
        )
    device = await get_device(device_id, detail=True)
    text = _embedding_text(device)
    vector = await embed_text(text)
    if not vector:
        raise APIError(502, "embedding_failed", "OpenAI did not return an embedding.")
    rows = await db.insert(
        "device_embeddings",
        {
            "device_id": device["id"],
            "embedding": "[" + ",".join(f"{value:.8f}" for value in vector) + "]",
            "embedded_text": text,
            "model_used": settings.embedding_model,
        },
        columns="device_id,model_used,generated_at",
        upsert=True,
        on_conflict="device_id",
    )
    await log_action(
        "embedding.generate",
        target_type="device",
        target_id=device["id"],
        ip_address=_ip(request),
    )
    return {**rows[0], "characters": len(text)}


@router.post(
    "/embeddings/rebuild",
    dependencies=WRITE,
    summary="Backfill embeddings for active devices",
)
async def rebuild_embeddings(
    request: Request, limit: int = Query(default=5, ge=1, le=25)
) -> dict:
    if not settings.ai_enabled:
        raise APIError(503, "ai_disabled", "Embeddings require OPENAI_API_KEY on the server.")
    devices = await db.select(
        "devices",
        columns="id,name",
        filters={"is_active": "is.true"},
        order="updated_at.desc",
        limit=limit,
    )
    results = []
    for row in devices.rows:
        device = await get_device(row["id"], detail=True)
        text = _embedding_text(device)
        vector = await embed_text(text)
        if not vector:
            results.append({"device_id": row["id"], "status": "failed"})
            continue
        await db.insert(
            "device_embeddings",
            {
                "device_id": row["id"],
                "embedding": "[" + ",".join(f"{value:.8f}" for value in vector) + "]",
                "embedded_text": text,
                "model_used": settings.embedding_model,
            },
            upsert=True,
            on_conflict="device_id",
            columns="device_id",
        )
        results.append({"device_id": row["id"], "status": "embedded"})
    await log_action(
        "embedding.rebuild",
        target_type="device",
        new_value={"requested": limit, "results": results},
        ip_address=_ip(request),
    )
    return {"processed": len(results), "results": results}
