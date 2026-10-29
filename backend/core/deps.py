"""Request dependencies: current user resolution and admin gating.

Authentication is delegated to Supabase GoTrue: the client sends the access
token it already holds from supabase-js, we validate it server-side, and every
user-scoped query is additionally filtered by `user_id = <token subject>`.
"""

from __future__ import annotations

import logging
import secrets
from dataclasses import dataclass, field
from typing import Optional

from fastapi import Depends, Header, Request

from core.config import settings
from core.db import DataAccessError, db
from core.errors import APIError
from core.ratelimit import WindowLimiter
from core.security import client_ip_from_request, is_ip_allowed

logger = logging.getLogger("rmdu.auth")

# Failed admin keys per caller address. A shared key presented over the public
# internet is guessable at machine speed, so the gate itself must throttle.
_admin_failures = WindowLimiter()


def _admin_bucket(request: Request) -> str:
    return f"admin_auth|{client_ip_from_request(request) or 'unknown'}"


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
    request: Request,
    x_admin_key: Optional[str] = Header(default=None, alias="X-Admin-Key"),
) -> None:
    """Gate the admin surface with the shared admin key (never the DB key).

    Three checks run before the key itself: the surface must be enabled, the
    caller address must be on the allowlist when one is configured, and the
    address must not be locked out from previous failures. Only then is the
    key compared, in constant time. A success clears the failure counter.
    """
    if not settings.admin_enabled:
        raise APIError(
            503,
            "admin_disabled",
            "Admin API is disabled. Configure ADMIN_API_KEY on the server to enable it.",
        )

    ip = client_ip_from_request(request)
    if not is_ip_allowed(ip, settings.admin_ip_allowlist_entries):
        logger.warning("admin request refused from non-allowlisted address %s", ip)
        raise APIError(403, "admin_ip_blocked", "This client address may not use the admin API.")

    bucket = _admin_bucket(request)
    retry_after = await _admin_failures.blocked_for(bucket, settings.admin_max_failed_attempts)
    if retry_after:
        raise APIError(
            429,
            "admin_locked_out",
            f"Too many failed admin keys. Retry in {retry_after}s.",
            {"retry_after_seconds": retry_after},
            headers={"Retry-After": str(retry_after)},
        )

    if not x_admin_key or not secrets.compare_digest(x_admin_key, settings.admin_api_key):
        allowed, wait = await _admin_failures.hit(
            bucket, settings.admin_max_failed_attempts, settings.admin_lockout_seconds
        )
        if not allowed:
            logger.warning("invalid admin key from %s; locked out for %ss", ip, wait)
        else:
            logger.warning("invalid admin key from %s", ip)
        raise APIError(401, "invalid_admin_key", "Missing or invalid X-Admin-Key header.")

    await _admin_failures.clear(bucket)


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
