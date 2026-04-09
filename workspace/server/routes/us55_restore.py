"""
US-5.5 Restore Routes
POST /api/projects/:projectId/backups/:backupId/restore — 恢复备份
GET  /api/projects/:projectId/backups/:backupId/preview    — 预览备份内容
"""

import base64
import json
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Literal, Optional, Union
from zipfile import ZipFile

from fastapi import APIRouter, Body, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.utils.time_utils import iso_z as _iso_z
from server.routes._deps import require_project as _require_project

router = APIRouter(prefix="/api/projects", tags=["us-5.5"])


class RestoreRequest(BaseModel):
    mode: str
    project_name: Optional[str] = None

    model_config = {"extra": "forbid"}


def _validate_backup_zip(zip_data: bytes) -> tuple[Optional[dict], Optional[dict]]:
    """Validate ZIP structure and return (manifest, error)."""
    try:
        with ZipFile(BytesIO(zip_data), "r") as zf:
            if "manifest.json" not in zf.namelist():
                return None, {
                    "code": "INVALID_BACKUP",
                    "message": "备份文件无效或已损坏",
                }

            manifest_data = json.loads(zf.read("manifest.json"))

            required_files = [
                "manifest.json",
                "project/project.json",
                "project/volumes.json",
                "project/chapters.json",
                "knowledge-base/data.json",
            ]
            for f in required_files:
                if f not in zf.namelist():
                    return None, {
                        "code": "INVALID_BACKUP",
                        "message": "备份文件无效或已损坏",
                    }

            version = manifest_data.get("version", "1.0")
            if version not in ["1.0", "1.1"]:
                return None, {
                    "code": "VERSION_INCOMPATIBLE",
                    "message": "备份文件无效或已损坏",
                }

            return manifest_data, None
    except Exception:
        return None, {"code": "INVALID_BACKUP", "message": "备份文件无效或已损坏"}


@router.get("/{project_id}/backups/{backup_id}/preview")
def preview_backup(
    project_id: str,
    backup_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
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

    try:
        zip_bytes = base64.b64decode(zip_data)
        manifest, val_err = _validate_backup_zip(zip_bytes)
        if val_err is not None:
            return JSONResponse(
                status_code=400,
                content={"error": val_err, "details": {}},
            )

        with ZipFile(BytesIO(zip_bytes), "r") as zf:
            project_data = json.loads(zf.read("project/project.json"))

        preview = {
            "projectName": manifest.get("projectName"),
            "totalChars": project_data.get("totalChars", 0),
            "chapterCount": manifest.get("counts", {}).get("chapters", 0),
            "kbEntries": manifest.get("counts", {}).get("knowledgeBaseEntries", 0),
            "backupDate": manifest.get("exportedAt"),
            "version": manifest.get("version"),
        }

        return JSONResponse(status_code=200, content=preview)
    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": {"code": "INVALID_BACKUP", "message": "备份文件无效或已损坏"},
                "details": {},
            },
        )


