"""Admin write-surface models."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import Field, model_validator

from schemas.catalog import ScoreOut, SpecsOut
from schemas.common import APIModel

Priority = Literal["gaming", "camera", "battery", "value", "all-rounder"]


class BrandCreate(APIModel):
    name: str = Field(min_length=1, max_length=80)
    logo_url: Optional[str] = None
    country: Optional[str] = Field(default=None, max_length=60)
    is_active: bool = True


class BrandUpdate(APIModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    logo_url: Optional[str] = None
    country: Optional[str] = Field(default=None, max_length=60)
    is_active: Optional[bool] = None


class ScoresIn(APIModel):
    performance_score: float = Field(ge=0, le=100)
    camera_score: float = Field(ge=0, le=100)
    battery_score: float = Field(ge=0, le=100)
    display_score: float = Field(ge=0, le=100)
    value_score: float = Field(ge=0, le=100)
    build_score: float = Field(ge=0, le=100)
    software_score: float = Field(ge=0, le=100)
    scored_by: Literal["system", "admin", "ai"] = "admin"


class CategoryAssignment(APIModel):
    category_id: Optional[str] = None
    category_slug: Optional[str] = None
    rank: int = Field(ge=1, le=999)
    rank_locked: bool = False
    justification: Optional[str] = Field(default=None, max_length=500)
    # Revision of the category ranking this placement was decided against. When
    # supplied, the RPC refuses to apply a placement over a newer ranking.
    expected_version: Optional[int] = Field(default=None, ge=1)

    @model_validator(mode="after")
    def _require_category(self) -> "CategoryAssignment":
        if not self.category_id and not self.category_slug:
            raise ValueError("either category_id or category_slug is required")
        return self


class DeviceCreate(APIModel):
    name: str = Field(min_length=1, max_length=150)
    brand_id: Optional[str] = None
    brand_name: Optional[str] = Field(default=None, max_length=80)
    slug: Optional[str] = Field(default=None, max_length=180)
    model_number: Optional[str] = Field(default=None, max_length=80)
    launch_date: Optional[date] = None
    price: float = Field(ge=0)
    currency: str = Field(default="INR", max_length=5)
    image_url: Optional[str] = None
    gallery_urls: List[str] = Field(default_factory=list)
    color_options: List[str] = Field(default_factory=list)
    is_featured: bool = False
    is_active: bool = True
    extra: Dict[str, Any] = Field(default_factory=dict)
    specs: Optional[SpecsOut] = None
    scores: Optional[ScoresIn] = None
    categories: List[CategoryAssignment] = Field(default_factory=list)

    @model_validator(mode="after")
    def _require_brand(self) -> "DeviceCreate":
        if not self.brand_id and not self.brand_name:
            raise ValueError("either brand_id or brand_name is required")
        return self


class DeviceUpdate(APIModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    brand_id: Optional[str] = None
    brand_name: Optional[str] = Field(default=None, max_length=80)
    slug: Optional[str] = Field(default=None, max_length=180)
    model_number: Optional[str] = Field(default=None, max_length=80)
    launch_date: Optional[date] = None
    price: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default=None, max_length=5)
    image_url: Optional[str] = None
    gallery_urls: Optional[List[str]] = None
    color_options: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    extra: Optional[Dict[str, Any]] = None
    # Expected revision, not a value to write: the update only matches while the
    # stored version still equals it (409 when someone else wrote first).
    version: Optional[int] = Field(default=None, ge=1)


class CategoryAssignmentsRequest(APIModel):
    categories: List[CategoryAssignment] = Field(min_length=1)


class RuleUpsertRequest(APIModel):
    priority: Priority
    weight_perf: float = Field(ge=0, le=1)
    weight_camera: float = Field(ge=0, le=1)
    weight_battery: float = Field(ge=0, le=1)
    weight_display: float = Field(ge=0, le=1)
    weight_value: float = Field(ge=0, le=1)
    weight_build: float = Field(ge=0, le=1)
    weight_software: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def _sum_to_one(self) -> "RuleUpsertRequest":
        total = round(
            self.weight_perf
            + self.weight_camera
            + self.weight_battery
            + self.weight_display
            + self.weight_value
            + self.weight_build
            + self.weight_software,
            2,
        )
        if total != 1.00:
            raise ValueError(f"weights must sum to exactly 1.00 (got {total})")
        return self


class RuleOut(APIModel):
    id: str
    priority: str
    weight_perf: float
    weight_camera: float
    weight_battery: float
    weight_display: float
    weight_value: float
    weight_build: float
    weight_software: float
    updated_at: Optional[datetime] = None


class StatsOut(APIModel):
    generated_at: datetime
    counts: Dict[str, int] = Field(default_factory=dict)
    catalog: Dict[str, Any] = Field(default_factory=dict)


class AuditLogOut(APIModel):
    id: str
    user_id: Optional[str] = None
    action: str
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None


class PriceAlertScanResult(APIModel):
    scanned: int
    triggered: List[dict] = Field(default_factory=list)
    errors: List[dict] = Field(default_factory=list)


class DeviceScoresResponse(APIModel):
    device_id: str
    scores: ScoreOut


# ── curated catalog content ────────────────────────────────────
# The write contracts for the tables the public catalog projects. Every list is
# ordered by `display_order` and every row keeps its identity across a replace,
# so a reorder never rewrites the rows the public pages already reference.


class CategoryCreate(APIModel):
    name: str = Field(min_length=1, max_length=60)
    slug: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = Field(default=None, max_length=2000)
    icon: Optional[str] = Field(default=None, max_length=50)
    color_hex: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    display_order: int = Field(default=0, ge=0, le=999)
    is_active: bool = True


class CategoryUpdate(APIModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    slug: Optional[str] = Field(default=None, max_length=80)
    description: Optional[str] = Field(default=None, max_length=2000)
    icon: Optional[str] = Field(default=None, max_length=50)
    color_hex: Optional[str] = Field(default=None, pattern=r"^#[0-9A-Fa-f]{6}$")
    display_order: Optional[int] = Field(default=None, ge=0, le=999)
    is_active: Optional[bool] = None
    # Expected revision, not a value to write (409 when someone else wrote first).
    version: Optional[int] = Field(default=None, ge=1)


class CategoryOrderRequest(APIModel):
    """Put these devices at ranks 1..n; every other member is pushed below."""

    device_ids: List[str] = Field(min_length=1, max_length=200)
    expected_version: Optional[int] = Field(default=None, ge=1)


class CategoryOrderResult(APIModel):
    category_id: str
    applied: int
    category_version: int


class CategoryMemberRemoval(APIModel):
    category_id: str
    device_id: str
    removed_rank: int
    category_version: int


class ProsConsItem(APIModel):
    # `id` present = update that row in place; absent = create a new one.
    id: Optional[str] = None
    type: Literal["pro", "con"]
    description: str = Field(min_length=1, max_length=500)
    importance: int = Field(default=3, ge=1, le=5)
    display_order: int = Field(default=0, ge=0, le=99)


class ProsConsReplace(APIModel):
    items: List[ProsConsItem] = Field(default_factory=list, max_length=40)


class FeatureItem(APIModel):
    id: Optional[str] = None
    feature_name: str = Field(min_length=1, max_length=80)
    feature_value: str = Field(min_length=1, max_length=500)
    icon: Optional[str] = Field(default=None, max_length=50)
    display_order: int = Field(default=0, ge=0, le=99)


class FeatureReplace(APIModel):
    items: List[FeatureItem] = Field(default_factory=list, max_length=40)


UssdCategory = Literal["general", "battery", "imei", "network", "display", "secret"]


class UssdCreate(APIModel):
    # Null device_id means the code applies to every device (universal).
    device_id: Optional[str] = None
    code: str = Field(min_length=2, max_length=40, pattern=r"^[0-9*#+]+$")
    description: str = Field(min_length=1, max_length=500)
    category: UssdCategory = "general"
    is_universal: bool = False


class UssdUpdate(APIModel):
    device_id: Optional[str] = None
    code: Optional[str] = Field(default=None, min_length=2, max_length=40, pattern=r"^[0-9*#+]+$")
    description: Optional[str] = Field(default=None, min_length=1, max_length=500)
    category: Optional[UssdCategory] = None
    is_universal: Optional[bool] = None


class SpecsReplace(SpecsOut):
    pass


# ── user administration ────────────────────────────────────────
# Role, active status and verification are server-controlled (Module 10 §4), so
# they are changed here and never through the profile endpoint.


class AdminUserOut(APIModel):
    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    is_verified: bool = False
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None


class AdminUserUpdate(APIModel):
    role: Optional[Literal["user", "admin", "editor"]] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
