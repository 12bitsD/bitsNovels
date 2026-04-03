"""
US-5.2 Auto Backup Routes
POST   /api/projects/:projectId/backups/auto/trigger — 创建自动备份（测试用）
GET    /api/projects/:projectId/backups                    — 列出自动+手动备份
GET    /api/projects/:projectId/backups/:backupId/download — 下载备份ZIP
"""

import base64
from datetime import datetime, timedelta, timezone
from io import BytesIO
import json
from typing import Any, Optional, Union, Tuple
from zipfile import ZipFile

from fastapi import APIRouter, BackgroundTasks, Header
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

router = APIRouter(prefix="/api/projects", tags=["us-5.2"])

MAX_AUTO_BACKUPS = 7


class TriggerBackupRequest(BaseModel):
    backup_type: str  # 'auto' or 'manual'


def _require_project(
    project_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import app, _error

    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return None, _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return None, _error(403, "FORBIDDEN", "No permission for this project")
    return project, None


def _iso_z(ts: datetime) -> str:
    return (
        ts.astimezone(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _create_backup_zip(project_id: str, backup_type: str) -> Optional[Tuple[dict, str]]:
    """Create a backup ZIP and return (manifest, base64_data)."""
    from server.main import app

    project = next(
        (p for p in app.state.fake_db.projects if p["id"] == project_id), None
    )
    if project is None:
        return None

    volumes = [v for v in app.state.volumes if v.get("projectId") == project_id]
    chapters = [c for c in app.state.chapters if c.get("projectId") == project_id]
    kb_items = [
        v for v in app.state.kb_items.values() if v.get("projectId") == project_id
    ]
    snapshots = [s for s in app.state.snapshots if s.get("projectId") == project_id]

    manifest = {
        "version": "1.0",
        "backupType": backup_type,
        "projectId": project_id,
        "projectName": project.get("name", "Unknown"),
        "exportedAt": _iso_z(datetime.now(timezone.utc)),
        "counts": {
            "volumes": len(volumes),
            "chapters": len(chapters),
            "knowledgeBaseEntries": len(kb_items),
            "snapshots": len(snapshots),
            "annotations": 0,
        },
    }

    zip_buffer = BytesIO()
    with ZipFile(zip_buffer, "w") as zf:
        zf.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))

        zf.writestr(
            "project/project.json",
            json.dumps(
                {
                    "id": project.get("id"),
                    "name": project.get("name"),
                    "type": project.get("type"),
                    "tags": project.get("tags", []),
                    "description": project.get("description"),
                    "status": project.get("status"),
                    "coverColor": project.get("coverColor"),
                    "totalChars": project.get("totalChars", 0),
                    "chapterCount": project.get("chapterCount", 0),
                },
                ensure_ascii=False,
            ),
        )

        zf.writestr(
            "project/volumes.json",
            json.dumps(volumes, ensure_ascii=False),
        )
        zf.writestr(
            "project/chapters.json",
            json.dumps(chapters, ensure_ascii=False),
        )

        chapter_texts = {}
        for ch in chapters:
            ch_id = ch.get("id")
            if ch_id and ch_id in app.state.chapter_contents:
                content = app.state.chapter_contents[ch_id].get("content", "")
                chapter_texts[f"chapter_{ch_id}.txt"] = content
        if chapter_texts:
            zf.writestr(
                "project/texts/chapters.json",
                json.dumps(chapter_texts, ensure_ascii=False),
            )

        kb_characters = [v for v in kb_items if v.get("type") == "character"]
        kb_locations = [v for v in kb_items if v.get("type") == "location"]
        kb_items_list = [v for v in kb_items if v.get("type") == "item"]
        kb_factions = [v for v in kb_items if v.get("type") == "faction"]
        kb_foreshadows = [v for v in kb_items if v.get("type") == "foreshadow"]
        kb_settings = [v for v in kb_items if v.get("type") == "setting"]

        zf.writestr(
            "knowledge-base/data.json",
            json.dumps(
                {
                    "characters": kb_characters,
                    "locations": kb_locations,
                    "items": kb_items_list,
                    "factions": kb_factions,
                    "foreshadows": kb_foreshadows,
                    "settings": kb_settings,
                    "relations": [],
                },
                ensure_ascii=False,
            ),
        )

        zf.writestr(
            "snapshots/snapshots.json",
            json.dumps(snapshots, ensure_ascii=False),
        )
        zf.writestr("annotations/annotations.json", json.dumps([], ensure_ascii=False))

        goals = app.state.goals.get(project_id, {})
        zf.writestr(
            "config/project-config.json",
            json.dumps(
                {
                    "writingGoals": goals,
                    "aiConfig": project.get("aiConfig", {}),
                },
                ensure_ascii=False,
            ),
        )

    zip_base64 = base64.b64encode(zip_buffer.getvalue()).decode("utf-8")
    return manifest, zip_base64


@router.post("/{project_id}/backups/auto/trigger")
def trigger_auto_backup(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _next_id, _iso_z, _now

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err
    assert project is not None

    if project.get("status") == "archived":
        return JSONResponse(
            status_code=409,
            content={
                "error": {
                    "code": "PROJECT_ARCHIVED",
                    "message": "Cannot backup archived project",
                    "details": {},
                }
            },
        )

    backup_id = _next_id("backup_counter", "backup")
    now_iso = _iso_z(_now())

    result = _create_backup_zip(project_id, "auto")
    if result is None:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "PROJECT_NOT_FOUND",
                    "message": "Project not found",
                    "details": {},
                }
            },
        )

    manifest, zip_data = result

    if project_id not in app.state.backups:
        app.state.backups[project_id] = []

    manifest["id"] = backup_id
    manifest["createdAt"] = now_iso

    app.state.backups[project_id].append(manifest)
    app.state.backup_files[backup_id] = zip_data

    auto_backups = [
        b
        for b in app.state.backups.get(project_id, [])
        if b.get("backupType") == "auto"
    ]
    if len(auto_backups) > MAX_AUTO_BACKUPS:
        oldest = auto_backups[0]
        oldest_id = oldest.get("id")
        if oldest_id:
            app.state.backup_files.pop(oldest_id, None)
            app.state.backups[project_id] = [
                b for b in app.state.backups[project_id] if b.get("id") != oldest_id
            ]

    _create_notification(
        user_id, project_id, "backup_done", "自动备份完成", "项目备份已创建"
    )

    return JSONResponse(
        status_code=201,
        content={"backupId": backup_id, "manifest": manifest},
    )


