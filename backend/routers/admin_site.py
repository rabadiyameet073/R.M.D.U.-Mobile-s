"""Admin endpoints for site copy (`site_settings`).

Gated exactly like the rest of the console: `require_admin` on the router, plus
the write kill switch and the 60/min admin budget on every mutation. Reads carry
neither, so an operator can always inspect the stored document.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Path, Request, status

from controllers import admin_site_controller
from core.deps import require_admin, require_admin_write
from core.ratelimit import ADMIN_MUTATION
from core.security import client_ip_from_request
from schemas.admin import (
    SiteSettingCreate,
    SiteSettingOut,
    SiteSettingUpdate,
    SiteSettingsOut,
)
from schemas.admin import SITE_SETTING_KEY_PATTERN

router = APIRouter(prefix="/admin/site", tags=["admin"], dependencies=[Depends(require_admin)])

WRITE = [Depends(require_admin_write), Depends(ADMIN_MUTATION)]


def setting_key() -> Path:
    """A fresh path constraint per route (FastAPI mutates the marker it gets)."""
    return Path(
        ...,
        pattern=SITE_SETTING_KEY_PATTERN,
        description="Section name: site | hero | nav | footer | <new_section>.",
    )


@router.get(
    "/settings",
    response_model=SiteSettingsOut,
    summary="Every site copy section, private ones included",
)
async def list_site_settings() -> dict:
    return await admin_site_controller.list_settings()


@router.post(
    "/settings",
    response_model=SiteSettingOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=WRITE,
    summary="Create a site copy section",
)
async def create_site_setting(payload: SiteSettingCreate, request: Request) -> dict:
    return await admin_site_controller.create_setting(
        payload, ip_address=client_ip_from_request(request)
    )


@router.put(
    "/settings/{key}",
    response_model=SiteSettingOut,
    dependencies=WRITE,
    summary="Replace a section's document (version-checked, creates when absent)",
)
async def update_site_setting(
    request: Request,
    payload: SiteSettingUpdate,
    key: str = setting_key(),
) -> dict:
    return await admin_site_controller.update_setting(
        key, payload, ip_address=client_ip_from_request(request)
    )


@router.delete(
    "/settings/{key}",
    response_model=SiteSettingOut,
    dependencies=WRITE,
    summary="Remove a section (the storefront falls back to built-in copy)",
)
async def delete_site_setting(request: Request, key: str = setting_key()) -> dict:
    return await admin_site_controller.delete_setting(
        key, ip_address=client_ip_from_request(request)
    )
