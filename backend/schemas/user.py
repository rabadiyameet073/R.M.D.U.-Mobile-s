"""Authenticated user surface models."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import Field, model_validator

from schemas.catalog import DeviceCard
from schemas.common import APIModel

OSChoice = Literal["android", "ios", "any"]
PriorityChoice = Literal["gaming", "camera", "battery", "value", "all-rounder"]


class UserOut(APIModel):
    id: str
    name: str
    email: str
    avatar_url: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    is_verified: bool = False
    auth_provider: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None


class ProfileOut(APIModel):
    user_id: str
    current_device_id: Optional[str] = None
    budget_min: float = 0
    budget_max: float = 999999
    primary_priority: PriorityChoice = "all-rounder"
    secondary_priority: Optional[PriorityChoice] = None
    preferred_os: OSChoice = "any"
    preferred_brands: List[str] = Field(default_factory=list)
    onboarding_done: bool = False
    # Optimistic-concurrency revision; echo it back on PATCH /me/profile.
    version: int = 1
    updated_at: Optional[datetime] = None


class ProfileUpdate(APIModel):
    current_device_id: Optional[str] = None
    budget_min: Optional[float] = Field(default=None, ge=0)
    budget_max: Optional[float] = Field(default=None, gt=0)
    primary_priority: Optional[PriorityChoice] = None
    secondary_priority: Optional[PriorityChoice] = None
    preferred_os: Optional[OSChoice] = None
    preferred_brands: Optional[List[str]] = None
    onboarding_done: Optional[bool] = None
    # Expected revision, not a value to write (409 when another tab wrote first).
    version: Optional[int] = Field(default=None, ge=1)

    @model_validator(mode="after")
    def _validate_budget_pair(self) -> "ProfileUpdate":
        if (
            self.budget_min is not None
            and self.budget_max is not None
            and self.budget_max < self.budget_min
        ):
            raise ValueError("budget_max must be greater than or equal to budget_min")
        return self


class UserStats(APIModel):
    phone_history: int = 0
    price_alerts: int = 0
    comparisons: int = 0
    shopkeeper_cards: int = 0
    reviews: int = 0
    recommendations: int = 0


class MeOut(APIModel):
    user: UserOut
    profile: ProfileOut
    stats: UserStats


class PhoneHistoryCreate(APIModel):
    device_id: str
    usage_years: Optional[float] = Field(default=None, ge=0, le=30)
    review: Optional[str] = Field(default=None, max_length=2000)


class PhoneHistoryOut(APIModel):
    id: str
    device_id: str
    usage_years: Optional[float] = None
    review: Optional[str] = None
    added_at: Optional[datetime] = None
    device: Optional[DeviceCard] = None


class PriceAlertCreate(APIModel):
    device_id: str
    target_price: float = Field(gt=0)


class PriceAlertOut(APIModel):
    id: str
    device_id: str
    target_price: float
    is_triggered: bool = False
    triggered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    device: Optional[DeviceCard] = None
    price_gap: Optional[float] = None


class ShopkeeperCardCreate(APIModel):
    device_id: str
    reason_summary: str = Field(min_length=3, max_length=500)
    avoid_summary: Optional[str] = Field(default=None, max_length=500)
    budget_note: Optional[str] = Field(default=None, max_length=200)
    expires_in_days: int = Field(default=7, ge=1, le=60)


class ShopkeeperCardOut(APIModel):
    id: str
    user_id: str
    device_id: str
    short_code: str
    reason_summary: str
    avoid_summary: Optional[str] = None
    budget_note: Optional[str] = None
    expires_at: Optional[datetime] = None
    view_count: int = 0
    created_at: Optional[datetime] = None
    device: Optional[DeviceCard] = None
    is_expired: bool = False


class PublicShopkeeperCardOut(ShopkeeperCardOut):
    user_id: Optional[str] = None  # hidden on the public lookup


class HistoryFeedItem(APIModel):
    id: str
    type: str
    title: str
    device_id: Optional[str] = None
    created_at: Optional[datetime] = None
    detail: Dict = Field(default_factory=dict)


class HistoryFeed(APIModel):
    items: List[HistoryFeedItem] = Field(default_factory=list)