@router.get("/{project_id}/backups")
def list_backups(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    backups = app.state.backups.get(project_id, [])
    items = sorted(backups, key=lambda x: x.get("createdAt", ""), reverse=True)

    return JSONResponse(
        status_code=200,
        content={"items": [_backup_response(b) for b in items]},
    )


@router.get("/{project_id}/backups/{backup_id}/download", response_model=None)
def download_backup(
    project_id: str,
    backup_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> Union[JSONResponse, Response]:
    from server.main import _require_user_id, app, _error

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    backup = next(
        (b for b in app.state.backups.get(project_id, []) if b.get("id") == backup_id),
        None,
    )
    if backup is None:
        return _error(404, "BACKUP_NOT_FOUND", "Backup not found")

    zip_data = app.state.backup_files.get(backup_id)
    if zip_data is None:
        return _error(404, "BACKUP_FILE_NOT_FOUND", "Backup file not found")

    zip_bytes = base64.b64decode(zip_data)

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="backup_{backup_id}.zip"'
        },
    )


def _backup_response(backup: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": backup.get("id"),
        "version": backup.get("version"),
        "backupType": backup.get("backupType"),
        "projectId": backup.get("projectId"),
        "projectName": backup.get("projectName"),
        "exportedAt": backup.get("exportedAt"),
        "counts": backup.get("counts", {}),
        "createdAt": backup.get("createdAt"),
    }


def _create_notification(
    user_id: str, project_id: str, notif_type: str, title: str, body: str
) -> None:
    from server.main import app, _next_id, _iso_z, _now

    notif_id = _next_id("notification_counter", "notif")
    notification = {
        "id": notif_id,
        "userId": user_id,
        "type": notif_type,
        "title": title,
        "body": body,
        "projectId": project_id,
        "read": False,
        "actionTarget": {"kind": "download"},
        "createdAt": _iso_z(_now()),
    }
    app.state.notifications.insert(0, notification)
