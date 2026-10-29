"""Admin surface for curated content and user administration.

The device endpoints in `routers/admin.py` publish a device as one unit. This
module covers everything a published device is *made of* afterwards — the
category list itself, its ranked membership, the spec sheet, the curated pros,
cons, features and USSD codes — plus the server-controlled user fields.

Two rules shape the writes here:

* **Ranks go through the ranking RPCs.** `fn_rerank_category_batch` and
  `fn_remove_category_member` are the only writers of `device_categories.rank`.
  They hold a namespaced advisory lock and the category row lock, check the
  caller's expected revision, keep the ranks dense and write the audit row in
  the same transaction. A plain PATCH cannot do any of that.
* **Lists converge, they never blank first.** Replacing pros/cons or features
  inserts and updates the requested rows, then deletes only the rows that are
  genuinely gone. PostgREST gives one transaction per call, so a "delete all,
  then insert" replace would expose an empty list between two calls. If a
  replace fails halfway the list is longer than requested, never shorter, and
  re-sending the same body converges.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response, status

from core.db import DataAccessError, db
from core.deps import require_admin, require_admin_write
from core.errors import APIError
from core.ratelimit import ADMIN_MUTATION
from core.utils import offset_for, pagination_meta, slugify
from schemas.admin import (
    AdminUserOut,
    AdminUserUpdate,
    CategoryCreate,
    CategoryMemberRemoval,
    CategoryOrderRequest,
    CategoryOrderResult,
    CategoryUpdate,
    FeatureReplace,
    ProsConsReplace,
    SpecsReplace,
    UssdCreate,
    UssdUpdate,
)
from schemas.catalog import CategoryOut, FeatureOut, ProsConsOut, SpecsOut, UssdOut
from schemas.common import Page
from services.audit import log_action
from services.catalog_service import category_device_count, get_device_row
from services.concurrency import call_rpc, interpret_rank

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_admin)],
)

# Two budgets on every mutation: the kill switch (`feature_admin_writes`) and
# the 60/min admin allowance. Reads deliberately carry neither, so an operator
# can always inspect what went wrong.
WRITE = [Depends(require_admin_write), Depends(ADMIN_MUTATION)]

CATEGORY_COLUMNS = (
    "id,name,slug,description,icon,color_hex,display_order,is_active,version,created_at"
)
PROS_CONS_COLUMNS = "id,type,description,importance,display_order"
FEATURE_COLUMNS = "id,feature_name,feature_value,icon,display_order"
USSD_COLUMNS = "id,device_id,code,description,category,is_universal,created_at"
USER_COLUMNS = (
    "id,name,email,avatar_url,role,is_active,is_verified,created_at,last_login_at"
)


def _ip(request: Request) -> Optional[str]:
    if request.client and request.client.host:
        return request.client.host
    return None


async def _category_or_404(category_id: str) -> dict:
    row = await db.select_one(
        "categories",
        columns=CATEGORY_COLUMNS,
        filters={"id": f"eq.{category_id}"},
    )
    if not row:
        raise APIError(404, "category_not_found", "No category with that id.")
    return row


# ── categories ─────────────────────────────────────────────────
@router.get(
    "/categories",
    response_model=List[CategoryOut],
    summary="Every category, including deactivated ones",
)
async def list_categories() -> List[dict]:
    result = await db.select(
        "categories",
        columns=CATEGORY_COLUMNS,
        order="display_order.asc,name.asc",
        limit=200,
    )
    counts = await asyncio.gather(
        *(category_device_count(row["id"]) for row in result.rows),
        return_exceptions=True,
    )
    return [
        {**row, "device_count": 0 if isinstance(count, Exception) else count}
        for row, count in zip(result.rows, counts)
    ]


@router.post(
    "/categories",
    response_model=CategoryOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=WRITE,
    summary="Create a category",
)
async def create_category(payload: CategoryCreate, request: Request) -> dict:
    values = payload.model_dump()
    values["slug"] = values.get("slug") or slugify(payload.name)
    try:
        rows = await db.insert("categories", values, columns=CATEGORY_COLUMNS)
    except DataAccessError as exc:
        if exc.status_code == 409:
            raise APIError(
                409,
                "category_exists",
                "A category with that name or slug already exists.",
            ) from exc
        raise
    await log_action(
        "category.create",
        target_type="category",
        target_id=rows[0]["id"],
        new_value=values,
        ip_address=_ip(request),
    )
    return rows[0]


@router.patch(
    "/categories/{category_id}",
    response_model=CategoryOut,
    dependencies=WRITE,
    summary="Update category metadata (version-checked)",
)
async def update_category(
    category_id: str, payload: CategoryUpdate, request: Request
) -> dict:
    existing = await _category_or_404(category_id)
    updates = payload.model_dump(exclude_unset=True)
    expected_version = updates.pop("version", None)
    if "slug" in updates and not updates["slug"]:
        updates["slug"] = slugify(updates.get("name") or existing["name"])
    if not updates:
        return existing

    filters = {"id": f"eq.{category_id}"}
    if expected_version is not None:
        filters["version"] = f"eq.{expected_version}"
    try:
        rows = await db.update("categories", filters, updates, columns=CATEGORY_COLUMNS)
    except DataAccessError as exc:
        if exc.status_code == 409:
            raise APIError(
                409, "category_exists", "Another category already uses that name or slug."
            ) from exc
        raise
    if not rows:
        current = await _category_or_404(category_id)
        if expected_version is not None:
            raise APIError(
                409,
                "version_conflict",
                f"Another writer already moved this category to version "
                f"{current.get('version')}; reload and retry.",
                {"current_version": current.get("version")},
            )
        raise APIError(404, "category_not_found", "No category with that id.")

    await log_action(
        "category.update",
        target_type="category",
        target_id=category_id,
        old_value={key: existing.get(key) for key in updates},
        new_value=updates,
        ip_address=_ip(request),
    )
    return rows[0]


@router.delete(
    "/categories/{category_id}",
    response_model=CategoryOut,
    dependencies=WRITE,
    summary="Deactivate a category (keeps memberships and URLs)",
)
async def deactivate_category(category_id: str, request: Request) -> dict:
    """Soft-delete on purpose.

    `device_categories` cascades on delete, so a hard delete would silently
    destroy every rank, review attribution and historical link that pointed at
    this category. Deactivation removes it from the public projection instead,
    and the explicit `is_active=false` in the response is the visibility policy.
    """
    existing = await _category_or_404(category_id)
    if not existing["is_active"]:
        return existing
    rows = await db.update(
        "categories",
        {"id": f"eq.{category_id}"},
        {"is_active": False},
        columns=CATEGORY_COLUMNS,
    )
    await log_action(
        "category.deactivate",
        target_type="category",
        target_id=category_id,
        old_value={"is_active": True},
        new_value={"is_active": False},
        ip_address=_ip(request),
    )
    return rows[0]


@router.put(
    "/categories/{category_id}/order",
    response_model=CategoryOrderResult,
    dependencies=WRITE,
    summary="Reorder a category in one transaction",
)
async def reorder_category(
    category_id: str, payload: CategoryOrderRequest, request: Request
) -> dict:
    """Apply a whole order at once.

    Sending one reorder per device would expose a half-applied list and burn one
    category revision per row. The batch RPC takes ranks 1..n for the ids given,
    pushes every other member below them in its current order, bumps the
    category revision once and writes one audit row.
    """
    await _category_or_404(category_id)
    result = await call_rpc(
        "fn_rerank_category_batch",
        {
            "p_category_id": category_id,
            "p_device_ids": payload.device_ids,
            "p_expected_version": payload.expected_version,
            "p_ip": _ip(request),
        },
        feature="Category reordering",
    )
    applied = interpret_rank(result)
    return {
        "category_id": category_id,
        "applied": applied.get("applied", 0),
        "category_version": applied.get("category_version"),
    }


@router.delete(
    "/categories/{category_id}/devices/{device_id}",
    response_model=CategoryMemberRemoval,
    dependencies=WRITE,
    summary="Remove a device from a category and close the rank gap",
)
async def remove_category_member(
    category_id: str,
    device_id: str,
    request: Request,
    expected_version: Optional[int] = Query(default=None, ge=1),
) -> dict:
    await _category_or_404(category_id)
    result = await call_rpc(
        "fn_remove_category_member",
        {
            "p_category_id": category_id,
            "p_device_id": device_id,
            "p_expected_version": expected_version,
            "p_ip": _ip(request),
        },
        feature="Category member removal",
    )
    removed = interpret_rank(result)
    return {
        "category_id": category_id,
        "device_id": device_id,
        "removed_rank": removed.get("removed_rank"),
        "category_version": removed.get("category_version"),
    }


# ── spec sheet ─────────────────────────────────────────────────
@router.put(
    "/devices/{device_id}/specs",
    response_model=SpecsOut,
    dependencies=WRITE,
    summary="Set the spec sheet for a device",
)
async def replace_specs(
    device_id: str, payload: SpecsReplace, request: Request
) -> dict:
    """Upsert the one spec row a device has.

    Missing values stay NULL — the contract treats them as unknown, never as
    zero or false, so an unmeasured benchmark must not be published as 0.
    """
    device = await get_device_row(device_id, detail=False)
    values = payload.model_dump(exclude_none=True)
    rows = await db.insert(
        "device_specs",
        {"device_id": device["id"], **values},
        columns="*",
        upsert=True,
        on_conflict="device_id",
    )
    await log_action(
        "specs.update",
        target_type="device",
        target_id=device["id"],
        new_value=values,
        ip_address=_ip(request),
    )
    return rows[0]


# ── pros / cons ────────────────────────────────────────────────
@router.get(
    "/devices/{device_id}/pros-cons",
    response_model=List[ProsConsOut],
    summary="Curated pros and cons for a device",
)
async def list_pros_cons(device_id: str) -> List[dict]:
    device = await get_device_row(device_id, detail=False)
    result = await db.select(
        "device_pros_cons",
        columns=PROS_CONS_COLUMNS,
        filters={"device_id": f"eq.{device['id']}"},
        order="type.asc,display_order.asc,importance.desc",
        limit=100,
    )
    return result.rows


@router.put(
    "/devices/{device_id}/pros-cons",
    response_model=List[ProsConsOut],
    dependencies=WRITE,
    summary="Replace the pros and cons list (converging, keeps row ids)",
)
async def replace_pros_cons(
    device_id: str, payload: ProsConsReplace, request: Request
) -> List[dict]:
    device = await get_device_row(device_id, detail=False)
    await _converge_rows(
        table="device_pros_cons",
        device_id=device["id"],
        items=payload.items,
        values_for=lambda item: {
            "type": item.type,
            "description": item.description,
            "importance": item.importance,
            "display_order": item.display_order,
        },
        columns=PROS_CONS_COLUMNS,
    )
    await log_action(
        "device.pros_cons",
        target_type="device",
        target_id=device["id"],
        new_value={"count": len(payload.items)},
        ip_address=_ip(request),
    )
    return await list_pros_cons(device["id"])


@router.delete(
    "/pros-cons/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
    dependencies=WRITE,
    summary="Delete one pro or con",
)
async def delete_pros_cons(item_id: str, request: Request) -> None:
    rows = await db.delete("device_pros_cons", {"id": f"eq.{item_id}"})
    if not rows:
        raise APIError(404, "pros_cons_not_found", "No pro or con with that id.")
    await log_action(
        "device.pros_cons.delete",
        target_type="device_pros_cons",
        target_id=item_id,
        ip_address=_ip(request),
    )


# ── features ───────────────────────────────────────────────────
@router.get(
    "/devices/{device_id}/features",
    response_model=List[FeatureOut],
    summary="Highlight features for a device",
)
async def list_features(device_id: str) -> List[dict]:
    device = await get_device_row(device_id, detail=False)
    result = await db.select(
        "device_features",
        columns=FEATURE_COLUMNS,
        filters={"device_id": f"eq.{device['id']}"},
        order="display_order.asc,created_at.asc",
        limit=100,
    )
    return result.rows


@router.put(
    "/devices/{device_id}/features",
    response_model=List[FeatureOut],
    dependencies=WRITE,
    summary="Replace the feature list (converging, keeps row ids)",
)
async def replace_features(
    device_id: str, payload: FeatureReplace, request: Request
) -> List[dict]:
    device = await get_device_row(device_id, detail=False)
    await _converge_rows(
        table="device_features",
        device_id=device["id"],
        items=payload.items,
        values_for=lambda item: {
            "feature_name": item.feature_name,
            "feature_value": item.feature_value,
            "icon": item.icon,
            "display_order": item.display_order,
        },
        columns=FEATURE_COLUMNS,
    )
    await log_action(
        "device.features",
        target_type="device",
        target_id=device["id"],
        new_value={"count": len(payload.items)},
        ip_address=_ip(request),
    )
    return await list_features(device["id"])


@router.delete(
    "/features/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
    dependencies=WRITE,
    summary="Delete one feature",
)
async def delete_feature(item_id: str, request: Request) -> None:
    rows = await db.delete("device_features", {"id": f"eq.{item_id}"})
    if not rows:
        raise APIError(404, "feature_not_found", "No feature with that id.")
    await log_action(
        "device.features.delete",
        target_type="device_features",
        target_id=item_id,
        ip_address=_ip(request),
    )


async def _converge_rows(
    *,
    table: str,
    device_id: str,
    items: List[Any],
    values_for,
    columns: str,
) -> None:
    """Insert new rows, update known rows in place, then delete the leftovers.

    Deliberately ordered so a partial failure can only leave extra rows behind,
    never fewer: the caller's next attempt with the same body removes them.
    """
    existing = await db.select(
        table,
        columns="id",
        filters={"device_id": f"eq.{device_id}"},
        limit=200,
    )
    known = {row["id"] for row in existing.rows}
    kept: List[str] = []
    for item in items:
        values = values_for(item)
        if item.id and item.id in known:
            await db.update(table, {"id": f"eq.{item.id}"}, values, columns="id")
            kept.append(item.id)
        else:
            rows = await db.insert(table, {"device_id": device_id, **values}, columns="id")
            kept.append(rows[0]["id"])

    for row_id in known - set(kept):
        await db.delete(table, {"id": f"eq.{row_id}"})


# ── USSD / hidden codes ────────────────────────────────────────
@router.get(
    "/ussd-codes",
    response_model=Page[UssdOut],
    summary="USSD codes for one device plus the universal ones",
)
async def list_ussd_codes(
    device_id: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> dict:
    filters: Dict[str, str] = {}
    if device_id:
        filters["or"] = f"(device_id.eq.{device_id},device_id.is.null)"
    else:
        filters["device_id"] = "is.null"
    result = await db.select(
        "device_ussd_codes",
        columns=USSD_COLUMNS,
        filters=filters,
        order="category.asc,code.asc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {"items": result.rows, "meta": pagination_meta(page, page_size, result.total or 0)}


@router.post(
    "/ussd-codes",
    response_model=UssdOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=WRITE,
    summary="Add a USSD or hidden code (device_id null = universal)",
)
async def create_ussd_code(payload: UssdCreate, request: Request) -> dict:
    values = payload.model_dump()
    if payload.device_id:
        device = await get_device_row(payload.device_id, detail=False)
        values["device_id"] = device["id"]
    else:
        values["device_id"] = None
        values["is_universal"] = True
    rows = await db.insert("device_ussd_codes", values, columns=USSD_COLUMNS)
    await log_action(
        "ussd.create",
        target_type="device_ussd_code",
        target_id=rows[0]["id"],
        new_value=values,
        ip_address=_ip(request),
    )
    return rows[0]


@router.patch(
    "/ussd-codes/{item_id}",
    response_model=UssdOut,
    dependencies=WRITE,
    summary="Update a USSD or hidden code",
)
async def update_ussd_code(item_id: str, payload: UssdUpdate, request: Request) -> dict:
    existing = await db.select_one(
        "device_ussd_codes", columns=USSD_COLUMNS, filters={"id": f"eq.{item_id}"}
    )
    if not existing:
        raise APIError(404, "ussd_not_found", "No USSD code with that id.")
    updates = payload.model_dump(exclude_unset=True)
    if "device_id" in updates:
        if updates["device_id"]:
            device = await get_device_row(updates["device_id"], detail=False)
            updates["device_id"] = device["id"]
        else:
            updates["device_id"] = None
            updates["is_universal"] = True
    if not updates:
        return existing
    rows = await db.update(
        "device_ussd_codes", {"id": f"eq.{item_id}"}, updates, columns=USSD_COLUMNS
    )
    await log_action(
        "ussd.update",
        target_type="device_ussd_code",
        target_id=item_id,
        old_value={key: existing.get(key) for key in updates},
        new_value=updates,
        ip_address=_ip(request),
    )
    return rows[0]


@router.delete(
    "/ussd-codes/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
    dependencies=WRITE,
    summary="Delete a USSD or hidden code",
)
async def delete_ussd_code(item_id: str, request: Request) -> None:
    rows = await db.delete("device_ussd_codes", {"id": f"eq.{item_id}"})
    if not rows:
        raise APIError(404, "ussd_not_found", "No USSD code with that id.")
    await log_action(
        "ussd.delete",
        target_type="device_ussd_code",
        target_id=item_id,
        ip_address=_ip(request),
    )


# ── users ──────────────────────────────────────────────────────
@router.get(
    "/users",
    response_model=Page[AdminUserOut],
    summary="List accounts (role, active state, verification)",
)
async def list_users(
    role: Optional[str] = Query(default=None, pattern="^(user|admin|editor)$"),
    is_active: Optional[bool] = Query(default=None),
    q: Optional[str] = Query(default=None, max_length=80),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> dict:
    filters: Dict[str, str] = {}
    if role:
        filters["role"] = f"eq.{role}"
    if is_active is not None:
        filters["is_active"] = f"is.{str(is_active).lower()}"
    if q:
        needle = q.replace(",", " ").replace("*", "").strip()
        if needle:
            filters["or"] = f"(name.ilike.*{needle}*,email.ilike.*{needle}*)"
    result = await db.select(
        "users",
        columns=USER_COLUMNS,
        filters=filters,
        order="created_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {"items": result.rows, "meta": pagination_meta(page, page_size, result.total or 0)}


@router.patch(
    "/users/{user_id}",
    response_model=AdminUserOut,
    dependencies=WRITE,
    summary="Change role, active state or verification",
)
async def update_user(user_id: str, payload: AdminUserUpdate, request: Request) -> dict:
    """Role and active state are server-controlled, so they are changed here.

    The last active admin cannot be demoted or deactivated: doing so would lock
    every operator out of the admin surface with no in-band recovery.
    """
    existing = await db.select_one(
        "users", columns=USER_COLUMNS, filters={"id": f"eq.{user_id}"}
    )
    if not existing:
        raise APIError(404, "user_not_found", "No user with that id.")
    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        return existing

    loses_admin = existing["role"] == "admin" and (
        updates.get("role", "admin") != "admin" or updates.get("is_active") is False
    )
    if loses_admin:
        remaining = await db.select(
            "users",
            columns="id",
            filters={"role": "eq.admin", "is_active": "is.true", "id": f"neq.{user_id}"},
            limit=1,
            count=True,
        )
        if not remaining.total:
            raise APIError(
                409,
                "last_admin",
                "This is the last active admin account; promote another account first.",
            )

    rows = await db.update("users", {"id": f"eq.{user_id}"}, updates, columns=USER_COLUMNS)
    await log_action(
        "user.update",
        target_type="user",
        target_id=user_id,
        old_value={key: existing.get(key) for key in updates},
        new_value=updates,
        ip_address=_ip(request),
    )
    return rows[0]
