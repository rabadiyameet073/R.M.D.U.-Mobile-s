"""Recommendation engine request/response models."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import Field, model_validator

from schemas.catalog import DeviceCard
from schemas.common import APIModel

Priority = Literal["gaming", "camera", "battery", "value", "all-rounder"]


class RecommendationRequest(APIModel):
    budget_min: float = Field(default=0, ge=0)
    budget_max: float = Field(default=200000, gt=0)
    primary_priority: Priority = "all-rounder"
    secondary_priority: Optional[Priority] = None
    preferred_os: Literal["android", "ios", "any"] = "any"
    preferred_brands: List[str] = Field(default_factory=list)
    require_five_g: bool = False
    require_nfc: bool = False
    min_ram_gb: Optional[int] = Field(default=None, ge=1, le=32)
    limit: int = Field(default=5, ge=1, le=20)
    persist: bool = False

    @model_validator(mode="after")
    def _validate_budget(self) -> "RecommendationRequest":
        if self.budget_max < self.budget_min:
            raise ValueError("budget_max must be greater than or equal to budget_min")
        if self.secondary_priority == self.primary_priority:
            self.secondary_priority = None
        return self


class RecommendationWeights(APIModel):
    performance: float
    camera: float
    battery: float
    display: float
    value: float
    build: float
    software: float


class ScoreContribution(APIModel):
    key: str
    score: float
    weight: float
    contribution: float


class ScoreBreakdown(APIModel):
    base_score: float
    penalty: float = 0
    final_score: float
    contributions: List[ScoreContribution] = Field(default_factory=list)
    notes: List[str] = Field(default_factory=list)


class RecommendationItem(APIModel):
    rank: int
    match_score: float
    reason: str
    device: DeviceCard
    breakdown: ScoreBreakdown


class RecommendationResponse(APIModel):
    mode: Literal["guest", "personal", "cached"]
    engine_version: str
    generated_at: datetime
    weights: RecommendationWeights
    budget: Dict[str, float]
    priorities: Dict[str, Optional[str]]
    items: List[RecommendationItem]
    candidates_evaluated: int = 0


class RecommendationRuleOut(APIModel):
    id: str
    priority: str
    weights: RecommendationWeights
    updated_at: Optional[datetime] = None


class PersonalRecommendationRequest(APIModel):
    limit: int = Field(default=5, ge=1, le=20)
    refresh: bool = False


class CachedRecommendationOut(APIModel):
    id: str
    match_score: float
    reason: str
    rank: int
    engine_version: str
    is_ai_generated: bool
    expires_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    device: Optional[DeviceCard] = None
