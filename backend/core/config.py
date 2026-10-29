"""Central configuration for the RMDU Mobiles FastAPI service.

Values are read from environment variables or a .env file (backend/.env,
then the monorepo root .env as a fallback).
"""

from functools import lru_cache
from typing import List

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # ── Application ─────────────────────────────────────────────
    app_env: str = Field("development", validation_alias="APP_ENV")
    app_host: str = Field("127.0.0.1", validation_alias="APP_HOST")
    app_port: int = Field(8000, validation_alias="APP_PORT")
    api_prefix: str = "/api/v1"
    cors_origins: str = Field(
        "http://localhost:5100,http://127.0.0.1:5100,http://localhost:5173,http://127.0.0.1:5173",
        validation_alias="CORS_ORIGINS",
    )

    # ── Supabase (service tier: server-side only) ───────────────
    supabase_url: str = Field(
        "https://lyoupcrbcloxjpgstzqh.supabase.co",
        validation_alias="SUPABASE_URL",
    )
    supabase_secret_key: str = Field(
        "",
        validation_alias=AliasChoices("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    )
    supabase_publishable_key: str = Field(
        "",
        validation_alias=AliasChoices("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY"),
    )

    # New Supabase secret keys are rejected when the User-Agent looks like a
    # browser, so every server call must present a non-browser identity.
    server_user_agent: str = "rmdu-backend/1.0"

    # ── Security ────────────────────────────────────────────────
    admin_api_key: str = Field("", validation_alias="ADMIN_API_KEY")
    request_timeout: float = 20.0
    max_page_size: int = Field(100, validation_alias="MAX_PAGE_SIZE")

    # ── Request hardening (Module 11 §11-§13, Module 12 §6.2) ────
    # Per-process token buckets. Cross-replica budgets need shared state, so
    # the limiter is a fast first line of defence, never a correctness control.
    rate_limit_enabled: bool = Field(True, validation_alias="RATE_LIMIT_ENABLED")
    # Comma-separated "<METHOD> <path prefix>" entries that must carry an
    # Idempotency-Key. Empty keeps the header optional but honoured everywhere.
    idempotency_required: str = Field("", validation_alias="IDEMPOTENCY_REQUIRED_PATHS")
    # Kill switches: one per dependency, each with documented degraded behavior.
    feature_ai: bool = Field(True, validation_alias="FEATURE_AI")
    feature_reviews: bool = Field(True, validation_alias="FEATURE_REVIEWS")
    feature_shopkeeper_cards: bool = Field(True, validation_alias="FEATURE_SHOPKEEPER_CARDS")
    feature_price_alerts: bool = Field(True, validation_alias="FEATURE_PRICE_ALERTS")
    feature_admin_writes: bool = Field(True, validation_alias="FEATURE_ADMIN_WRITES")

    # ── AI / RAG ────────────────────────────────────────────────
    openai_api_key: str = Field("", validation_alias="OPENAI_API_KEY")
    embedding_model: str = Field(
        "text-embedding-3-small", validation_alias="EMBEDDING_MODEL"
    )
    embedding_dimensions: int = Field(1536, validation_alias="EMBEDDING_DIMENSIONS")

    # ── Derived helpers ─────────────────────────────────────────
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def rest_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/rest/v1"

    @property
    def auth_url(self) -> str:
        return f"{self.supabase_url.rstrip('/')}/auth/v1"

    @property
    def ai_enabled(self) -> bool:
        key = self.openai_api_key.strip()
        return key.startswith("sk-") and "your-openai" not in key

    @property
    def admin_enabled(self) -> bool:
        return bool(self.admin_api_key.strip())

    @property
    def idempotency_required_rules(self) -> List[tuple]:
        """Parse `IDEMPOTENCY_REQUIRED_PATHS` into (method, path-prefix) pairs."""
        rules: List[tuple] = []
        for entry in self.idempotency_required.split(","):
            entry = entry.strip()
            if not entry:
                continue
            method, _, prefix = entry.partition(" ")
            if not prefix:
                method, prefix = "POST", method
            rules.append((method.strip().upper(), prefix.strip()))
        return rules


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
