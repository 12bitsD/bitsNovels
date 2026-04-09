from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any, Optional, cast

from server.services._base import _iso_z, _main_module, app

KB_STORE_NAMES = {
    "item": "kb_items",
    "character": "kb_characters",
    "location": "kb_locations",
    "faction": "kb_factions",
    "foreshadow": "kb_foreshadows",
    "setting": "kb_settings",
}
TRASH_RETENTION_DAYS = 30



def _now() -> datetime:
    return cast(datetime, _main_module()._now())


def _error(status_code: int, code: str, message: str) -> Any:
    return _main_module()._error(status_code, code, message)


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def _kb_store(entity_type: str) -> dict[str, dict[str, Any]]:
    store_name = KB_STORE_NAMES.get(entity_type)
    if store_name is None:
        return {}
    return cast(dict[str, dict[str, Any]], getattr(app.state, store_name, {}))


def _kb_trash_id(entity_type: str, entity_id: str) -> str:
    return f"kb:{entity_type}:{entity_id}"


def _parse_kb_trash_id(item_id: str) -> tuple[Optional[str], Optional[str]]:
    prefix, separator, rest = item_id.partition(":")
    if prefix != "kb" or not separator:
        return None, None
    entity_type, separator, entity_id = rest.partition(":")
    if not separator or not entity_type or not entity_id:
        return None, None
    return entity_type, entity_id


def _retention_expires_at(deleted_at: str) -> str:
    deleted_ts = _parse_iso(deleted_at)
    assert deleted_ts is not None
    return _iso_z(deleted_ts + timedelta(days=TRASH_RETENTION_DAYS))


def _remaining_days(expires_at: str) -> int:
    expires_ts = _parse_iso(expires_at)
    assert expires_ts is not None
    delta_seconds = (expires_ts - _now()).total_seconds()
    if delta_seconds <= 0:
        return 0
    return ceil(delta_seconds / 86400)


def _estimate_size_mb(payload: Any) -> float:
    size_bytes = len(repr(payload).encode("utf-8"))
    return round(size_bytes / (1024 * 1024), 6)


def create_chapter_trash_entry(
    project_id: str,
    chapter: dict[str, Any],
    original_volume_name: str,
) -> dict[str, Any]:
    deleted_at = _iso_z(_now())
    expires_at = _retention_expires_at(deleted_at)
    content_data = cast(
        dict[str, Any], app.state.chapter_contents.get(chapter["id"], {})
    )
    snapshots = [
        snapshot
        for snapshot in getattr(app.state.fake_db, "snapshots", [])
        if snapshot.get("chapterId") == chapter["id"]
    ]
    return {
        "id": f"trash-{len(app.state.trash_items) + 1}",
        "projectId": project_id,
        "sourceType": "chapter",
        "entityType": "chapter",
        "entityId": chapter["id"],
        "title": chapter["title"],
        "originalVolumeId": chapter["volumeId"],
        "originalVolumeName": original_volume_name,
        "originalPosition": chapter.get("order", 0),
        "chars": chapter.get("chars", 0),
        "deletedAt": deleted_at,
        "expiresAt": expires_at,
        "snapshotCount": len(snapshots),
        "chapterData": dict(chapter),
        "contentData": dict(content_data),
    }


def soft_delete_kb_entity(entity_type: str, entity: dict[str, Any]) -> None:
    deleted_at = _iso_z(_now())
    entity["deletedAt"] = deleted_at
    entity["restoreUntil"] = _retention_expires_at(deleted_at)
    entity["updatedAt"] = deleted_at


def _chapter_trash_item(record: dict[str, Any]) -> dict[str, Any]:
    expires_at = record.get("expiresAt") or _retention_expires_at(record["deletedAt"])
    normalized = dict(record)
    normalized["sourceType"] = "chapter"
    normalized["entityType"] = "chapter"
    normalized["entityId"] = record.get("entityId") or record.get(
        "chapterData", {}
    ).get("id")
    normalized["expiresAt"] = expires_at
    normalized["remainingDays"] = _remaining_days(expires_at)
    normalized["trashSizeMB"] = _estimate_size_mb(
        {
            "record": record,
            "chapterData": record.get("chapterData"),
            "contentData": record.get("contentData"),
        }
    )
    return normalized


