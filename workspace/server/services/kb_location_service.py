from __future__ import annotations

from typing import Any, Optional, cast

from server.services._base import _main_module, app
from server.services.kb_core_service import (
    bulk_confirm_entities,
    confirm_kb_entity,
    create_kb_entity,
    reject_kb_entity,
    soft_delete_kb_entity,
    update_kb_entity,
)
from server.utils.kb_helpers import dedupe_entity, ensure_kb_state, merge_aliases

VALID_LOCATION_TYPES = {"city", "village", "building", "nature", "virtual", "other"}


def _now() -> Any:
    return _main_module()._now()


def _ensure_exclusions() -> None:
    if not hasattr(app.state, "kb_parser_exclusions"):
        app.state.kb_parser_exclusions = {}


def _normalized(value: str) -> str:
    return value.strip().lower()


def _project_exclusions(project_id: str) -> dict[str, set[str]]:
    _ensure_exclusions()
    project_exclusions = app.state.kb_parser_exclusions.setdefault(project_id, {})
    return cast(dict[str, set[str]], project_exclusions)


def _excluded_names(project_id: str) -> set[str]:
    return _project_exclusions(project_id).setdefault("location", set())


def _active_locations(project_id: str) -> list[dict[str, Any]]:
    ensure_kb_state(app.state)
    return [
        cast(dict[str, Any], entity)
        for entity in app.state.kb_items.values()
        if entity.get("projectId") == project_id
        and entity.get("type") == "location"
        and entity.get("deletedAt") is None
    ]


def _require_location(project_id: str, entity_id: str) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = cast(Optional[dict[str, Any]], app.state.kb_items.get(entity_id))
    if (
        entity is None
        or entity.get("projectId") != project_id
        or entity.get("type") != "location"
    ):
        raise KeyError(entity_id)
    return entity


def _matches_query(entity: dict[str, Any], query: str) -> bool:
    normalized_query = query.strip().lower()
    if not normalized_query:
        return True
    fields = [
        cast(str, entity.get("name", "")),
        " ".join(cast(list[str], entity.get("aliases", []))),
        cast(str, entity.get("description") or ""),
        cast(str, entity.get("remark") or ""),
    ]
    return any(normalized_query in field.lower() for field in fields)


def _location_response(entity: dict[str, Any]) -> dict[str, Any]:
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
        "name": entity["name"],
        "aliases": cast(list[str], entity.get("aliases", [])),
        "locationType": entity.get("locationType", "other"),
        "parentId": entity.get("parentId"),
        "description": entity.get("description"),
        "characterIds": cast(list[str], entity.get("characterIds", [])),
        "chapterIds": cast(list[str], entity.get("chapterIds", [])),
        "rawAI": entity.get("rawAI"),
    }


def list_locations(
    project_id: str, query: str = "", location_type: Optional[str] = None
) -> list[dict[str, Any]]:
    items = []
    for entity in _active_locations(project_id):
        if location_type and entity.get("locationType") != location_type:
            continue
        if not _matches_query(entity, query):
            continue
        items.append(entity)
    return sorted(items, key=lambda item: cast(str, item.get("name", "")))


def list_location_tree(project_id: str) -> list[dict[str, Any]]:
    items = list_locations(project_id)
    by_id = {item["id"]: item for item in items}
    roots = [item for item in items if item.get("parentId") not in by_id]
    ordered: list[dict[str, Any]] = []

    def visit(node: dict[str, Any]) -> None:
        ordered.append(node)
        children = sorted(
            [item for item in items if item.get("parentId") == node["id"]],
            key=lambda item: cast(str, item.get("name", "")),
        )
        for child in children:
            visit(child)

    for root in sorted(roots, key=lambda item: cast(str, item.get("name", ""))):
        visit(root)
    return ordered


def get_location(project_id: str, entity_id: str) -> dict[str, Any]:
    return _require_location(project_id, entity_id)


def create_location(project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return create_kb_entity(
        project_id,
        "location",
        {
            "name": payload.get("name"),
            "aliases": payload.get("aliases", []),
            "locationType": payload.get("locationType", "other"),
            "parentId": payload.get("parentId"),
            "description": payload.get("description"),
            "characterIds": payload.get("characterIds", []),
            "chapterIds": payload.get("chapterIds", []),
            "source": payload.get("source", "manual"),
            "confirmed": payload.get("confirmed", False),
            "rawAI": payload.get("rawAI"),
            "remark": payload.get("remark"),
        },
    )


def update_location(
    project_id: str, entity_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
    normalized = dict(payload)
    if "characterIds" in normalized:
        normalized["characterIds"] = merge_aliases(
            cast(list[str], normalized.get("characterIds", []))
        )
    if "chapterIds" in normalized:
        normalized["chapterIds"] = merge_aliases(
            cast(list[str], normalized.get("chapterIds", []))
        )
    return update_kb_entity(project_id, "location", entity_id, normalized)


def delete_location(project_id: str, entity_id: str) -> dict[str, Any]:
    return soft_delete_kb_entity(project_id, "location", entity_id)


def confirm_location(project_id: str, entity_id: str) -> dict[str, Any]:
    return confirm_kb_entity(project_id, "location", entity_id)


def reject_location(
    project_id: str, entity_id: str, remark: Optional[str] = None
) -> dict[str, Any]:
    entity = reject_kb_entity(project_id, "location", entity_id, remark=remark)
    _excluded_names(project_id).add(_normalized(cast(str, entity.get("name", ""))))
    for alias in cast(list[str], entity.get("aliases", [])):
        _excluded_names(project_id).add(_normalized(alias))
    return entity


def bulk_confirm_locations(project_id: str, entity_ids: list[str]) -> dict[str, int]:
    return bulk_confirm_entities(project_id, "location", entity_ids)


def location_response(entity: dict[str, Any]) -> dict[str, Any]:
    return _location_response(entity)


def upsert_location_from_parser(
    project_id: str, payload: dict[str, Any], return_is_new: bool = False
) -> Any:
    name = cast(str, payload.get("name", "")).strip()
    aliases = cast(list[str], payload.get("aliases", []))
    candidates = {_normalized(name), *(_normalized(alias) for alias in aliases)}
    if candidates & _excluded_names(project_id):
        return (None, False) if return_is_new else None
    existing = dedupe_entity(_active_locations(project_id), name, aliases)
    if existing is None:
        created = create_location(
            project_id,
            {
                **payload,
                "source": "ai",
                "confirmed": False,
            },
        )
        return (created, True) if return_is_new else created
    updated = update_location(
        project_id,
        cast(str, existing["id"]),
        {
            "aliases": merge_aliases(
                cast(list[str], existing.get("aliases", [])),
                aliases,
                excluded={cast(str, existing.get("name", ""))},
            ),
            "locationType": payload.get(
                "locationType", existing.get("locationType", "other")
            ),
            "parentId": payload.get("parentId", existing.get("parentId")),
            "description": payload.get("description") or existing.get("description"),
            "characterIds": merge_aliases(
                cast(list[str], existing.get("characterIds", [])),
                cast(list[str], payload.get("characterIds", [])),
            ),
            "chapterIds": merge_aliases(
                cast(list[str], existing.get("chapterIds", [])),
                cast(list[str], payload.get("chapterIds", [])),
            ),
            "rawAI": payload.get("rawAI", existing.get("rawAI")),
        },
    )
    return (updated, False) if return_is_new else updated
