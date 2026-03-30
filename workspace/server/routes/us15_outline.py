from fastapi import APIRouter, Body, Header
from pydantic import BaseModel
from typing import Any, Optional, Union
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/projects", tags=["us-1.5"])


class CreateVolumeRequest(BaseModel):
    name: Optional[str] = None

    model_config = {"extra": "forbid"}


class PatchVolumeRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

    model_config = {"extra": "forbid"}


class CreateChapterRequest(BaseModel):
    title: Optional[str] = None

    model_config = {"extra": "forbid"}


class PatchChapterRequest(BaseModel):
    title: Optional[str] = None
    volumeId: Optional[str] = None
    position: Optional[int] = None

    model_config = {"extra": "forbid"}


class ReorderVolumesRequest(BaseModel):
    volumeIds: list[str]

    model_config = {"extra": "forbid"}


class ReorderChaptersRequest(BaseModel):
    chapterIds: list[str]
    targetVolumeId: Optional[str] = None

    model_config = {"extra": "forbid"}


class BulkMoveRequest(BaseModel):
    chapterIds: list[str]
    targetVolumeId: str

    model_config = {"extra": "forbid"}


class BulkTrashRequest(BaseModel):
    chapterIds: list[str]

    model_config = {"extra": "forbid"}


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
    if project_id in app.state.archived_project_ids:
        return None, _error(409, "PROJECT_ARCHIVED_READ_ONLY", "Project is archived")
    return project, None


def _volume_response(volume: dict[str, Any]) -> dict[str, Any]:
    from server.main import app

    chapters = [c for c in app.state.fake_db.chapters if c["volumeId"] == volume["id"]]
    return {
        "id": volume["id"],
        "name": volume["name"],
        "description": volume.get("description", ""),
        "order": volume["order"],
        "chapterCount": len(chapters),
        "totalChars": sum(c.get("chars", 0) for c in chapters),
        "chapters": [
            {
                "id": c["id"],
                "projectId": c["projectId"],
                "volumeId": c["volumeId"],
                "title": c["title"],
                "order": c["order"],
                "chars": c.get("chars", 0),
                "lastEditedAt": c.get("lastEditedAt"),
                "parserStatus": c.get("parserStatus", "empty"),
            }
            for c in sorted(chapters, key=lambda x: x["order"])
        ],
    }


def _outline_totals(project_id: str) -> dict[str, Any]:
    from server.main import app

    volumes = [v for v in app.state.fake_db.volumes if v["projectId"] == project_id]
    chapters = [c for c in app.state.fake_db.chapters if c["projectId"] == project_id]
    return {
        "volumeCount": len(volumes),
        "chapterCount": len(chapters),
        "totalChars": sum(c.get("chars", 0) for c in chapters),
    }