def _kb_trash_item(entity_type: str, entity: dict[str, Any]) -> dict[str, Any]:
    deleted_at = cast(str, entity["deletedAt"])
    expires_at = entity.get("restoreUntil") or _retention_expires_at(deleted_at)
    title = entity.get("name") or entity.get("title") or entity.get("id")
    return {
        "id": _kb_trash_id(entity_type, entity["id"]),
        "projectId": entity["projectId"],
        "sourceType": "kb",
        "entityType": entity_type,
        "entityId": entity["id"],
        "title": title,
        "deletedAt": deleted_at,
        "expiresAt": expires_at,
        "remainingDays": _remaining_days(expires_at),
        "trashSizeMB": _estimate_size_mb(entity),
    }


def _delete_expired_kb_entities(project_id: str) -> None:
    now = _now()
    for entity_type in KB_STORE_NAMES:
        store = _kb_store(entity_type)
        expired_ids = [
            entity_id
            for entity_id, entity in store.items()
            if entity.get("projectId") == project_id
            and entity.get("deletedAt")
            and (_parse_iso(entity.get("restoreUntil")) or now) <= now
        ]
        for entity_id in expired_ids:
            store.pop(entity_id, None)


def auto_cleanup_expired(project_id: str) -> None:
    now = _now()
    app.state.trash_items = [
        record
        for record in app.state.trash_items
        if not (
            record.get("projectId") == project_id
            and (
                _parse_iso(
                    record.get("expiresAt")
                    or _retention_expires_at(record["deletedAt"])
                )
                or now
            )
            <= now
        )
    ]
    _delete_expired_kb_entities(project_id)


def _all_trash_items(project_id: str) -> list[dict[str, Any]]:
    auto_cleanup_expired(project_id)
    items = [
        _chapter_trash_item(record)
        for record in app.state.trash_items
        if record.get("projectId") == project_id
    ]
    for entity_type in KB_STORE_NAMES:
        store = _kb_store(entity_type)
        items.extend(
            _kb_trash_item(entity_type, entity)
            for entity in store.values()
            if entity.get("projectId") == project_id and entity.get("deletedAt")
        )
    items.sort(key=lambda item: (item["deletedAt"], item["id"]), reverse=True)
    return items


def list_trash_items(
    project_id: str,
    page: int = 1,
    page_size: int = 20,
    source_type: Optional[str] = None,
) -> dict[str, Any]:
    items = _all_trash_items(project_id)
    if source_type:
        items = [item for item in items if item["sourceType"] == source_type]
    total = len(items)
    start = max(page - 1, 0) * max(page_size, 1)
    end = start + max(page_size, 1)
    paged_items = items[start:end]
    trash_storage_mb = round(sum(item["trashSizeMB"] for item in items), 6)
    return {
        "items": paged_items,
        "total": total,
        "trashStorageMB": trash_storage_mb,
    }


def _restore_kb_entity(project_id: str, item_id: str) -> Optional[dict[str, Any]]:
    entity_type, entity_id = _parse_kb_trash_id(item_id)
    if entity_type is None or entity_id is None:
        return None
    entity = _kb_store(entity_type).get(entity_id)
    if (
        entity is None
        or entity.get("projectId") != project_id
        or not entity.get("deletedAt")
    ):
        return None
    entity["deletedAt"] = None
    entity["restoreUntil"] = None
    entity["updatedAt"] = _iso_z(_now())
    return {
        "ok": True,
        "restoredToVolumeId": None,
        "restoredToPosition": None,
        "fallbackToDefaultVolume": False,
    }


def _ensure_fallback_volume(project_id: str) -> dict[str, Any]:
    project_volumes = sorted(
        [v for v in app.state.fake_db.volumes if v["projectId"] == project_id],
        key=lambda volume: (int(volume.get("order", 0)), str(volume["id"])),
    )
    if project_volumes:
        return cast(dict[str, Any], project_volumes[0])
    volume_id = f"volume-{app.state.volume_counter}"
    app.state.volume_counter += 1
    volume = {
        "id": volume_id,
        "projectId": project_id,
        "name": "默认卷",
        "description": "",
        "order": 0,
        "ownerId": None,
        "createdAt": _iso_z(_now()),
        "updatedAt": _iso_z(_now()),
    }
    app.state.fake_db.volumes.append(volume)
    return volume


