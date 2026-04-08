import importlib

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from typing import Any, Optional

router = APIRouter(prefix="/api/projects", tags=["us-1.7"])


def _trash_service() -> Any:
    return importlib.import_module("server.services.trash_service")


def _require_project(
    project_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import app, _error

    project = next(
        (
            project
            for project in app.state.fake_db.projects
            if project["id"] == project_id
        ),
        None,
    )
    if project is None:
        return None, _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return None, _error(403, "FORBIDDEN", "No permission for this project")
    return project, None


@router.get("/{project_id}/trash")
def get_trash(
    project_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, alias="pageSize", ge=1, le=100),
    source_type: Optional[str] = Query(default=None, alias="sourceType"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    return JSONResponse(
        status_code=200,
        content=_trash_service().list_trash_items(
            project_id, page, page_size, source_type
        ),
    )


@router.get("/{project_id}/trash/stats")
def get_trash_stats(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    return JSONResponse(
        status_code=200, content=_trash_service().trash_stats(project_id)
    )


@router.post("/{project_id}/trash/{item_id}/restore")
def restore_trash_item(
    project_id: str,
    item_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    result = _trash_service().restore_trash_item(project_id, item_id)
    if isinstance(result, JSONResponse):
        return result
    return JSONResponse(status_code=200, content=result)


@router.delete("/{project_id}/trash/{item_id}")
def delete_single_trash_item(
    project_id: str,
    item_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    if not _trash_service().delete_trash_item(project_id, item_id):
        return _error(404, "TRASH_ITEM_NOT_FOUND", "Trash item not found")
    return JSONResponse(status_code=200, content={"ok": True, "deletedItemId": item_id})


@router.delete("/{project_id}/trash")
def clear_project_trash(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    deleted_count = _trash_service().clear_trash(project_id)
    return JSONResponse(
        status_code=200, content={"ok": True, "deletedCount": deleted_count}
    )
