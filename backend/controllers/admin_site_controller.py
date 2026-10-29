"""Controller for the site-copy console.

`PUT` doubles as create-or-update for a section: the console edits one JSON
document at a time and does not care whether the row exists yet, which is what
makes "add a section in the console, see it on the site" a single call.
"""

from __future__ import annotations

from typing import Optional

from schemas.admin import SiteSettingCreate, SiteSettingUpdate
from services import site_settings_service
from services.site_settings_service import UNSET


async def list_settings() -> dict:
    return {"items": await site_settings_service.list_settings()}


async def create_setting(payload: SiteSettingCreate, *, ip_address: Optional[str]) -> dict:
    return await site_settings_service.upsert_setting(
        payload.key,
        value=payload.value,
        description=payload.description,
        is_public=payload.is_public,
        ip_address=ip_address,
    )


async def update_setting(
    key: str, payload: SiteSettingUpdate, *, ip_address: Optional[str]
) -> dict:
    data = payload.model_dump(exclude_unset=True)
    expected_version = data.pop("version", None)
    value = data.get("value")
    return await site_settings_service.upsert_setting(
        key,
        # An explicit `null` value is not a request to store null (the column is
        # NOT NULL); it means "leave the document alone".
        value=UNSET if value is None else value,
        description=data.get("description", UNSET),
        is_public=data.get("is_public", UNSET),
        expected_version=expected_version,
        ip_address=ip_address,
    )


async def delete_setting(key: str, *, ip_address: Optional[str]) -> dict:
    return await site_settings_service.delete_setting(key, ip_address=ip_address)
