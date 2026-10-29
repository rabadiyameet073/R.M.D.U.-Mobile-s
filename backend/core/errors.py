"""Error types and FastAPI exception handlers.

Every error leaves the API in the same envelope:

    {"error": {"code": "...", "message": "...", "details": {...}}}

so the frontend never has to guess how a failure is shaped.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import settings
from core.db import DataAccessError, is_write_rejected

logger = logging.getLogger("rmdu.api")


class APIError(Exception):
    """Domain error raised deliberately by routers/services.

    `headers` carries protocol-level hints the client must see (a `Retry-After`
    on 429/503, for example), so they are not dropped by the JSON handler.
    """

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[Any] = None,
        headers: Optional[dict] = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details
        self.headers = headers or {}


def error_payload(code: str, message: str, details: Optional[Any] = None) -> dict:
    payload: dict = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return payload


async def api_error_handler(_: Request, exc: APIError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(exc.code, exc.message, exc.details),
        headers=exc.headers or None,
    )


_SAFE_DATA_MESSAGES = {
    "conflict": "The request conflicts with the current state of the resource.",
    "not_found": "The requested resource does not exist.",
    "database_error": "The data service is temporarily unavailable.",
}


async def data_access_error_handler(request: Request, exc: DataAccessError) -> JSONResponse:
    """Translate upstream PostgREST/Auth failures into stable API errors.

    An upstream message can name tables, constraints and columns, which is a
    map of the database interior. It is logged for operators and echoed only
    outside production; callers otherwise receive a generic sentence.
    """
    if request.method in ("POST", "PUT", "PATCH", "DELETE") and is_write_rejected(exc):
        # A locked database is an operational state, not a client mistake. The
        # statement never ran, so the contract is "nothing was saved" rather
        # than a 400 the caller could never fix by changing the request.
        logger.error(
            "database refused a write %s %s: %s",
            request.method,
            request.url.path,
            exc.message,
        )
        return JSONResponse(
            status_code=503,
            content=error_payload(
                "database_locked",
                "The database is read-only right now, so the change was not saved. "
                "No partial write was applied; retry once write access is restored.",
            ),
            headers={"Retry-After": "120"},
        )
    status = exc.status_code if 400 <= exc.status_code < 500 else 502
    # 401/403 from the data plane are server-side credential problems, never
    # something the API consumer can fix.
    if status in (401, 403):
        status = 502
    code = "conflict" if status == 409 else ("not_found" if status == 404 else "database_error")
    logger.warning("data access error status=%s code=%s message=%s", exc.status_code, code, exc.message)
    if settings.is_production:
        return JSONResponse(status_code=status, content=error_payload(code, _SAFE_DATA_MESSAGES[code]))
    return JSONResponse(
        status_code=status,
        content=error_payload(code, exc.message, exc.payload or None),
    )


async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    """Report which fields failed without echoing the submitted values back.

    Pydantic includes the offending input in each error; a password field or an
    access token would land in the response and in any client-side log, so only
    the location, the rule and the human message are kept.
    """
    details = [
        {
            "field": ".".join(
                str(part) for part in error.get("loc", ()) if part not in ("body", "query", "path")
            ),
            "message": error.get("msg", "Invalid value."),
            "type": error.get("type", "value_error"),
        }
        for error in exc.errors()[:20]
    ]
    return JSONResponse(
        status_code=422,
        content=error_payload(
            "validation_error",
            "One or more request fields are invalid.",
            details,
        ),
    )


_HTTP_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    406: "not_acceptable",
    409: "conflict",
    413: "payload_too_large",
    415: "unsupported_media_type",
    428: "precondition_required",
    429: "rate_limited",
    503: "unavailable",
}


async def http_exception_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Keep framework-raised errors (404, 405, ...) inside the same envelope."""
    message = exc.detail if isinstance(exc.detail, str) and exc.detail else "The request could not be completed."
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(_HTTP_CODES.get(exc.status_code, "http_error"), message),
        headers=getattr(exc, "headers", None),
    )


async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content=error_payload("internal_error", "An unexpected server error occurred."),
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(DataAccessError, data_access_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
