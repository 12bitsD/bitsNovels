"""
US-5.1 Export Routes
POST   /api/projects/:projectId/exports                    — 创建导出任务
GET    /api/projects/:projectId/exports                    — 获取最近10条导出任务
GET    /api/projects/:projectId/exports/:taskId             — 获取任务状态/进度
GET    /api/projects/:projectId/exports/:taskId/download    — 下载文件
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union

from fastapi import APIRouter, BackgroundTasks, Header
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/projects", tags=["us-5.1"])


class CreateExportRequest(BaseModel):
    format: str
    scope: str
    scopeIds: Optional[list[str]] = None


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


def _iso_z(ts: datetime) -> str:
    return (
        ts.astimezone(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


@router.post("/{project_id}/exports")
def create_export_task(
    project_id: str,
    payload: CreateExportRequest,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _next_id, _iso_z, _now

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    valid_formats = {"docx", "txt", "pdf", "markdown"}
    if payload.format not in valid_formats:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": f"Invalid format. Must be one of: {valid_formats}",
                    "details": {},
                }
            },
        )

    valid_scopes = {"all", "volume", "chapter"}
    if payload.scope not in valid_scopes:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": f"Invalid scope. Must be one of: {valid_scopes}",
                    "details": {},
                }
            },
        )

    task_id = _next_id("export_task_counter", "export")
    now_iso = _iso_z(_now())

    task = {
        "id": task_id,
        "projectId": project_id,
        "userId": user_id,
        "format": payload.format,
        "scope": payload.scope,
        "scopeIds": payload.scopeIds,
        "status": "pending",
        "progress": 0,
        "createdAt": now_iso,
    }

    app.state.export_tasks[task_id] = task

    background_tasks.add_task(
        _run_export_task,
        task_id,
        project_id,
        user_id,
        payload.format,
        payload.scope,
        payload.scopeIds,
    )

    return JSONResponse(
        status_code=201,
        content={"taskId": task_id, "status": "pending"},
    )


def _run_export_task(
    task_id: str,
    project_id: str,
    user_id: str,
    format: str,
    scope: str,
    scope_ids: Optional[list[str]],
) -> None:
    from server.services.export_service import process_export_task

    process_export_task(task_id, project_id, user_id, format, scope, scope_ids)


@router.get("/{project_id}/exports")
def list_export_tasks(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    tasks = [
        t
        for t in app.state.export_tasks.values()
        if t["projectId"] == project_id and t["userId"] == user_id
    ]

    tasks = sorted(tasks, key=lambda x: x["createdAt"], reverse=True)
    items = tasks[:10]

    return JSONResponse(
        status_code=200,
        content={"items": [_export_task_response(t) for t in items]},
    )


@router.get("/{project_id}/exports/{task_id}")
def get_export_task(
    project_id: str,
    task_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _error

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    task = app.state.export_tasks.get(task_id)
    if task is None:
        return _error(404, "EXPORT_TASK_NOT_FOUND", "Export task not found")

    if task["projectId"] != project_id or task["userId"] != user_id:
        return _error(403, "FORBIDDEN", "No permission for this export task")

    return JSONResponse(
        status_code=200,
        content={"task": _export_task_response(task)},
    )


@router.get("/{project_id}/exports/{task_id}/download", response_model=None)
def download_export(
    project_id: str,
    task_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> Union[JSONResponse, Response]:
    from server.main import _require_user_id, app, _error, _now

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    task = app.state.export_tasks.get(task_id)
    if task is None:
        return _error(404, "EXPORT_TASK_NOT_FOUND", "Export task not found")

    if task["projectId"] != project_id or task["userId"] != user_id:
        return _error(403, "FORBIDDEN", "No permission for this export task")

    if task["status"] != "done":
        return _error(409, "EXPORT_NOT_READY", "Export file is not ready yet")

    if task.get("expiresAt"):
        expires_at = datetime.fromisoformat(task["expiresAt"].replace("Z", "+00:00"))
        if _now() > expires_at:
            return _error(410, "EXPORT_LINK_EXPIRED", "Export link has expired")

    file_info = app.state.export_files.get(task_id)
    if file_info is None:
        return _error(404, "EXPORT_FILE_NOT_FOUND", "Export file not found")

    content_type_map = {
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain",
        "pdf": "application/pdf",
        "markdown": "text/markdown",
    }
    content_type = content_type_map.get(file_info["format"], "application/octet-stream")

    return Response(
        content=file_info["data"],
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="export.{file_info["format"]}"'
        },
    )


def _export_task_response(task: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": task["id"],
        "projectId": task["projectId"],
        "userId": task["userId"],
        "format": task["format"],
        "scope": task["scope"],
        "scopeIds": task.get("scopeIds"),
        "status": task["status"],
        "progress": task["progress"],
        "fileUrl": task.get("fileUrl"),
        "expiresAt": task.get("expiresAt"),
        "createdAt": task["createdAt"],
    }
