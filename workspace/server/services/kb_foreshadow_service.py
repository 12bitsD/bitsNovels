from __future__ import annotations

import importlib
from datetime import datetime
from typing import Any, Optional, cast

from server.services._base import app, _iso_z, _main_module


def _kb_core_service() -> Any:
    return importlib.import_module("server.services.kb_core_service")


FORESHADOW_STATUSES = {
    "unresolved",
    "partially_resolved",
    "resolved",
    "abandoned",
}
RESOLUTION_MARKERS = ("原来", "真相", "揭晓", "竟是", "才知")


def _now() -> datetime:
    return cast(datetime, _main_module()._now())


def _next_id(counter_key: str, prefix: str) -> str:
    return cast(str, _main_module()._next_id(counter_key, prefix))


def _active_foreshadows(project_id: str) -> list[dict[str, Any]]:
    return [
        entity
        for entity in app.state.kb_foreshadows.values()
        if entity.get("projectId") == project_id and entity.get("deletedAt") is None
    ]


def _chapter(project_id: str, chapter_id: Optional[str]) -> Optional[dict[str, Any]]:
    if not chapter_id:
        return None
    return cast(
        Optional[dict[str, Any]],
        next(
            (
                chapter
                for chapter in app.state.fake_db.chapters
                if chapter["projectId"] == project_id and chapter["id"] == chapter_id
            ),
            None,
        ),
    )


def _chapter_order_map(project_id: str) -> dict[str, int]:
    chapters = sorted(
        [
            chapter
            for chapter in app.state.fake_db.chapters
            if chapter["projectId"] == project_id
        ],
        key=lambda chapter: (int(chapter.get("order", 0)), str(chapter["id"])),
    )
    return {cast(str, chapter["id"]): index for index, chapter in enumerate(chapters)}


def _notification_enabled(user_id: str, notification_type: str) -> bool:
    user_settings = getattr(app.state, "user_settings", {})
    settings = cast(Optional[dict[str, Any]], user_settings.get(user_id))
    if not settings:
        return True
    notifications = cast(dict[str, Any], settings.get("notifications") or {})
    if notifications.get("muteAll") is True:
        return False
    for item in cast(list[dict[str, Any]], notifications.get("items") or []):
        if item.get("type") == notification_type:
            return bool(item.get("inApp", True))
    return True


def _send_notification(
    user_id: str,
    project_id: str,
    foreshadow: dict[str, Any],
    notification_type: str,
) -> None:
    if not _notification_enabled(user_id, notification_type):
        return
    title = (
        "伏笔回收提醒" if notification_type == "foreshadow_reminder" else "伏笔回收警告"
    )
    expected = foreshadow.get("expectedResolveChapterId")
    body = (
        f"伏笔《{foreshadow['name']}》已到预期回收章节 {expected}，当前仍未回收。"
        if notification_type == "foreshadow_reminder"
        else f"伏笔《{foreshadow['name']}》已超过预期回收章节 5 章，建议尽快处理。"
    )
    app.state.fake_db.notifications.append(
        {
            "id": _next_id("notification_counter", "notif"),
            "userId": user_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "projectId": project_id,
            "read": False,
            "createdAt": _iso_z(_now()),
            "actionTarget": {
                "kind": "foreshadow_panel",
                "projectId": project_id,
                "entityId": foreshadow["id"],
            },
        }
    )


def _normalize_notify_state(value: Optional[dict[str, Any]] = None) -> dict[str, bool]:
    state = value or {}
    return {
        "reminded": bool(state.get("reminded", False)),
        "warned": bool(state.get("warned", False)),
    }


def _keyword_variants(*values: str) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        cleaned = value.strip()
        if len(cleaned) < 2:
            continue
        for candidate in [cleaned]:
            if candidate not in seen:
                seen.add(candidate)
                ordered.append(candidate)
        max_size = min(len(cleaned), 4)
        for size in range(max_size, 1, -1):
            for index in range(0, len(cleaned) - size + 1):
                candidate = cleaned[index : index + size]
                if candidate not in seen:
                    seen.add(candidate)
                    ordered.append(candidate)
    return [candidate for candidate in ordered if len(candidate) >= 2]


