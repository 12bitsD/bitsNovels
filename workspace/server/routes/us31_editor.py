from fastapi import APIRouter, Header
from typing import Any, Optional
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/projects", tags=["us-3.1"])


def _require_chapter(
    project_id: str,
    chapter_id: str,
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

    chapter = next(
        (
            c
            for c in app.state.fake_db.chapters
            if c["id"] == chapter_id and c["projectId"] == project_id
        ),
        None,
    )
    if chapter is None:
        return None, _error(404, "CHAPTER_NOT_FOUND", "Chapter not found")

    return chapter, None


def _chapter_content_response(chapter: dict[str, Any]) -> dict[str, Any]:
    from server.main import app

    chapter_id = chapter["id"]
    content_data = app.state.chapter_contents.get(chapter_id, {})
    content = content_data.get("content", "")
    char_count = content_data.get("charCount", 0)

    return {
        "id": chapter["id"],
        "projectId": chapter["projectId"],
        "volumeId": chapter["volumeId"],
        "title": chapter["title"],
        "content": content,
        "charCount": char_count,
        "parseStatus": chapter.get("parserStatus", "empty"),
        "lastEditedAt": chapter.get("lastEditedAt"),
        "updatedAt": chapter.get("updatedAt"),
        "createdAt": chapter.get("createdAt"),
    }


@router.get("/{project_id}/chapters/{chapter_id}")
def get_chapter(
    project_id: str,
    chapter_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return err
    assert chapter is not None

    return JSONResponse(
        status_code=200,
        content={"chapter": _chapter_content_response(chapter)},
    )
