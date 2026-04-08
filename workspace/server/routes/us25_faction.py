from typing import Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.routes.us24_item import _require_project
from server.services import kb_faction_service

router = APIRouter(prefix="/api/projects", tags=["us-2.5"])


class PatchFactionRequest(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    factionType: Optional[str] = None
    summary: Optional[str] = None
    memberCharacterIds: Optional[list[str]] = None
    allyFactionIds: Optional[list[str]] = None
    rivalFactionIds: Optional[list[str]] = None
    chapterIds: Optional[list[str]] = None
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


@router.get("/{project_id}/kb/faction")
def list_factions(
    project_id: str,
    query: str = Query(default=""),
    factionType: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    items = kb_faction_service.list_factions(
        project_id, query=query, faction_type=factionType
    )
    return JSONResponse(
        status_code=200,
        content={
            "items": [kb_faction_service.faction_response(item) for item in items],
            "total": len(items),
        },
    )


@router.get("/{project_id}/kb/faction/{entity_id}")
def get_faction(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        faction = kb_faction_service.get_faction(project_id, entity_id)
    except KeyError:
        return _error(404, "FACTION_NOT_FOUND", "Faction not found")
    return JSONResponse(
        status_code=200,
        content={"faction": kb_faction_service.faction_response(faction)},
    )


@router.patch("/{project_id}/kb/faction/{entity_id}")
def patch_faction(
    project_id: str,
    entity_id: str,
    payload: PatchFactionRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    if payload.name is not None and not payload.name.strip():
        return _error(400, "FACTION_NAME_REQUIRED", "Faction name is required")
    if (
        payload.factionType is not None
        and payload.factionType not in kb_faction_service.VALID_FACTION_TYPES
    ):
        return _error(400, "INVALID_FACTION_TYPE", "Invalid faction type")
    try:
        faction = kb_faction_service.update_faction(
            project_id,
            entity_id,
            {
                key: value
                for key, value in payload.model_dump().items()
                if value is not None
            },
        )
    except KeyError:
        return _error(404, "FACTION_NOT_FOUND", "Faction not found")
    return JSONResponse(
        status_code=200,
        content={"faction": kb_faction_service.faction_response(faction)},
    )


@router.post("/{project_id}/kb/faction/{entity_id}/confirm")
def confirm_faction(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        faction = kb_faction_service.confirm_faction(project_id, entity_id)
    except KeyError:
        return _error(404, "FACTION_NOT_FOUND", "Faction not found")
    return JSONResponse(
        status_code=200,
        content={"faction": kb_faction_service.faction_response(faction)},
    )


@router.post("/{project_id}/kb/faction/bulk-confirm")
def bulk_confirm_factions(
    project_id: str,
    payload: BulkConfirmRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    result = kb_faction_service.bulk_confirm_factions(project_id, payload.entityIds)
    return JSONResponse(status_code=200, content=result)


@router.post("/{project_id}/kb/faction/{entity_id}/not-faction")
def mark_not_faction(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        faction = kb_faction_service.mark_faction_not_entity(project_id, entity_id)
    except KeyError:
        return _error(404, "FACTION_NOT_FOUND", "Faction not found")
    return JSONResponse(
        status_code=200,
        content={"faction": kb_faction_service.faction_response(faction)},
    )
