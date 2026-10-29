"""Grounded AI endpoints: semantic search, RAG answers and chat sessions."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status

from core.config import settings
from core.db import db
from core.deps import CurrentUser, get_current_user, get_optional_user, require_feature
from core.errors import APIError
from core.ratelimit import AI_QUERY, CHAT_SESSION
from core.utils import offset_for, pagination_meta
from schemas.ai import (
    AIQueryRequest,
    AIQueryResponse,
    ChatMessageCreateRequest,
    ChatMessageOut,
    ChatSessionCreateRequest,
    ChatSessionOut,
    ChatTurnResponse,
    EmbeddingStatus,
)
from schemas.common import Page
from services.vector_search import (
    answer_chat_turn,
    answer_query,
    rag_chunks,
    semantic_cards,
)

router = APIRouter(prefix="/ai", tags=["ai"])

SESSION_COLUMNS = "id,session_token,user_id,is_active,created_at,last_message_at"
MESSAGE_COLUMNS = (
    "id,session_id,role,content,referenced_device_ids,tokens_used,created_at"
)


def _sources(chunks: List[dict]) -> List[dict]:
    return [
        {
            "source_type": chunk.get("source_type") or "guide",
            "source_id": chunk.get("source_id"),
            "chunk_text": chunk.get("chunk_text"),
            "score": chunk.get("score"),
            "metadata": chunk.get("metadata") or {},
        }
        for chunk in chunks
    ]


async def _load_session(token: str, user: Optional[CurrentUser]) -> dict:
    session = await db.select_one(
        "ai_chat_sessions", columns=SESSION_COLUMNS, filters={"session_token": f"eq.{token}"}
    )
    if not session:
        raise APIError(404, "chat_session_not_found", "No chat session matches that token.")
    if session.get("user_id") and (user is None or user.id != session["user_id"]):
        raise APIError(403, "chat_session_forbidden", "This chat session belongs to another user.")
    return session


@router.get("/status", response_model=EmbeddingStatus)
async def ai_status() -> dict:
    device_embeddings, chunks = await _count_pair()
    return {
        "ai_enabled": settings.ai_enabled,
        "device_embeddings": device_embeddings,
        "knowledge_chunks": chunks,
        "model": settings.embedding_model,
        "dimensions": settings.embedding_dimensions,
        "meta": {
            "mode": "semantic" if settings.ai_enabled else "keyword",
            "note": None
            if settings.ai_enabled
            else "OPENAI_API_KEY is not configured; endpoints fall back to keyword search.",
        },
    }


async def _count_pair() -> tuple:
    embeddings = await db.select(
        "device_embeddings", columns="device_id", limit=1, count=True
    )
    chunks = await db.select(
        "rag_knowledge_chunks", columns="id", limit=1, count=True
    )
    return embeddings.total or 0, chunks.total or 0


@router.post(
    "/query",
    response_model=AIQueryResponse,
    dependencies=[Depends(AI_QUERY), Depends(require_feature("feature_ai"))],
    summary="Ask a catalog question",
)
async def ai_query(payload: AIQueryRequest) -> dict:
    cards, mode = await semantic_cards(payload.query, payload.limit)
    chunks = await rag_chunks(payload.query) if payload.include_sources else []
    answer, used_llm = await answer_query(payload.query, cards, chunks)
    return {
        "mode": mode,
        "answer": answer,
        "devices": cards,
        "sources": _sources(chunks) if payload.include_sources else [],
        "ai_enabled": settings.ai_enabled,
        "generated_at": datetime.now(timezone.utc),
        "meta": {"used_llm": used_llm, "device_matches": len(cards)},
    }


@router.post(
    "/chat/sessions",
    response_model=ChatSessionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(CHAT_SESSION), Depends(require_feature("feature_ai"))],
    summary="Start a chat session",
)
async def create_chat_session(
    payload: ChatSessionCreateRequest,
    user: Optional[CurrentUser] = Depends(get_optional_user),
) -> dict:
    rows = await db.insert(
        "ai_chat_sessions",
        {"user_id": user.id if user else None},
        columns=SESSION_COLUMNS,
    )
    session = rows[0]
    if payload.greeting:
        await db.insert(
            "ai_chat_messages",
            {
                "session_id": session["id"],
                "role": "assistant",
                "content": payload.greeting,
            },
        )
    return session


@router.get(
    "/chat/sessions",
    response_model=Page[ChatSessionOut],
    summary="My chat sessions, newest activity first",
)
async def list_chat_sessions(
    active_only: bool = Query(default=False, description="Hide sessions the user closed"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Session history for the signed-in account.

    Anonymous sessions belong to nobody, so they are intentionally absent here:
    a token holder can still read a single anonymous session, but no listing
    endpoint will ever enumerate other people's conversations.
    """
    filters = {"user_id": f"eq.{user.id}"}
    if active_only:
        filters["is_active"] = "is.true"
    result = await db.select(
        "ai_chat_sessions",
        columns=SESSION_COLUMNS,
        filters=filters,
        order="last_message_at.desc.nullslast,created_at.desc",
        limit=page_size,
        offset=offset_for(page, page_size),
        count=True,
    )
    return {
        "items": result.rows,
        "meta": pagination_meta(page, page_size, result.total or 0),
    }


