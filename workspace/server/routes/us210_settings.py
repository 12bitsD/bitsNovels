from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.routes.us24_item import _require_project
from server.services import kb_setting_service

router = APIRouter(prefix="/api/projects", tags=["us-2.10"])


def _require_user_project(
    project_id: str,
    authorization: Optional[str],
) -> tuple[Optional[str], Optional[JSONResponse]]:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return None, maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return None, err
    return maybe_user_id, None


class CreateSettingRequest(BaseModel):
    title: str
    category: str
    content: str

    model_config = {"extra": "forbid"}


class PatchSettingRequest(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    confirmed: Optional[bool] = None
    relatedEntityRefs: Optional[list[dict[str, str]]] = None

    model_config = {"extra": "forbid"}


class ReorderSettingsRequest(BaseModel):
    orderedIds: list[str]

    model_config = {"extra": "forbid"}


class UpdateSettingReferencesRequest(BaseModel):
    relatedEntityRefs: list[dict[str, str]]

    model_config = {"extra": "forbid"}


def _validate_setting_payload_or_error(
    *,
    title: Optional[str],
    category: Optional[str],
    content: Optional[str],
) -> Optional[JSONResponse]:
    from server.main import _error

    if title is not None and not title.strip():
        return _error(400, "SETTING_TITLE_REQUIRED", "Setting title is required")
    if category is not None and not category.strip():
        return _error(400, "SETTING_CATEGORY_REQUIRED", "Setting category is required")
    if content is not None and not content.strip():
        return _error(400, "SETTING_CONTENT_REQUIRED", "Setting content is required")
    return None


@router.get("/{project_id}/kb/settings")
def list_settings(
    project_id: str,
    query: str = Query(default=""),
    category: str = Query(default=""),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err

    items = kb_setting_service.list_settings(project_id, query=query, category=category)
    return JSONResponse(
        status_code=200,
        content={
            "items": [kb_setting_service.setting_response(item) for item in items],
            "total": len(items),
        },
    )


@router.post("/{project_id}/kb/settings")
def create_setting(
    project_id: str,
    payload: CreateSettingRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:

    user_id, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err

    err_resp = _validate_setting_payload_or_error(
        title=payload.title,
        category=payload.category,
        content=payload.content,
    )
    if err_resp is not None:
        return err_resp

    setting = kb_setting_service.create_setting(
        project_id,
        {
            "title": payload.title,
            "category": payload.category,
            "content": payload.content,
            "source": "manual",
            "confirmed": False,
        },
    )
    return JSONResponse(
        status_code=201,
        content={"setting": kb_setting_service.setting_response(setting)},
    )


@router.patch("/{project_id}/kb/settings/reorder")
def reorder_settings(
    project_id: str,
    payload: ReorderSettingsRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    updated_count = 0
    for index, entity_id in enumerate(payload.orderedIds):
        try:
            kb_setting_service.update_setting(project_id, entity_id, {"order": index})
            updated_count += 1
        except KeyError:
            continue
    return JSONResponse(status_code=200, content={"updatedCount": updated_count})



@router.get("/{project_id}/kb/settings/{entity_id}")
def get_setting(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        setting = kb_setting_service.get_setting(project_id, entity_id)
    except KeyError:
        return _error(404, "SETTING_NOT_FOUND", "Setting not found")
    return JSONResponse(
        status_code=200,
        content={"setting": kb_setting_service.setting_response(setting)},
    )


@router.patch("/{project_id}/kb/settings/{entity_id}")
def patch_setting(
    project_id: str,
    entity_id: str,
    payload: PatchSettingRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err

    err_resp = _validate_setting_payload_or_error(
        title=payload.title,
        category=payload.category,
        content=payload.content,
    )
    if err_resp is not None:
        return err_resp

    try:
        setting = kb_setting_service.update_setting(
            project_id,
            entity_id,
            {k: v for k, v in payload.model_dump().items() if v is not None},
        )
    except KeyError:
        return _error(404, "SETTING_NOT_FOUND", "Setting not found")
    return JSONResponse(
        status_code=200,
        content={"setting": kb_setting_service.setting_response(setting)},
    )


@router.delete("/{project_id}/kb/settings/{entity_id}")
def delete_setting(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        kb_setting_service.soft_delete_setting(project_id, entity_id)
    except KeyError:
        return _error(404, "SETTING_NOT_FOUND", "Setting not found")
    return JSONResponse(status_code=200, content={"ok": True})


@router.post("/{project_id}/kb/settings/{entity_id}/references")
def update_setting_references(
    project_id: str,
    entity_id: str,
    payload: UpdateSettingReferencesRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        setting = kb_setting_service.update_setting(
            project_id,
            entity_id,
            {"relatedEntityRefs": payload.relatedEntityRefs},
        )
    except KeyError:
        return _error(404, "SETTING_NOT_FOUND", "Setting not found")
    return JSONResponse(
        status_code=200,
        content={"setting": kb_setting_service.setting_response(setting)},
    )
