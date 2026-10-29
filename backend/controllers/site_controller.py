"""Storefront controller.

The public site surface answers exactly four questions — what the home page
shows, what a category page shows, what copy the chrome carries, and which
devices are promoted. Each function composes service reads into the response
model and adds no transport concerns of its own.
"""

from __future__ import annotations

from typing import Any, Dict

from services import site_service


async def home() -> Dict[str, Any]:
    """Aggregate the home page: tiles with members, featured, brands, copy."""
    return await site_service.home_payload()


async def settings() -> Dict[str, Any]:
    """Public site copy (hero, navigation, footer) as stored by the console."""
    return {"settings": await site_service.public_settings()}


async def category_page(
    identifier: str,
    *,
    page: int,
    page_size: int,
    ranking: str,
) -> Dict[str, Any]:
    return await site_service.category_page(
        identifier, page=page, page_size=page_size, ranking=ranking
    )


async def featured(limit: int) -> Dict[str, Any]:
    return {"items": await site_service.featured_devices(limit)}
