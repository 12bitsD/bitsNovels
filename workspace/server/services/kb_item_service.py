from __future__ import annotations

from typing import Any, Optional, cast

from server.services._base import _iso_z, _main_module, app
from server.services.kb_core_service import (
    bulk_confirm_entities,
    confirm_kb_entity,
    create_kb_entity,
    merge_entities,
    reject_kb_entity,
    soft_delete_kb_entity,
    update_kb_entity,
)
from server.utils.kb_helpers import dedupe_entity, ensure_kb_state, merge_aliases

VALID_ITEM_TYPES = {"weapon", "armor", "accessory", "consumable", "token", "other"}


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
    return _project_exclusions(project_id).setdefault("item", set())


def _active_items(project_id: str) -> list[dict[str, Any]]:
    ensure_kb_state(app.state)
    return [
        cast(dict[str, Any], entity)
        for entity in app.state.kb_items.values()
        if entity.get("projectId") == project_id
        and entity.get("type") == "item"
        and entity.get("deletedAt") is None
    ]


def _require_item(project_id: str, entity_id: str) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = cast(Optional[dict[str, Any]], app.state.kb_items.get(entity_id))
    if (
        entity is None
        or entity.get("projectId") != project_id
        or entity.get("type") != "item"
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
        cast(str, entity.get("summary") or ""),
        cast(str, entity.get("remark") or ""),
    ]
    return any(normalized_query in field.lower() for field in fields)


def _append_history(
    existing: list[dict[str, Any]],
    from_character_id: Optional[str],
    to_character_id: Optional[str],
    chapter_id: str,
    note: Optional[str],
) -> list[dict[str, Any]]:
    if from_character_id == to_character_id:
        return existing
    return [
        *existing,
        {
            "fromCharacterId": from_character_id,
            "toCharacterId": to_character_id,
            "chapterId": chapter_id,
            "note": note,
            "createdAt": _iso_z(_now()),
        },
    ]


def _item_response(entity: dict[str, Any]) -> dict[str, Any]:
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
        "itemType": entity.get("itemType", "other"),
        "summary": entity.get("summary"),
        "ownerCharacterId": entity.get("ownerCharacterId"),
        "ownershipHistory": cast(
            list[dict[str, Any]], entity.get("ownershipHistory", [])
        ),
        "chapterIds": cast(list[str], entity.get("chapterIds", [])),
        "rawAI": entity.get("rawAI"),
    }


def list_items(
    project_id: str, query: str = "", item_type: Optional[str] = None
) -> list[dict[str, Any]]:
    items = []
    for entity in _active_items(project_id):
        if item_type and entity.get("itemType") != item_type:
            continue
        if not _matches_query(entity, query):
            continue
        items.append(entity)
    return sorted(items, key=lambda item: cast(str, item.get("name", "")))


def get_item(project_id: str, entity_id: str) -> dict[str, Any]:
    return _require_item(project_id, entity_id)


