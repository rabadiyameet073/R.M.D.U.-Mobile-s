"""Transport-level hardening: caller identity, origin guard, body cap, headers.

Nothing in this module knows about a business rule. It answers four questions
the rest of the stack must be able to trust:

* **Who is calling?** `client_ip()` is the only place `X-Forwarded-For` is
  parsed, and only when the immediate peer is an explicitly trusted proxy.
  Audit rows and rate-limit buckets therefore cannot be spoofed by a header.
* **May a browser on another site trigger this?** `OriginGuardMiddleware`
  refuses state-changing requests that carry a `Origin`/`Referer` outside the
  configured allowlist. Non-browser clients send neither and are unaffected.
* **How large may the body be?** `BodySizeLimitMiddleware` enforces a hard cap
  before the application parses anything, so a 200 MB JSON blob cannot exhaust
  a worker.
* **How may the response be embedded?** `SecurityHeadersMiddleware` adds the
  anti-clickjacking, anti-sniffing, HSTS and CSP headers and strips the server
  fingerprint.
"""

from __future__ import annotations

import ipaddress
import json
import logging
import re
from typing import Iterable, List, Optional

from core.config import settings
from core.errors import error_payload

logger = logging.getLogger("rmdu.security")

# A client-supplied request id is echoed back and written to the log, so it is
# constrained to a short, log-safe alphabet.
SAFE_REQUEST_ID = re.compile(r"^[A-Za-z0-9._-]{8,64}$")

UNSAFE_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})

_PUBLIC_DOC_PREFIXES = ("/docs", "/redoc", "/openapi.json")

# The API only ever answers JSON (and the docs pages, which load their own
# bundle). `default-src 'none'` means an injected payload has nowhere to go.
_API_CSP = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
# Swagger/ReDoc are server-rendered from a CDN bundle; they need a looser policy.
_DOCS_CSP = (
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; "
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
    "connect-src 'self'; frame-ancestors 'none'"
)  # noqa: E501 - a CSP is one long string by nature


def _header(scope: dict, name: bytes) -> Optional[str]:
    for key, value in scope.get("headers") or ():
        if key.lower() == name:
            return value.decode("latin-1")
    return None


def _peer_address(scope: dict) -> Optional[str]:
    client = scope.get("client")
    if client and client[0]:
        return client[0]
    return None


def _matches_any(value: str, entries: Iterable[str]) -> bool:
    """Exact IP match, or membership of a CIDR block."""
    for entry in entries:
        if entry == value:
            return True
        try:
            if ipaddress.ip_address(value) in ipaddress.ip_network(entry, strict=False):
                return True
        except ValueError:
            # Not an address/network (e.g. a hostname): fall back to exact text.
            continue
    return False


def client_ip(scope: dict) -> Optional[str]:
    """Resolve the caller address, trusting forwarding headers only from proxies.

    The walk is right-to-left: the right-most hop not listed as a trusted proxy
    is the first address that cannot be forged by the caller. If every hop is
    trusted (a misconfiguration), the left-most entry is the best available
    answer rather than `None`.
    """
    peer = _peer_address(scope)
    trusted = settings.trusted_proxies_list
    if not peer or not trusted or not _matches_any(peer, trusted):
        return peer

    forwarded = _header(scope, b"x-forwarded-for")
    if not forwarded:
        return peer
    chain = [part.strip() for part in forwarded.split(",") if part.strip()]
    for candidate in reversed(chain):
        if not _matches_any(candidate, trusted):
            return candidate
    return chain[0] if chain else peer


def client_ip_from_request(request) -> Optional[str]:
    """Same resolution for a Starlette/FastAPI `Request`."""
    return client_ip(request.scope)


def is_ip_allowed(ip: Optional[str], entries: List[str]) -> bool:
    if not entries:
        return True
    if not ip:
        return False
    return _matches_any(ip, entries)


def _client_is_trusted_proxy(scope: dict) -> bool:
    peer = _peer_address(scope)
    return bool(peer and _matches_any(peer, settings.trusted_proxies_list))


def _origin_of(scope: dict) -> Optional[str]:
    origin = _header(scope, b"origin")
    if origin:
        return origin.strip()
    referer = _header(scope, b"referer")
    if not referer:
        return None
    # `referer` is a URL; compare only the scheme://host[:port] prefix.
    parts = referer.split("/")
    if len(parts) >= 3 and parts[0] in ("http:", "https:"):
        return f"{parts[0]}//{parts[2]}"
    return None


