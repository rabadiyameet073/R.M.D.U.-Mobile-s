"""RMDU Mobiles API.

A single FastAPI service in front of the live Supabase database (PostgREST +
GoTrue). Read endpoints are public; user endpoints require a Supabase access
token; the admin surface requires X-Admin-Key.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from core.db import db
from core.errors import register_error_handlers
from core.middleware import IdempotencyMiddleware, RequestContextMiddleware
from core.utils import as_float
from routers import (
    admin,
    admin_content,
    ai,
    brands,
    categories,
    compare,
    devices,
    me,
    recommendations,
    retail,
)
from schemas.common import HealthOut, MetaOut
from services.catalog_service import categories_with_counts
from services.recommendation_engine import load_rules

APP_VERSION = "1.0.0"
OPENAPI_TAGS = [
    {
        "name": "system",
        "description": "Liveness, readiness, feature-flag snapshot and catalog metadata.",
    },
    {
        "name": "devices",
        "description": "Catalog search and filters, typeahead, full detail, reviews and USSD codes.",
    },
    {
        "name": "categories",
        "description": "The RMDU categories with dense, admin-ordered ranks and an auto-ranking view.",
    },
    {
        "name": "brands",
        "description": "Brand directory and the catalog filtered by brand.",
    },
    {
        "name": "compare",
        "description": "Side-by-side spec matrix, weighted scoreboard and re-openable saved sessions.",
    },
    {
        "name": "recommendations",
        "description": "Weighted recommendation engine: guest, quick-pick and personal modes.",
    },
    {
        "name": "me",
        "description": "Signed-in profile, phone history, price alerts, cards, reviews and activity feed.",
    },
    {
        "name": "retail",
        "description": "Shareable shopkeeper cards addressed by short code; public lookup counts views.",
    },
    {
        "name": "ai",
        "description": "Grounded semantic search, RAG answers and chat sessions.",
    },
    {
        "name": "admin",
        "description": "X-Admin-Key gated reads and writes for the catalog console; every mutation is audited.",
    },
]
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("rmdu.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info(
        "Starting RMDU API v%s env=%s db=%s ai=%s admin=%s",
        APP_VERSION,
        settings.app_env,
        settings.supabase_url,
        settings.ai_enabled,
        settings.admin_enabled,
    )
    yield
    await db.close()
    logger.info("RMDU API shut down cleanly.")


app = FastAPI(
    title="RMDU Mobiles API",
    description=(
        "Dynamic backend for the RMDU Mobiles smartphone recommendation platform. "
        "All catalog data is read live from Supabase; recommendation weights, "
        "category ranks and scores are database-driven and admin-editable."
    ),
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(IdempotencyMiddleware)
# CORS is added last so it stays outermost: preflight answers never depend on
# the layers below, and the response headers they add survive the wrapper.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time-Ms", "Retry-After", "Idempotent-Replayed"],
)
register_error_handlers(app)


async def health_check() -> dict:
    started = time.perf_counter()
    database = "ok"
    detail = None
    try:
        await db.select("categories", columns="id", limit=1)
    except Exception as exc:  # noqa: BLE001 - health must never raise
        database = "down"
        detail = str(exc)
    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    return {
        "status": "ok" if database == "ok" else "degraded",
        "version": APP_VERSION,
        "environment": settings.app_env,
        "database": database,
        "latency_ms": latency_ms,
        "detail": detail,
    }


def feature_flags() -> dict:
    """Kill switches as the frontend sees them (Module 11 §13)."""
    return {
        "ai": settings.feature_ai and settings.ai_enabled,
        "reviews": settings.feature_reviews,
        "shopkeeper_cards": settings.feature_shopkeeper_cards,
        "price_alerts": settings.feature_price_alerts,
        "admin_writes": settings.feature_admin_writes,
        "rate_limit": settings.rate_limit_enabled,
        "idempotency_required": bool(settings.idempotency_required.strip()),
    }


async def meta() -> dict:
    rules = await load_rules()
    categories = await categories_with_counts()
    brands = await db.select(
        "brands",
        columns="id,name,logo_url,country",
        filters={"is_active": "is.true"},
        order="name.asc",
        limit=200,
    )
    return {
        "version": APP_VERSION,
        "environment": settings.app_env,
        "api_prefix": settings.api_prefix,
        "categories": categories,
        "brands": brands.rows,
        "priorities": [
            {
                "priority": row["priority"],
                "weights": {
                    "performance": as_float(row.get("weight_perf")) or 0,
                    "camera": as_float(row.get("weight_camera")) or 0,
                    "battery": as_float(row.get("weight_battery")) or 0,
                    "display": as_float(row.get("weight_display")) or 0,
                    "value": as_float(row.get("weight_value")) or 0,
                    "build": as_float(row.get("weight_build")) or 0,
                    "software": as_float(row.get("weight_software")) or 0,
                },
            }
            for row in rules.values()
        ],
        "sort_options": [
            "relevance",
            "newest",
            "price_asc",
            "price_desc",
            "name_asc",
            "name_desc",
            "score_desc",
            "featured",
        ],
        "ai_enabled": settings.ai_enabled,
        "admin_enabled": settings.admin_enabled,
        "features": feature_flags(),
    }


async def readiness_check() -> JSONResponse:
    """Readiness probe: the shell may serve, but writes need the database.

    Unlike `/health`, which is liveness and always answers, readiness returns
    503 while the data plane is unreachable so a load balancer stops routing
    mutations at it instead of letting them fail one by one.
    """
    database = "ok"
    detail = None
    try:
        await db.select("categories", columns="id", limit=1)
    except Exception as exc:  # noqa: BLE001 - readiness must never raise
        database = "down"
        detail = str(exc)[:300]
    payload = {
        "status": "ready" if database == "ok" else "not_ready",
        "version": APP_VERSION,
        "environment": settings.app_env,
        "database": database,
        "features": feature_flags(),
        "detail": detail,
    }
    return JSONResponse(
        status_code=200 if database == "ok" else 503,
        content=payload,
        headers={"Cache-Control": "no-store"},
    )


app.add_api_route("/health", health_check, methods=["GET"], response_model=HealthOut, tags=["system"])
app.add_api_route(
    f"{settings.api_prefix}/health",
    health_check,
    methods=["GET"],
    response_model=HealthOut,
    tags=["system"],
)
app.add_api_route(f"{settings.api_prefix}/meta", meta, methods=["GET"], response_model=MetaOut, tags=["system"])
app.add_api_route("/health/ready", readiness_check, methods=["GET"], tags=["system"])
app.add_api_route(f"{settings.api_prefix}/health/ready", readiness_check, methods=["GET"], tags=["system"])

for module in (
    brands,
    devices,
    categories,
    compare,
    recommendations,
    retail,
    ai,
    me,
    admin,
    admin_content,
):
    app.include_router(module.router, prefix=settings.api_prefix)


@app.get("/", tags=["system"], include_in_schema=False)
async def root() -> dict:
    return {
        "service": "RMDU Mobiles API",
        "version": APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "api": settings.api_prefix,
    }
