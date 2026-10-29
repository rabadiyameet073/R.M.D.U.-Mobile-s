"""Async data-access gateway to Supabase PostgREST.

The backend uses the service-role credential server-side only. Every request
is parameterized (PostgREST query params), no SQL string concatenation ever
happens here, and all calls present a non-browser User-Agent because new
Supabase secret keys are refused when the client looks like a browser.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import httpx

from core.config import settings


class DataAccessError(Exception):
    """Raised when PostgREST/Auth responds with an error status."""

    def __init__(self, status_code: int, message: str, payload: Optional[dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.payload = payload or {}


class QueryResult:
    def __init__(self, rows: List[dict], total: Optional[int] = None):
        self.rows = rows
        self.total = total


class SupabaseGateway:
    """Thin, typed wrapper over PostgREST + GoTrue."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            if not settings.supabase_secret_key:
                raise DataAccessError(
                    500,
                    "SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY is not configured",
                )
            self._client = httpx.AsyncClient(
                timeout=settings.request_timeout,
                headers={
                    "apikey": settings.supabase_secret_key,
                    "Authorization": f"Bearer {settings.supabase_secret_key}",
                    "User-Agent": settings.server_user_agent,
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    # ── internals ───────────────────────────────────────────────
    @staticmethod
    def _parse_error(response: httpx.Response) -> DataAccessError:
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text}
        if isinstance(payload, list) and payload:
            payload = payload[0]
        message = (payload or {}).get("message") or response.reason_phrase
        return DataAccessError(response.status_code, str(message), payload if isinstance(payload, dict) else {})

    @staticmethod
    def _parse_count(response: httpx.Response) -> Optional[int]:
        content_range = response.headers.get("content-range", "")
        if "/" in content_range:
            total = content_range.rsplit("/", 1)[-1]
            return int(total) if total.isdigit() else None
        return None

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[dict] = None,
        json: Any = None,
        prefer: Optional[str] = None,
        count: bool = False,
    ) -> httpx.Response:
        headers: Dict[str, str] = {}
        if prefer:
            headers["Prefer"] = prefer
        if count:
            headers["Prefer"] = f"{headers.get('Prefer', '') + ',' if headers.get('Prefer') else ''}count=exact"

        response = await self.client.request(
            method,
            f"{settings.rest_url}{path}",
            params=params,
            json=json,
            headers=headers,
        )
        if response.status_code >= 400:
            raise self._parse_error(response)
        return response

    # ── queries ─────────────────────────────────────────────────
    async def select(
        self,
        table: str,
        *,
        columns: str = "*",
        filters: Optional[Dict[str, str]] = None,
        order: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        count: bool = False,
    ) -> QueryResult:
        params: Dict[str, Any] = {"select": columns}
        params.update(filters or {})
        if order:
            params["order"] = order
        if limit is not None:
            params["limit"] = limit
        if offset:
            params["offset"] = offset
        response = await self._request("GET", f"/{table}", params=params, count=count)
        return QueryResult(response.json(), self._parse_count(response) if count else None)

    async def select_one(self, table: str, **kwargs: Any) -> Optional[dict]:
        kwargs["limit"] = 1
        result = await self.select(table, **kwargs)
        return result.rows[0] if result.rows else None

    async def insert(
        self,
        table: str,
        rows: Any,
        *,
        columns: str = "*",
        upsert: bool = False,
        on_conflict: Optional[str] = None,
    ) -> List[dict]:
        params = {"select": columns}
        if on_conflict:
            params["on_conflict"] = on_conflict
        prefer = "return=representation,resolution=merge-duplicates" if upsert else "return=representation"
        response = await self._request("POST", f"/{table}", params=params, json=rows, prefer=prefer)
        return response.json()

    async def update(
        self,
        table: str,
        filters: Dict[str, str],
        values: dict,
        *,
        columns: str = "*",
    ) -> List[dict]:
        params = {"select": columns, **filters}
        response = await self._request(
            "PATCH", f"/{table}", params=params, json=values, prefer="return=representation"
        )
        return response.json()

    async def delete(self, table: str, filters: Dict[str, str]) -> List[dict]:
        params = {"select": "id", **filters}
        response = await self._request(
            "DELETE", f"/{table}", params=params, prefer="return=representation"
        )
        return response.json()

    async def rpc(self, function: str, payload: Optional[dict] = None) -> Any:
        response = await self._request("POST", f"/rpc/{function}", json=payload or {})
        return response.json()

    # ── auth ────────────────────────────────────────────────────
    async def get_auth_user(self, access_token: str) -> dict:
        """Validate a user access token against GoTrue (works with any JWT alg)."""
        if not settings.supabase_publishable_key:
            raise DataAccessError(500, "SUPABASE_PUBLISHABLE_KEY / SUPABASE_ANON_KEY is not configured")
        async with httpx.AsyncClient(timeout=settings.request_timeout) as client:
            response = await client.get(
                f"{settings.auth_url}/user",
                headers={
                    "apikey": settings.supabase_publishable_key,
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": settings.server_user_agent,
                },
            )
        if response.status_code != 200:
            raise DataAccessError(401, "Invalid or expired access token")
        return response.json()


db = SupabaseGateway()
