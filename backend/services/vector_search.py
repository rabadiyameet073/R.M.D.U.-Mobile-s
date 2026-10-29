"""Semantic retrieval + grounded answer generation.

Embeddings live in pgvector, but PostgREST cannot `ORDER BY` a vector column,
so similarity is computed in-process over the embedding rows (catalog scale).
When OpenAI is not configured the module degrades to deterministic keyword
search and template answers — endpoints stay available either way.
"""

from __future__ import annotations

import math
import os
from typing import Any, List, Optional, Tuple

import httpx

from core.config import settings
from core.db import db
from core.utils import clean_search_term
from services.catalog_service import cards_by_ids

OPENAI_BASE = "https://api.openai.com/v1"
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
MAX_CONTEXT_DEVICES = 6
MAX_CONTEXT_CHUNKS = 6


def parse_vector(raw: Any) -> Optional[List[float]]:
    if raw is None:
        return None
    if isinstance(raw, list):
        return [float(value) for value in raw]
    if isinstance(raw, str):
        cleaned = raw.strip().strip("[]")
        if not cleaned:
            return None
        try:
            return [float(part) for part in cleaned.split(",") if part.strip()]
        except ValueError:
            return None
    return None


def cosine_similarity(left: List[float], right: List[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    norm_left = math.sqrt(sum(a * a for a in left))
    norm_right = math.sqrt(sum(b * b for b in right))
    if norm_left == 0 or norm_right == 0:
        return 0.0
    return dot / (norm_left * norm_right)


async def embed_text(text: str) -> Optional[List[float]]:
    if not settings.ai_enabled:
        return None
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OPENAI_BASE}/embeddings",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "User-Agent": settings.server_user_agent,
                },
                json={
                    "model": settings.embedding_model,
                    "input": text,
                    "dimensions": settings.embedding_dimensions,
                },
            )
        if response.status_code != 200:
            return None
        data = response.json().get("data") or []
        return data[0].get("embedding") if data else None
    except httpx.HTTPError:
        return None