def create_item(project_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return create_kb_entity(
        project_id,
        "item",
        {
            "name": payload.get("name"),
            "aliases": payload.get("aliases", []),
            "itemType": payload.get("itemType", "other"),
            "summary": payload.get("summary"),
            "ownerCharacterId": payload.get("ownerCharacterId"),
            "ownershipHistory": payload.get("ownershipHistory", []),
            "chapterIds": payload.get("chapterIds", []),
            "source": payload.get("source", "manual"),
            "confirmed": payload.get("confirmed", False),
            "rawAI": payload.get("rawAI"),
            "remark": payload.get("remark"),
        },
    )


def update_item(
    project_id: str, entity_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
    current = _require_item(project_id, entity_id)
    normalized = dict(payload)
    if "chapterIds" in normalized:
        normalized["chapterIds"] = merge_aliases(
            cast(list[str], normalized.get("chapterIds", []))
        )
    if "ownerCharacterId" in normalized:
        history = _append_history(
            cast(list[dict[str, Any]], current.get("ownershipHistory", [])),
            cast(Optional[str], current.get("ownerCharacterId")),
            cast(Optional[str], normalized.get("ownerCharacterId")),
            cast(str, normalized.get("ownershipChapterId") or ""),
            cast(Optional[str], normalized.get("ownershipNote")),
        )
        normalized["ownershipHistory"] = history
    normalized.pop("ownershipChapterId", None)
    normalized.pop("ownershipNote", None)
    return update_kb_entity(project_id, "item", entity_id, normalized)


def delete_item(project_id: str, entity_id: str) -> dict[str, Any]:
    return soft_delete_kb_entity(project_id, "item", entity_id)


def confirm_item(project_id: str, entity_id: str) -> dict[str, Any]:
    return confirm_kb_entity(project_id, "item", entity_id)


def reject_item(
    project_id: str, entity_id: str, remark: Optional[str] = None
) -> dict[str, Any]:
    entity = reject_kb_entity(project_id, "item", entity_id, remark=remark)
    _excluded_names(project_id).add(_normalized(cast(str, entity.get("name", ""))))
    for alias in cast(list[str], entity.get("aliases", [])):
        _excluded_names(project_id).add(_normalized(alias))
    return entity


def bulk_confirm_items(project_id: str, entity_ids: list[str]) -> dict[str, int]:
    return bulk_confirm_entities(project_id, "item", entity_ids)


def merge_item_entities(
    project_id: str, source_id: str, target_id: str
) -> dict[str, dict[str, Any]]:
    return merge_entities(project_id, "item", source_id, target_id)


def get_item_references(project_id: str, entity_id: str) -> list[dict[str, Any]]:
    entity = _require_item(project_id, entity_id)
    references: list[dict[str, Any]] = []
    owner_character_id = cast(Optional[str], entity.get("ownerCharacterId"))
    if owner_character_id:
        references.append({"type": "owner", "characterId": owner_character_id})
    for chapter_id in cast(list[str], entity.get("chapterIds", [])):
        references.append({"type": "chapter", "chapterId": chapter_id})
    return references


def item_response(entity: dict[str, Any]) -> dict[str, Any]:
    return _item_response(entity)


def upsert_item_from_parser(
    project_id: str, payload: dict[str, Any], return_is_new: bool = False
) -> Any:
    name = cast(str, payload.get("name", "")).strip()
    aliases = cast(list[str], payload.get("aliases", []))
    candidates = {_normalized(name), *(_normalized(alias) for alias in aliases)}
    if candidates & _excluded_names(project_id):
        return (None, False) if return_is_new else None
    existing = dedupe_entity(_active_items(project_id), name, aliases)
    if existing is None:
        created = create_item(
            project_id,
            {
                **payload,
                "source": "ai",
                "confirmed": False,
                "ownershipHistory": [],
            },
        )
        return (created, True) if return_is_new else created
    owner_character_id = cast(Optional[str], payload.get("ownerCharacterId"))
    updated = update_item(
        project_id,
        cast(str, existing["id"]),
        {
            "aliases": merge_aliases(
                cast(list[str], existing.get("aliases", [])),
                aliases,
                excluded={cast(str, existing.get("name", ""))},
            ),
            "itemType": payload.get("itemType", existing.get("itemType", "other")),
            "summary": payload.get("summary") or existing.get("summary"),
            "chapterIds": merge_aliases(
                cast(list[str], existing.get("chapterIds", [])),
                cast(list[str], payload.get("chapterIds", [])),
            ),
            "ownerCharacterId": owner_character_id
            if owner_character_id is not None
            else existing.get("ownerCharacterId"),
            "ownershipChapterId": (
                cast(list[str], payload.get("chapterIds", []))[0]
                if cast(list[str], payload.get("chapterIds", []))
                else ""
            ),
            "ownershipNote": payload.get("note"),
            "rawAI": payload.get("rawAI", existing.get("rawAI")),
        },
    )
    return (updated, False) if return_is_new else updated