# 1. GET /api/projects/:projectId/outline
@router.get("/{project_id}/outline")
def get_outline(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err
    assert project is not None

    volumes = sorted(
        [v for v in app.state.fake_db.volumes if v["projectId"] == project_id],
        key=lambda v: v["order"],
    )
    volume_items = [_volume_response(v) for v in volumes]
    totals = _outline_totals(project_id)

    return JSONResponse(
        status_code=200,
        content={
            "volumes": volume_items,
            "totals": totals,
            "updatedAt": project["updatedAt"]
            if "updatedAt" in project
            else _iso_z(app.state.session_clock.now),
        },
    )


# 2. POST /api/projects/:projectId/volumes
@router.post("/{project_id}/volumes")
def create_volume(
    project_id: str,
    payload: CreateVolumeRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    name = payload.name.strip() if payload.name else ""
    if not name:
        return _error(400, "VOLUME_NAME_REQUIRED", "Volume name is required")
    if len(name) > 30:
        return _error(
            400, "VOLUME_NAME_TOO_LONG", "Volume name must be 30 characters or fewer"
        )

    max_order = max(
        [v["order"] for v in app.state.fake_db.volumes if v["projectId"] == project_id],
        default=-1,
    )

    volume_id = f"volume-{app.state.volume_counter}"
    app.state.volume_counter += 1
    now_iso = _iso_z(app.state.session_clock.now)
    volume = {
        "id": volume_id,
        "projectId": project_id,
        "name": name,
        "description": "",
        "order": max_order + 1,
        "ownerId": user_id,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    app.state.fake_db.volumes.append(volume)
    return JSONResponse(status_code=201, content={"volume": _volume_response(volume)})


# 3. PATCH /api/projects/:projectId/volumes/:volumeId
@router.patch("/{project_id}/volumes/{volume_id}")
def patch_volume(
    project_id: str,
    volume_id: str,
    payload: PatchVolumeRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    volume = next(
        (
            v
            for v in app.state.fake_db.volumes
            if v["id"] == volume_id and v["projectId"] == project_id
        ),
        None,
    )
    if volume is None:
        return _error(404, "VOLUME_NOT_FOUND", "Volume not found")

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            return _error(400, "VOLUME_NAME_REQUIRED", "Volume name is required")
        if len(name) > 30:
            return _error(
                400,
                "VOLUME_NAME_TOO_LONG",
                "Volume name must be 30 characters or fewer",
            )
        volume["name"] = name

    if payload.description is not None:
        desc = str(payload.description or "")
        if len(desc) > 500:
            return _error(
                400,
                "VOLUME_DESCRIPTION_TOO_LONG",
                "Volume description must be 500 characters or fewer",
            )
        volume["description"] = desc

    volume["updatedAt"] = _iso_z(app.state.session_clock.now)
    return JSONResponse(status_code=200, content={"volume": _volume_response(volume)})


# 4. DELETE /api/projects/:projectId/volumes/:volumeId
@router.delete("/{project_id}/volumes/{volume_id}")
def delete_volume(
    project_id: str,
    volume_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    volume = next(
        (
            v
            for v in app.state.fake_db.volumes
            if v["id"] == volume_id and v["projectId"] == project_id
        ),
        None,
    )
    if volume is None:
        return _error(404, "VOLUME_NOT_FOUND", "Volume not found")

    chapters = [c for c in app.state.fake_db.chapters if c["volumeId"] == volume_id]
    now_iso = _iso_z(app.state.session_clock.now)

    for ch in chapters:
        app.state.trash_items.append(
            {
                "id": f"trash-{len(app.state.trash_items) + 1}",
                "projectId": project_id,
                "type": "chapter",
                "title": ch["title"],
                "originalVolumeId": volume_id,
                "originalVolumeName": volume["name"],
                "originalPosition": ch["order"],
                "chars": ch.get("chars", 0),
                "deletedAt": now_iso,
                "expiresAt": _iso_z(app.state.session_clock.now),
                "remainingDays": 30,
                "snapshotCount": 0,
            }
        )
        app.state.fake_db.chapters = [
            c for c in app.state.fake_db.chapters if c["id"] != ch["id"]
        ]

    app.state.fake_db.volumes = [
        v for v in app.state.fake_db.volumes if v["id"] != volume_id
    ]
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "trashedChapterCount": len(chapters),
        },
    )


# 5. POST /api/projects/:projectId/outline/reorder-volumes
@router.post("/{project_id}/outline/reorder-volumes")
def reorder_volumes(
    project_id: str,
    payload: ReorderVolumesRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    volume_ids = payload.volumeIds
    project_volume_ids = {
        v["id"] for v in app.state.fake_db.volumes if v["projectId"] == project_id
    }
    if set(volume_ids) != project_volume_ids:
        return _error(
            400, "VOLUME_IDS_MISMATCH", "volumeIds must match all project volumes"
        )

    for order, vid in enumerate(volume_ids):
        vol = next((v for v in app.state.fake_db.volumes if v["id"] == vid), None)
        if vol:
            vol["order"] = order

    return JSONResponse(status_code=200, content={"ok": True})


# 6. POST /api/projects/:projectId/volumes/:volumeId/chapters
@router.post("/{project_id}/volumes/{volume_id}/chapters")
def create_chapter(
    project_id: str,
    volume_id: str,
    payload: CreateChapterRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    volume = next(
        (
            v
            for v in app.state.fake_db.volumes
            if v["id"] == volume_id and v["projectId"] == project_id
        ),
        None,
    )
    if volume is None:
        return _error(404, "VOLUME_NOT_FOUND", "Volume not found")

    title = payload.title.strip() if payload.title else ""
    if not title:
        return _error(400, "CHAPTER_TITLE_REQUIRED", "Chapter title is required")
    if len(title) > 50:
        return _error(
            400,
            "CHAPTER_TITLE_TOO_LONG",
            "Chapter title must be 50 characters or fewer",
        )

    max_order = max(
        [c["order"] for c in app.state.fake_db.chapters if c["volumeId"] == volume_id],
        default=-1,
    )

    chapter_id = f"chapter-{app.state.chapter_counter}"
    app.state.chapter_counter += 1
    now_iso = _iso_z(app.state.session_clock.now)
    chapter = {
        "id": chapter_id,
        "projectId": project_id,
        "volumeId": volume_id,
        "title": title,
        "order": max_order + 1,
        "chars": 0,
        "lastEditedAt": now_iso,
        "parserStatus": "empty",
    }
    app.state.fake_db.chapters.append(chapter)
    return JSONResponse(
        status_code=201,
        content={
            "chapter": {
                "id": chapter["id"],
                "title": chapter["title"],
                "volumeId": chapter["volumeId"],
                "order": chapter["order"],
                "chars": chapter["chars"],
                "lastEditedAt": chapter["lastEditedAt"],
                "parserStatus": chapter["parserStatus"],
            }
        },
    )


# 7. PATCH /api/projects/:projectId/chapters/:chapterId
@router.patch("/{project_id}/chapters/{chapter_id}")
def patch_chapter(
    project_id: str,
    chapter_id: str,
    payload: PatchChapterRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    chapter = next(
        (
            c
            for c in app.state.fake_db.chapters
            if c["id"] == chapter_id and c["projectId"] == project_id
        ),
        None,
    )
    if chapter is None:
        return _error(404, "CHAPTER_NOT_FOUND", "Chapter not found")

    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            return _error(400, "CHAPTER_TITLE_REQUIRED", "Chapter title is required")
        if len(title) > 50:
            return _error(
                400,
                "CHAPTER_TITLE_TOO_LONG",
                "Chapter title must be 50 characters or fewer",
            )
        chapter["title"] = title

    if payload.volumeId is not None:
        target_vol_id = payload.volumeId
        target_vol = next(
            (
                v
                for v in app.state.fake_db.volumes
                if v["id"] == target_vol_id and v["projectId"] == project_id
            ),
            None,
        )
        if target_vol is None:
            return _error(404, "VOLUME_NOT_FOUND", "Target volume not found")
        chapter["volumeId"] = target_vol_id

    if payload.position is not None:
        chapter["order"] = payload.position

    chapter["lastEditedAt"] = _iso_z(app.state.session_clock.now)
    return JSONResponse(
        status_code=200,
        content={
            "chapter": {
                "id": chapter["id"],
                "title": chapter["title"],
                "volumeId": chapter["volumeId"],
                "order": chapter["order"],
                "chars": chapter.get("chars", 0),
                "lastEditedAt": chapter["lastEditedAt"],
                "parserStatus": chapter.get("parserStatus", "empty"),
            }
        },
    )


# 8. POST /api/projects/:projectId/chapters/reorder
@router.post("/{project_id}/chapters/reorder")
def reorder_chapters(
    project_id: str,
    payload: ReorderChaptersRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    chapter_ids = payload.chapterIds
    target_volume_id = payload.targetVolumeId

    if target_volume_id:
        target_vol = next(
            (
                v
                for v in app.state.fake_db.volumes
                if v["id"] == target_volume_id and v["projectId"] == project_id
            ),
            None,
        )
        if target_vol is None:
            return _error(404, "VOLUME_NOT_FOUND", "Target volume not found")

    for order, ch_id in enumerate(chapter_ids):
        ch = next(
            (
                c
                for c in app.state.fake_db.chapters
                if c["id"] == ch_id and c["projectId"] == project_id
            ),
            None,
        )
        if ch:
            if target_volume_id:
                ch["volumeId"] = target_volume_id
            ch["order"] = order

    return JSONResponse(status_code=200, content={"ok": True})


# 9. POST /api/projects/:projectId/chapters/bulk-move
@router.post("/{project_id}/chapters/bulk-move")
def bulk_move_chapters(
    project_id: str,
    payload: BulkMoveRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    chapter_ids = payload.chapterIds
    target_volume_id = payload.targetVolumeId

    target_vol = next(
        (
            v
            for v in app.state.fake_db.volumes
            if v["id"] == target_volume_id and v["projectId"] == project_id
        ),
        None,
    )
    if target_vol is None:
        return _error(404, "VOLUME_NOT_FOUND", "Target volume not found")

    max_order = max(
        [
            c["order"]
            for c in app.state.fake_db.chapters
            if c["volumeId"] == target_volume_id
        ],
        default=-1,
    )

    moved = 0
    for ch_id in chapter_ids:
        ch = next(
            (
                c
                for c in app.state.fake_db.chapters
                if c["id"] == ch_id and c["projectId"] == project_id
            ),
            None,
        )
        if ch:
            max_order += 1
            ch["volumeId"] = target_volume_id
            ch["order"] = max_order
            moved += 1

    return JSONResponse(status_code=200, content={"ok": True, "movedCount": moved})


# 10. POST /api/projects/:projectId/chapters/bulk-trash
@router.post("/{project_id}/chapters/bulk-trash")
def bulk_trash_chapters(
    project_id: str,
    payload: BulkTrashRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, _error, _iso_z, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return err

    chapter_ids = payload.chapterIds
    now_iso = _iso_z(app.state.session_clock.now)

    trashed = 0
    for ch_id in chapter_ids:
        ch = next(
            (
                c
                for c in app.state.fake_db.chapters
                if c["id"] == ch_id and c["projectId"] == project_id
            ),
            None,
        )
        if ch:
            vol = next(
                (v for v in app.state.fake_db.volumes if v["id"] == ch["volumeId"]),
                None,
            )
            app.state.trash_items.append(
                {
                    "id": f"trash-{len(app.state.trash_items) + 1}",
                    "projectId": project_id,
                    "type": "chapter",
                    "title": ch["title"],
                    "originalVolumeId": ch["volumeId"],
                    "originalVolumeName": vol["name"] if vol else "",
                    "originalPosition": ch["order"],
                    "chars": ch.get("chars", 0),
                    "deletedAt": now_iso,
                    "expiresAt": _iso_z(app.state.session_clock.now),
                    "remainingDays": 30,
                    "snapshotCount": 0,
                }
            )
            app.state.fake_db.chapters = [
                c for c in app.state.fake_db.chapters if c["id"] != ch_id
            ]
            trashed += 1

    return JSONResponse(status_code=200, content={"ok": True, "trashedCount": trashed})
