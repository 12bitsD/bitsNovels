from typing import Any, Optional, Protocol, cast

from fastapi import APIRouter, Body, Header
from fastapi.responses import JSONResponse

from server.models.request_models import CreateProjectRequest, DeleteProjectRequest

router = APIRouter(tags=["projects"])

PROJECT_TAGS = {"玄幻", "都市", "科幻", "历史", "言情", "悬疑", "其他"}


class _MainModule(Protocol):
    app: Any

    def _now(self) -> Any: ...
    def _iso_z(self, ts: Any) -> str: ...
    def _error(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[dict[str, Any]] = None,
    ) -> JSONResponse: ...
    def _require_user_id(self, authorization: Optional[str]) -> str | JSONResponse: ...
    def _next_id(self, counter_key: str, prefix: str) -> str: ...


def _m() -> _MainModule:
    from server import main as _main

    return cast(_MainModule, _main)


def _project_response_item(project: dict[str, Any]) -> dict[str, Any]:
    m = _m()
    return {
        "id": project["id"],
        "name": project["name"],
        "tags": project.get("tags", []),
        "description": project.get("description"),
        "coverColor": project.get("coverColor", "#5B8FF9"),
        "type": project.get("type", "novel"),
        "totalChars": project.get("totalChars", 0),
        "chapterCount": project.get("chapterCount", 0),
        "lastEditedChapterId": project.get("lastEditedChapterId"),
        "status": project.get("status", "active"),
        "updatedAt": project.get("updatedAt", m._iso_z(m._now())),
        "createdAt": project.get("createdAt", m._iso_z(m._now())),
    }


