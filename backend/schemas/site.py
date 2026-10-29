"""Storefront payloads.

The public site composes several tables into one response so a page render is a
single round trip. These models are deliberately lenient: a device row that is
missing an optional column still renders (as a card with fewer facts) instead
of failing the whole page.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from pydantic import Field

from schemas.catalog import BrandRef, CategoryOut
from schemas.common import APIModel


class SiteDeviceCard(APIModel):
    """A catalog card: exactly what a grid tile prints, nothing else."""

    id: str
    name: str
    slug: Optional[str] = None
    brand_name: Optional[str] = None
    brand_logo_url: Optional[str] = None
    image_url: Optional[str] = None
    price: float = 0
    currency: str = "INR"
    overall_score: Optional[float] = None
    key_specs: Dict[str, Any] = Field(default_factory=dict)
    is_featured: bool = False
    color_options: List[str] = Field(default_factory=list)
    launch_date: Optional[date] = None


class SiteRankedDevice(APIModel):
    rank: Optional[int] = None
    auto_rank: Optional[int] = None
    rank_locked: bool = False
    category_score: Optional[float] = None
    device: SiteDeviceCard


class SiteCategoryCard(CategoryOut):
    """A category tile plus the first few members, in admin-chosen order."""

    devices: List[SiteRankedDevice] = Field(default_factory=list)


class SiteHomeOut(APIModel):
    settings: Dict[str, Any] = Field(default_factory=dict)
    categories: List[SiteCategoryCard] = Field(default_factory=list)
    featured: List[SiteDeviceCard] = Field(default_factory=list)
    brands: List[BrandRef] = Field(default_factory=list)
    stats: Dict[str, int] = Field(default_factory=dict)


class SiteSettingsOut(APIModel):
    settings: Dict[str, Any] = Field(default_factory=dict)


class SiteFeaturedOut(APIModel):
    items: List[SiteDeviceCard] = Field(default_factory=list)
