from __future__ import annotations

from datetime import datetime
from typing import Any, Optional, cast

from server.services._base import app, _iso_z


def _now() -> datetime:
    from server.services._base import _main_module

    return cast(datetime, _main_module()._now())


def ensure_timer_state() -> None:
    if not hasattr(app.state, "timer_sessions"):
        app.state.timer_sessions = []
    if not hasattr(app.state, "timer_session_counter"):
        app.state.timer_session_counter = 0


def _next_session_id() -> str:
    ensure_timer_state()
    session_id = f"timer-session-{app.state.timer_session_counter}"
    app.state.timer_session_counter += 1
    return session_id


def _current_project_chars(project_id: str) -> int:
    total = 0
    for chapter in app.state.fake_db.chapters:
        if chapter["projectId"] != project_id:
            continue
        chapter_data = app.state.chapter_contents.get(chapter["id"], {})
        total += int(chapter_data.get("charCount", 0))
    return total


def _elapsed_seconds(session: dict[str, Any]) -> int:
    started_at = cast(datetime, session["startedAtDt"])
    ended_at = cast(Optional[datetime], session.get("endedAtDt"))
    base_time = ended_at or _now()
    return max(int((base_time - started_at).total_seconds()), 0)


def session_response(session: dict[str, Any]) -> dict[str, Any]:
    response = {
        "id": session["id"],
        "projectId": session["projectId"],
        "chapterId": session.get("chapterId"),
        "mode": session["mode"],
        "status": session["status"],
        "targetDurationSeconds": session.get("targetDurationSeconds"),
        "elapsedSeconds": _elapsed_seconds(session),
        "startChars": session["startChars"],
        "endChars": session.get("endChars"),
        "deltaChars": session.get("deltaChars"),
        "startedAt": session["startedAt"],
        "updatedAt": session["updatedAt"],
        "endedAt": session.get("endedAt"),
    }
    if (
        session["mode"] == "countdown"
        and session.get("targetDurationSeconds") is not None
    ):
        response["remainingSeconds"] = max(
            int(session["targetDurationSeconds"]) - int(response["elapsedSeconds"]),
            0,
        )
    return response


def create_session(
    project_id: str,
    mode: str,
    chapter_id: Optional[str] = None,
    target_duration_seconds: Optional[int] = None,
) -> dict[str, Any]:
    ensure_timer_state()
    now = _now()
    now_iso = _iso_z(now)
    session = {
        "id": _next_session_id(),
        "projectId": project_id,
        "chapterId": chapter_id,
        "mode": mode,
        "status": "running",
        "targetDurationSeconds": target_duration_seconds,
        "startChars": _current_project_chars(project_id),
        "endChars": None,
        "deltaChars": None,
        "startedAt": now_iso,
        "updatedAt": now_iso,
        "endedAt": None,
        "startedAtDt": now,
        "endedAtDt": None,
    }
    app.state.timer_sessions.append(session)
    return session


def get_session(project_id: str, session_id: str) -> Optional[dict[str, Any]]:
    ensure_timer_state()
    return cast(
        Optional[dict[str, Any]],
        next(
            (
                session
                for session in app.state.timer_sessions
                if session["id"] == session_id and session["projectId"] == project_id
            ),
            None,
        ),
    )


def update_session_status(session: dict[str, Any], status: str) -> dict[str, Any]:
    session["status"] = status
    session["updatedAt"] = _iso_z(_now())
    return session


def end_session(session: dict[str, Any]) -> dict[str, Any]:
    now = _now()
    end_chars = _current_project_chars(session["projectId"])
    session["status"] = "completed"
    session["endChars"] = end_chars
    session["deltaChars"] = end_chars - int(session["startChars"])
    session["endedAt"] = _iso_z(now)
    session["updatedAt"] = session["endedAt"]
    session["endedAtDt"] = now
    return session


def list_sessions(project_id: str) -> list[dict[str, Any]]:
    ensure_timer_state()
    sessions = [
        session
        for session in app.state.timer_sessions
        if session["projectId"] == project_id
    ]
    return sorted(sessions, key=lambda session: session["startedAt"], reverse=True)
