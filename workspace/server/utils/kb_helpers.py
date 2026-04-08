from __future__ import annotations

from typing import Any, Optional, cast

STORE_BY_TYPE = {
    "character": "kb_characters",
    "location": "kb_locations",
    "item": "kb_items",
    "faction": "kb_factions",
    "foreshadow": "kb_foreshadows",
    "setting": "kb_settings",
}


def ensure_kb_state(app_state: Any) -> None:
    if not hasattr(app_state, "kb_items"):
        app_state.kb_items = {}
    if not hasattr(app_state, "kb_item_counter"):
        app_state.kb_item_counter = 0
    for store_name in {
        "kb_characters",
        "kb_locations",
        "kb_factions",
        "kb_foreshadows",
        "kb_settings",
    }:
        if not hasattr(app_state, store_name):
            setattr(app_state, store_name, {})


def _normalized(value: str) -> str:
    return value.strip().lower()


def merge_aliases(*groups: list[str], excluded: Optional[set[str]] = None) -> list[str]:
    seen: set[str] = set(
        _normalized(item) for item in (excluded or set()) if item.strip()
    )
    merged: list[str] = []
    for group in groups:
        for alias in group:
            cleaned = alias.strip()
            if not cleaned:
                continue
            key = _normalized(cleaned)
            if key in seen:
                continue
            seen.add(key)
            merged.append(cleaned)
    return merged


def dedupe_entity(
    existing_entities: list[dict[str, Any]], name: str, aliases: list[str]
) -> Optional[dict[str, Any]]:
    candidates = {_normalized(name), *(_normalized(alias) for alias in aliases)}
    for entity in existing_entities:
        entity_names = {_normalized(cast(str, entity.get("name", "")))}
        entity_names.update(
            _normalized(alias) for alias in cast(list[str], entity.get("aliases", []))
        )
        if candidates & entity_names:
            return entity
    return None


def update_entity_statistics(entity: dict[str, Any]) -> dict[str, Any]:
    chapter_ids = merge_aliases(cast(list[str], entity.get("chapterIds", [])))
    entity["chapterIds"] = chapter_ids
    if entity.get("type") == "character":
        entity["appearanceCount"] = len(chapter_ids)
        entity["firstAppearanceChapterId"] = chapter_ids[0] if chapter_ids else None
        entity["lastAppearanceChapterId"] = chapter_ids[-1] if chapter_ids else None
    return entity


def migrate_entity_references(
    app_state: Any, project_id: str, entity_type: str, source_id: str, target_id: str
) -> None:
    ensure_kb_state(app_state)
    for entity in app_state.kb_items.values():
        if entity.get("projectId") != project_id or entity.get("deletedAt") is not None:
            continue
        if entity_type == "character":
            if entity.get("ownerCharacterId") == source_id:
                entity["ownerCharacterId"] = target_id
            if entity.get("factionId") == source_id:
                entity["factionId"] = target_id
            if "characterIds" in entity:
                entity["characterIds"] = [
                    target_id if value == source_id else value
                    for value in cast(list[str], entity.get("characterIds", []))
                ]
                entity["characterIds"] = merge_aliases(
                    cast(list[str], entity["characterIds"])
                )
            if "memberCharacterIds" in entity:
                entity["memberCharacterIds"] = [
                    target_id if value == source_id else value
                    for value in cast(list[str], entity.get("memberCharacterIds", []))
                ]
                entity["memberCharacterIds"] = merge_aliases(
                    cast(list[str], entity["memberCharacterIds"])
                )
        if entity_type == "faction":
            if entity.get("parentId") == source_id:
                entity["parentId"] = target_id
            for field in ("allyFactionIds", "rivalFactionIds"):
                if field in entity:
                    entity[field] = [
                        target_id if value == source_id else value
                        for value in cast(list[str], entity.get(field, []))
                    ]
                    entity[field] = merge_aliases(cast(list[str], entity[field]))


def sync_entity_store(app_state: Any, entity: dict[str, Any]) -> None:
    ensure_kb_state(app_state)
    app_state.kb_items[entity["id"]] = entity
    store_name = STORE_BY_TYPE.get(cast(str, entity.get("type")))
    if store_name is not None:
        getattr(app_state, store_name)[entity["id"]] = entity
