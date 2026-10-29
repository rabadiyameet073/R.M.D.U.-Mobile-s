"""Cross-cutting request concerns as pure ASGI middleware.

Two layers live here:

* `RequestContextMiddleware` stamps every request with an id, an access log
  line and the cache policy Module 11 §11.1 requires (`private, no-store` for
  profile, admin, AI and card capability responses — expiry and ownership must
  never be served from a cache).
* `IdempotencyMiddleware` implements the Module 12 §6.2 contract on top of the
  `fn_begin_idempotent` / `fn_complete_idempotent` RPCs shipped in migration 07.

Both are written against the raw ASGI interface on purpose. The idempotency
layer must read the request body before the app does and replay it downstream,
then buffer the response body to persist the committed result — neither is
possible through `BaseHTTPMiddleware` without touching private request state.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import time
import uuid
from typing import Any, Dict, Optional, Tuple

from core.config import settings
from core.db import DataAccessError, db
from core.errors import error_payload
from core.security import SAFE_REQUEST_ID, client_ip

logger = logging.getLogger("rmdu.http")

UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})
MAX_RECORDED_RESPONSE = 2 * 1024 * 1024  # idempotent replay only stores JSON
IDEMPOTENCY_HEADER = b"idempotency-key"
_UUID_RE = re.compile(
    r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE
)

# Paths whose responses must never be cached: ownership, expiry or spend.
_PRIVATE_PREFIXES = ("/api/v1/me", "/api/v1/admin", "/api/v1/ai")
_CAPABILITY_PREFIXES = ("/api/v1/retail/cards",)


def cache_policy(path: str) -> Optional[str]:
    if path.startswith(_CAPABILITY_PREFIXES):
        return "no-store"
    if path.startswith(_PRIVATE_PREFIXES):
        return "private, no-store"
    if path.startswith("/health"):
        return "no-store"
    return None


def _header(scope: dict, name: bytes) -> Optional[str]:
    for key, value in scope.get("headers") or ():
        if key.lower() == name:
            return value.decode("latin-1")
    return None


class RequestContextMiddleware:
    """Request id, latency header, access log and cache policy."""

    def __init__(self, app) -> None:
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = time.perf_counter()
        # A caller-supplied id is echoed back and written to the access log, so
        # anything outside a short log-safe alphabet is discarded.
        provided_id = _header(scope, b"x-request-id")
        request_id = (
            provided_id
            if provided_id and SAFE_REQUEST_ID.match(provided_id)
            else uuid.uuid4().hex[:16]
        )
        caller_ip = client_ip(scope) or "unknown"
        state = scope.setdefault("state", {})
        state["request_id"] = request_id
        state["client_ip"] = caller_ip

        path = scope.get("path", "")
        policy = cache_policy(path)
        outcome: Dict[str, Any] = {"status": 500, "elapsed_ms": 0.0}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
                outcome["status"] = message["status"]
                outcome["elapsed_ms"] = elapsed_ms
                headers = list(message.get("headers") or [])
                present = {name.lower() for name, _ in headers}
                headers.append((b"x-request-id", request_id.encode("latin-1")))
                headers.append((b"x-response-time-ms", str(elapsed_ms).encode("latin-1")))
                if policy and b"cache-control" not in present:
                    headers.append((b"cache-control", policy.encode("latin-1")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            logger.info(
                "%s %s -> %s %.1fms ip=%s rid=%s",
                scope.get("method"),
                path,
                outcome["status"],
                outcome["elapsed_ms"],
                caller_ip,
                request_id,
            )


class IdempotencyMiddleware:
    """Replay the first committed result for a repeated `Idempotency-Key`.

    Statuses map onto the RPC contract: `started` executes, `replay` returns the
    stored status and body, `in_progress` answers 409 with a retry hint, and a
    body hash mismatch answers 409 without touching business data. A failed
    attempt is recorded as `failed` so the caller may retry the same key.
    """

    def __init__(self, app) -> None:
        self.app = app
        self._storage_missing = False

    # ── helpers ────────────────────────────────────────────────
    @staticmethod
    def _actor_scope(scope: dict) -> str:
        credential = _header(scope, b"authorization") or _header(scope, b"x-admin-key")
        if credential:
            prefix = "user" if credential.lower().startswith("bearer ") else "admin"
            digest = hashlib.sha256(credential.encode("utf-8")).hexdigest()[:32]
            return f"{prefix}:{digest}"
        host = client_ip(scope) or "unknown"
        agent = _header(scope, b"user-agent") or ""
        digest = hashlib.sha256(f"{host}|{agent}".encode("utf-8")).hexdigest()[:32]
        return f"guest:{digest}"

    @staticmethod
    def _operation(scope: dict) -> str:
        path = _UUID_RE.sub("{id}", scope.get("path", ""))
        return f"{scope.get('method')} {path}"[:80]

    @staticmethod
    def _is_required(scope: dict) -> bool:
        method = (scope.get("method") or "").upper()
        path = scope.get("path", "")
        for rule_method, prefix in settings.idempotency_required_rules:
            if rule_method != method:
                continue
            if not prefix.startswith("/api"):
                prefix = f"{settings.api_prefix}{prefix}"
            if path.startswith(prefix):
                return True
        return False

    @staticmethod
    async def _json_body(receive) -> Tuple[bytes, Any]:
        chunks = []
        more = True
        while more:
            message = await receive()
            if message["type"] == "http.disconnect":
                break
            chunks.append(message.get("body", b""))
            more = message.get("more_body", False)
        body = b"".join(chunks)
        try:
            parsed = json.loads(body) if body else None
        except ValueError:
            parsed = None
        return body, parsed

    @staticmethod
    async def _send_json(send, status: int, payload: dict, extra: Optional[dict] = None) -> None:
        body = json.dumps(payload, default=str).encode("utf-8")
        headers = [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(body)).encode("latin-1")),
        ]
        for name, value in (extra or {}).items():
            headers.append((name.lower().encode("latin-1"), str(value).encode("latin-1")))
        await send({"type": "http.response.start", "status": status, "headers": headers})
        await send({"type": "http.response.body", "body": body})

    async def _begin(self, actor: str, operation: str, key: str, body: bytes) -> Tuple[str, dict]:
        try:
            result = await db.rpc(
                "fn_begin_idempotent",
                {
                    "p_actor_scope": actor,
                    "p_operation": operation,
                    "p_key": key,
                    "p_request_hash": hashlib.sha256(body).hexdigest(),
                },
            )
        except DataAccessError as exc:
            if not self._storage_missing:
                self._storage_missing = True
                logger.warning(
                    "idempotency storage unavailable (%s); requests pass through unrecorded",
                    exc.message,
                )
            return "unavailable", {}
        return (result or {}).get("status", "unavailable"), (result or {})

    async def _complete(
        self, actor: str, operation: str, key: str, status: int, payload: Any, *, ok: bool
    ) -> None:
        try:
            await db.rpc(
                "fn_complete_idempotent",
                {
                    "p_actor_scope": actor,
                    "p_operation": operation,
                    "p_key": key,
                    "p_http_status": status,
                    "p_result": payload,
                    "p_status": "completed" if ok else "failed",
                },
            )
        except DataAccessError as exc:
            logger.warning("idempotency completion failed for %s: %s", operation, exc.message)

    # ── ASGI entry point ───────────────────────────────────────
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or (scope.get("method") or "").upper() not in UNSAFE_METHODS:
            await self.app(scope, receive, send)
            return

        key = _header(scope, IDEMPOTENCY_HEADER)
        if not key:
            if self._is_required(scope):
                await self._send_json(
                    send,
                    428,
                    error_payload(
                        "idempotency_key_required",
                        "This operation requires an Idempotency-Key header.",
                    ),
                )
                return
            await self.app(scope, receive, send)
            return

        key = key.strip()
        if not (8 <= len(key) <= 200):
            await self._send_json(
                send,
                422,
                error_payload(
                    "idempotency_key_invalid",
                    "Idempotency-Key must be between 8 and 200 characters.",
                ),
            )
            return

        body, _ = await self._json_body(receive)
        actor = self._actor_scope(scope)
        operation = self._operation(scope)

        status, result = await self._begin(actor, operation, key, body)
        if status == "unavailable":
            async def replay_receive():
                return {"type": "http.request", "body": body, "more_body": False}

            await self.app(scope, replay_receive, send)
            return
        if status == "replay":
            await self._send_json(
                send,
                int(result.get("http_status") or 200),
                result.get("result") or {},
                {"Idempotent-Replayed": "true"},
            )
            return
        if status == "in_progress":
            await self._send_json(
                send,
                409,
                error_payload(
                    "idempotency_in_progress",
                    "An identical request with this Idempotency-Key is still running.",
                ),
                {"Retry-After": "1"},
            )
            return
        if status == "mismatch":
            await self._send_json(
                send,
                409,
                error_payload(
                    "idempotency_key_reuse",
                    "This Idempotency-Key was already used with a different request body.",
                ),
            )
            return

        async def replay_receive():
            return {"type": "http.request", "body": body, "more_body": False}

        captured: Dict[str, Any] = {"status": 500, "body": b"", "json": False, "too_large": False}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                captured["status"] = message["status"]
                for name, value in message.get("headers") or ():
                    if name.lower() == b"content-type":
                        captured["json"] = value.decode("latin-1").startswith("application/json")
            elif message["type"] == "http.response.body":
                chunk = message.get("body", b"")
                if len(captured["body"]) + len(chunk) <= MAX_RECORDED_RESPONSE:
                    captured["body"] += chunk
                else:
                    captured["too_large"] = True
            await send(message)

        try:
            await self.app(scope, replay_receive, send_wrapper)
        except Exception:
            await self._complete(actor, operation, key, 500, None, ok=False)
            raise

        status_code = int(captured["status"])
        ok = status_code < 400
        payload: Any = None
        if ok and captured["json"] and not captured["too_large"] and captured["body"]:
            try:
                payload = json.loads(captured["body"])
            except ValueError:
                payload = None
        await self._complete(actor, operation, key, status_code, payload, ok=ok)