def _response(foreshadow: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": foreshadow["id"],
        "projectId": foreshadow["projectId"],
        "type": foreshadow["type"],
        "source": foreshadow["source"],
        "confirmed": foreshadow["confirmed"],
        "remark": foreshadow.get("remark"),
        "createdAt": foreshadow["createdAt"],
        "updatedAt": foreshadow["updatedAt"],
        "deletedAt": foreshadow.get("deletedAt"),
        "restoreUntil": foreshadow.get("restoreUntil"),
        "name": foreshadow["name"],
        "summary": foreshadow["summary"],
        "plantedChapterId": foreshadow["plantedChapterId"],
        "quote": foreshadow["quote"],
        "status": foreshadow["status"],
        "expectedResolveChapterId": foreshadow.get("expectedResolveChapterId"),
        "resolvedChapterId": foreshadow.get("resolvedChapterId"),
        "resolveNote": foreshadow.get("resolveNote"),
        "aiSuggestions": foreshadow.get("aiSuggestions", []),
        "notifyState": _normalize_notify_state(foreshadow.get("notifyState")),
        "rawAI": foreshadow.get("rawAI"),
    }


def list_foreshadows(
    project_id: str,
    *,
    status: Optional[str] = None,
    query: Optional[str] = None,
    group_by_status: bool = False,
) -> dict[str, Any]:
    items = [_response(item) for item in _active_foreshadows(project_id)]
    if status:
        items = [item for item in items if item["status"] == status]
    if query:
        needle = query.strip().lower()
        items = [
            item
            for item in items
            if needle in item["name"].lower() or needle in item["summary"].lower()
        ]
    items.sort(key=lambda item: (item["status"], item["createdAt"], item["id"]))
    response = {"items": items, "total": len(items)}
    if group_by_status:
        groups = {status_name: [] for status_name in FORESHADOW_STATUSES}
        for item in items:
            groups[item["status"]].append(item)
        response["groups"] = groups
    return response


def get_foreshadow(project_id: str, entity_id: str) -> dict[str, Any]:
    foreshadow = _kb_core_service()._require_entity(project_id, "foreshadow", entity_id)
    return _response(foreshadow)


