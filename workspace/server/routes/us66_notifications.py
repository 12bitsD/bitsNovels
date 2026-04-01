from typing import Any, Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/me", tags=["us-6.6"])

CATEGORY_MAP = {
    "ai_parse": ["parse_done", "parse_failed"],
    "backup_export": ["backup_done", "backup_failed", "export_done"],
    "consistency_foreshadow": [
        "consistency_issue",
        "foreshadow_reminder",
        "foreshadow_warning",
        "snapshot_expire",
        "recycle_expire",
    ],
    "system": ["storage_warning", "storage_critical", "system_announcement"],
}


def _notification_response(n: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": n["id"],
        "userId": n["userId"],
        "type": n["type"],
        "title": n["title"],
        "body": n["body"],
        "projectId": n.get("projectId"),
        "read": n["read"],
        "actionTarget": n.get("actionTarget"),
        "createdAt": n["createdAt"],
    }


def _filter_by_category(
    notifications: list[dict[str, Any]], category: str
) -> list[dict[str, Any]]:
    if category == "all":
        return notifications
    allowed_types = CATEGORY_MAP.get(category, [])
    return [n for n in notifications if n["type"] in allowed_types]


@router.get("/notifications")
def list_notifications(
    category: Optional[str] = None,
    read: Optional[bool] = None,
    cursor: Optional[str] = None,
    limit: int = Query(default=20, ge=1, le=100),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    notifications = [
        n for n in app.state.fake_db.notifications if n["userId"] == user_id
    ]

    if category is not None:
        notifications = _filter_by_category(notifications, category)

    if read is not None:
        notifications = [n for n in notifications if n["read"] == read]

    notifications = sorted(notifications, key=lambda x: x["createdAt"], reverse=True)

    total = len(notifications)

    start_idx = 0
    if cursor is not None:
        try:
            start_idx = int(cursor)
        except ValueError:
            start_idx = 0

    end_idx = start_idx + limit
    page_items = notifications[start_idx:end_idx]

    has_more = end_idx < total
    next_cursor = str(end_idx) if has_more else None

    return JSONResponse(
        status_code=200,
        content={
            "items": [_notification_response(n) for n in page_items],
            "total": total,
            "cursor": next_cursor,
            "hasMore": has_more,
        },
    )


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _error

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    notification = next(
        (
            n
            for n in app.state.fake_db.notifications
            if n["id"] == notification_id and n["userId"] == user_id
        ),
        None,
    )

    if notification is None:
        return _error(404, "NOTIFICATION_NOT_FOUND", "Notification not found")

    notification["read"] = True
    return JSONResponse(status_code=204, content=None)


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    count = 0
    for n in app.state.fake_db.notifications:
        if n["userId"] == user_id and not n["read"]:
            n["read"] = True
            count += 1

    return JSONResponse(status_code=200, content={"count": count})


@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _error

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    notification = next(
        (
            n
            for n in app.state.fake_db.notifications
            if n["id"] == notification_id and n["userId"] == user_id
        ),
        None,
    )

    if notification is None:
        return _error(404, "NOTIFICATION_NOT_FOUND", "Notification not found")

    app.state.fake_db.notifications = [
        n
        for n in app.state.fake_db.notifications
        if not (n["id"] == notification_id and n["userId"] == user_id)
    ]

    return JSONResponse(status_code=204, content=None)


@router.delete("/notifications")
def clear_read_notifications(
    scope: Optional[str] = None,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    if scope == "read":
        before_count = len(app.state.fake_db.notifications)
        app.state.fake_db.notifications = [
            n
            for n in app.state.fake_db.notifications
            if not (n["userId"] == user_id and n["read"])
        ]
        after_count = len(app.state.fake_db.notifications)
        deleted_count = before_count - after_count
        return JSONResponse(status_code=200, content={"count": deleted_count})

    return JSONResponse(status_code=200, content={"count": 0})


@router.get("/notifications/unread-count")
def get_unread_count(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    count = sum(
        1
        for n in app.state.fake_db.notifications
        if n["userId"] == user_id and not n["read"]
    )

    return JSONResponse(status_code=200, content={"count": count})
