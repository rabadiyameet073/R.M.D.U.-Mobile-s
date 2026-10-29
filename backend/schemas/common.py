"""Shared response envelopes."""

from __future__ import annotations

from typing import Dict, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class APIModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class PaginationMeta(APIModel):
    page: int
    page_size: int
    total: int
    total_pages: int
    has_next: bool


class Page(APIModel, Generic[T]):
    items: List[T]
    meta: PaginationMeta


class Message(APIModel):
    message: str
    detail: Optional[str] = None


class ErrorBody(APIModel):
    code: str
    message: str
    details: Optional[dict] = None


class ErrorEnvelope(APIModel):
    error: ErrorBody


class HealthOut(APIModel):
    status: str
    version: str
    environment: str
    database: str
    latency_ms: Optional[float] = None
    detail: Optional[str] = None


class MetaOut(APIModel):
    """Bootstrap payload so the SPA can render dynamic navigation/filters."""

    version: str
    environment: str
    api_prefix: str
    categories: List[dict] = Field(default_factory=list)
    brands: List[dict] = Field(default_factory=list)
    priorities: List[dict] = Field(default_factory=list)
    sort_options: List[str] = Field(default_factory=list)
    ai_enabled: bool = False
    admin_enabled: bool = False
    # Kill switches the SPA must honour: hide a surface instead of calling it.
    features: Dict[str, bool] = Field(default_factory=dict)
