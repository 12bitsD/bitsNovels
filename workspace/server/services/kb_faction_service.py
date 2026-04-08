from __future__ import annotations

from types import ModuleType
from typing import Any, Optional, cast

import server.services.kb_core_service as kb_core_service

from ..utils.kb_helpers import ensure_kb_state, merge_aliases, sync_entity_store

VALID_FACTION_TYPES = {"country", "sect", "company", "gang", "military", "other"}


def _main_module() -> ModuleType:
    from server import main as server_main

    return server_main


class _AppProxy:
    @property
    def state(self) -> Any:
        return _main_module().app.state


app = _AppProxy()


def _project_settings(project_id: str) -> dict[str, Any]:
    ensure_kb_state(app.state)
    settings = cast(dict[str, Any], app.state.kb_settings.setdefault(project_id, {}))
    settings.setdefault(
        "parserExcludes",
        {
            "characterNames": [],
            "factionNames": [],
        },
    )
    return settings


def _require_faction(project_id: str, entity_id: str) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = cast(Optional[dict[str, Any]], app.state.kb_items.get(entity_id))
    if (
        entity is None
        or entity.get("projectId") != project_id
        or entity.get("type") != "faction"
    ):
        raise KeyError(entity_id)
    return entity


def _require_character(project_id: str, entity_id: str) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = cast(Optional[dict[str, Any]], app.state.kb_items.get(entity_id))
    if (
        entity is None
        or entity.get("projectId") != project_id
        or entity.get("type") != "character"
        or entity.get("deletedAt") is not None
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


def _sanitize_relation_ids(entity_id: str, relation_ids: list[str]) -> list[str]:
    return [
        relation_id
        for relation_id in merge_aliases(relation_ids)
        if relation_id != entity_id
    ]


def _remove_from_previous_faction(project_id: str, character: dict[str, Any]) -> None:
    previous_faction_id = cast(Optional[str], character.get("factionId"))
    if not previous_faction_id:
        return
    previous = cast(
        Optional[dict[str, Any]], app.state.kb_factions.get(previous_faction_id)
    )
    if previous is None or previous.get("deletedAt") is not None:
        return
    previous["memberCharacterIds"] = [
        member_id
        for member_id in cast(list[str], previous.get("memberCharacterIds", []))
        if member_id != character["id"]
    ]
    sync_entity_store(app.state, previous)


def _sync_member_characters(
    project_id: str,
    faction: dict[str, Any],
    previous_member_ids: list[str],
) -> None:
    current_member_ids = merge_aliases(
        cast(list[str], faction.get("memberCharacterIds", []))
    )
    faction["memberCharacterIds"] = current_member_ids
    for member_id in previous_member_ids:
        if member_id in current_member_ids:
            continue
        try:
            character = _require_character(project_id, member_id)
        except KeyError:
            continue
        if character.get("factionId") == faction["id"]:
            character["factionId"] = None
            sync_entity_store(app.state, character)
    resolved_members: list[str] = []
    for member_id in current_member_ids:
        try:
            character = _require_character(project_id, member_id)
        except KeyError:
            continue
        _remove_from_previous_faction(project_id, character)
        character["factionId"] = faction["id"]
        sync_entity_store(app.state, character)
        resolved_members.append(member_id)
    faction["memberCharacterIds"] = resolved_members
    sync_entity_store(app.state, faction)


def list_factions(
    project_id: str,
    query: str = "",
    faction_type: Optional[str] = None,
) -> list[dict[str, Any]]:
    ensure_kb_state(app.state)
    items = []
    for entity in app.state.kb_items.values():
        if entity.get("projectId") != project_id:
            continue
        if entity.get("type") != "faction" or entity.get("deletedAt") is not None:
            continue
        if faction_type and entity.get("factionType") != faction_type:
            continue
        if not _matches_query(cast(dict[str, Any], entity), query):
            continue
        items.append(cast(dict[str, Any], entity))
    return sorted(items, key=lambda item: str(item.get("name", "")))


def get_faction(project_id: str, entity_id: str) -> dict[str, Any]:
    faction = _require_faction(project_id, entity_id)
    if faction.get("deletedAt") is not None:
        raise KeyError(entity_id)
    return faction


def update_faction(
    project_id: str, entity_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
    faction = get_faction(project_id, entity_id)
    normalized = dict(payload)
    previous_member_ids = list(cast(list[str], faction.get("memberCharacterIds", [])))
    if "aliases" in normalized:
        normalized["aliases"] = merge_aliases(
            cast(list[str], normalized.get("aliases", []))
        )
    if "memberCharacterIds" in normalized:
        normalized["memberCharacterIds"] = merge_aliases(
            cast(list[str], normalized.get("memberCharacterIds", []))
        )
    if "allyFactionIds" in normalized:
        normalized["allyFactionIds"] = _sanitize_relation_ids(
            entity_id, cast(list[str], normalized.get("allyFactionIds", []))
        )
    if "rivalFactionIds" in normalized:
        normalized["rivalFactionIds"] = _sanitize_relation_ids(
            entity_id, cast(list[str], normalized.get("rivalFactionIds", []))
        )
    if "chapterIds" in normalized:
        normalized["chapterIds"] = merge_aliases(
            cast(list[str], normalized.get("chapterIds", []))
        )
    updated = kb_core_service.update_kb_entity(
        project_id, "faction", entity_id, normalized
    )
    _sync_member_characters(project_id, updated, previous_member_ids)
    return updated


def confirm_faction(project_id: str, entity_id: str) -> dict[str, Any]:
    return kb_core_service.confirm_kb_entity(project_id, "faction", entity_id)


def bulk_confirm_factions(project_id: str, entity_ids: list[str]) -> dict[str, int]:
    return kb_core_service.bulk_confirm_entities(project_id, "faction", entity_ids)


def mark_faction_not_entity(project_id: str, entity_id: str) -> dict[str, Any]:
    faction = get_faction(project_id, entity_id)
    for member_id in cast(list[str], faction.get("memberCharacterIds", [])):
        character = cast(
            Optional[dict[str, Any]], app.state.kb_characters.get(member_id)
        )
        if character is not None and character.get("factionId") == entity_id:
            character["factionId"] = None
            sync_entity_store(app.state, character)
    deleted = kb_core_service.soft_delete_kb_entity(project_id, "faction", entity_id)
    settings = _project_settings(project_id)
    parser_excludes = cast(dict[str, list[str]], settings["parserExcludes"])
    parser_excludes["factionNames"] = merge_aliases(
        cast(list[str], parser_excludes.get("factionNames", [])),
        [cast(str, deleted.get("name", ""))],
    )
    return deleted


def faction_response(entity: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": entity["id"],
        "projectId": entity["projectId"],
        "type": entity["type"],
        "source": entity["source"],
        "confirmed": entity["confirmed"],
        "remark": entity.get("remark"),
        "createdAt": entity["createdAt"],
        "updatedAt": entity["updatedAt"],
        "deletedAt": entity.get("deletedAt"),
        "restoreUntil": entity.get("restoreUntil"),
        "name": entity["name"],
        "aliases": cast(list[str], entity.get("aliases", [])),
        "factionType": entity.get("factionType", "other"),
        "summary": entity.get("summary"),
        "memberCharacterIds": cast(list[str], entity.get("memberCharacterIds", [])),
        "allyFactionIds": cast(list[str], entity.get("allyFactionIds", [])),
        "rivalFactionIds": cast(list[str], entity.get("rivalFactionIds", [])),
        "chapterIds": cast(list[str], entity.get("chapterIds", [])),
        "rawAI": entity.get("rawAI"),
    }
