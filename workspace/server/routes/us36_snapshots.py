from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Any, Optional

from server.utils.text_utils import calculate_char_count as _calculate_char_count
from server.utils.time_utils import iso_z as _iso_z
from server.routes._deps import require_writable_project as _require_project

router = APIRouter(prefix="/api/projects", tags=["us-3.6"])

MAX_LABEL_LENGTH = 100
MAX_AUTO_SNAPSHOTS_PER_CHAPTER = 50
CLEANUP_DAYS = 90


class CreateSnapshotRequest(BaseModel):
    label: Optional[str] = None
    type: Optional[str] = None

    model_config = {"extra": "forbid"}


class CleanupRequest(BaseModel):
    pass

    model_config = {"extra": "forbid"}




def _require_chapter(
    project_id: str,
    chapter_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import app, _error

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return None, err

    chapter = next(
        (
            c
            for c in app.state.fake_db.chapters
            if c["id"] == chapter_id and c["projectId"] == project_id
        ),
        None,
    )
    if chapter is None:
        return None, _error(404, "CHAPTER_NOT_FOUND", "Chapter not found")

    return chapter, None


def _require_snapshot(
    project_id: str,
    chapter_id: str,
    snapshot_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import app, _error

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return None, err

    snapshot = next(
        (
            s
            for s in app.state.snapshots
            if s["id"] == snapshot_id and s["chapterId"] == chapter_id
        ),
        None,
    )
    if snapshot is None:
        return None, _error(404, "SNAPSHOT_NOT_FOUND", "Snapshot not found")

    return snapshot, None


def _snapshot_response(snapshot: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": snapshot["id"],
        "chapterId": snapshot["chapterId"],
        "content": snapshot["content"],
        "charCount": snapshot["charCount"],
        "type": snapshot["type"],
        "label": snapshot.get("label"),
        "createdAt": snapshot["createdAt"],
    }


def _check_archived(project_id: str) -> Optional[JSONResponse]:
    from server.main import _error

    from server.main import app

    if project_id in app.state.archived_project_ids:
        return _error(409, "PROJECT_ARCHIVED_READ_ONLY", "Project is archived")
    return None


def _cleanup_auto_snapshots(chapter_id: str) -> None:
    from server.main import app

    auto_snapshots = [
        s
        for s in app.state.snapshots
        if s["chapterId"] == chapter_id and s["type"] in ("auto", "daily")
    ]
    if len(auto_snapshots) > MAX_AUTO_SNAPSHOTS_PER_CHAPTER:
        auto_snapshots.sort(key=lambda s: s["createdAt"])
        to_remove = auto_snapshots[
            : len(auto_snapshots) - MAX_AUTO_SNAPSHOTS_PER_CHAPTER
        ]
        remove_ids = {s["id"] for s in to_remove}
        app.state.snapshots = [
            s for s in app.state.snapshots if s["id"] not in remove_ids
        ]


# 1. POST /api/projects/:projectId/chapters/:chapterId/snapshots
@router.post("/{project_id}/chapters/{chapter_id}/snapshots")
def create_snapshot(
    project_id: str,
    chapter_id: str,
    payload: CreateSnapshotRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return err

    archived_err = _check_archived(project_id)
    if archived_err is not None:
        return archived_err

    if payload.label is not None and len(payload.label) > MAX_LABEL_LENGTH:
        return _error(
            400,
            "SNAPSHOT_LABEL_TOO_LONG",
            f"Snapshot label must be {MAX_LABEL_LENGTH} characters or fewer",
        )

    content_data = app.state.chapter_contents.get(chapter_id, {})
    content = content_data.get("content", "")
    char_count = content_data.get("charCount", _calculate_char_count(content))

    snapshot_type = (
        payload.type if payload.type in ("manual", "auto", "daily") else "manual"
    )

    snapshot_id = f"snapshot-{app.state.snapshot_counter}"
    app.state.snapshot_counter += 1
    now_iso = _iso_z(app.state.session_clock.now)

    snapshot = {
        "id": snapshot_id,
        "chapterId": chapter_id,
        "projectId": project_id,
        "content": content,
        "charCount": char_count,
        "type": snapshot_type,
        "label": payload.label if snapshot_type == "manual" else None,
        "createdAt": now_iso,
    }
    app.state.snapshots.append(snapshot)

    _cleanup_auto_snapshots(chapter_id)

    return JSONResponse(
        status_code=201,
        content={"snapshot": _snapshot_response(snapshot)},
    )


# 2. GET /api/projects/:projectId/chapters/:chapterId/snapshots
@router.get("/{project_id}/chapters/{chapter_id}/snapshots")
def list_snapshots(
    project_id: str,
    chapter_id: str,
    page: int = 1,
    limit: int = 20,
    type: Optional[str] = None,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return err

    snapshots = [
        s
        for s in app.state.snapshots
        if s["chapterId"] == chapter_id and s["projectId"] == project_id
    ]

    if type is not None:
        valid_types = {"manual", "auto", "daily", "restore_backup"}
        if type not in valid_types:
            return _error(
                400, "INVALID_SNAPSHOT_TYPE", f"Invalid snapshot type: {type}"
            )
        snapshots = [s for s in snapshots if s["type"] == type]

    snapshots.sort(key=lambda s: s["createdAt"], reverse=True)

    total = len(snapshots)
    start = max(page - 1, 0) * limit
    end = start + limit
    paginated = snapshots[start:end]

    return JSONResponse(
        status_code=200,
        content={
            "snapshots": [_snapshot_response(s) for s in paginated],
            "total": total,
            "page": page,
            "limit": limit,
        },
    )


# 3. GET /api/projects/:projectId/chapters/:chapterId/snapshots/:snapshotId
@router.get("/{project_id}/chapters/{chapter_id}/snapshots/{snapshot_id}")
def get_snapshot(
    project_id: str,
    chapter_id: str,
    snapshot_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    snapshot, err = _require_snapshot(project_id, chapter_id, snapshot_id, user_id)
    if err is not None:
        return err

    return JSONResponse(
        status_code=200,
        content={"snapshot": _snapshot_response(snapshot)},
    )


# 4. GET /api/projects/:projectId/chapters/:chapterId/snapshots/:snapshotId/diff
@router.get("/{project_id}/chapters/{chapter_id}/snapshots/{snapshot_id}/diff")
def get_snapshot_diff(
    project_id: str,
    chapter_id: str,
    snapshot_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    snapshot, err = _require_snapshot(project_id, chapter_id, snapshot_id, user_id)
    if err is not None:
        return err

    content_data = app.state.chapter_contents.get(chapter_id, {})
    current_content = content_data.get("content", "")

    snapshot_content = snapshot["content"]

    diff_lines = []
    if snapshot_content != current_content:
        diff_lines.append(f"--- snapshot ({snapshot_id})")
        diff_lines.append("+++ current")
        diff_lines.append(f"Snapshot: {snapshot_content[:100]}...")
        diff_lines.append(f"Current: {current_content[:100]}...")

    return JSONResponse(
        status_code=200,
        content={
            "diff": "\n".join(diff_lines) if diff_lines else "",
            "snapshotContent": snapshot_content,
            "currentContent": current_content,
        },
    )


# 5. POST /api/projects/:projectId/chapters/:chapterId/snapshots/:snapshotId/restore
@router.post("/{project_id}/chapters/{chapter_id}/snapshots/{snapshot_id}/restore")
def restore_snapshot(
    project_id: str,
    chapter_id: str,
    snapshot_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return err

    archived_err = _check_archived(project_id)
    if archived_err is not None:
        return archived_err

    snapshot, err = _require_snapshot(project_id, chapter_id, snapshot_id, user_id)
    if err is not None:
        return err

    content_data = app.state.chapter_contents.get(chapter_id, {})
    current_content = content_data.get("content", "")
    current_char_count = content_data.get(
        "charCount", _calculate_char_count(current_content)
    )

    backup_id = f"snapshot-{app.state.snapshot_counter}"
    app.state.snapshot_counter += 1
    now_iso = _iso_z(app.state.session_clock.now)

    backup_snapshot = {
        "id": backup_id,
        "chapterId": chapter_id,
        "projectId": project_id,
        "content": current_content,
        "charCount": current_char_count,
        "type": "restore_backup",
        "createdAt": now_iso,
    }
    app.state.snapshots.append(backup_snapshot)

    app.state.chapter_contents[chapter_id] = {
        "content": snapshot["content"],
        "charCount": snapshot["charCount"],
        "saveSource": "restore",
        "savedAt": now_iso,
    }

    chapter["chars"] = snapshot["charCount"]
    chapter["lastEditedAt"] = now_iso

    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "restoreBackupId": backup_id,
            "restoredContent": snapshot["content"],
        },
    )


# 6. DELETE /api/projects/:projectId/chapters/:chapterId/snapshots/:snapshotId
@router.delete("/{project_id}/chapters/{chapter_id}/snapshots/{snapshot_id}")
def delete_snapshot(
    project_id: str,
    chapter_id: str,
    snapshot_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    snapshot, err = _require_snapshot(project_id, chapter_id, snapshot_id, user_id)
    if err is not None:
        return err

    if snapshot["type"] != "manual":
        return _error(
            400,
            "CANNOT_DELETE_AUTO_SNAPSHOT",
            "Only manual snapshots can be deleted. Use cleanup endpoint for auto snapshots.",
        )

    app.state.snapshots = [s for s in app.state.snapshots if s["id"] != snapshot_id]

    return JSONResponse(status_code=200, content={"ok": True})


# 7. GET /api/projects/:projectId/snapshots/storage
@router.get("/{project_id}/snapshots/storage")
def get_storage_stats(
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

    project_snapshots = [s for s in app.state.snapshots if s["projectId"] == project_id]

    total_chars = sum(s["charCount"] for s in project_snapshots)
    total_size_mb = total_chars / (1024 * 1024)

    return JSONResponse(
        status_code=200,
        content={
            "totalSizeMB": round(total_size_mb, 4),
            "snapshotCount": len(project_snapshots),
        },
    )


# 8. POST /api/projects/:projectId/snapshots/cleanup
@router.post("/{project_id}/snapshots/cleanup")
def cleanup_old_snapshots(
    project_id: str,
    preview: bool = False,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    cutoff_date = app.state.session_clock.now - timedelta(days=CLEANUP_DAYS)
    cutoff_iso = _iso_z(cutoff_date)

    old_auto_snapshots = [
        s
        for s in app.state.snapshots
        if s["projectId"] == project_id
        and s["type"] in ("auto", "daily")
        and s["createdAt"] < cutoff_iso
    ]

    if preview:
        return JSONResponse(
            status_code=200,
            content={
                "preview": True,
                "wouldDeleteCount": len(old_auto_snapshots),
                "cutoffDate": cutoff_iso,
            },
        )

    delete_ids = {s["id"] for s in old_auto_snapshots}
    app.state.snapshots = [s for s in app.state.snapshots if s["id"] not in delete_ids]

    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "deletedCount": len(old_auto_snapshots),
            "cutoffDate": cutoff_iso,
        },
    )
