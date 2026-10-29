"""Error types and FastAPI exception handlers.

Every error leaves the API in the same envelope:

    {"error": {"code": "...", "message": "...", "details": {...}}}

so the frontend never has to guess how a failure is shaped.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.db import DataAccessError

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


async def data_access_error_handler(_: Request, exc: DataAccessError) -> JSONResponse:
    """Translate upstream PostgREST/Auth failures into stable API errors."""
    status = exc.status_code if 400 <= exc.status_code < 500 else 502
    # 401/403 from the data plane are server-side credential problems, never
    # something the API consumer can fix.
    if status in (401, 403):
        status = 502
    code = "conflict" if status == 409 else ("not_found" if status == 404 else "database_error")
    logger.warning("data access error status=%s message=%s", exc.status_code, exc.message)
    return JSONResponse(
        status_code=status,
        content=error_payload(code, exc.message, exc.payload or None),
    )


async def unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content=error_payload("internal_error", "An unexpected server error occurred."),
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(APIError, api_error_handler)
    app.add_exception_handler(DataAccessError, data_access_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)
