"""Request budgets — the fast, non-authoritative half of abuse control.

Module 11 §11.3 lists a starting budget per surface. Those budgets live here as
fixed windows in process memory, which means N replicas grant roughly N times
the configured allowance. That is acceptable because a limiter is never the
thing that protects correctness: one review per user-device is a UNIQUE
constraint, one holder per slot is a partial unique index, one claim per
idempotency key is a unique row. This module only stops a single caller from
burning the catalog, the AI budget or the admin audit log.

Identity is derived from the presented credential (bearer token or admin key),
never from a body/query field, and only a hash of it is kept in memory so the
bucket table cannot leak secrets. Anonymous callers fall back to the socket
peer address.
"""

from __future__ import annotations

import asyncio
import hashlib
import math
import time
from typing import Dict, Optional, Tuple

from fastapi import Request

from core.config import settings
from core.errors import APIError


def request_identity(request: Request, *, scope: str = "credential") -> str:
    """Stable, non-reversible per-caller key."""
    if scope != "ip":
        credential = request.headers.get("authorization") or request.headers.get("x-admin-key")
        if credential:
            digest = hashlib.sha256(credential.encode("utf-8")).hexdigest()[:32]
            return f"cred:{digest}"
    host = request.client.host if request.client else "unknown"
    return f"ip:{host}"


class _Window:
    __slots__ = ("reset_at", "count")

    def __init__(self, reset_at: float, count: int) -> None:
        self.reset_at = reset_at
        self.count = count


class WindowLimiter:
    """Fixed-window counters with opportunistic pruning."""

    PRUNE_EVERY_S = 120.0

    def __init__(self) -> None:
        self._windows: Dict[str, _Window] = {}
        self._lock = asyncio.Lock()
        self._last_prune = 0.0

    async def hit(self, key: str, limit: int, window_seconds: float) -> Tuple[bool, int]:
        """Return (allowed, retry_after_seconds)."""
        now = time.monotonic()
        async with self._lock:
            current = self._windows.get(key)
            if current is None or current.reset_at <= now:
                self._windows[key] = _Window(now + window_seconds, 1)
                allowed, retry_after = True, 0
            elif current.count >= limit:
                allowed = False
                retry_after = max(1, math.ceil(current.reset_at - now))
            else:
                current.count += 1
                allowed, retry_after = True, 0

            if now - self._last_prune > self.PRUNE_EVERY_S:
                self._last_prune = now
                for stale in [k for k, w in self._windows.items() if w.reset_at <= now]:
                    self._windows.pop(stale, None)
        return allowed, retry_after

    def reset(self) -> None:
        self._windows.clear()


limiter = WindowLimiter()


def rate_limit(
    surface: str,
    *,
    limit: int,
    window_seconds: float = 60.0,
    scope: str = "credential",
):
    """Build a FastAPI dependency that enforces one budget for one surface."""

    async def dependency(request: Request) -> None:
        if not settings.rate_limit_enabled or limit <= 0:
            return
        identity = request_identity(request, scope=scope)
        allowed, retry_after = await limiter.hit(
            f"{surface}|{identity}", limit, window_seconds
        )
        if not allowed:
            raise APIError(
                429,
                "rate_limited",
                f"Too many requests on '{surface}'. Retry in {retry_after}s.",
                {"surface": surface, "limit": limit, "window_seconds": window_seconds},
                headers={"Retry-After": str(retry_after)},
            )

    return dependency


# Budgets from Module 11 §11.3, named once so routes cannot drift apart.
CARD_LOOKUP = rate_limit("card_lookup", limit=30, window_seconds=60.0, scope="ip")
CARD_CREATE = rate_limit("card_create", limit=10, window_seconds=3600.0)
REVIEW_WRITE = rate_limit("review_write", limit=3, window_seconds=3600.0)
AI_QUERY = rate_limit("ai_query", limit=10, window_seconds=60.0)
ADMIN_MUTATION = rate_limit("admin_mutation", limit=60, window_seconds=60.0)
CLAIM = rate_limit("claim", limit=5, window_seconds=60.0)


def retry_after_header(seconds: int) -> dict:
    return {"Retry-After": str(max(int(seconds), 1))}


def identity_summary(request: Request) -> Optional[str]:
    """Human-safe identity label for audit rows (never the secret)."""
    credential = request.headers.get("authorization") or request.headers.get("x-admin-key")
    if credential:
        return request_identity(request)
    if request.client:
        return request.client.host
    return None
