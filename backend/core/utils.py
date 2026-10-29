"""Small shared helpers: pagination, filter escaping, slug generation."""

from __future__ import annotations

import re
import unicodedata
import uuid
from typing import Iterable, Optional

_UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)
# Characters that carry meaning inside PostgREST filter expressions.
_UNSAFE_FILTER_CHARS = re.compile(r"[,()*%\\\"]")


def is_uuid(value: str) -> bool:
    return bool(_UUID_RE.match(value or ""))


def identifier_filters(identifier: str) -> dict:
    """Resolve a slug-or-UUID path segment into a PostgREST filter."""
    return {"id": f"eq.{identifier}"} if is_uuid(identifier) else {"slug": f"eq.{identifier}"}


def offset_for(page: int, page_size: int) -> int:
    return max(page - 1, 0) * page_size


def pagination_meta(page: int, page_size: int, total: int) -> dict:
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return {
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
        "has_next": page < total_pages,
    }


def clean_search_term(term: Optional[str], *, max_length: int = 80) -> str:
    """Strip characters that would break a PostgREST ilike/or expression."""
    if not term:
        return ""
    cleaned = _UNSAFE_FILTER_CHARS.sub(" ", term).strip()
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned[:max_length]


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return slug or f"device-{uuid.uuid4().hex[:8]}"


def in_filter(values: Iterable[str]) -> str:
    """Build a PostgREST `in.(...)` expression with quoted values."""
    quoted = [f'"{value}"' for value in values if value]
    return f"in.({','.join(quoted)})"


def as_float(value) -> Optional[float]:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def as_int(value) -> Optional[int]:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
