"""Outbound transport for the AI provider.

Kept beside `core/db.py` for the same reason that module owns PostgREST: a
service decides *what* to ask, this module decides *how* the request travels —
credentials, timeouts, user agent and the failure contract. Every call returns
`None` instead of raising, so an unreachable provider degrades the answer to
keyword search rather than failing the request.

Only this module and `core/db.py` are allowed to open a network connection;
`scripts/audit_contracts.py` enforces that.
"""

from __future__ import annotations

import logging
import os
from typing import Any, List, Optional

import httpx

from core.config import settings

OPENAI_BASE = "https://api.openai.com/v1"
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
EMBED_TIMEOUT_SECONDS = 30.0
CHAT_TIMEOUT_SECONDS = 45.0

logger = logging.getLogger("rmdu.ai")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "User-Agent": settings.server_user_agent,
    }


async def embed_text(text: str) -> Optional[List[float]]:
    """One embedding vector, or `None` when AI is disabled or unreachable."""
    if not settings.ai_enabled:
        return None
    try:
        async with httpx.AsyncClient(timeout=EMBED_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{OPENAI_BASE}/embeddings",
                headers=_headers(),
                json={
                    "model": settings.embedding_model,
                    "input": text,
                    "dimensions": settings.embedding_dimensions,
                },
            )
    except httpx.HTTPError as exc:
        logger.warning("embedding request failed: %s", exc)
        return None
    if response.status_code != 200:
        logger.warning("embedding request answered HTTP %s", response.status_code)
        return None
    try:
        data = response.json().get("data") or []
    except ValueError:
        logger.warning("embedding response was not JSON")
        return None
    return data[0].get("embedding") if data else None


async def chat_completion(
    messages: List[dict[str, Any]], *, max_tokens: int = 600, temperature: float = 0.3
) -> Optional[str]:
    """One chat completion, or `None` when AI is disabled or unreachable."""
    if not settings.ai_enabled:
        return None
    try:
        async with httpx.AsyncClient(timeout=CHAT_TIMEOUT_SECONDS) as client:
            response = await client.post(
                f"{OPENAI_BASE}/chat/completions",
                headers=_headers(),
                json={
                    "model": CHAT_MODEL,
                    "messages": messages,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                },
            )
    except httpx.HTTPError as exc:
        logger.warning("chat completion failed: %s", exc)
        return None
    if response.status_code != 200:
        logger.warning("chat completion answered HTTP %s", response.status_code)
        return None
    try:
        choices = response.json().get("choices") or []
    except ValueError:
        logger.warning("chat completion response was not JSON")
        return None
    if not choices:
        return None
    return (choices[0].get("message") or {}).get("content")
