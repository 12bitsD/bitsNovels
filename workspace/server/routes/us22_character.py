from typing import Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.routes.us24_item import _require_project
from server.services import kb_character_service

router = APIRouter(prefix="/api/projects", tags=["us-2.2"])


class PatchCharacterRequest(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    appearance: Optional[str] = None
    personalityTags: Optional[list[str]] = None
    factionId: Optional[str] = None
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


@router.get("/{project_id}/kb/character")
def list_characters(
    project_id: str,
    query: str = Query(default=""),
    sortBy: str = Query(default="firstAppearance"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    items = kb_character_service.list_characters(
        project_id, query=query, sort_by=sortBy
    )
    return JSONResponse(
        status_code=200,
        content={
            "items": [kb_character_service.character_response(item) for item in items],
            "total": len(items),
        },
    )


@router.get("/{project_id}/kb/character/{entity_id}")
def get_character(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        character = kb_character_service.get_character(project_id, entity_id)
    except KeyError:
        return _error(404, "CHARACTER_NOT_FOUND", "Character not found")
    return JSONResponse(
        status_code=200,
        content={"character": kb_character_service.character_response(character)},
    )


@router.patch("/{project_id}/kb/character/{entity_id}")
def patch_character(
    project_id: str,
    entity_id: str,
    payload: PatchCharacterRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    if payload.name is not None and not payload.name.strip():
        return _error(400, "CHARACTER_NAME_REQUIRED", "Character name is required")
    try:
        character = kb_character_service.update_character(
            project_id,
            entity_id,
            {
                key: value
                for key, value in payload.model_dump().items()
                if value is not None
            },
        )
    except KeyError as exc:
        if str(exc).strip("'") == entity_id:
            return _error(404, "CHARACTER_NOT_FOUND", "Character not found")
        return _error(404, "FACTION_NOT_FOUND", "Faction not found")
    return JSONResponse(
        status_code=200,
        content={"character": kb_character_service.character_response(character)},
    )


@router.post("/{project_id}/kb/character/{entity_id}/confirm")
def confirm_character(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        character = kb_character_service.confirm_character(project_id, entity_id)
    except KeyError:
        return _error(404, "CHARACTER_NOT_FOUND", "Character not found")
    return JSONResponse(
        status_code=200,
        content={"character": kb_character_service.character_response(character)},
    )


@router.post("/{project_id}/kb/character/bulk-confirm")
def bulk_confirm_characters(
    project_id: str,
    payload: BulkConfirmRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    result = kb_character_service.bulk_confirm_characters(project_id, payload.entityIds)
    return JSONResponse(status_code=200, content=result)


@router.post("/{project_id}/kb/character/{entity_id}/not-character")
def mark_not_character(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    try:
        character = kb_character_service.mark_character_not_entity(
            project_id, entity_id
        )
    except KeyError:
        return _error(404, "CHARACTER_NOT_FOUND", "Character not found")
    return JSONResponse(
        status_code=200,
        content={"character": kb_character_service.character_response(character)},
    )