@router.post("/{project_id}/backups/{backup_id}/restore")
def restore_backup(
    project_id: str,
    backup_id: str,
    payload: RestoreRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _error, _now, _next_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    if payload.mode not in ["create_new", "overwrite"]:
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "INVALID_MODE",
                    "message": "Mode must be 'create_new' or 'overwrite'",
                    "details": {},
                }
            },
        )

    if payload.mode == "overwrite":
        if not payload.project_name:
            return JSONResponse(
                status_code=422,
                content={
                    "error": {
                        "code": "CONFIRMATION_REQUIRED",
                        "message": "Project name confirmation required for overwrite mode",
                        "details": {},
                    }
                },
            )
        if payload.project_name != project.get("name"):
            return JSONResponse(
                status_code=400,
                content={
                    "error": {
                        "code": "NAME_MISMATCH",
                        "message": "Project name confirmation does not match",
                        "details": {},
                    }
                },
            )

    backup = next(
        (b for b in app.state.backups.get(project_id, []) if b.get("id") == backup_id),
        None,
    )
    if backup is None:
        return _error(404, "BACKUP_NOT_FOUND", "Backup not found")

    zip_data = app.state.backup_files.get(backup_id)
    if zip_data is None:
        return _error(404, "BACKUP_FILE_NOT_FOUND", "Backup file not found")

    try:
        zip_bytes = base64.b64decode(zip_data)
        manifest, val_err = _validate_backup_zip(zip_bytes)
        if val_err is not None:
            return JSONResponse(
                status_code=400,
                content={"error": val_err, "details": {}},
            )

        with ZipFile(BytesIO(zip_bytes), "r") as zf:
            project_data = json.loads(zf.read("project/project.json"))
            volumes_data = json.loads(zf.read("project/volumes.json"))
            chapters_data = json.loads(zf.read("project/chapters.json"))
            kb_data = json.loads(zf.read("knowledge-base/data.json"))

            if payload.mode == "create_new":
                new_project_id = _next_id("project_counter", "project")
                now_iso = _iso_z(_now())

                new_project = {
                    "id": new_project_id,
                    "ownerId": user_id,
                    "name": project_data.get("name", "Restored Project"),
                    "type": project_data.get("type", "novel"),
                    "tags": project_data.get("tags", []),
                    "description": project_data.get("description"),
                    "status": "active",
                    "coverColor": project_data.get("coverColor", "#5B8FF9"),
                    "totalChars": project_data.get("totalChars", 0),
                    "chapterCount": project_data.get("chapterCount", 0),
                    "createdAt": now_iso,
                    "updatedAt": now_iso,
                }
                app.state.fake_db.projects.append(new_project)

                old_to_new_vol = {}
                for vol in volumes_data:
                    vol_id = _next_id("volume_counter", "volume")
                    old_id = vol.get("id")
                    old_to_new_vol[old_id] = vol_id
                    new_vol = dict(vol)
                    new_vol["id"] = vol_id
                    new_vol["projectId"] = new_project_id
                    app.state.fake_db.volumes.append(new_vol)

                for ch in chapters_data:
                    ch_id = _next_id("chapter_counter", "chapter")
                    old_vol_id = ch.get("volumeId")
                    new_vol_id = old_to_new_vol.get(old_vol_id, old_vol_id)
                    new_ch = dict(ch)
                    new_ch["id"] = ch_id
                    new_ch["projectId"] = new_project_id
                    new_ch["volumeId"] = new_vol_id
                    app.state.fake_db.chapters.append(new_ch)

                kb_types = [
                    "characters",
                    "locations",
                    "items",
                    "factions",
                    "foreshadows",
                    "settings",
                ]
                for kb_type in kb_types:
                    for item in kb_data.get(kb_type, []):
                        item_id = _next_id("kb_item_counter", "kb")
                        new_item = dict(item)
                        new_item["id"] = item_id
                        new_item["projectId"] = new_project_id
                        app.state.kb_items[item_id] = new_item

                return JSONResponse(
                    status_code=201,
                    content={
                        "projectId": new_project_id,
                        "mode": "create_new",
                        "message": "Project restored as new project",
                    },
                )

            else:
                for i, p in enumerate(app.state.fake_db.projects):
                    if p["id"] == project_id:
                        app.state.fake_db.projects[i] = {
                            **p,
                            "name": project_data.get("name", p["name"]),
                            "type": project_data.get("type", p.get("type", "novel")),
                            "tags": project_data.get("tags", p.get("tags", [])),
                            "description": project_data.get(
                                "description", p.get("description")
                            ),
                            "coverColor": project_data.get(
                                "coverColor", p.get("coverColor")
                            ),
                            "totalChars": project_data.get(
                                "totalChars", p.get("totalChars", 0)
                            ),
                            "chapterCount": project_data.get(
                                "chapterCount", p.get("chapterCount", 0)
                            ),
                            "updatedAt": _iso_z(_now()),
                        }
                        break

                app.state.fake_db.volumes = [
                    v for v in app.state.fake_db.volumes if v.get("projectId") != project_id
                ]
                app.state.fake_db.chapters = [
                    c for c in app.state.fake_db.chapters if c.get("projectId") != project_id
                ]
                old_kb_items = {
                    k: v
                    for k, v in app.state.kb_items.items()
                    if v.get("projectId") != project_id
                }
                app.state.kb_items = old_kb_items

                old_to_new_vol = {}
                for vol in volumes_data:
                    vol_id = _next_id("volume_counter", "volume")
                    old_id = vol.get("id")
                    old_to_new_vol[old_id] = vol_id
                    new_vol = dict(vol)
                    new_vol["id"] = vol_id
                    new_vol["projectId"] = project_id
                    app.state.fake_db.volumes.append(new_vol)

                for ch in chapters_data:
                    ch_id = _next_id("chapter_counter", "chapter")
                    old_vol_id = ch.get("volumeId")
                    new_vol_id = old_to_new_vol.get(old_vol_id, old_vol_id)
                    new_ch = dict(ch)
                    new_ch["id"] = ch_id
                    new_ch["projectId"] = project_id
                    new_ch["volumeId"] = new_vol_id
                    app.state.fake_db.chapters.append(new_ch)

                kb_types = [
                    "characters",
                    "locations",
                    "items",
                    "factions",
                    "foreshadows",
                    "settings",
                ]
                for kb_type in kb_types:
                    for item in kb_data.get(kb_type, []):
                        item_id = _next_id("kb_item_counter", "kb")
                        new_item = dict(item)
                        new_item["id"] = item_id
                        new_item["projectId"] = project_id
                        app.state.kb_items[item_id] = new_item

                return JSONResponse(
                    status_code=200,
                    content={
                        "projectId": project_id,
                        "mode": "overwrite",
                        "message": "Project restored successfully",
                    },
                )

    except Exception:
        return JSONResponse(
            status_code=400,
            content={
                "error": {"code": "INVALID_BACKUP", "message": "备份文件无效或已损坏"},
                "details": {},
            },
        )