def create_foreshadow(project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    created = _kb_core_service().create_kb_entity(
        project_id,
        "foreshadow",
        {
            "name": payload["name"],
            "summary": payload.get("summary") or payload["name"],
            "plantedChapterId": payload["plantedChapterId"],
            "quote": payload.get("quote", ""),
            "status": payload.get("status", "unresolved"),
            "expectedResolveChapterId": payload.get("expectedResolveChapterId"),
            "resolvedChapterId": payload.get("resolvedChapterId"),
            "resolveNote": payload.get("resolveNote"),
            "source": payload.get("source", "manual"),
            "confirmed": bool(payload.get("confirmed", False)),
            "chapterIds": [payload["plantedChapterId"]],
            "aiSuggestions": cast(
                list[dict[str, Any]], payload.get("aiSuggestions", [])
            ),
            "notifyState": _normalize_notify_state(payload.get("notifyState")),
            "rawAI": payload.get("rawAI"),
        },
    )
    return _response(created)


def update_foreshadow(
    project_id: str, entity_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
    foreshadow = _kb_core_service()._require_entity(project_id, "foreshadow", entity_id)
    updates: dict[str, Any] = {}
    if "name" in payload and payload["name"] is not None:
        updates["name"] = str(payload["name"]).strip()
    if "summary" in payload:
        updates["summary"] = payload.get("summary")
    if "quote" in payload:
        updates["quote"] = payload.get("quote")
    if "expectedResolveChapterId" in payload:
        updates["expectedResolveChapterId"] = payload.get("expectedResolveChapterId")
    if "status" in payload:
        updates["status"] = payload["status"]
        if payload["status"] == "resolved":
            updates["resolvedChapterId"] = payload.get("resolvedChapterId")
            updates["resolveNote"] = payload.get("resolveNote")
            updates["notifyState"] = {"reminded": False, "warned": False}
        elif payload["status"] == "abandoned":
            updates["resolvedChapterId"] = None
            updates["resolveNote"] = None
            updates["notifyState"] = {"reminded": False, "warned": False}
        elif payload["status"] == "partially_resolved":
            updates["resolvedChapterId"] = payload.get(
                "resolvedChapterId", foreshadow.get("resolvedChapterId")
            )
            updates["resolveNote"] = payload.get(
                "resolveNote", foreshadow.get("resolveNote")
            )
    updated = _kb_core_service().update_kb_entity(
        project_id, "foreshadow", entity_id, updates
    )
    return _response(updated)


def soft_delete_foreshadow(project_id: str, entity_id: str) -> dict[str, Any]:
    deleted = _kb_core_service().soft_delete_kb_entity(
        project_id, "foreshadow", entity_id
    )
    return _response(deleted)


def process_parser_findings(
    project_id: str, chapter_id: str, content: str
) -> dict[str, int]:
    created_count = 0
    suggestion_count = 0
    markers = [
        marker
        for marker in ("似乎", "隐约", "也许", "注定", "伏笔")
        if marker in content
    ]
    for marker in markers[:1]:
        _, is_new = _kb_core_service().upsert_parser_entity(
            project_id,
            "foreshadow",
            {
                "name": f"{chapter_id}-{marker}",
                "summary": marker,
                "source": "ai",
                "confirmed": False,
                "chapterIds": [chapter_id],
                "plantedChapterId": chapter_id,
                "quote": content,
                "aiSuggestions": [],
                "notifyState": {"reminded": False, "warned": False},
                "rawAI": {"marker": marker},
            },
        )
        if is_new:
            created_count += 1

    if not any(marker in content for marker in RESOLUTION_MARKERS):
        return {"created": created_count, "suggestions": suggestion_count}

    created_at = _iso_z(_now())
    lowered = content.lower()
    for foreshadow in _active_foreshadows(project_id):
        if foreshadow.get("status") in {"resolved", "abandoned"}:
            continue
        keywords = _keyword_variants(
            cast(str, foreshadow.get("name", "")),
            cast(str, foreshadow.get("summary", "")),
            cast(str, foreshadow.get("quote", "")),
        )
        matched_keyword = next(
            (keyword for keyword in keywords if keyword.lower() in lowered),
            None,
        )
        if matched_keyword is None:
            continue
        suggestions = cast(list[dict[str, Any]], foreshadow.get("aiSuggestions", []))
        if any(suggestion.get("chapterId") == chapter_id for suggestion in suggestions):
            continue
        suggestions.append(
            {
                "chapterId": chapter_id,
                "message": f"AI 猜测“{matched_keyword}”可能在本章得到回收。",
                "confidence": "medium",
                "createdAt": created_at,
            }
        )
        _kb_core_service().update_kb_entity(
            project_id,
            "foreshadow",
            cast(str, foreshadow["id"]),
            {"aiSuggestions": suggestions},
        )
        suggestion_count += 1
    return {"created": created_count, "suggestions": suggestion_count}


def check_notifications(
    project_id: str, current_chapter_id: str, user_id: str
) -> dict[str, int]:
    chapter_orders = _chapter_order_map(project_id)
    current_order = chapter_orders.get(current_chapter_id)
    if current_order is None:
        raise KeyError(current_chapter_id)
    reminders = 0
    warnings = 0
    for foreshadow in _active_foreshadows(project_id):
        if foreshadow.get("status") in {"resolved", "abandoned"}:
            if foreshadow.get("notifyState") != {"reminded": False, "warned": False}:
                _kb_core_service().update_kb_entity(
                    project_id,
                    "foreshadow",
                    cast(str, foreshadow["id"]),
                    {"notifyState": {"reminded": False, "warned": False}},
                )
            continue
        expected_chapter_id = cast(
            Optional[str], foreshadow.get("expectedResolveChapterId")
        )
        expected_order = (
            chapter_orders.get(expected_chapter_id)
            if expected_chapter_id is not None
            else None
        )
        if expected_order is None:
            continue
        notify_state = _normalize_notify_state(
            cast(Optional[dict[str, Any]], foreshadow.get("notifyState"))
        )
        updates: dict[str, Any] = {}
        if current_order >= expected_order and not notify_state["reminded"]:
            _send_notification(user_id, project_id, foreshadow, "foreshadow_reminder")
            notify_state["reminded"] = True
            reminders += 1
        if current_order >= expected_order + 5 and not notify_state["warned"]:
            _send_notification(user_id, project_id, foreshadow, "foreshadow_warning")
            notify_state["warned"] = True
            warnings += 1
        if notify_state != _normalize_notify_state(
            cast(Optional[dict[str, Any]], foreshadow.get("notifyState"))
        ):
            updates["notifyState"] = notify_state
        if updates:
            _kb_core_service().update_kb_entity(
                project_id,
                "foreshadow",
                cast(str, foreshadow["id"]),
                updates,
            )
    return {"reminders": reminders, "warnings": warnings}
