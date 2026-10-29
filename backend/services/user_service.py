"""User provisioning and profile helpers.

Supabase writes to `auth.users`; a DB trigger mirrors rows into `public.users`
and `public.user_profiles`. This module is idempotent so the API still works if
that trigger has not run yet (for example on a restored database).
"""

from __future__ import annotations

import asyncio
from typing import Optional, Tuple

from core.db import DataAccessError, db
from core.deps import CurrentUser
from core.errors import APIError
from core.utils import as_float

USER_COLUMNS = (
    "id,name,email,avatar_url,role,is_active,is_verified,auth_provider,"
    "created_at,last_login_at"
)
PROFILE_COLUMNS = (
    "user_id,current_device_id,budget_min,budget_max,primary_priority,"
    "secondary_priority,preferred_os,preferred_brands,onboarding_done,version,updated_at"
)


def serialize_profile(row: dict) -> dict:
    return {
        "user_id": row.get("user_id"),
        "current_device_id": row.get("current_device_id"),
        "budget_min": as_float(row.get("budget_min")) or 0.0,
        "budget_max": as_float(row.get("budget_max")) or 999999.0,
        "primary_priority": row.get("primary_priority") or "all-rounder",
        "secondary_priority": row.get("secondary_priority"),
        "preferred_os": row.get("preferred_os") or "any",
        "preferred_brands": row.get("preferred_brands") or [],
        "onboarding_done": row.get("onboarding_done", False),
        "version": row.get("version") or 1,
        "updated_at": row.get("updated_at"),
    }


async def ensure_user(user: CurrentUser) -> Tuple[dict, dict]:
    """Guarantee a `public.users` + `user_profiles` row for this auth subject."""
    user_row = await db.select_one(
        "users", columns=USER_COLUMNS, filters={"id": f"eq.{user.id}"}
    )
    if not user_row:
        if not user.email:
            raise APIError(
                400,
                "email_required",
                "The authenticated account has no email address on file.",
            )
        payload = {
            "id": user.id,
            "name": user.name or user.email.split("@")[0],
            "email": user.email,
            "avatar_url": user.avatar_url,
            "auth_provider": user.provider or "email",
            "oauth_id": user.id,
            "raw_meta": user.raw.get("user_metadata") or {},
            "is_verified": True,
        }
        try:
            await db.insert("users", payload, upsert=True, on_conflict="id")
        except DataAccessError as exc:
            if exc.status_code == 409:
                raise APIError(
                    409,
                    "account_link_conflict",
                    "An account with this email already exists under a different auth identity.",
                ) from exc
            raise
        user_row = await db.select_one(
            "users", columns=USER_COLUMNS, filters={"id": f"eq.{user.id}"}
        )

    profile_row = await db.select_one(
        "user_profiles", columns=PROFILE_COLUMNS, filters={"user_id": f"eq.{user.id}"}
    )
    if not profile_row:
        await db.insert(
            "user_profiles",
            {"user_id": user.id},
            upsert=True,
            on_conflict="user_id",
        )
        profile_row = await db.select_one(
            "user_profiles", columns=PROFILE_COLUMNS, filters={"user_id": f"eq.{user.id}"}
        )

    if not user_row or not profile_row:
        raise APIError(500, "user_provisioning_failed", "Could not provision the user record.")
    return user_row, profile_row


async def user_stats(user_id: str) -> dict:
    tables = {
        "phone_history": "user_phone_history",
        "price_alerts": "price_alerts",
        "comparisons": "comparison_sessions",
        "shopkeeper_cards": "shopkeeper_cards",
        "reviews": "reviews",
        "recommendations": "recommendations",
    }
    counts = await asyncio.gather(
        *(
            db.select(table, columns="id", filters={"user_id": f"eq.{user_id}"}, limit=1, count=True)
            for table in tables.values()
        ),
        return_exceptions=True,
    )
    stats = {}
    for key, result in zip(tables.keys(), counts):
        stats[key] = 0 if isinstance(result, Exception) else (result.total or 0)
    return stats


async def get_profile(user_id: str) -> Optional[dict]:
    return await db.select_one(
        "user_profiles", columns=PROFILE_COLUMNS, filters={"user_id": f"eq.{user_id}"}
    )
