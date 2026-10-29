"""Route guard audit.

Walks the live FastAPI app and reports, for every mutating route, whether an
authentication guard and a rate-limit budget are attached. Exits non-zero when
one is missing, so an endpoint cannot be added in an unguarded state.

Guards are matched by callable identity, not by name: `rate_limit()` and
`require_feature()` both return a closure called `dependency`, so name matching
would confuse a kill switch with a budget.

Run from the `backend` directory:  python scripts/audit_routes.py
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.routing import APIRoute  # noqa: E402

from core.deps import (  # noqa: E402
    get_current_user,
    get_optional_user,
    require_admin,
    require_admin_write,
)
from core.ratelimit import (  # noqa: E402
    ADMIN_MUTATION,
    AI_QUERY,
    CARD_CREATE,
    CARD_LOOKUP,
    CHAT_SESSION,
    CLAIM,
    COMPARE_QUERY,
    RECOMMEND_QUERY,
    REVIEW_WRITE,
    USER_MUTATION,
)
from main import app  # noqa: E402

MUTATION_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

AUTH_GUARDS = {
    id(require_admin),
    id(require_admin_write),
    id(get_current_user),
    id(get_optional_user),
}

LIMIT_GUARDS = {
    id(budget)
    for budget in (
        ADMIN_MUTATION,
        AI_QUERY,
        CARD_CREATE,
        CARD_LOOKUP,
        CHAT_SESSION,
        CLAIM,
        COMPARE_QUERY,
        RECOMMEND_QUERY,
        REVIEW_WRITE,
        USER_MUTATION,
    )
}

# Mutating routes that are intentionally reachable without a credential. Each
# one still needs a rate-limit budget; this list is the only place anonymity is
# declared, so adding a public write is a deliberate, reviewable edit.
PUBLIC_WRITES = {
    "POST /api/v1/ai/query": "guest ask-the-catalog; budget 10/min per caller",
    "POST /api/v1/ai/chat/sessions": "guest chat; 10 sessions/hour per caller",
    "POST /api/v1/ai/chat/sessions/{token}/messages": "guest chat turn; 10/min",
    "POST /api/v1/compare": "guest comparison; 30/min per caller",
    "POST /api/v1/recommendations": "guest engine; persisted runs still need a token",
}

# Probes that carry no data and need neither guard.
IGNORED_PATHS = {"/health", "/health/ready", "/openapi.json"}


def _dependencies(route: APIRoute) -> set[int]:
    found: set[int] = set()
    stack = list(route.dependant.dependencies)
    while stack:
        dep = stack.pop()
        if getattr(dep, "call", None) is not None:
            found.add(id(dep.call))
            stack.extend(dep.dependencies)
    return found


def main() -> int:
    missing_auth: list[str] = []
    missing_limit: list[str] = []
    public: list[str] = []
    scanned = 0
    mutations = 0

    for route in app.routes:
        if not isinstance(route, APIRoute) or route.path in IGNORED_PATHS:
            continue
        methods = sorted(route.methods - {"HEAD", "OPTIONS"})
        if not methods:
            continue
        scanned += 1
        if not set(methods) & MUTATION_METHODS:
            continue
        mutations += 1

        deps = _dependencies(route)
        has_auth = bool(deps & AUTH_GUARDS)
        has_limit = bool(deps & LIMIT_GUARDS)
        label = f"{methods[0]} {route.path}"

        if label in PUBLIC_WRITES:
            public.append(f"{label}  -> {PUBLIC_WRITES[label]}")
        elif not has_auth:
            missing_auth.append(label)
        if not has_limit:
            missing_limit.append(label)

    print(f"routes scanned: {scanned} ({mutations} mutating)")
    if public:
        print("\nDECLARED PUBLIC WRITES:")
        for row in public:
            print("  " + row)
    if missing_auth:
        print("\nMISSING AUTH GUARD:")
        for row in missing_auth:
            print("  " + row)
    if missing_limit:
        print("\nMISSING RATE LIMIT:")
        for row in missing_limit:
            print("  " + row)
    if not missing_auth and not missing_limit:
        print("\nOK: every mutating route is authenticated or declared public, and throttled.")
    return 1 if (missing_auth or missing_limit) else 0


if __name__ == "__main__":
    raise SystemExit(main())
