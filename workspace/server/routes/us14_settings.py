from fastapi import APIRouter, Header
from typing import Optional
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/projects", tags=["us-1.4"])


@router.get("/{project_id}/settings")
def get_project_settings(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import app, _require_user_id, _project_response_item

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

    volumes = [v for v in app.state.fake_db.volumes if v["projectId"] == project_id]
    chapters = [c for c in app.state.fake_db.chapters if c["projectId"] == project_id]
    total_chars = sum(c.get("chars", 0) for c in chapters)
    kb_entries = 0

    stats = {
        "volumeCount": len(volumes),
        "chapterCount": len(chapters),
        "totalChars": total_chars,
        "kbEntryCount": kb_entries,
    }

    tabs = [
        {"id": "basic", "label": "基本信息"},
        {"id": "goals", "label": "写作目标"},
        {"id": "ai", "label": "AI 配置"},
        {"id": "backup", "label": "备份与恢复"},
    ]

    return JSONResponse(
        status_code=200,
        content={
            "project": _project_response_item(project),
            "stats": stats,
            "tabs": tabs,
        },
    )