def _restore_chapter(project_id: str, item_id: str) -> Optional[dict[str, Any]]:
    record = next(
        (
            candidate
            for candidate in app.state.trash_items
            if candidate.get("id") == item_id
            and candidate.get("projectId") == project_id
        ),
        None,
    )
    if record is None:
        return None
    chapter_data = dict(record.get("chapterData") or {})
    chapter_id = record.get("entityId") or chapter_data.get("id")
    if chapter_id is None:
        return None
    existing_volume = next(
        (
            volume
            for volume in app.state.fake_db.volumes
            if volume["id"] == record.get("originalVolumeId")
            and volume["projectId"] == project_id
        ),
        None,
    )
    fallback = existing_volume is None
    target_volume = existing_volume or _ensure_fallback_volume(project_id)
    if fallback:
        restored_position = (
            max(
                [
                    int(chapter.get("order", 0))
                    for chapter in app.state.fake_db.chapters
                    if chapter["projectId"] == project_id
                    and chapter["volumeId"] == target_volume["id"]
                ],
                default=-1,
            )
            + 1
        )
    else:
        restored_position = int(record.get("originalPosition", 0))
        for chapter in app.state.fake_db.chapters:
            if (
                chapter["projectId"] == project_id
                and chapter["volumeId"] == target_volume["id"]
                and int(chapter.get("order", 0)) >= restored_position
            ):
                chapter["order"] = int(chapter.get("order", 0)) + 1
    restored_chapter = {
        "id": chapter_id,
        "projectId": project_id,
        "volumeId": target_volume["id"],
        "title": chapter_data.get("title") or record.get("title") or "未命名章节",
        "order": restored_position,
        "chars": chapter_data.get("chars", record.get("chars", 0)),
        "lastEditedAt": chapter_data.get("lastEditedAt") or _iso_z(_now()),
        "parserStatus": chapter_data.get("parserStatus", "empty"),
    }
    restored_chapter["updatedAt"] = (
        chapter_data.get("updatedAt") or restored_chapter["lastEditedAt"]
    )
    restored_chapter["createdAt"] = (
        chapter_data.get("createdAt") or restored_chapter["lastEditedAt"]
    )
    app.state.fake_db.chapters = [
        chapter for chapter in app.state.fake_db.chapters if chapter["id"] != chapter_id
    ]
    app.state.fake_db.chapters.append(restored_chapter)
    content_data = record.get("contentData")
    if content_data:
        app.state.chapter_contents[chapter_id] = dict(content_data)
    app.state.trash_items = [
        candidate
        for candidate in app.state.trash_items
        if candidate.get("id") != item_id
    ]
    return {
        "ok": True,
        "restoredToVolumeId": target_volume["id"],
        "restoredToPosition": restored_position,
        "fallbackToDefaultVolume": fallback,
    }


def restore_trash_item(project_id: str, item_id: str) -> Any:
    restored = _restore_kb_entity(project_id, item_id)
    if restored is not None:
        return restored
    restored = _restore_chapter(project_id, item_id)
    if restored is not None:
        return restored
    return _error(404, "TRASH_ITEM_NOT_FOUND", "Trash item not found")


def delete_trash_item(project_id: str, item_id: str) -> bool:
    entity_type, entity_id = _parse_kb_trash_id(item_id)
    if entity_type is not None and entity_id is not None:
        store = _kb_store(entity_type)
        entity = store.get(entity_id)
        if (
            entity is None
            or entity.get("projectId") != project_id
            or not entity.get("deletedAt")
        ):
            return False
        store.pop(entity_id, None)
        return True
    before = len(app.state.trash_items)
    app.state.trash_items = [
        record
        for record in app.state.trash_items
        if not (record.get("projectId") == project_id and record.get("id") == item_id)
    ]
    return len(app.state.trash_items) != before


def clear_trash(project_id: str) -> int:
    items = _all_trash_items(project_id)
    deleted_count = 0
    for item in items:
        if delete_trash_item(project_id, item["id"]):
            deleted_count += 1
    return deleted_count


def trash_stats(project_id: str) -> dict[str, Any]:
    items = _all_trash_items(project_id)
    by_type: dict[str, int] = {}
    expires_soon_count = 0
    for item in items:
        key = (
            item["entityType"]
            if item["sourceType"] == "chapter"
            else f"kb:{item['entityType']}"
        )
        by_type[key] = by_type.get(key, 0) + 1
        if item["remainingDays"] <= 3:
            expires_soon_count += 1
    return {
        "totalItems": len(items),
        "byType": by_type,
        "trashStorageMB": round(sum(item["trashSizeMB"] for item in items), 6),
        "expiresSoonCount": expires_soon_count,
    }
