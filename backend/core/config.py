"""Central configuration for the RMDU Mobiles FastAPI service.

Values are read from environment variables or a .env file (backend/.env,
then the monorepo root .env as a fallback).
"""

from functools import lru_cache
from typing import List, Optional

from pydantic import AliasChoices, Field, model_validator
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

    # ── Data-plane write lock ───────────────────────────────────
    # One switch that stops every write the backend can issue without touching
    # the database: reads keep working, and each INSERT/UPDATE/DELETE/RPC is
    # refused before the request leaves the process. Set it while the database
    # is under maintenance or review.
    db_read_only: bool = Field(False, validation_alias="DB_READ_ONLY")

    # ── Security ────────────────────────────────────────────────
    admin_api_key: str = Field("", validation_alias="ADMIN_API_KEY")
    # Optional second gate: comma-separated IPs/CIDRs allowed to reach /admin.
    # Empty means "any caller that holds the key" (behind a proxy this is only
    # as good as the proxy, so production should set it).
    admin_ip_allowlist: str = Field("", validation_alias="ADMIN_IP_ALLOWLIST")
    # Brute-force brake for the admin key: after this many failures from one
    # caller inside the window, further attempts answer 429 until it expires.
    admin_max_failed_attempts: int = Field(10, validation_alias="ADMIN_MAX_FAILED_ATTEMPTS")
    admin_lockout_seconds: int = Field(900, validation_alias="ADMIN_LOCKOUT_SECONDS")
    request_timeout: float = 20.0
    max_page_size: int = Field(100, validation_alias="MAX_PAGE_SIZE")

    # ── HTTP hardening ──────────────────────────────────────────
    # Host allowlist for the ASGI server (Host-header / DNS-rebinding guard).
    # "*" disables the check; production should list real domains.
    allowed_hosts: str = Field("*", validation_alias="ALLOWED_HOSTS")
    # Only honour X-Forwarded-For when the immediate peer is listed here.
    trusted_proxies: str = Field("", validation_alias="TRUSTED_PROXIES")
    # Hard cap on a request body; larger payloads are refused with 413 before
    # the router or the database ever sees them.
    max_request_bytes: int = Field(1_000_000, validation_alias="MAX_REQUEST_BYTES")
    # `None` means "on outside production"; set explicitly to force either way.
    enable_docs: Optional[bool] = Field(default=None, validation_alias="ENABLE_DOCS")
    security_headers: bool = Field(True, validation_alias="SECURITY_HEADERS")
    hsts_max_age: int = Field(31536000, validation_alias="HSTS_MAX_AGE")

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
    @model_validator(mode="after")
    def _refuse_wildcard_cors(self) -> "Settings":
        """Fail at startup instead of shipping a browser-open API.

        CORS runs with `allow_credentials=True`, so an origin of `*` is either
        rejected by the browser (and the app appears broken) or, on a proxy that
        rewrites the header, an invitation for any site to call the API with a
        signed-in visitor's cookies. An explicit list is the only supported
        configuration.
        """
        if any(origin == "*" for origin in self.cors_origins_list):
            raise ValueError(
                "CORS_ORIGINS must list explicit origins (e.g. https://rmdu.in); "
                "'*' is not allowed alongside credentialed requests."
            )
        return self

    @property
    def is_production(self) -> bool:
        return self.app_env.strip().lower() in ("production", "prod", "live")

    @property
    def docs_enabled(self) -> bool:
        """Interactive docs and the OpenAPI document are opt-in in production."""
        if self.enable_docs is None:
            return not self.is_production
        return bool(self.enable_docs)

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def allowed_hosts_list(self) -> List[str]:
        return [host.strip() for host in self.allowed_hosts.split(",") if host.strip()]

    @property
    def trusted_proxies_list(self) -> List[str]:
        return [proxy.strip() for proxy in self.trusted_proxies.split(",") if proxy.strip()]

    @property
    def admin_ip_allowlist_entries(self) -> List[str]:
        return [item.strip() for item in self.admin_ip_allowlist.split(",") if item.strip()]

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