@router.get("/api/projects")
def list_projects(
    page: int = 1,
    limit: int = 20,
    sort: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    m = _m()
    maybe_user_id = m._require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    projects = [p for p in m.app.state.fake_db.projects if p["ownerId"] == user_id]
    if type is not None:
        projects = [p for p in projects if p.get("type", "novel") == type]
    if status is not None:
        projects = [p for p in projects if p.get("status", "active") == status]
    else:
        projects = [p for p in projects if p.get("status", "active") != "archived"]
    if search:
        projects = [p for p in projects if search in p.get("name", "")]
    if sort in {"updatedAt", "createdAt", "name", "totalChars"}:
        projects = sorted(
            projects,
            key=lambda p: p.get(sort, p.get("name", "")),
            reverse=sort != "name",
        )
    items = [_project_response_item(p) for p in projects]
    start = max(page - 1, 0) * limit
    end = start + limit
    data = items[start:end]
    return JSONResponse(
        status_code=200,
        content={
            "items": data,
            "data": data,
            "total": len(items),
            "page": page,
            "limit": limit,
        },
    )


@router.get("/api/projects/{project_id}")
def get_project(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    m = _m()
    maybe_user_id = m._require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    project = next(
        (p for p in m.app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return m._error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return m._error(403, "FORBIDDEN", "No permission for this project")
    return JSONResponse(
        status_code=200,
        content={
            "project": _project_response_item(project),
            "lastEditedChapterId": project.get("lastEditedChapterId"),
            "permissions": {
                "read": True,
                "write": project_id not in m.app.state.archived_project_ids,
            },
        },
    )


@router.post("/api/projects/{project_id}/archive")
def archive_project(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    m = _m()
    maybe_user_id = m._require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    project = next(
        (p for p in m.app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return m._error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return m._error(403, "FORBIDDEN", "No permission for this project")
    project["status"] = "archived"
    project["archivedAt"] = m._iso_z(m._now())
    m.app.state.archived_project_ids.add(project_id)
    return JSONResponse(
        status_code=200,
        content={"ok": True, "status": "archived", "archivedAt": project["archivedAt"]},
    )


@router.patch("/api/projects/{project_id}")
def patch_project(
    project_id: str,
    payload: dict[str, Any],
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    m = _m()
    maybe_user_id = m._require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    project = next(
        (p for p in m.app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return m._error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return m._error(403, "FORBIDDEN", "No permission for this project")
    if project_id in m.app.state.archived_project_ids:
        return m._error(409, "PROJECT_ARCHIVED_READ_ONLY", "Project is archived")
    if "name" in payload:
        name = str(payload["name"]).strip()
        if len(name) < 1 or len(name) > 50:
            return m._error(400, "PROJECT_NAME_INVALID", "Project name is invalid")
        project["name"] = name
    if "type" in payload:
        project_type = str(payload["type"])
        if project_type not in {"novel", "medium", "short"}:
            return m._error(400, "PROJECT_TYPE_INVALID", "Project type is invalid")
        project["type"] = project_type
    if "tags" in payload:
        raw_tags = payload["tags"]
        if not isinstance(raw_tags, list):
            return m._error(400, "PROJECT_TAGS_INVALID", "Project tags are invalid")
        tags = [str(tag) for tag in raw_tags]
        if len(tags) > 5 or any(tag not in PROJECT_TAGS for tag in tags):
            return m._error(400, "PROJECT_TAGS_INVALID", "Project tags are invalid")
        project["tags"] = tags
    if "description" in payload:
        description = payload["description"]
        if description is not None and len(str(description)) > 500:
            return m._error(
                400, "PROJECT_DESCRIPTION_TOO_LONG", "Project description is too long"
            )
        project["description"] = None if description is None else str(description)
    if {"name", "type", "tags", "description"} & payload.keys():
        project["updatedAt"] = m._iso_z(m._now())
    return JSONResponse(
        status_code=200,
        content={"ok": True, "project": _project_response_item(project)},
    )


@router.delete("/api/projects/{project_id}")
def delete_project(
    project_id: str,
    payload: DeleteProjectRequest = Body(...),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    m = _m()
    maybe_user_id = m._require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    project = next(
        (p for p in m.app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return m._error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return m._error(403, "FORBIDDEN", "No permission for this project")
    if payload.confirmationName != project.get("name"):
        return m._error(
            400,
            "PROJECT_NAME_CONFIRMATION_MISMATCH",
            "Project confirmation name mismatch",
        )
    m.app.state.fake_db.projects = [
        p for p in m.app.state.fake_db.projects if p["id"] != project_id
    ]
    m.app.state.archived_project_ids.discard(project_id)
    return JSONResponse(status_code=200, content={"ok": True})


@router.post("/api/projects")
def create_project(
    payload: CreateProjectRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    m = _m()
    maybe_user_id = m._require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    name = payload.name.strip()
    if len(name) < 1 or len(name) > 50:
        return m._error(400, "PROJECT_NAME_INVALID", "Project name is invalid")
    if len(payload.tags) > 5 or any(tag not in PROJECT_TAGS for tag in payload.tags):
        return m._error(400, "PROJECT_TAGS_INVALID", "Project tags are invalid")
    if payload.description is not None and len(payload.description) > 500:
        return m._error(
            400, "PROJECT_DESCRIPTION_TOO_LONG", "Project description is too long"
        )
    duplicated = any(
        p["ownerId"] == user_id and p.get("name", "").strip() == name
        for p in m.app.state.fake_db.projects
    )
    if duplicated:
        return m._error(409, "PROJECT_NAME_DUPLICATED", "Project name already exists")
    if "create_project_after_insert_before_outline" in m.app.state.fake_db.failpoints:
        return m._error(500, "PROJECT_CREATE_FAILED", "Project create failed")
    project_id = m._next_id("project_counter", "project")
    now_iso = m._iso_z(m._now())
    project = {
        "id": project_id,
        "ownerId": user_id,
        "name": name,
        "type": payload.type,
        "tags": payload.tags,
        "description": payload.description,
        "status": "active",
        "coverColor": "#5B8FF9",
        "totalChars": 0,
        "chapterCount": 0,
        "lastEditedChapterId": "chapter-1",
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    m.app.state.fake_db.projects.append(project)
    return JSONResponse(
        status_code=201,
        content={
            "projectId": project_id,
            "defaultVolumeId": "volume-1",
            "firstChapterId": "chapter-1",
            "importedEntryCount": 0,
        },
    )
