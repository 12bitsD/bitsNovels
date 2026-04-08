import importlib
from typing import Any, Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.routes.us24_item import _require_project
from server.routes.us31_editor import _require_chapter


def _foreshadow_service() -> Any:
    return importlib.import_module("server.services.kb_foreshadow_service")


router = APIRouter(prefix="/api/projects", tags=["us-2.6"])

VALID_STATUSES = {
    "unresolved",
    "partially_resolved",
    "resolved",
    "abandoned",
}


class CreateForeshadowRequest(BaseModel):
    name: str
    summary: str
    plantedChapterId: str
    quote: str = ""
    expectedResolveChapterId: Optional[str] = None

    model_config = {"extra": "forbid"}


class UpdateForeshadowRequest(BaseModel):
    name: Optional[str] = None
    summary: Optional[str] = None
    quote: Optional[str] = None
    status: Optional[str] = None
    expectedResolveChapterId: Optional[str] = None
    resolvedChapterId: Optional[str] = None
    resolveNote: Optional[str] = None

    model_config = {"extra": "forbid"}


class CheckNotificationsRequest(BaseModel):
    currentChapterId: str

    model_config = {"extra": "forbid"}


def _validate_status(status: Optional[str]) -> Optional[JSONResponse]:
    from server.main import _error

    if status is None or status in VALID_STATUSES:
        return None
    return _error(
        400, "INVALID_FORESHADOW_STATUS", f"Invalid foreshadow status: {status}"
    )


@router.get("/{project_id}/kb/foreshadow")
def list_foreshadows(
    project_id: str,
    status: Optional[str] = None,
    query: Optional[str] = None,
    group_by: Optional[str] = Query(default=None, alias="groupBy"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    status_error = _validate_status(status)
    if status_error is not None:
        return status_error
    return JSONResponse(
        status_code=200,
        content=_foreshadow_service().list_foreshadows(
            project_id,
            status=status,
            query=query,
            group_by_status=group_by == "status",
        ),
    )


@router.post("/{project_id}/kb/foreshadow")
def create_foreshadow(
    project_id: str,
    payload: CreateForeshadowRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    chapter, err = _require_chapter(project_id, payload.plantedChapterId, maybe_user_id)
    if err is not None:
        return err
    assert chapter is not None
    if not payload.name.strip():
        return _error(400, "FORESHADOW_NAME_REQUIRED", "Foreshadow name is required")
    foreshadow = _foreshadow_service().create_foreshadow(
        project_id,
        payload.model_dump(),
    )
    return JSONResponse(status_code=201, content={"foreshadow": foreshadow})


@router.get("/{project_id}/kb/foreshadow/{entity_id}")
def get_foreshadow(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    try:
        foreshadow = _foreshadow_service().get_foreshadow(project_id, entity_id)
    except KeyError:
        return _error(404, "FORESHADOW_NOT_FOUND", "Foreshadow not found")
    return JSONResponse(status_code=200, content={"foreshadow": foreshadow})


@router.patch("/{project_id}/kb/foreshadow/{entity_id}")
def patch_foreshadow(
    project_id: str,
    entity_id: str,
    payload: UpdateForeshadowRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    status_error = _validate_status(payload.status)
    if status_error is not None:
        return status_error
    if payload.status == "resolved" and (
        not payload.resolvedChapterId or not payload.resolveNote
    ):
        return _error(
            400,
            "FORESHADOW_RESOLUTION_REQUIRED",
            "Resolved foreshadow requires resolvedChapterId and resolveNote",
        )
    try:
        foreshadow = _foreshadow_service().update_foreshadow(
            project_id,
            entity_id,
            payload.model_dump(exclude_unset=True),
        )
    except KeyError:
        return _error(404, "FORESHADOW_NOT_FOUND", "Foreshadow not found")
    return JSONResponse(status_code=200, content={"foreshadow": foreshadow})


@router.post("/{project_id}/kb/foreshadow/check-notifications")
def check_foreshadow_notifications(
    project_id: str,
    payload: CheckNotificationsRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    _, chapter_err = _require_chapter(
        project_id, payload.currentChapterId, maybe_user_id
    )
    if chapter_err is not None:
        return chapter_err
    try:
        triggered = _foreshadow_service().check_notifications(
            project_id,
            payload.currentChapterId,
            maybe_user_id,
        )
    except KeyError:
        return _error(404, "CHAPTER_NOT_FOUND", "Chapter not found")
    return JSONResponse(status_code=200, content={"triggered": triggered})


@router.delete("/{project_id}/kb/foreshadow/{entity_id}")
def delete_foreshadow(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    try:
        foreshadow = _foreshadow_service().soft_delete_foreshadow(project_id, entity_id)
    except KeyError:
        return _error(404, "FORESHADOW_NOT_FOUND", "Foreshadow not found")
    return JSONResponse(status_code=200, content={"foreshadow": foreshadow})
