"""Public storefront endpoints.

These are the only routes the marketing pages call. They are unauthenticated by
design and read exclusively `is_active` rows, so the admin console and a direct
SQL insert both surface here without any further wiring.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Query

from controllers import site_controller
from core.config import settings
from schemas.catalog import CategoryDetail
from schemas.site import SiteFeaturedOut, SiteHomeOut, SiteSettingsOut

router = APIRouter(prefix="/site", tags=["site"])

MAX_SITE_PAGE = 48


@router.get(
    "/home",
    response_model=SiteHomeOut,
    summary="Everything the storefront home page renders",
)
async def home() -> dict:
    return await site_controller.home()


@router.get(
    "/settings",
    response_model=SiteSettingsOut,
    summary="Public site copy: hero, navigation and footer",
)
async def site_settings() -> dict:
    return await site_controller.settings()


@router.get(
    "/categories/{identifier}",
    response_model=CategoryDetail,
    summary="Category header with admin copy and one page of ranked members",
)
async def site_category(
    identifier: str,
    ranking: Literal["manual", "auto"] = Query(default="manual"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=MAX_SITE_PAGE),
) -> dict:
    return await site_controller.category_page(
        identifier, page=page, page_size=page_size, ranking=ranking
    )


@router.get(
    "/featured",
    response_model=SiteFeaturedOut,
    summary="Promoted devices, falling back to the newest arrivals",
)
async def site_featured(limit: int = Query(default=8, ge=1, le=settings.max_page_size)) -> dict:
    return await site_controller.featured(limit)
