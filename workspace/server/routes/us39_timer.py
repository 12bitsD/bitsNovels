import importlib
from typing import Any, Optional

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(tags=["us-3.9"])


def _timer_service() -> Any:
    return importlib.import_module("server.services.timer_service")


class StartSessionRequest(BaseModel):
    projectId: str
    mode: str
    chapterId: Optional[str] = None
    targetDurationSeconds: Optional[int] = None

    model_config = {"extra": "forbid"}


class UpdateSessionRequest(BaseModel):
    status: str

    model_config = {"extra": "forbid"}


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


def _require_chapter(
    project_id: str,
    chapter_id: str,
) -> Optional[dict[str, Any]]:
    from server.main import app

    return next(
        (
            chapter
            for chapter in app.state.fake_db.chapters
            if chapter["projectId"] == project_id and chapter["id"] == chapter_id
        ),
        None,
    )


def _require_session(
    session_id: str,
    authorization: Optional[str],
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return None, maybe_user_id
    user_id = maybe_user_id

    for project in _timer_service().app.state.fake_db.projects:
        if project["ownerId"] != user_id:
            continue
        session = _timer_service().get_session(project["id"], session_id)
        if session is not None:
            return session, None
    return None, _error(404, "TIMER_SESSION_NOT_FOUND", "Timer session not found")


@router.post("/api/sessions")
def start_session(
    payload: StartSessionRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(payload.projectId, user_id)
    if err is not None:
        return err
    if payload.mode not in {"stopwatch", "countdown"}:
        return _error(400, "TIMER_MODE_INVALID", "Timer mode is invalid")
    if payload.mode == "countdown" and not payload.targetDurationSeconds:
        return _error(
            400,
            "TIMER_DURATION_REQUIRED",
            "Countdown timer requires target duration",
        )
    if (
        payload.chapterId is not None
        and _require_chapter(payload.projectId, payload.chapterId) is None
    ):
        return _error(404, "CHAPTER_NOT_FOUND", "Chapter not found")

    session = _timer_service().create_session(
        project_id=payload.projectId,
        mode=payload.mode,
        chapter_id=payload.chapterId,
        target_duration_seconds=payload.targetDurationSeconds,
    )
    return JSONResponse(
        status_code=201, content={"session": _timer_service().session_response(session)}
    )


@router.patch("/api/sessions/{session_id}")
def update_session(
    session_id: str,
    payload: UpdateSessionRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    session, err = _require_session(session_id, authorization)
    if err is not None:
        return err
    if payload.status not in {"running", "paused"}:
        return _error(400, "TIMER_STATUS_INVALID", "Timer status is invalid")

    updated = _timer_service().update_session_status(session, payload.status)
    return JSONResponse(
        status_code=200,
        content={"session": _timer_service().session_response(updated)},
    )


@router.post("/api/sessions/{session_id}/end")
def end_session(
    session_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    session, err = _require_session(session_id, authorization)
    if err is not None:
        return err

    ended = _timer_service().end_session(session)
    return JSONResponse(
        status_code=200, content={"session": _timer_service().session_response(ended)}
    )


@router.get("/api/projects/{project_id}/sessions")
def list_sessions(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    sessions = [
        _timer_service().session_response(session)
        for session in _timer_service().list_sessions(project_id)
    ]
    return JSONResponse(status_code=200, content={"sessions": sessions})
