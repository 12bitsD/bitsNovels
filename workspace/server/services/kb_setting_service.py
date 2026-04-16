from __future__ import annotations

from typing import Any, Optional, cast

from server.services._base import app
from server.services.kb_core_service import (
    create_kb_entity,
    soft_delete_kb_entity,
    update_kb_entity,
)
from server.utils.kb_helpers import ensure_kb_state


def _active_settings(project_id: str) -> list[dict[str, Any]]:
    ensure_kb_state(app.state)
    return [
        cast(dict[str, Any], entity)
        for entity in app.state.kb_settings.values()
        if entity.get("projectId") == project_id
        and entity.get("type") == "setting"
        and entity.get("deletedAt") is None
    ]


def _require_setting(project_id: str, entity_id: str) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = cast(Optional[dict[str, Any]], app.state.kb_settings.get(entity_id))
    if (
        entity is None
        or entity.get("projectId") != project_id
        or entity.get("type") != "setting"
        or entity.get("deletedAt") is not None
    ):
        raise KeyError(entity_id)
    return entity


def _matches_query(entity: dict[str, Any], query: str) -> bool:
    q = query.strip().lower()
    if not q:
        return True
    fields = [
        cast(str, entity.get("title") or ""),
        cast(str, entity.get("category") or ""),
        cast(str, entity.get("content") or ""),
    ]
    return any(q in field.lower() for field in fields)


def setting_response(entity: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": entity["id"],
        "projectId": entity["projectId"],
        "type": entity["type"],
        "source": entity["source"],
        "confirmed": entity["confirmed"],
        "isRejected": entity.get("isRejected", False),
        "remark": entity.get("remark"),
        "createdAt": entity["createdAt"],
        "updatedAt": entity["updatedAt"],
        "deletedAt": entity.get("deletedAt"),
        "restoreUntil": entity.get("restoreUntil"),
        "title": entity.get("title") or entity.get("name"),
        "category": entity.get("category", "other"),
        "content": entity.get("content", ""),
        "order": int(entity.get("order", 0)),
        "relatedEntityRefs": cast(
            list[dict[str, Any]], entity.get("relatedEntityRefs", [])
        ),
        "rawAI": entity.get("rawAI"),
    }


def list_settings(
    project_id: str, query: str = "", category: str = ""
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for entity in _active_settings(project_id):
        if category and cast(str, entity.get("category", "")) != category:
            continue
        if not _matches_query(entity, query):
            continue
        items.append(entity)
    return sorted(items, key=lambda e: (int(e.get("order", 0)), cast(str, e.get("updatedAt", ""))))


def get_setting(project_id: str, entity_id: str) -> dict[str, Any]:
    return _require_setting(project_id, entity_id)


def create_setting(project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    title = cast(str, payload.get("title") or "").strip()
    return create_kb_entity(
        project_id,
        "setting",
        {
            "name": title,
            "title": title,
            "category": cast(str, payload.get("category") or "other").strip(),
            "content": cast(str, payload.get("content") or "").strip(),
            "order": int(payload.get("order", 0)),
            "relatedEntityRefs": payload.get("relatedEntityRefs", []),
            "source": payload.get("source", "manual"),
            "confirmed": bool(payload.get("confirmed", False)),
            "rawAI": payload.get("rawAI"),
            "remark": payload.get("remark"),
        },
    )


def update_setting(project_id: str, entity_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(patch)
    if "title" in normalized and "name" not in normalized:
        normalized["name"] = normalized["title"]
    _require_setting(project_id, entity_id)
    return update_kb_entity(project_id, "setting", entity_id, normalized)


def soft_delete_setting(project_id: str, entity_id: str) -> dict[str, Any]:
    _require_setting(project_id, entity_id)
    return soft_delete_kb_entity(project_id, "setting", entity_id)

