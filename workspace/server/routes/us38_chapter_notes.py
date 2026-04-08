import importlib
from typing import Any, Optional

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(prefix="/api/projects", tags=["us-3.8"])

MAX_CHAPTER_NOTE_CHARS = 2000


def _chapter_note_service() -> Any:
    return importlib.import_module("server.services.chapter_note_service")


class PatchChapterNoteRequest(BaseModel):
    content: str
    saveSource: str

    model_config = {"extra": "forbid"}


def _require_chapter(
    project_id: str,
    chapter_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.routes.us31_editor import _require_chapter as require_editor_chapter

    return require_editor_chapter(project_id, chapter_id, user_id)


def _check_archived(project_id: str) -> Optional[JSONResponse]:
    from server.main import _error, app

    if project_id in app.state.archived_project_ids:
        return _error(409, "PROJECT_ARCHIVED_READ_ONLY", "Project is archived")
    return None


@router.get("/{project_id}/chapters/{chapter_id}/note")
def get_chapter_note(
    project_id: str,
    chapter_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return err

    note = _chapter_note_service().get_note(chapter)
    return JSONResponse(status_code=200, content={"note": note})


@router.patch("/{project_id}/chapters/{chapter_id}/note")
def patch_chapter_note(
    project_id: str,
    chapter_id: str,
    payload: PatchChapterNoteRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return err

    archived_err = _check_archived(project_id)
    if archived_err is not None:
        return archived_err

    char_count = _chapter_note_service().calculate_note_char_count(payload.content)
    if char_count > MAX_CHAPTER_NOTE_CHARS:
        return _error(
            400,
            "CHAPTER_NOTE_TOO_LONG",
            f"Chapter note must be {MAX_CHAPTER_NOTE_CHARS} characters or fewer",
        )

    note = _chapter_note_service().save_note(chapter, payload.content)
    return JSONResponse(status_code=200, content={"note": note})
