from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional, cast

from ..utils.kb_helpers import (
    dedupe_entity,
    ensure_kb_state,
    merge_aliases,
    migrate_entity_references,
    sync_entity_store,
    update_entity_statistics,
)
from server.services._base import app, _iso_z, _main_module


def _now() -> datetime:
    return cast(datetime, _main_module()._now())


def _next_kb_id() -> str:
    counter = getattr(app.state, "kb_item_counter", 0)
    setattr(app.state, "kb_item_counter", counter + 1)
    return f"kb-{counter}"


def _active_entities(project_id: str, entity_type: str) -> list[dict[str, Any]]:
    ensure_kb_state(app.state)
    return [
        cast(dict[str, Any], entity)
        for entity in app.state.kb_items.values()
        if entity.get("projectId") == project_id
        and entity.get("type") == entity_type
        and entity.get("deletedAt") is None
    ]


def _require_entity(
    project_id: str, entity_type: str, entity_id: str
) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = cast(Optional[dict[str, Any]], app.state.kb_items.get(entity_id))
    if (
        entity is None
        or entity.get("projectId") != project_id
        or entity.get("type") != entity_type
    ):
        raise KeyError(entity_id)
    return entity


def _base_entity(
    project_id: str, entity_type: str, payload: dict[str, Any]
) -> dict[str, Any]:
    now_iso = _iso_z(_now())
    name = cast(str, payload.get("name", "")).strip()
    aliases = merge_aliases(
        cast(list[str], payload.get("aliases", [])), excluded={name}
    )
    entity = {
        "id": _next_kb_id(),
        "projectId": project_id,
        "type": entity_type,
        "source": payload.get("source", "manual"),
        "confirmed": bool(payload.get("confirmed", False)),
        "isRejected": bool(payload.get("isRejected", False)),
        "remark": payload.get("remark"),
        "createdAt": now_iso,
        "updatedAt": now_iso,
        "deletedAt": None,
        "restoreUntil": None,
        "name": name,
        "aliases": aliases,
    }
    chapter_ids = merge_aliases(cast(list[str], payload.get("chapterIds", [])))
    if entity_type == "character":
        entity.update(
            {
                "gender": payload.get("gender"),
                "occupation": payload.get("occupation"),
                "appearance": payload.get("appearance"),
                "personalityTags": cast(list[str], payload.get("personalityTags", [])),
                "factionId": payload.get("factionId"),
                "chapterIds": chapter_ids,
                "firstAppearanceChapterId": None,
                "lastAppearanceChapterId": None,
                "appearanceCount": 0,
                "rawAI": payload.get("rawAI"),
            }
        )
    elif entity_type == "location":
        entity.update(
            {
                "locationType": payload.get("locationType", "other"),
                "parentId": payload.get("parentId"),
                "description": payload.get("description"),
                "characterIds": merge_aliases(
                    cast(list[str], payload.get("characterIds", []))
                ),
                "chapterIds": chapter_ids,
                "rawAI": payload.get("rawAI"),
            }
        )
    elif entity_type == "item":
        entity.update(
            {
                "itemType": payload.get("itemType", "other"),
                "summary": payload.get("summary"),
                "ownerCharacterId": payload.get("ownerCharacterId"),
                "ownershipHistory": cast(
                    list[dict[str, Any]], payload.get("ownershipHistory", [])
                ),
                "chapterIds": chapter_ids,
                "rawAI": payload.get("rawAI"),
            }
        )
    elif entity_type == "faction":
        entity.update(
            {
                "factionType": payload.get("factionType", "other"),
                "summary": payload.get("summary"),
                "memberCharacterIds": merge_aliases(
                    cast(list[str], payload.get("memberCharacterIds", []))
                ),
                "allyFactionIds": merge_aliases(
                    cast(list[str], payload.get("allyFactionIds", []))
                ),
                "rivalFactionIds": merge_aliases(
                    cast(list[str], payload.get("rivalFactionIds", []))
                ),
                "chapterIds": chapter_ids,
                "rawAI": payload.get("rawAI"),
            }
        )
    elif entity_type == "foreshadow":
        entity.update(
            {
                "summary": payload.get("summary", name),
                "plantedChapterId": payload.get(
                    "plantedChapterId", chapter_ids[0] if chapter_ids else ""
                ),
                "quote": payload.get("quote", ""),
                "status": payload.get("status", "unresolved"),
                "expectedResolveChapterId": payload.get("expectedResolveChapterId"),
                "resolvedChapterId": payload.get("resolvedChapterId"),
                "resolveNote": payload.get("resolveNote"),
                "aiSuggestions": cast(
                    list[dict[str, Any]], payload.get("aiSuggestions", [])
                ),
                "notifyState": payload.get(
                    "notifyState", {"reminded": False, "warned": False}
                ),
                "rawAI": payload.get("rawAI"),
            }
        )
    else:
        entity.update(
            {
                "title": payload.get("title", name),
                "category": payload.get("category", "other"),
                "content": payload.get("content", ""),
                "order": int(payload.get("order", 0)),
                "relatedEntityRefs": cast(
                    list[dict[str, Any]], payload.get("relatedEntityRefs", [])
                ),
                "rawAI": payload.get("rawAI"),
            }
        )
    return update_entity_statistics(entity)


def create_kb_entity(
    project_id: str, entity_type: str, payload: dict[str, Any]
) -> dict[str, Any]:
    ensure_kb_state(app.state)
    entity = _base_entity(project_id, entity_type, payload)
    sync_entity_store(app.state, entity)
    return entity