@router.get("/chat/sessions/{token}", response_model=ChatSessionOut)
async def get_chat_session(
    token: str, user: Optional[CurrentUser] = Depends(get_optional_user)
) -> dict:
    return await _load_session(token, user)


@router.get("/chat/sessions/{token}/messages", response_model=List[ChatMessageOut])
async def list_chat_messages(
    token: str, user: Optional[CurrentUser] = Depends(get_optional_user)
) -> List[dict]:
    session = await _load_session(token, user)
    result = await db.select(
        "ai_chat_messages",
        columns=MESSAGE_COLUMNS,
        filters={"session_id": f"eq.{session['id']}"},
        order="created_at.asc",
        limit=100,
    )
    return result.rows


@router.delete(
    "/chat/sessions/{token}",
    response_model=ChatSessionOut,
    dependencies=[Depends(CHAT_SESSION)],
)
async def close_chat_session(
    token: str, user: Optional[CurrentUser] = Depends(get_optional_user)
) -> dict:
    session = await _load_session(token, user)
    updated = await db.update(
        "ai_chat_sessions",
        {"id": f"eq.{session['id']}"},
        {"is_active": False},
        columns=SESSION_COLUMNS,
    )
    return updated[0]


@router.post(
    "/chat/sessions/{token}/messages",
    response_model=ChatTurnResponse,
    dependencies=[Depends(AI_QUERY), Depends(require_feature("feature_ai"))],
    summary="Send a message and get a grounded reply",
)
async def send_chat_message(
    token: str,
    payload: ChatMessageCreateRequest,
    user: Optional[CurrentUser] = Depends(get_optional_user),
) -> dict:
    session = await _load_session(token, user)
    if not session.get("is_active", True):
        raise APIError(409, "chat_session_closed", "This chat session is closed.")

    history = await db.select(
        "ai_chat_messages",
        columns="role,content",
        filters={"session_id": f"eq.{session['id']}"},
        order="created_at.asc",
        limit=20,
    )

    # Retrieve before writing so a data-layer failure cannot leave an
    # unanswered user message behind.
    cards, mode = await semantic_cards(payload.content, 5)
    chunks = await rag_chunks(payload.content)
    answer, used_llm = await answer_chat_turn(history.rows, payload.content, cards, chunks)

    user_message = (
        await db.insert(
            "ai_chat_messages",
            {
                "session_id": session["id"],
                "role": "user",
                "content": payload.content,
            },
            columns=MESSAGE_COLUMNS,
        )
    )[0]

    assistant_message = (
        await db.insert(
            "ai_chat_messages",
            {
                "session_id": session["id"],
                "role": "assistant",
                "content": answer,
                "referenced_device_ids": [card["id"] for card in cards],
            },
            columns=MESSAGE_COLUMNS,
        )
    )[0]

    await db.update(
        "ai_chat_sessions",
        {"id": f"eq.{session['id']}"},
        {"last_message_at": datetime.now(timezone.utc).isoformat()},
        columns="id",
    )

    return {
        "user_message": user_message,
        "assistant_message": assistant_message,
        "devices": cards,
        "sources": _sources(chunks),
        "mode": mode,
        "ai_enabled": settings.ai_enabled,
    }
