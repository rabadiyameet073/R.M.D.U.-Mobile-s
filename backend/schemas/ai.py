"""AI / RAG endpoints models."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import Field, field_validator

from schemas.catalog import DeviceCard
from schemas.common import APIModel


class AIQueryRequest(APIModel):
    query: str = Field(min_length=3, max_length=500)
    limit: int = Field(default=5, ge=1, le=10)
    include_sources: bool = True


class AISource(APIModel):
    source_type: str
    source_id: Optional[str] = None
    chunk_text: Optional[str] = None
    score: Optional[float] = None
    metadata: dict = Field(default_factory=dict)


class AIQueryResponse(APIModel):
    mode: Literal["semantic", "keyword"]
    answer: str
    devices: List[DeviceCard] = Field(default_factory=list)
    sources: List[AISource] = Field(default_factory=list)
    ai_enabled: bool = False
    generated_at: datetime
    meta: dict = Field(default_factory=dict)


class ChatSessionCreateRequest(APIModel):
    greeting: Optional[str] = None


class ChatSessionOut(APIModel):
    id: str
    session_token: str
    user_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None


class ChatMessageCreateRequest(APIModel):
    content: str = Field(min_length=1, max_length=2000)


class ChatMessageOut(APIModel):
    id: str
    session_id: str
    role: str
    content: str
    referenced_device_ids: List[str] = Field(default_factory=list)
    tokens_used: Optional[int] = None
    created_at: Optional[datetime] = None

    @field_validator("referenced_device_ids", mode="before")
    @classmethod
    def _null_list_to_empty(cls, value):
        return value or []


class ChatTurnResponse(APIModel):
    user_message: ChatMessageOut
    assistant_message: ChatMessageOut
    devices: List[DeviceCard] = Field(default_factory=list)
    sources: List[AISource] = Field(default_factory=list)
    mode: Literal["semantic", "keyword"] = "keyword"
    ai_enabled: bool = False


class EmbeddingStatus(APIModel):
    ai_enabled: bool
    device_embeddings: int
    knowledge_chunks: int
    model: str
    dimensions: int
    meta: dict[str, Any] = Field(default_factory=dict)