async def _openai_chat(
    messages: List[dict], *, max_tokens: int = 600, temperature: float = 0.3
) -> Optional[str]:
    if not settings.ai_enabled:
        return None
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{OPENAI_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "User-Agent": settings.server_user_agent,
                },
                json={
                    "model": CHAT_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
        if response.status_code != 200:
            return None
        choices = response.json().get("choices") or []
        if not choices:
            return None
        return (choices[0].get("message") or {}).get("content")
    except httpx.HTTPError:
        return None


async def _keyword_device_ids(query: str, limit: int) -> List[str]:
    term = clean_search_term(query, max_length=60)
    if not term:
        return []
    result = await db.select(
        "devices",
        columns="id",
        filters={
            "is_active": "is.true",
            "or": f"(name.ilike.*{term}*,slug.ilike.*{term}*)",
        },
        order="created_at.desc",
        limit=limit,
    )
    return [row["id"] for row in result.rows]


async def _fallback_device_ids(limit: int) -> List[str]:
    result = await db.select(
        "devices",
        columns="id,device_scores(overall_score)",
        filters={"is_active": "is.true"},
        order="device_scores(overall_score).desc.nullslast",
        limit=limit,
    )
    return [row["id"] for row in result.rows]


async def semantic_device_ids(query: str, limit: int) -> Tuple[List[str], str]:
    """Return (device_ids, mode). Semantic when embeddings + AI are available."""
    query_vector = await embed_text(query)
    if query_vector:
        rows = await db.select(
            "device_embeddings",
            columns="device_id,embedding",
            limit=1000,
        )
        scored: List[Tuple[str, float]] = []
        for row in rows.rows:
            vector = parse_vector(row.get("embedding"))
            if not vector:
                continue
            scored.append((row["device_id"], cosine_similarity(query_vector, vector)))
        if scored:
            scored.sort(key=lambda pair: pair[1], reverse=True)
            return [device_id for device_id, _ in scored[:limit]], "semantic"

    ids = await _keyword_device_ids(query, limit)
    if ids:
        return ids, "keyword"
    return await _fallback_device_ids(limit), "keyword"


async def semantic_cards(query: str, limit: int) -> Tuple[List[dict], str]:
    ids, mode = await semantic_device_ids(query, limit)
    mapping = await cards_by_ids(ids)
    return [mapping[device_id] for device_id in ids if device_id in mapping], mode


async def rag_chunks(query: str, limit: int = MAX_CONTEXT_CHUNKS) -> List[dict]:
    query_vector = await embed_text(query)
    if not query_vector:
        return []
    rows = await db.select(
        "rag_knowledge_chunks",
        columns="id,source_type,source_id,chunk_text,metadata,embedding",
        limit=500,
    )
    scored: List[dict] = []
    for row in rows.rows:
        vector = parse_vector(row.get("embedding"))
        if not vector:
            continue
        scored.append(
            {
                "source_type": row.get("source_type"),
                "source_id": row.get("source_id"),
                "chunk_text": row.get("chunk_text"),
                "metadata": row.get("metadata") or {},
                "score": round(cosine_similarity(query_vector, vector), 4),
            }
        )
    scored.sort(key=lambda item: item["score"], reverse=True)
    return [item for item in scored[:limit] if item["score"] > 0.2]


def _device_fact_line(card: dict) -> str:
    specs = card.get("specs") or {}
    scores = card.get("scores") or {}
    parts = [
        f"{card['name']} by {(card.get('brand') or {}).get('name', 'unknown brand')}",
        f"₹{float(card.get('price') or 0):,.0f}",
    ]
    if scores.get("overall_score") is not None:
        parts.append(f"overall {float(scores['overall_score']):.1f}/100")
    if specs.get("processor_name"):
        parts.append(str(specs["processor_name"]))
    if specs.get("battery_mah"):
        parts.append(f"{float(specs['battery_mah']):.0f} mAh")
    if specs.get("camera_primary_mp"):
        parts.append(f"{float(specs['camera_primary_mp']):g} MP main camera")
    return " — ".join(parts)


def template_answer(query: str, cards: List[dict], mode: str) -> str:
    if not cards:
        return (
            f"I could not find matching phones for “{query}” in the RMDU catalog yet. "
            "The catalog is still being stocked, so try a broader query or browse a category."
        )
    lines = [f"Top RMDU matches for “{query}”:"]
    for index, card in enumerate(cards[:MAX_CONTEXT_DEVICES], start=1):
        lines.append(f"{index}. {_device_fact_line(card)}")
    lines.append(
        "These picks are ranked from live catalog scores and pricing. "
        "Ask about budget, gaming, camera or battery to narrow it further."
    )
    return "\n".join(lines)


def _context_block(cards: List[dict], chunks: List[dict]) -> str:
    lines = ["CATALOG FACTS:"]
    for card in cards[:MAX_CONTEXT_DEVICES]:
        lines.append(f"- {_device_fact_line(card)}")
    if chunks:
        lines.append("KNOWLEDGE CHUNKS:")
        for chunk in chunks[:MAX_CONTEXT_CHUNKS]:
            lines.append(f"- ({chunk['source_type']}) {chunk['chunk_text']}")
    return "\n".join(lines)


SYSTEM_PROMPT = (
    "You are RMDU Mobiles' phone advisor for the Indian market. Answer only from the "
    "provided catalog facts and knowledge chunks. Be concise, practical, and price-aware. "
    "Never invent specifications or prices. If the data does not cover the question, say so "
    "and suggest what the user can browse instead."
)


async def answer_query(query: str, cards: List[dict], chunks: List[dict]) -> Tuple[str, bool]:
    """Return (answer, used_llm)."""
    if settings.ai_enabled:
        content = _context_block(cards, chunks)
        reply = await _openai_chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"{content}\n\nUSER QUESTION: {query}",
                },
            ]
        )
        if reply:
            return reply.strip(), True
    return template_answer(query, cards, "keyword"), False


async def answer_chat_turn(
    history: List[dict], query: str, cards: List[dict], chunks: List[dict]
) -> Tuple[str, bool]:
    if settings.ai_enabled:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for message in history[-8:]:
            if message.get("role") in ("user", "assistant"):
                messages.append({"role": message["role"], "content": message["content"]})
        messages.append(
            {
                "role": "user",
                "content": f"{_context_block(cards, chunks)}\n\nUSER QUESTION: {query}",
            }
        )
        reply = await _openai_chat(messages)
        if reply:
            return reply.strip(), True
    return template_answer(query, cards, "keyword"), False
