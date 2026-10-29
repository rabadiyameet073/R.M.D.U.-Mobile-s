"""Request dependencies: current user resolution and admin gating.

Authentication is delegated to Supabase GoTrue: the client sends the access
token it already holds from supabase-js, we validate it server-side, and every
user-scoped query is additionally filtered by `user_id = <token subject>`.
"""

from __future__ import annotations

import secrets
from dataclasses import dataclass, field
from typing import Optional

from fastapi import Depends, Header

from core.config import settings
from core.db import DataAccessError, db
from core.errors import APIError


@dataclass(slots=True)
class CurrentUser:
    id: str
    email: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    provider: Optional[str] = None
    raw: dict = field(default_factory=dict)


def _extract_bearer(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()


async def get_optional_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[CurrentUser]:
    """Return the authenticated user, or None for anonymous requests."""
    token = _extract_bearer(authorization)
    if not token:
        if authorization:
            raise APIError(
                401,
                "invalid_authorization",
                "Authorization header must use the 'Bearer <access_token>' scheme.",
            )
        return None
    try:
        payload = await db.get_auth_user(token)
    except DataAccessError as exc:
        raise APIError(401, "invalid_token", "Access token is invalid or expired.") from exc

    metadata = payload.get("user_metadata") or {}
    app_metadata = payload.get("app_metadata") or {}
    return CurrentUser(
        id=payload["id"],
        email=payload.get("email"),
        name=metadata.get("full_name") or metadata.get("name"),
        avatar_url=metadata.get("avatar_url") or metadata.get("picture"),
        provider=app_metadata.get("provider"),
        raw=payload,
    )


async def get_current_user(
    user: Optional[CurrentUser] = Depends(get_optional_user),
) -> CurrentUser:
    if user is None:
        raise APIError(
            401,
            "authentication_required",
            "A Supabase access token is required for this endpoint.",
        )
    return user


async def require_admin(
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
) -> None:
    """Gate the admin surface with the shared admin key (never the DB key)."""
    if not settings.admin_enabled:
        raise APIError(
            503,
            "admin_disabled",
            "Admin API is disabled. Configure ADMIN_API_KEY on the server to enable it.",
        )
    if not x_admin_key or not secrets.compare_digest(x_admin_key, settings.admin_api_key):
        raise APIError(401, "invalid_admin_key", "Missing or invalid X-Admin-Key header.")


def require_feature(flag: str):
    """Kill switch for one dependency (Module 11 §13).

    Degraded behavior is an honest `503` with `Retry-After`: the feature is
    temporarily unavailable, and nothing is silently faked in its place.
    """

    def dependency() -> None:
        if not getattr(settings, flag, True):
            raise APIError(
                503,
                "feature_disabled",
                f"This feature is temporarily disabled ({flag}).",
                {"feature": flag},
                headers={"Retry-After": "60"},
            )

    return dependency


def require_admin_write() -> None:
    """Block admin mutations without disabling the read-only admin surface."""
    if not settings.feature_admin_writes:
        raise APIError(
            503,
            "admin_writes_disabled",
            "Admin writes are temporarily disabled; reads remain available.",
            {"feature": "feature_admin_writes"},
            headers={"Retry-After": "60"},
        )
