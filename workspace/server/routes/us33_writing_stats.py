from datetime import date, timedelta
from typing import Any, Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse

from server.routes._deps import require_project as _require_project

router = APIRouter(prefix="/api/projects", tags=["us-3.3"])


@router.get("/{project_id}/writing-stats/summary")
def get_writing_stats_summary(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _now, _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    now = _now()
    today_date = now.date()
    today_iso = today_date.isoformat()

    writing_stats_list: list[dict[str, Any]] = app.state.writing_stats.get(
        project_id, []
    )

    stats_map: dict[str, int] = {}
    for stat in writing_stats_list:
        stats_map[stat["date"]] = stat.get("writtenChars", 0)

    today_chars = stats_map.get(today_iso, 0)

    week_start = today_date - timedelta(days=today_date.weekday())
    week_chars = 0
    for i in range(7):
        day_date = (week_start + timedelta(days=i)).isoformat()
        week_chars += stats_map.get(day_date, 0)

    month_start = today_date.replace(day=1)
    month_chars = 0
    current = month_start
    while current <= today_date:
        day_date = current.isoformat()
        month_chars += stats_map.get(day_date, 0)
        current += timedelta(days=1)

    chapters = [c for c in app.state.fake_db.chapters if c["projectId"] == project_id]
    total_chars = sum(c.get("chars", 0) for c in chapters)

    days_with_writing = len([d for d in stats_map.values() if d > 0])
    daily_average = total_chars / days_with_writing if days_with_writing > 0 else 0

    sorted_dates = sorted(stats_map.keys())
    consecutive_days = 0
    if sorted_dates:
        check_date = today_date
        for i in range(len(sorted_dates) - 1, -1, -1):
            if sorted_dates[i] == check_date.isoformat():
                consecutive_days += 1
                check_date -= timedelta(days=1)
            elif sorted_dates[i] < check_date.isoformat():
                break

    highest_day_chars = 0
    highest_day_date: Optional[str] = None
    for stat_date, chars in stats_map.items():
        if chars > highest_day_chars:
            highest_day_chars = chars
            highest_day_date = stat_date

    return JSONResponse(
        status_code=200,
        content={
            "todayChars": today_chars,
            "weekChars": week_chars,
            "monthChars": month_chars,
            "totalChars": total_chars,
            "dailyAverage": daily_average,
            "consecutiveDays": consecutive_days,
            "highestDayChars": highest_day_chars,
            "highestDayDate": highest_day_date,
        },
    )


@router.get("/{project_id}/writing-stats/daily")
def get_writing_stats_daily(
    project_id: str,
    range_param: str = Query(default="30d", alias="range"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _now, _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    days = int(range_param.rstrip("d"))
    now = _now()

    writing_stats_list: list[dict[str, Any]] = app.state.writing_stats.get(
        project_id, []
    )

    stats_map: dict[str, int] = {}
    for stat in writing_stats_list:
        stats_map[stat["date"]] = stat.get("writtenChars", 0)

    data = []
    for i in range(days - 1, -1, -1):
        day_date = (now.date() - timedelta(days=i)).isoformat()
        data.append({"date": day_date, "chars": stats_map.get(day_date, 0)})

    return JSONResponse(status_code=200, content={"data": data})


@router.get("/{project_id}/writing-stats/weekly")
def get_writing_stats_weekly(
    project_id: str,
    range_param: str = Query(default="12w", alias="range"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _now, _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    weeks = int(range_param.rstrip("w"))
    now = _now()

    writing_stats_list: list[dict[str, Any]] = app.state.writing_stats.get(
        project_id, []
    )

    stats_map: dict[str, int] = {}
    for stat in writing_stats_list:
        stats_map[stat["date"]] = stat.get("writtenChars", 0)

    data = []
    for i in range(weeks - 1, -1, -1):
        week_start_date = now.date() - timedelta(weeks=i, days=now.date().weekday())
        week_chars = 0
        for j in range(7):
            day_date = (week_start_date + timedelta(days=j)).isoformat()
            week_chars += stats_map.get(day_date, 0)
        data.append({"weekStart": week_start_date.isoformat(), "chars": week_chars})

    return JSONResponse(status_code=200, content={"data": data})


@router.get("/{project_id}/writing-stats/heatmap")
def get_writing_stats_heatmap(
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

    hourly_stats: dict[int, int] = {hour: 0 for hour in range(24)}

    writing_stats_list: list[dict[str, Any]] = app.state.writing_stats.get(
        project_id, []
    )

    for stat in writing_stats_list:
        if "hourlyData" in stat:
            for hour_data in stat["hourlyData"]:
                hour = hour_data.get("hour", 0)
                chars = hour_data.get("chars", 0)
                if 0 <= hour <= 23:
                    hourly_stats[hour] += chars

    data = [{"hour": hour, "chars": chars} for hour, chars in hourly_stats.items()]

    return JSONResponse(status_code=200, content={"data": data})


@router.get("/{project_id}/writing-stats/by-volume")
def get_writing_stats_by_volume(
    project_id: str,
    sort: str = "order",
    order: str = "asc",
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

    volumes = [v for v in app.state.fake_db.volumes if v["projectId"] == project_id]
    chapters = [c for c in app.state.fake_db.chapters if c["projectId"] == project_id]

    volume_stats = []
    for volume in volumes:
        volume_id = volume["id"]
        volume_chapters = [c for c in chapters if c["volumeId"] == volume_id]
        total_chars = sum(c.get("chars", 0) for c in volume_chapters)
        chapter_count = len(volume_chapters)

        volume_stats.append(
            {
                "id": volume_id,
                "name": volume["name"],
                "totalChars": total_chars,
                "chapterCount": chapter_count,
            }
        )

    reverse = order == "desc"
    if sort == "totalChars":
        volume_stats.sort(key=lambda x: x["totalChars"], reverse=reverse)
    elif sort == "chapterCount":
        volume_stats.sort(key=lambda x: x["chapterCount"], reverse=reverse)
    else:
        volume_stats.sort(
            key=lambda x: volumes.index(next(v for v in volumes if v["id"] == x["id"])),
            reverse=reverse,
        )

    return JSONResponse(status_code=200, content={"data": volume_stats})


@router.get("/{project_id}/writing-stats/by-chapter")
def get_writing_stats_by_chapter(
    project_id: str,
    sort: str = "order",
    order: str = "asc",
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

    chapters = [c for c in app.state.fake_db.chapters if c["projectId"] == project_id]

    chapter_stats = []
    for chapter in chapters:
        chapter_stats.append(
            {
                "id": chapter["id"],
                "title": chapter["title"],
                "volumeId": chapter["volumeId"],
                "charCount": chapter.get("chars", 0),
            }
        )

    reverse = order == "desc"
    if sort == "charCount":
        chapter_stats.sort(key=lambda x: x["charCount"], reverse=reverse)
    else:
        chapter_stats.sort(
            key=lambda x: chapters.index(
                next(c for c in chapters if c["id"] == x["id"])
            ),
            reverse=reverse,
        )

    return JSONResponse(status_code=200, content={"data": chapter_stats})