def update_kb_entity(
    project_id: str, entity_type: str, entity_id: str, payload: dict[str, Any]
) -> dict[str, Any]:
    entity = _require_entity(project_id, entity_type, entity_id)
    if "name" in payload:
        entity["name"] = cast(str, payload["name"]).strip()
    if "aliases" in payload:
        entity["aliases"] = merge_aliases(
            cast(list[str], entity.get("aliases", [])),
            cast(list[str], payload.get("aliases", [])),
            excluded={cast(str, entity.get("name", ""))},
        )
    if "chapterIds" in payload:
        entity["chapterIds"] = merge_aliases(
            cast(list[str], payload.get("chapterIds", []))
        )
    for key, value in payload.items():
        if key in {"name", "aliases", "chapterIds"}:
            continue
        entity[key] = value
    entity["updatedAt"] = _iso_z(_now())
    update_entity_statistics(entity)
    sync_entity_store(app.state, entity)
    return entity


def soft_delete_kb_entity(
    project_id: str, entity_type: str, entity_id: str
) -> dict[str, Any]:
    entity = _require_entity(project_id, entity_type, entity_id)
    now = _now()
    entity["deletedAt"] = _iso_z(now)
    entity["restoreUntil"] = _iso_z(now + timedelta(days=30))
    entity["updatedAt"] = entity["deletedAt"]
    sync_entity_store(app.state, entity)
    return entity


def confirm_kb_entity(
    project_id: str, entity_type: str, entity_id: str
) -> dict[str, Any]:
    entity = _require_entity(project_id, entity_type, entity_id)
    entity["confirmed"] = True
    entity["isRejected"] = False
    entity["updatedAt"] = _iso_z(_now())
    sync_entity_store(app.state, entity)
    return entity


def reject_kb_entity(
    project_id: str, entity_type: str, entity_id: str, remark: Optional[str] = None
) -> dict[str, Any]:
    entity = _require_entity(project_id, entity_type, entity_id)
    entity["confirmed"] = False
    entity["isRejected"] = True
    entity["remark"] = remark
    entity["updatedAt"] = _iso_z(_now())
    sync_entity_store(app.state, entity)
    return entity


def bulk_confirm_entities(
    project_id: str, entity_type: str, entity_ids: list[str]
) -> dict[str, int]:
    confirmed_count = 0
    for entity_id in entity_ids:
        try:
            confirm_kb_entity(project_id, entity_type, entity_id)
            confirmed_count += 1
        except KeyError:
            continue
    return {"confirmedCount": confirmed_count}


def merge_entities(
    project_id: str, entity_type: str, source_id: str, target_id: str
) -> dict[str, dict[str, Any]]:
    source = _require_entity(project_id, entity_type, source_id)
    target = _require_entity(project_id, entity_type, target_id)
    target["aliases"] = merge_aliases(
        cast(list[str], target.get("aliases", [])),
        [cast(str, source.get("name", ""))],
        cast(list[str], source.get("aliases", [])),
        excluded={cast(str, target.get("name", ""))},
    )
    if "chapterIds" in target or "chapterIds" in source:
        target["chapterIds"] = merge_aliases(
            cast(list[str], target.get("chapterIds", [])),
            cast(list[str], source.get("chapterIds", [])),
        )
    source_remark = cast(Optional[str], source.get("remark"))
    target_remark = cast(Optional[str], target.get("remark"))
    if source_remark:
        target["remark"] = (
            source_remark if not target_remark else f"{target_remark}\n{source_remark}"
        )
    update_entity_statistics(target)
    migrate_entity_references(app.state, project_id, entity_type, source_id, target_id)
    sync_entity_store(app.state, target)
    soft_delete_kb_entity(project_id, entity_type, source_id)
    return {"target": target, "source": source}


def search_entities(
    project_id: str,
    query: str,
    entity_types: Optional[list[str]] = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    if len(query.strip()) < 2:
        raise ValueError("query must be at least 2 characters")
    normalized_query = query.strip().lower()
    results: list[dict[str, Any]] = []
    for entity in app.state.kb_items.values():
        if entity.get("projectId") != project_id or entity.get("deletedAt") is not None:
            continue
        if entity_types and entity.get("type") not in entity_types:
            continue
        field_scores = [
            ("name", cast(str, entity.get("name", "")), 100),
            ("aliases", " ".join(cast(list[str], entity.get("aliases", []))), 80),
            ("remark", cast(str, entity.get("remark") or ""), 50),
            ("summary", cast(str, entity.get("summary") or ""), 40),
            ("description", cast(str, entity.get("description") or ""), 40),
            ("quote", cast(str, entity.get("quote") or ""), 35),
            ("content", cast(str, entity.get("content") or ""), 35),
        ]
        matched_field: Optional[str] = None
        score = -1
        for field_name, field_value, field_score in field_scores:
            if normalized_query in field_value.lower():
                matched_field = field_name
                score = (
                    field_score
                    if field_value.lower() == normalized_query
                    else field_score - 10
                )
                break
        if matched_field is None:
            continue
        results.append(
            {
                "id": entity["id"],
                "type": entity["type"],
                "name": entity.get("name") or entity.get("title"),
                "matchedField": matched_field,
                "score": score,
            }
        )
    return sorted(results, key=lambda item: (-int(item["score"]), str(item["name"])))[
        :limit
    ]


def upsert_parser_entity(
    project_id: str, entity_type: str, payload: dict[str, Any]
) -> tuple[dict[str, Any], bool]:
    existing = dedupe_entity(
        _active_entities(project_id, entity_type),
        cast(str, payload.get("name", "")),
        cast(list[str], payload.get("aliases", [])),
    )
    if existing is None:
        return create_kb_entity(project_id, entity_type, payload), True
    return update_kb_entity(
        project_id,
        entity_type,
        cast(str, existing["id"]),
        {
            key: value
            for key, value in payload.items()
            if key not in {"source", "confirmed"}
        },
    ), False
