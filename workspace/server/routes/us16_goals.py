from datetime import date, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/projects", tags=["us-1.6"])


@router.get("/{project_id}/goals")
def get_goals(
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

    goals = app.state.goals.get(project_id)
    if goals:
        return JSONResponse(
            status_code=200,
            content={
                "dailyWordTarget": goals.get("dailyWordTarget"),
                "totalWordTarget": goals.get("totalWordTarget"),
                "deadline": goals.get("deadline"),
            },
        )
    return JSONResponse(
        status_code=200,
        content={
            "dailyWordTarget": None,
            "totalWordTarget": None,
            "deadline": None,
        },
    )


@router.put("/{project_id}/goals")
def put_goals(
    project_id: str,
    payload: dict[str, Any],
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _now, _require_user_id, app

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

    daily = payload.get("dailyWordTarget")
    total = payload.get("totalWordTarget")
    deadline_str = payload.get("deadline")

    if daily is not None:
        if not isinstance(daily, int) or daily < 100 or daily > 50000:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "dailyWordTarget must be between 100 and 50000",
                        "details": {},
                    }
                },
            )

    if total is not None:
        if not isinstance(total, int) or total < 1000 or total > 5000000:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "totalWordTarget must be between 1000 and 5000000",
                        "details": {},
                    }
                },
            )

    if deadline_str is not None:
        try:
            deadline_dt = date.fromisoformat(deadline_str)
        except ValueError:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "deadline must be a valid date in YYYY-MM-DD format",
                        "details": {},
                    }
                },
            )
        today = _now().date()
        if deadline_dt <= today:
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "deadline must be later than today",
                        "details": {},
                    }
                },
            )

    current_goals = app.state.goals.get(project_id, {})
    updated_goals = {**current_goals}

    if daily is not None:
        updated_goals["dailyWordTarget"] = daily
    if total is not None:
        updated_goals["totalWordTarget"] = total
    if deadline_str is not None:
        updated_goals["deadline"] = deadline_str

    app.state.goals[project_id] = updated_goals

    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "goals": {
                "dailyWordTarget": updated_goals.get("dailyWordTarget"),
                "totalWordTarget": updated_goals.get("totalWordTarget"),
                "deadline": updated_goals.get("deadline"),
            },
        },
    )


@router.delete("/{project_id}/goals")
def delete_goals(
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

    if project_id in app.state.goals:
        del app.state.goals[project_id]

    return JSONResponse(status_code=200, content={"ok": True})


@router.get("/{project_id}/writing-stats")
def get_writing_stats(
    project_id: str,
    range_: str = "30d",
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _now, _require_user_id, app

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

    now = _now()
    today_date = now.date().isoformat()

    chapters = [c for c in app.state.fake_db.chapters if c["projectId"] == project_id]

    today_written_chars = 0
    for c in chapters:
        last_edited = c.get("lastEditedAt", "")
        if last_edited.startswith(today_date):
            today_written_chars += c.get("chars", 0)

    writing_stats_list: list[dict[str, Any]] = app.state.writing_stats.get(
        project_id, []
    )

    trend_map: dict[str, int] = {}
    for stat in writing_stats_list:
        trend_map[stat["date"]] = stat.get("writtenChars", 0)

    trend30d: list[int] = []
    for i in range(29, -1, -1):
        day = (now.date() - timedelta(days=i)).isoformat()
        trend30d.append(trend_map.get(day, 0))

    goals = app.state.goals.get(project_id, {})
    total_word_target = goals.get("totalWordTarget")

    total_chars = sum(c.get("chars", 0) for c in chapters)

    if total_word_target and total_word_target > 0:
        total_progress = min(100.0, (total_chars / total_word_target) * 100)
    else:
        total_progress = 0.0

    estimated_completion_date: Optional[str] = None
    if total_word_target and total_word_target > 0 and total_progress < 100:
        recent_stats = writing_stats_list[-7:] if writing_stats_list else []
        if recent_stats:
            total_recent_chars = sum(s.get("writtenChars", 0) for s in recent_stats)
            days_count = len(recent_stats)
            daily_avg = total_recent_chars / days_count if days_count > 0 else 0
            remaining_chars = total_word_target - total_chars
            if daily_avg > 0:
                days_needed = int(remaining_chars / daily_avg)
                est_date = now.date() + timedelta(days=days_needed)
                estimated_completion_date = est_date.isoformat()

    return JSONResponse(
        status_code=200,
        content={
            "todayWrittenChars": today_written_chars,
            "trend30d": trend30d,
            "totalProgress": total_progress,
            "estimatedCompletionDate": estimated_completion_date,
        },
    )
