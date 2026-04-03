from fastapi import APIRouter, Body, Header
from pydantic import BaseModel
from typing import Any, Optional
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/projects", tags=["us-2.4"])

VALID_ITEM_TYPES = {"weapon", "armor", "accessory", "consumable", "token", "other"}


class CreateItemRequest(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    itemType: Optional[str] = None
    source: Optional[str] = None
    ownerCharacterId: Optional[str] = None
    chapterIds: Optional[list[str]] = None

    model_config = {"extra": "forbid"}


class PatchItemRequest(BaseModel):
    name: Optional[str] = None
    aliases: Optional[list[str]] = None
    itemType: Optional[str] = None
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


def _require_project(
    project_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import app, _error

    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return None, _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return None, _error(403, "FORBIDDEN", "No permission for this project")
    return project, None


def _require_item(
    item_id: str,
    project_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import _error, app

    item = app.state.kb_items.get(item_id)
    if item is None:
        return None, _error(404, "ITEM_NOT_FOUND", "Item not found")
    if item["projectId"] != project_id:
        return None, _error(404, "ITEM_NOT_FOUND", "Item not found")
    return item, None


def _item_response(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": item["id"],
        "projectId": item["projectId"],
        "source": item["source"],
        "confirmed": item["confirmed"],
        "remark": item.get("remark"),
        "createdAt": item["createdAt"],
        "updatedAt": item["updatedAt"],
        "deletedAt": item.get("deletedAt"),
        "restoreUntil": item.get("restoreUntil"),
        "name": item["name"],
        "aliases": item["aliases"],
        "itemType": item["itemType"],
        "summary": item.get("summary"),
        "ownerCharacterId": item.get("ownerCharacterId"),
        "ownershipHistory": item["ownershipHistory"],
        "chapterIds": item["chapterIds"],
        "rawAI": item.get("rawAI"),
    }


# 1. GET /api/projects/:projectId/kb/item — list all items
@router.get("/{project_id}/kb/item")
def list_items(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    items = [
        _item_response(item)
        for item in app.state.kb_items.values()
        if item["projectId"] == project_id and item.get("deletedAt") is None
    ]
    return JSONResponse(
        status_code=200,
        content={"items": items, "total": len(items)},
    )


# 2. POST /api/projects/:projectId/kb/item — create item
@router.post("/{project_id}/kb/item")
def create_item(
    project_id: str,
    payload: CreateItemRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    name = payload.name.strip() if payload.name else ""
    if not name:
        return _error(400, "ITEM_NAME_REQUIRED", "Item name is required")

    item_type = payload.itemType or "other"
    if item_type not in VALID_ITEM_TYPES:
        return _error(400, "INVALID_ITEM_TYPE", f"Invalid item type: {item_type}")

    source = payload.source or "manual"
    if source not in {"ai", "manual"}:
        source = "manual"

    item_id = f"kbitem-{app.state.kb_item_counter}"
    app.state.kb_item_counter += 1
    now_iso = _iso_z(app.state.session_clock.now)

    item = {
        "id": item_id,
        "projectId": project_id,
        "source": source,
        "confirmed": False,
        "remark": None,
        "createdAt": now_iso,
        "updatedAt": now_iso,
        "deletedAt": None,
        "restoreUntil": None,
        "name": name,
        "aliases": payload.aliases or [],
        "itemType": item_type,
        "summary": None,
        "ownerCharacterId": payload.ownerCharacterId,
        "ownershipHistory": [],
        "chapterIds": payload.chapterIds or [],
        "rawAI": None,
    }
    app.state.kb_items[item_id] = item
    return JSONResponse(status_code=201, content={"item": _item_response(item)})


# 3. GET /api/projects/:projectId/kb/item/:entityId — get item detail
@router.get("/{project_id}/kb/item/{entity_id}")
def get_item(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id

    project, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err

    item, err = _require_item(entity_id, project_id)
    if err is not None:
        return err

    return JSONResponse(status_code=200, content={"item": _item_response(item)})


# 4. PATCH /api/projects/:projectId/kb/item/:entityId — update item
@router.patch("/{project_id}/kb/item/{entity_id}")
def patch_item(
    project_id: str,
    entity_id: str,
    payload: PatchItemRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    item, err = _require_item(entity_id, project_id)
    if err is not None:
        return err

    now_iso = _iso_z(app.state.session_clock.now)

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            return _error(400, "ITEM_NAME_REQUIRED", "Item name is required")
        item["name"] = name

    if payload.aliases is not None:
        item["aliases"] = payload.aliases

    if payload.itemType is not None:
        if payload.itemType not in VALID_ITEM_TYPES:
            return _error(
                400, "INVALID_ITEM_TYPE", f"Invalid item type: {payload.itemType}"
            )
        item["itemType"] = payload.itemType

    if payload.ownerCharacterId is not None:
        old_owner = item.get("ownerCharacterId")
        new_owner = payload.ownerCharacterId
        if old_owner != new_owner:
            history_record = {
                "fromCharacterId": old_owner,
                "toCharacterId": new_owner,
                "chapterId": payload.ownershipChapterId or "",
                "note": payload.ownershipNote or "",
                "createdAt": now_iso,
            }
            item["ownershipHistory"] = item.get("ownershipHistory", []) + [
                history_record
            ]
        item["ownerCharacterId"] = new_owner

    if payload.chapterIds is not None:
        item["chapterIds"] = payload.chapterIds

    if payload.remark is not None:
        item["remark"] = payload.remark

    item["updatedAt"] = now_iso
    return JSONResponse(status_code=200, content={"item": _item_response(item)})


# 5. DELETE /api/projects/:projectId/kb/item/:entityId — soft delete
@router.delete("/{project_id}/kb/item/{entity_id}")
def delete_item(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    item, err = _require_item(entity_id, project_id)
    if err is not None:
        return err

    now_iso = _iso_z(app.state.session_clock.now)
    item["deletedAt"] = now_iso
    item["restoreUntil"] = _iso_z(app.state.session_clock.now)
    item["updatedAt"] = now_iso
    return JSONResponse(status_code=200, content={"ok": True})


# 6. POST /api/projects/:projectId/kb/item/:entityId/confirm — confirm
@router.post("/{project_id}/kb/item/{entity_id}/confirm")
def confirm_item(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    item, err = _require_item(entity_id, project_id)
    if err is not None:
        return err

    now_iso = _iso_z(app.state.session_clock.now)
    item["confirmed"] = True
    item["updatedAt"] = now_iso
    return JSONResponse(status_code=200, content={"item": _item_response(item)})


# 7. POST /api/projects/:projectId/kb/item/:entityId/reject — reject
@router.post("/{project_id}/kb/item/{entity_id}/reject")
def reject_item(
    project_id: str,
    entity_id: str,
    payload: RejectRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    item, err = _require_item(entity_id, project_id)
    if err is not None:
        return err

    now_iso = _iso_z(app.state.session_clock.now)
    item["confirmed"] = False
    item["remark"] = payload.remark
    item["updatedAt"] = now_iso
    return JSONResponse(status_code=200, content={"item": _item_response(item)})


# 8. POST /api/projects/:projectId/kb/item/bulk-confirm — bulk confirm
@router.post("/{project_id}/kb/item/bulk-confirm")
def bulk_confirm_items(
    project_id: str,
    payload: BulkConfirmRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    if not payload.entityIds:
        return _error(400, "EMPTY_ENTITY_IDS", "entityIds cannot be empty")

    now_iso = _iso_z(app.state.session_clock.now)
    confirmed_count = 0

    for entity_id in payload.entityIds:
        item = app.state.kb_items.get(entity_id)
        if item is not None and item["projectId"] == project_id:
            item["confirmed"] = True
            item["updatedAt"] = now_iso
            confirmed_count += 1

    return JSONResponse(
        status_code=200,
        content={"ok": True, "confirmedCount": confirmed_count},
    )


# 9. POST /api/projects/:projectId/kb/item/:entityId/merge — merge
@router.post("/{project_id}/kb/item/{entity_id}/merge")
def merge_item(
    project_id: str,
    entity_id: str,
    payload: MergeRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    source_item, err = _require_item(entity_id, project_id)
    if err is not None:
        return err

    target_item = app.state.kb_items.get(payload.targetId)
    if target_item is None or target_item["projectId"] != project_id:
        return _error(404, "TARGET_ITEM_NOT_FOUND", "Target item not found")

    now_iso = _iso_z(app.state.session_clock.now)
    source_item["deletedAt"] = now_iso
    source_item["updatedAt"] = now_iso
    return JSONResponse(status_code=200, content={"ok": True})


# 10. GET /api/projects/:projectId/kb/item/:entityId/references — check references
@router.get("/{project_id}/kb/item/{entity_id}/references")
def get_item_references(
    project_id: str,
    entity_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id

    project, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err

    item, err = _require_item(entity_id, project_id)
    if err is not None:
        return err

    references: list[dict[str, Any]] = []
    has_refs = (
        len(item.get("chapterIds", [])) > 0 or item.get("ownerCharacterId") is not None
    )
    if has_refs:
        if item.get("ownerCharacterId"):
            references.append(
                {
                    "type": "owner",
                    "characterId": item["ownerCharacterId"],
                }
            )
        for ch_id in item.get("chapterIds", []):
            references.append(
                {
                    "type": "chapter",
                    "chapterId": ch_id,
                }
            )

    return JSONResponse(
        status_code=200,
        content={"hasReferences": has_refs, "references": references},
    )
