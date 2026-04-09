from __future__ import annotations

from typing import Any, Optional, cast

import server.services.kb_core_service as kb_core_service
from server.services._base import app

from ..utils.kb_helpers import ensure_kb_state, merge_aliases, sync_entity_store

VALID_CHARACTER_SORTS = {"firstAppearance", "appearanceCount"}


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


def _require_character(project_id: str, entity_id: str) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = cast(Optional[dict[str, Any]], app.state.kb_items.get(entity_id))
    if (
        entity is None
        or entity.get("projectId") != project_id
        or entity.get("type") != "character"
    ):
        raise KeyError(entity_id)
    return entity


def _require_faction(project_id: str, entity_id: str) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = cast(Optional[dict[str, Any]], app.state.kb_items.get(entity_id))
    if (
        entity is None
        or entity.get("projectId") != project_id
        or entity.get("type") != "faction"
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
        cast(str, entity.get("occupation") or ""),
        cast(str, entity.get("appearance") or ""),
        cast(str, entity.get("remark") or ""),
    ]
    return any(normalized_query in field.lower() for field in fields)


def _sync_character_faction(
    project_id: str,
    character: dict[str, Any],
    previous_faction_id: Optional[str],
) -> None:
    current_faction_id = cast(Optional[str], character.get("factionId"))
    if previous_faction_id and previous_faction_id != current_faction_id:
        previous = cast(
            Optional[dict[str, Any]], app.state.kb_factions.get(previous_faction_id)
        )
        if previous is not None and previous.get("deletedAt") is None:
            previous["memberCharacterIds"] = [
                member_id
                for member_id in cast(list[str], previous.get("memberCharacterIds", []))
                if member_id != character["id"]
            ]
            sync_entity_store(app.state, previous)
    if not current_faction_id:
        return
    faction = _require_faction(project_id, current_faction_id)
    faction["memberCharacterIds"] = merge_aliases(
        cast(list[str], faction.get("memberCharacterIds", [])), [character["id"]]
    )
    sync_entity_store(app.state, faction)


def list_characters(
    project_id: str,
    query: str = "",
    sort_by: str = "firstAppearance",
) -> list[dict[str, Any]]:
    ensure_kb_state(app.state)
    items = []
    for entity in app.state.kb_items.values():
        if entity.get("projectId") != project_id:
            continue
        if entity.get("type") != "character" or entity.get("deletedAt") is not None:
            continue
        if not _matches_query(cast(dict[str, Any], entity), query):
            continue
        items.append(cast(dict[str, Any], entity))
    if sort_by == "appearanceCount":
        return sorted(
            items,
            key=lambda item: (
                -int(item.get("appearanceCount", 0)),
                str(item.get("name", "")),
            ),
        )
    return sorted(
        items,
        key=lambda item: (
            str(item.get("firstAppearanceChapterId") or ""),
            str(item.get("name", "")),
        ),
    )


def get_character(project_id: str, entity_id: str) -> dict[str, Any]:
    character = _require_character(project_id, entity_id)
    if character.get("deletedAt") is not None:
        raise KeyError(entity_id)
    return character


def update_character(
    project_id: str, entity_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
    character = get_character(project_id, entity_id)
    normalized = dict(payload)
    previous_faction_id = cast(Optional[str], character.get("factionId"))
    if "aliases" in normalized:
        normalized["aliases"] = merge_aliases(
            cast(list[str], normalized.get("aliases", []))
        )
    if "personalityTags" in normalized:
        normalized["personalityTags"] = merge_aliases(
            cast(list[str], normalized.get("personalityTags", []))
        )
    if "chapterIds" in normalized:
        normalized["chapterIds"] = merge_aliases(
            cast(list[str], normalized.get("chapterIds", []))
        )
    if "factionId" in normalized and normalized.get("factionId"):
        _require_faction(project_id, cast(str, normalized["factionId"]))
    updated = kb_core_service.update_kb_entity(
        project_id, "character", entity_id, normalized
    )
    _sync_character_faction(project_id, updated, previous_faction_id)
    return updated


def confirm_character(project_id: str, entity_id: str) -> dict[str, Any]:
    return kb_core_service.confirm_kb_entity(project_id, "character", entity_id)


def bulk_confirm_characters(project_id: str, entity_ids: list[str]) -> dict[str, int]:
    return kb_core_service.bulk_confirm_entities(project_id, "character", entity_ids)


def mark_character_not_entity(project_id: str, entity_id: str) -> dict[str, Any]:
    character = get_character(project_id, entity_id)
    previous_faction_id = cast(Optional[str], character.get("factionId"))
    character["factionId"] = None
    _sync_character_faction(project_id, character, previous_faction_id)
    deleted = kb_core_service.soft_delete_kb_entity(project_id, "character", entity_id)
    settings = _project_settings(project_id)
    parser_excludes = cast(dict[str, list[str]], settings["parserExcludes"])
    parser_excludes["characterNames"] = merge_aliases(
        cast(list[str], parser_excludes.get("characterNames", [])),
        [cast(str, deleted.get("name", ""))],
    )
    return deleted


def character_response(entity: dict[str, Any]) -> dict[str, Any]:
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
        "gender": entity.get("gender"),
        "occupation": entity.get("occupation"),
        "appearance": entity.get("appearance"),
        "personalityTags": cast(list[str], entity.get("personalityTags", [])),
        "factionId": entity.get("factionId"),
        "chapterIds": cast(list[str], entity.get("chapterIds", [])),
        "firstAppearanceChapterId": entity.get("firstAppearanceChapterId"),
        "lastAppearanceChapterId": entity.get("lastAppearanceChapterId"),
        "appearanceCount": int(entity.get("appearanceCount", 0)),
        "rawAI": entity.get("rawAI"),
    }
