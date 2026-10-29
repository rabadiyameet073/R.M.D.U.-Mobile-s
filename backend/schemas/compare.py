"""Comparison models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import Field, field_validator

from schemas.catalog import DeviceCard
from schemas.common import APIModel


class CompareRequest(APIModel):
    devices: List[str] = Field(min_length=2, max_length=4)
    priority: Literal["gaming", "camera", "battery", "value", "all-rounder"] = "all-rounder"
    save_session: bool = True

    @field_validator("devices")
    @classmethod
    def _dedupe(cls, value: List[str]) -> List[str]:
        seen: List[str] = []
        for item in value:
            cleaned = item.strip()
            if cleaned and cleaned not in seen:
                seen.append(cleaned)
        if len(seen) < 2:
            raise ValueError("provide at least two distinct devices")
        return seen


class ComparisonValue(APIModel):
    device_id: str
    value: Any = None
    display: str = "—"
    is_winner: bool = False
    is_present: bool = False


class ComparisonRow(APIModel):
    key: str
    label: str
    group: str
    unit: Optional[str] = None
    higher_is_better: Optional[bool] = None
    winner_device_id: Optional[str] = None
    values: List[ComparisonValue] = Field(default_factory=list)


class ComparisonScoreboard(APIModel):
    device_id: str
    overall_score: Optional[float] = None
    weighted_score: float = 0
    is_winner: bool = False


class ComparisonResponse(APIModel):
    session_id: Optional[str] = None
    priority: str
    devices: List[DeviceCard] = Field(default_factory=list)
    rows: List[ComparisonRow] = Field(default_factory=list)
    scoreboard: List[ComparisonScoreboard] = Field(default_factory=list)
    winner_device_id: Optional[str] = None
    verdict: str = ""
    generated_at: datetime
    meta: Dict[str, Any] = Field(default_factory=dict)


class ComparisonSessionOut(APIModel):
    id: str
    user_id: Optional[str] = None
    device_ids: List[str] = Field(default_factory=list)
    winner_device_id: Optional[str] = None
    created_at: Optional[datetime] = None
    devices: List[DeviceCard] = Field(default_factory=list)


class SavedComparisonResponse(ComparisonResponse):
    """A stored session replayed through the current engine.

    `saved_at` is when the comparison was first run; `generated_at` and the
    scoreboard are recomputed now, so a re-opened link reflects the weights,
    scores and prices the database holds today.
    """

    saved_at: Optional[datetime] = None
    saved_winner_device_id: Optional[str] = None
