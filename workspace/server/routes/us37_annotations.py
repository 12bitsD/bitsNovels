import importlib
from typing import Any, Optional

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.routes._deps import require_project as _require_project

router = APIRouter(prefix="/api/projects", tags=["us-3.7"])


def _annotation_service() -> Any:
    return importlib.import_module("server.services.annotation_service")


class CreateAnnotationRequest(BaseModel):
    anchorStart: int
    anchorEnd: int
    selectedText: str
    content: str

    model_config = {"extra": "forbid"}


class UpdateAnnotationRequest(BaseModel):
    content: Optional[str] = None
    resolved: Optional[bool] = None

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
            chapter
            for chapter in app.state.fake_db.chapters
            if chapter["id"] == chapter_id and chapter["projectId"] == project_id
        ),
        None,
    )
    if chapter is None:
        return None, _error(404, "CHAPTER_NOT_FOUND", "Chapter not found")
    return chapter, None


def _require_annotation(
    project_id: str,
    annotation_id: str,
    user_id: str,
) -> tuple[Optional[dict[str, Any]], Optional[JSONResponse]]:
    from server.main import _error

    project, err = _require_project(project_id, user_id)
    if err is not None:
        return None, err
    annotation = _annotation_service().get_annotation(project_id, annotation_id)
    if annotation is None:
        return None, _error(404, "ANNOTATION_NOT_FOUND", "Annotation not found")
    return annotation, None


@router.post("/{project_id}/chapters/{chapter_id}/annotations")
def create_annotation(
    project_id: str,
    chapter_id: str,
    payload: CreateAnnotationRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return err

    if payload.anchorStart < 0 or payload.anchorEnd <= payload.anchorStart:
        return _error(400, "ANNOTATION_RANGE_INVALID", "Annotation range is invalid")

    annotation = _annotation_service().create_annotation(
        project_id=project_id,
        chapter_id=chapter_id,
        anchor_start=payload.anchorStart,
        anchor_end=payload.anchorEnd,
        selected_text=payload.selectedText,
        content=payload.content,
    )
    return JSONResponse(status_code=201, content={"annotation": annotation})


@router.get("/{project_id}/chapters/{chapter_id}/annotations")
def list_annotations(
    project_id: str,
    chapter_id: str,
    resolved: Optional[bool] = Query(default=None),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    chapter, err = _require_chapter(project_id, chapter_id, user_id)
    if err is not None:
        return err

    annotations = _annotation_service().list_annotations(
        project_id, chapter_id, resolved
    )
    return JSONResponse(status_code=200, content={"annotations": annotations})


@router.patch("/{project_id}/annotations/{annotation_id}")
def update_annotation(
    project_id: str,
    annotation_id: str,
    payload: UpdateAnnotationRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    annotation, err = _require_annotation(project_id, annotation_id, user_id)
    if err is not None:
        return err
    if payload.content is None and payload.resolved is None:
        return _error(400, "ANNOTATION_UPDATE_EMPTY", "No annotation fields to update")

    updated = _annotation_service().update_annotation(
        annotation,
        content=payload.content,
        resolved=payload.resolved,
    )
    return JSONResponse(status_code=200, content={"annotation": updated})


@router.delete("/{project_id}/annotations/{annotation_id}")
def delete_annotation(
    project_id: str,
    annotation_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    annotation, err = _require_annotation(project_id, annotation_id, user_id)
    if err is not None:
        return err

    _annotation_service().delete_annotation(annotation_id)
    return JSONResponse(status_code=200, content={"ok": True})