async def _send_json(send, status: int, payload: dict, extra: Optional[dict] = None) -> None:
    body = json.dumps(payload).encode("utf-8")
    headers = [
        (b"content-type", b"application/json"),
        (b"content-length", str(len(body)).encode("latin-1")),
    ]
    for name, value in (extra or {}).items():
        headers.append((name.lower().encode("latin-1"), str(value).encode("latin-1")))
    await send({"type": "http.response.start", "status": status, "headers": headers})
    await send({"type": "http.response.body", "body": body})


class SecurityHeadersMiddleware:
    """Add the response headers a browser needs to treat this API defensively."""

    def __init__(self, app) -> None:
        self.app = app
        self._hsts = (
            f"max-age={max(settings.hsts_max_age, 0)}; includeSubDomains"
            if settings.is_production
            else None
        )

    def _headers_for(self, path: str) -> List[tuple]:
        is_doc = path.startswith(_PUBLIC_DOC_PREFIXES)
        headers = [
            (b"x-content-type-options", b"nosniff"),
            (b"x-frame-options", b"DENY"),
            (b"referrer-policy", b"strict-origin-when-cross-origin"),
            (b"permissions-policy", b"geolocation=(), microphone=(), camera=(), payment=()"),
            (b"cross-origin-opener-policy", b"same-origin-allow-popups"),
            (b"cross-origin-resource-policy", b"cross-origin"),
            (b"x-permitted-cross-domain-policies", b"none"),
            (b"content-security-policy", (_DOCS_CSP if is_doc else _API_CSP).encode("latin-1")),
        ]
        if self._hsts:
            headers.append((b"strict-transport-security", self._hsts.encode("latin-1")))
        return headers

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http" or not settings.security_headers:
            await self.app(scope, receive, send)
            return

        path = scope.get("path", "")
        extra = self._headers_for(path)

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = [
                    (name, value)
                    for name, value in (message.get("headers") or [])
                    # Never advertise the server stack or the framework.
                    if name.lower() not in (b"server", b"x-powered-by")
                ]
                present = {name.lower() for name, _ in headers}
                for name, value in extra:
                    if name not in present:
                        headers.append((name, value))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)


class OriginGuardMiddleware:
    """Reject cross-site state changes that a browser would have made.

    The API authenticates with headers (`Authorization`, `X-Admin-Key`), which a
    browser never attaches automatically, so CSRF is already unlikely. This is
    defence in depth: an unsafe request carrying a browser `Origin` that is not
    allowlisted is refused before it can touch data.
    """

    def __init__(self, app) -> None:
        self.app = app
        self._allowed = set(settings.cors_origins_list)

    async def __call__(self, scope, receive, send) -> None:
        if (
            scope["type"] != "http"
            or (scope.get("method") or "").upper() not in UNSAFE_METHODS
            or not self._allowed
        ):
            await self.app(scope, receive, send)
            return

        origin = _origin_of(scope)
        if origin is None:
            # Server-to-server callers (curl, mobile app, another service).
            await self.app(scope, receive, send)
            return

        if origin in self._allowed:
            await self.app(scope, receive, send)
            return

        logger.warning("blocked cross-origin %s %s from %s", scope.get("method"), scope.get("path"), origin)
        await _send_json(
            send,
            403,
            error_payload(
                "origin_not_allowed",
                "This origin is not allowed to perform state-changing requests.",
            ),
        )


class BodySizeLimitMiddleware:
    """Refuse oversized payloads before the application reads them.

    The body is buffered up to the configured cap and replayed downstream. That
    is what makes a streaming/chunked upload unable to bypass the limit: the
    `Content-Length` header alone is advisory and may be absent or forged.
    """

    def __init__(self, app) -> None:
        self.app = app
        self._limit = max(int(settings.max_request_bytes), 1024)

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http" or (scope.get("method") or "").upper() not in UNSAFE_METHODS:
            await self.app(scope, receive, send)
            return

        declared = _header(scope, b"content-length")
        if declared:
            try:
                if int(declared) > self._limit:
                    await self._too_large(send)
                    return
            except ValueError:
                await _send_json(
                    send,
                    400,
                    error_payload("invalid_content_length", "Content-Length must be a number."),
                )
                return

        chunks: List[bytes] = []
        total = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            if message["type"] != "http.request":
                continue
            chunk = message.get("body", b"")
            total += len(chunk)
            if total > self._limit:
                await self._too_large(send)
                return
            chunks.append(chunk)
            if not message.get("more_body", False):
                break

        body = b"".join(chunks)

        async def replay():
            return {"type": "http.request", "body": body, "more_body": False}

        await self.app(scope, replay, send)

    async def _too_large(self, send) -> None:
        logger.warning("rejected request body above %s bytes", self._limit)
        await _send_json(
            send,
            413,
            error_payload(
                "payload_too_large",
                f"Request body exceeds the {self._limit} byte limit.",
            ),
        )
