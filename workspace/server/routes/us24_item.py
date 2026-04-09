from typing import Any, Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import server.services.kb_item_service as kb_item_service
from server.routes._deps import require_project as _require_project

router = APIRouter(prefix="/api/projects", tags=["us-2.4"])

VALID_ITEM_TYPES = kb_item_service.VALID_ITEM_TYPES


class CreateItemRequest(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    itemType: Optional[str] = None
    source: Optional[str] = None
    summary: Optional[str] = None
    ownerCharacterId: Optional[str] = None
    chapterIds: Optional[list[str]] = None

    model_config = {"extra": "forbid"}


class PatchItemRequest(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    itemType: Optional[str] = None
    summary: Optional[str] = None
    ownerCharacterId: Optional[str] = None
    ownershipNote: Optional[str] = None
    ownershipChapterId: Optional[str] = None
    chapterIds: Optional[list[str]] = None
    remark: Optional[str] = None

    model_config = {"extra": "forbid"}


class BulkConfirmRequest(BaseModel):
    entityIds: list[str]

    model_config = {"extra": "forbid"}


class MergeRequest(BaseModel):
    targetId: str

    model_config = {"extra": "forbid"}


class RejectRequest(BaseModel):
    remark: Optional[str] = None

    model_config = {"extra": "forbid"}


def _require_item(
    project_id: str, entity_id: str
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import _error

    try:
        return kb_item_service.get_item(project_id, entity_id), None
    except KeyError:
        return None, _error(404, "ITEM_NOT_FOUND", "Item not found")


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


@router.get("/{project_id}/kb/item")
def list_items(
    project_id: str,
    query: str = Query(default=""),
    itemType: Optional[str] = Query(default=None),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    items = kb_item_service.list_items(project_id, query=query, item_type=itemType)
    return JSONResponse(
        status_code=200,
        content={
            "items": [kb_item_service.item_response(item) for item in items],
            "total": len(items),
        },
    )


@router.post("/{project_id}/kb/item")
def create_item(
    project_id: str,
    payload: CreateItemRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    name = (payload.name or "").strip()
    if not name:
        return _error(400, "ITEM_NAME_REQUIRED", "Item name is required")
    item_type = payload.itemType or "other"
    if item_type not in VALID_ITEM_TYPES:
        return _error(400, "INVALID_ITEM_TYPE", "Invalid item type")
    item = kb_item_service.create_item(
        project_id,
        {
            "name": name,
            "aliases": payload.aliases or [],
            "itemType": item_type,
            "summary": payload.summary,
            "ownerCharacterId": payload.ownerCharacterId,
            "chapterIds": payload.chapterIds or [],
            "source": payload.source or "manual",
        },
    )
    return JSONResponse(
        status_code=201, content={"item": kb_item_service.item_response(item)}
    )


@router.get("/{project_id}/kb/item/{entity_id}")
def get_item(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    item, err = _require_item(project_id, entity_id)
    if err is not None:
        return err
    assert item is not None
    return JSONResponse(
        status_code=200, content={"item": kb_item_service.item_response(item)}
    )


@router.patch("/{project_id}/kb/item/{entity_id}")
def patch_item(
    project_id: str,
    entity_id: str,
    payload: PatchItemRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_item(project_id, entity_id)
    if err is not None:
        return err
    if payload.name is not None and not payload.name.strip():
        return _error(400, "ITEM_NAME_REQUIRED", "Item name is required")
    if payload.itemType is not None and payload.itemType not in VALID_ITEM_TYPES:
        return _error(400, "INVALID_ITEM_TYPE", "Invalid item type")
    item = kb_item_service.update_item(
        project_id,
        entity_id,
        {
            key: value
            for key, value in payload.model_dump().items()
            if value is not None
        },
    )
    return JSONResponse(
        status_code=200, content={"item": kb_item_service.item_response(item)}
    )


@router.delete("/{project_id}/kb/item/{entity_id}")
def delete_item(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_item(project_id, entity_id)
    if err is not None:
        return err
    kb_item_service.delete_item(project_id, entity_id)
    return JSONResponse(status_code=200, content={"ok": True})


@router.post("/{project_id}/kb/item/{entity_id}/confirm")
def confirm_item(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    item, err = _require_item(project_id, entity_id)
    if err is not None:
        return err
    assert item is not None
    confirmed = kb_item_service.confirm_item(project_id, entity_id)
    return JSONResponse(
        status_code=200, content={"item": kb_item_service.item_response(confirmed)}
    )


@router.post("/{project_id}/kb/item/{entity_id}/reject")
def reject_item(
    project_id: str,
    entity_id: str,
    payload: RejectRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_item(project_id, entity_id)
    if err is not None:
        return err
    item = kb_item_service.reject_item(project_id, entity_id, remark=payload.remark)
    return JSONResponse(
        status_code=200, content={"item": kb_item_service.item_response(item)}
    )


@router.post("/{project_id}/kb/item/bulk-confirm")
def bulk_confirm_items(
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
    result = kb_item_service.bulk_confirm_items(project_id, payload.entityIds)
    return JSONResponse(
        status_code=200,
        content={"ok": True, "confirmedCount": result["confirmedCount"]},
    )


@router.post("/{project_id}/kb/item/{entity_id}/merge")
def merge_item(
    project_id: str,
    entity_id: str,
    payload: MergeRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_item(project_id, entity_id)
    if err is not None:
        return err
    target_item, target_err = _require_item(project_id, payload.targetId)
    if target_err is not None:
        return _error(404, "TARGET_ITEM_NOT_FOUND", "Target item not found")
    assert target_item is not None
    kb_item_service.merge_item_entities(project_id, entity_id, payload.targetId)
    return JSONResponse(status_code=200, content={"ok": True})


@router.get("/{project_id}/kb/item/{entity_id}/references")
def get_item_references(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    _, err = _require_user_project(project_id, authorization)
    if err is not None:
        return err
    _, err = _require_item(project_id, entity_id)
    if err is not None:
        return err
    references = kb_item_service.get_item_references(project_id, entity_id)
    return JSONResponse(
        status_code=200,
        content={"hasReferences": len(references) > 0, "references": references},
    )
