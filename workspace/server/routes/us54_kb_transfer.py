from typing import Any, Literal, Optional

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.routes._deps import require_project as _require_project

router = APIRouter(prefix="/api/projects", tags=["us-5.4"])


class ExportScope(BaseModel):
    mode: Literal["all", "types", "items"]
    types: Optional[list[str]] = None
    itemIds: Optional[list[str]] = None


class CreateExportRequest(BaseModel):
    scope: ExportScope

    model_config = {"extra": "forbid"}


class ImportRequest(BaseModel):
    strategy: str
    data: dict[str, Any]

    model_config = {"extra": "forbid"}


@router.post("/{project_id}/kb/export")
def create_kb_export(
    project_id: str,
    payload: CreateExportRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id
    from server.services.kb_transfer_service import (
        create_kb_export as svc_create_export,
    )

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    scope = payload.scope.model_dump()
    result, svc_err = svc_create_export(project_id, scope, user_id)
    if svc_err is not None:
        return _error(404, svc_err["error"], svc_err["message"])

    return JSONResponse(status_code=201, content=result)


@router.get("/{project_id}/kb/export/{export_id}/download")
def download_kb_export(
    project_id: str,
    export_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id
    from server.services.kb_transfer_service import get_kb_export as svc_get_export

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    result, svc_err = svc_get_export(export_id, project_id)
    if svc_err is not None:
        return _error(404, svc_err["error"], svc_err["message"])

    return JSONResponse(status_code=200, content=result)


@router.post("/{project_id}/kb/import")
def import_kb(
    project_id: str,
    payload: ImportRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id
    from server.services.kb_transfer_service import import_kb_data as svc_import

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    result, svc_err = svc_import(project_id, payload.data, payload.strategy)
    if svc_err is not None:
        return _error(400, svc_err["error"], svc_err["message"])

    return JSONResponse(status_code=200, content=result)
