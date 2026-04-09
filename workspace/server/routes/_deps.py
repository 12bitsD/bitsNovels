from typing import Any, Optional

from fastapi.responses import JSONResponse


def require_project(
    project_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import _error, app

    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return None, _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return None, _error(403, "FORBIDDEN", "No permission for this project")
    return project, None


def require_writable_project(
    project_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import _error, app

    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return None, _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return None, _error(403, "FORBIDDEN", "No permission for this project")
    if project_id in app.state.archived_project_ids:
        return None, _error(409, "PROJECT_ARCHIVED_READ_ONLY", "Project is archived")
    return project, None
