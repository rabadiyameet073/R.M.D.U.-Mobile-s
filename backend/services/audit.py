"""Admin audit trail helper."""

from __future__ import annotations

import logging
from typing import Optional

from core.db import DataAccessError, db

logger = logging.getLogger("rmdu.audit")


async def log_action(
    action: str,
    *,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    ip_address: Optional[str] = None,
    actor_id: Optional[str] = None,
) -> None:
    """Best-effort immutable audit entry; never fails the caller's request."""
    try:
        await db.insert(
            "audit_log",
            {
                "user_id": actor_id,
                "action": action[:60],
                "target_type": target_type,
                "target_id": target_id,
                "old_value": old_value,
                "new_value": new_value,
                "ip_address": ip_address,
            },
        )
    except DataAccessError as exc:
        logger.warning("audit log write failed for %s: %s", action, exc.message)
