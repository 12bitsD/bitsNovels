from typing import Optional

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/projects", tags=["us-1.8"])


@router.post("/{project_id}/unarchive")
def unarchive_project(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "PROJECT_NOT_FOUND",
                    "message": "Project not found",
                    "details": {},
                }
            },
        )
    if project["ownerId"] != user_id:
        return JSONResponse(
            status_code=403,
            content={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "No permission for this project",
                    "details": {},
                }
            },
        )

    project["status"] = "active"
    app.state.archived_project_ids.discard(project_id)
    return JSONResponse(status_code=200, content={"ok": True, "status": "active"})
