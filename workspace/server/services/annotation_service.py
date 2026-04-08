from __future__ import annotations

from datetime import datetime
from types import ModuleType
from typing import Any, Optional, cast


def _main_module() -> ModuleType:
    from server import main as server_main

    return server_main


class _AppProxy:
    @property
    def state(self) -> Any:
        return _main_module().app.state


app = _AppProxy()


def _iso_z(ts: datetime) -> str:
    return cast(str, _main_module()._iso_z(ts))


def _now() -> datetime:
    return cast(datetime, _main_module()._now())


def ensure_annotation_state() -> None:
    if not hasattr(app.state, "annotations"):
        app.state.annotations = []
    if not hasattr(app.state, "annotation_counter"):
        app.state.annotation_counter = 0


def _next_annotation_id() -> str:
    ensure_annotation_state()
    annotation_id = f"annotation-{app.state.annotation_counter}"
    app.state.annotation_counter += 1
    return annotation_id


def create_annotation(
    project_id: str,
    chapter_id: str,
    anchor_start: int,
    anchor_end: int,
    selected_text: str,
    content: str,
) -> dict[str, Any]:
    ensure_annotation_state()
    now_iso = _iso_z(_now())
    annotation = {
        "id": _next_annotation_id(),
        "projectId": project_id,
        "chapterId": chapter_id,
        "anchorStart": anchor_start,
        "anchorEnd": anchor_end,
        "selectedText": selected_text,
        "content": content,
        "resolved": False,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    app.state.annotations.append(annotation)
    return annotation


def list_annotations(
    project_id: str,
    chapter_id: str,
    resolved: Optional[bool] = None,
) -> list[dict[str, Any]]:
    ensure_annotation_state()
    annotations = [
        annotation
        for annotation in app.state.annotations
        if annotation["projectId"] == project_id
        and annotation["chapterId"] == chapter_id
    ]
    if resolved is not None:
        annotations = [
            annotation
            for annotation in annotations
            if bool(annotation["resolved"]) is resolved
        ]
    return sorted(
        annotations,
        key=lambda annotation: (annotation["anchorStart"], annotation["anchorEnd"]),
    )


def get_annotation(
    project_id: str,
    annotation_id: str,
) -> Optional[dict[str, Any]]:
    ensure_annotation_state()
    return cast(
        Optional[dict[str, Any]],
        next(
            (
                annotation
                for annotation in app.state.annotations
                if annotation["id"] == annotation_id
                and annotation["projectId"] == project_id
            ),
            None,
        ),
    )


def update_annotation(
    annotation: dict[str, Any],
    content: Optional[str] = None,
    resolved: Optional[bool] = None,
) -> dict[str, Any]:
    if content is not None:
        annotation["content"] = content
    if resolved is not None:
        annotation["resolved"] = resolved
    annotation["updatedAt"] = _iso_z(_now())
    return annotation


def delete_annotation(annotation_id: str) -> None:
    ensure_annotation_state()
    app.state.annotations = [
        annotation
        for annotation in app.state.annotations
        if annotation["id"] != annotation_id
    ]
