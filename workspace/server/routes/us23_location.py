from typing import Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import server.services.kb_location_service as kb_location_service
from server.routes.us24_item import _require_project

router = APIRouter(prefix="/api/projects", tags=["us-2.3"])

VALID_LOCATION_TYPES = kb_location_service.VALID_LOCATION_TYPES


class CreateLocationRequest(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    locationType: Optional[str] = None
    parentId: Optional[str] = None
    description: Optional[str] = None
    characterIds: Optional[list[str]] = None
    chapterIds: Optional[list[str]] = None
    source: Optional[str] = None

    model_config = {"extra": "forbid"}


class PatchLocationRequest(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    locationType: Optional[str] = None
    parentId: Optional[str] = None
    description: Optional[str] = None
    characterIds: Optional[list[str]] = None
    chapterIds: Optional[list[str]] = None
    remark: Optional[str] = None

    model_config = {"extra": "forbid"}


class RejectRequest(BaseModel):
    remark: Optional[str] = None

    model_config = {"extra": "forbid"}


class BulkConfirmRequest(BaseModel):
    entityIds: list[str]

    model_config = {"extra": "forbid"}


def _require_user_project(
    project_id: str, authorization: Optional[str]
) -> tuple[Optional[str], Optional[JSONResponse]]:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return None, maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return None, err
    return maybe_user_id, None


def _require_location(
    project_id: str, entity_id: str
) -> tuple[Optional[dict[str, object]], Optional[JSONResponse]]:
    from server.main import _error

    try:
        return kb_location_service.get_location(project_id, entity_id), None
    except KeyError:
        return None, _error(404, "LOCATION_NOT_FOUND", "Location not found")


@router.get("/{project_id}/kb/location")
def list_locations(
    project_id: str,
    query: str = Query(default=""),
    locationType: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    items = kb_location_service.list_locations(
        project_id, query=query, location_type=locationType
    )
    return JSONResponse(
        status_code=200,
        content={
            "items": [kb_location_service.location_response(item) for item in items],
            "total": len(items),
        },
    )


@router.get("/{project_id}/kb/location/tree")
def list_location_tree(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    items = kb_location_service.list_location_tree(project_id)
    return JSONResponse(
        status_code=200,
        content={
            "items": [kb_location_service.location_response(item) for item in items],
            "total": len(items),
        },
    )


@router.post("/{project_id}/kb/location")
def create_location(
    project_id: str,
    payload: CreateLocationRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    name = (payload.name or "").strip()
    if not name:
        return _error(400, "LOCATION_NAME_REQUIRED", "Location name is required")
    location_type = payload.locationType or "other"
    if location_type not in VALID_LOCATION_TYPES:
        return _error(400, "INVALID_LOCATION_TYPE", "Invalid location type")
    location = kb_location_service.create_location(
        project_id,
        {
            "name": name,
            "aliases": payload.aliases or [],
            "locationType": location_type,
            "parentId": payload.parentId,
            "description": payload.description,
            "characterIds": payload.characterIds or [],
            "chapterIds": payload.chapterIds or [],
            "source": payload.source or "manual",
        },
    )
    return JSONResponse(
        status_code=201,
        content={"location": kb_location_service.location_response(location)},
    )


@router.get("/{project_id}/kb/location/{entity_id}")
def get_location(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    location, err = _require_location(project_id, entity_id)
    if err is not None:
        return err
    assert location is not None
    return JSONResponse(
        status_code=200,
        content={"location": kb_location_service.location_response(location)},
    )


@router.patch("/{project_id}/kb/location/{entity_id}")
def patch_location(
    project_id: str,
    entity_id: str,
    payload: PatchLocationRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_location(project_id, entity_id)
    if err is not None:
        return err
    if payload.name is not None and not payload.name.strip():
        return _error(400, "LOCATION_NAME_REQUIRED", "Location name is required")
    if (
        payload.locationType is not None
        and payload.locationType not in VALID_LOCATION_TYPES
    ):
        return _error(400, "INVALID_LOCATION_TYPE", "Invalid location type")
    location = kb_location_service.update_location(
        project_id,
        entity_id,
        {
            key: value
            for key, value in payload.model_dump().items()
            if value is not None
        },
    )
    return JSONResponse(
        status_code=200,
        content={"location": kb_location_service.location_response(location)},
    )


@router.delete("/{project_id}/kb/location/{entity_id}")
def delete_location(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_location(project_id, entity_id)
    if err is not None:
        return err
    kb_location_service.delete_location(project_id, entity_id)
    return JSONResponse(status_code=200, content={"ok": True})


@router.post("/{project_id}/kb/location/{entity_id}/confirm")
def confirm_location(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_location(project_id, entity_id)
    if err is not None:
        return err
    location = kb_location_service.confirm_location(project_id, entity_id)
    return JSONResponse(
        status_code=200,
        content={"location": kb_location_service.location_response(location)},
    )


@router.post("/{project_id}/kb/location/{entity_id}/reject")
def reject_location(
    project_id: str,
    entity_id: str,
    payload: RejectRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_location(project_id, entity_id)
    if err is not None:
        return err
    location = kb_location_service.reject_location(
        project_id, entity_id, payload.remark
    )
    return JSONResponse(
        status_code=200,
        content={"location": kb_location_service.location_response(location)},
    )


@router.post("/{project_id}/kb/location/bulk-confirm")
def bulk_confirm_locations(
    project_id: str,
    payload: BulkConfirmRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    if not payload.entityIds:
        return _error(400, "EMPTY_ENTITY_IDS", "entityIds cannot be empty")
    result = kb_location_service.bulk_confirm_locations(project_id, payload.entityIds)
    return JSONResponse(
        status_code=200,
        content={"ok": True, "confirmedCount": result["confirmedCount"]},
    )
