"""Catalog models: brands, devices, specs, scores, categories, reviews."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import Field, field_validator

from schemas.common import APIModel


class BrandRef(APIModel):
    id: str
    name: str
    logo_url: Optional[str] = None
    country: Optional[str] = None


class BrandOut(BrandRef):
    is_active: bool = True
    created_at: Optional[datetime] = None
    device_count: Optional[int] = None


class ScoreOut(APIModel):
    performance_score: float = 0
    camera_score: float = 0
    battery_score: float = 0
    display_score: float = 0
    value_score: float = 0
    build_score: float = 0
    software_score: float = 0
    overall_score: float = 0
    scored_by: Optional[str] = None
    updated_at: Optional[datetime] = None


class SpecsOut(APIModel):
    processor_name: Optional[str] = None
    processor_brand: Optional[str] = None
    process_node: Optional[str] = None
    cpu_cores: Optional[int] = None
    cpu_max_freq_ghz: Optional[float] = None
    gpu_name: Optional[str] = None
    antutu_score: Optional[int] = None
    geekbench_single: Optional[int] = None
    geekbench_multi: Optional[int] = None
    ram_gb: Optional[int] = None
    storage_gb: Optional[int] = None
    storage_type: Optional[str] = None
    display_size_inch: Optional[float] = None
    display_resolution: Optional[str] = None
    display_type: Optional[str] = None
    refresh_rate_hz: Optional[int] = None
    peak_brightness_nit: Optional[int] = None
    protection: Optional[str] = None
    camera_primary_mp: Optional[float] = None
    camera_ultra_mp: Optional[float] = None
    camera_tele_mp: Optional[float] = None
    camera_front_mp: Optional[float] = None
    camera_features: List[str] = Field(default_factory=list)
    video_max_res: Optional[str] = None
    battery_mah: Optional[int] = None
    charging_watt: Optional[int] = None
    wireless_watt: Optional[int] = None
    reverse_watt: Optional[int] = None
    five_g: bool = False
    wifi_standard: Optional[str] = None
    bluetooth_version: Optional[str] = None
    nfc: bool = False
    usb_type: Optional[str] = None
    os: Optional[str] = None
    ui_layer: Optional[str] = None
    guaranteed_updates: Optional[int] = None
    weight_grams: Optional[int] = None
    dimensions: Optional[str] = None
    build_material: Optional[str] = None
    ip_rating: Optional[str] = None

    @field_validator("camera_features", mode="before")
    @classmethod
    def _null_list_to_empty(cls, value):
        return value or []


class CategoryRef(APIModel):
    id: str
    name: str
    slug: str
    icon: Optional[str] = None
    color_hex: Optional[str] = None


class CategoryMembership(CategoryRef):
    rank: Optional[int] = None
    rank_locked: bool = False
    justification: Optional[str] = None


class CategoryOut(APIModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color_hex: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    device_count: Optional[int] = None


class ProsConsOut(APIModel):
    id: str
    type: str
    description: str
    importance: int = 1
    display_order: int = 0


class FeatureOut(APIModel):
    id: str
    feature_name: str
    feature_value: str
    icon: Optional[str] = None
    display_order: int = 0


class UssdOut(APIModel):
    id: str
    code: str
    description: str
    category: str = "general"
    is_universal: bool = False


class ReviewAuthor(APIModel):
    id: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class ReviewOut(APIModel):
    id: str
    user_id: str
    device_id: str
    rating: int
    title: Optional[str] = None
    review_text: Optional[str] = None
    verified_owner: bool = False
    helpful_votes: int = 0
    is_approved: bool = False
    created_at: Optional[datetime] = None
    author: Optional[ReviewAuthor] = None


class ReviewsSummary(APIModel):
    count: int = 0
    average_rating: Optional[float] = None
    distribution: Dict[str, int] = Field(default_factory=dict)


class DeviceCard(APIModel):
    id: str
    brand_id: str
    name: str
    slug: str
    model_number: Optional[str] = None
    launch_date: Optional[date] = None
    price: float
    currency: str = "INR"
    image_url: Optional[str] = None
    gallery_urls: List[str] = Field(default_factory=list)
    color_options: List[str] = Field(default_factory=list)
    is_active: bool = True
    is_featured: bool = False
    # Optimistic-concurrency revision; echo it back on admin updates.
    version: int = 1
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    extra: Dict[str, Any] = Field(default_factory=dict)
    brand: Optional[BrandRef] = None
    scores: Optional[ScoreOut] = None
    specs: Optional[SpecsOut] = None
    overall_score: Optional[float] = None
    key_specs: Dict[str, Any] = Field(default_factory=dict)


class DeviceDetail(DeviceCard):
    pros: List[ProsConsOut] = Field(default_factory=list)
    cons: List[ProsConsOut] = Field(default_factory=list)
    features: List[FeatureOut] = Field(default_factory=list)
    ussd_codes: List[UssdOut] = Field(default_factory=list)
    categories: List[CategoryMembership] = Field(default_factory=list)
    reviews_summary: ReviewsSummary = Field(default_factory=ReviewsSummary)


class RankedDeviceOut(APIModel):
    rank: Optional[int] = None
    manual_rank: Optional[int] = None
    auto_rank: Optional[int] = None
    rank_locked: bool = False
    category_score: Optional[float] = None
    overall_score: Optional[float] = None
    device: DeviceCard


class CategoryDetail(CategoryOut):
    devices: List[RankedDeviceOut] = Field(default_factory=list)
    ranking_mode: str = "manual"


class ReviewCreateRequest(APIModel):
    device_id: str
    rating: int = Field(ge=1, le=5)
    title: Optional[str] = Field(default=None, max_length=120)
    review_text: Optional[str] = Field(default=None, max_length=4000)


class ReviewModerationRequest(APIModel):
    is_approved: bool


class HelpfulVoteResponse(APIModel):
    id: str
    helpful_votes: int
