import json
from collections.abc import AsyncIterator
from typing import Optional

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse, StreamingResponse

from server.models.ai_models import CreateAITaskRequest, UpdateAIProjectConfigRequest
from server.routes._deps import require_project as _require_project
from server.routes.us31_editor import _require_chapter
from server.services import ai_service

router = APIRouter(tags=["us-4.1", "us-4.8"])


def _require_ai_task(
    task_id: str,
    authorization: Optional[str],
) -> tuple[Optional[dict[str, object]], Optional[JSONResponse]]:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return None, maybe_user_id
    task = ai_service.get_ai_task(task_id)
    if task is None:
        return None, _error(404, "AI_TASK_NOT_FOUND", "AI task not found")
    if task["userId"] != maybe_user_id:
        return None, _error(403, "FORBIDDEN", "No permission for this task")
    return task, None


@router.get("/api/projects/{project_id}/ai-config")
def get_project_ai_config(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    return JSONResponse(
        status_code=200,
        content=ai_service.build_ai_config_response(project_id, maybe_user_id),
    )


@router.put("/api/projects/{project_id}/ai-config")
@router.patch("/api/projects/{project_id}/ai-config")
def put_project_ai_config(
    project_id: str,
    payload: UpdateAIProjectConfigRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    ai_service.update_project_ai_config(project_id, payload.model_dump(exclude_unset=True))
    return JSONResponse(
        status_code=200,
        content=ai_service.build_ai_config_response(project_id, maybe_user_id),
    )


@router.post("/api/ai/tasks")
async def create_ai_task(
    payload: CreateAITaskRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    _, err = _require_project(payload.projectId, maybe_user_id)
    if err is not None:
        return err
    if payload.chapterId is not None:
        _, chapter_err = _require_chapter(payload.projectId, payload.chapterId, maybe_user_id)
        if chapter_err is not None:
            return chapter_err

    # Basic validation by task type (contract-level guards).
    from server.main import _error

    if payload.type in {"polish", "expand", "summarize"}:
        if payload.selectionText is None or not payload.selectionText.strip():
            return _error(422, "VALIDATION_ERROR", "selectionText is required for diff tasks")
        if payload.type == "expand":
            multiplier = payload.parameters.get("multiplier")
            if multiplier is not None and not (isinstance(multiplier, (int, float)) and 1.1 <= float(multiplier) <= 3.0):
                return _error(422, "VALIDATION_ERROR", "multiplier must be between 1.1 and 3.0")
        if payload.type == "summarize":
            ratio = payload.parameters.get("ratio")
            if ratio is not None and not (isinstance(ratio, (int, float)) and 0.2 <= float(ratio) <= 0.9):
                return _error(422, "VALIDATION_ERROR", "ratio must be between 0.2 and 0.9")
    if payload.type == "dialogue":
        scene = payload.parameters.get("scene")
        if scene is not None and isinstance(scene, str) and len(scene) > 200:
            return _error(422, "VALIDATION_ERROR", "scene must be <= 200 characters")
    task = ai_service.create_ai_task(
        project_id=payload.projectId,
        user_id=maybe_user_id,
        task_type=payload.type,
        chapter_id=payload.chapterId,
        selection_text=payload.selectionText,
        cursor_offset=payload.cursorOffset,
        parameters=payload.parameters,
    )
    await ai_service.start_task_runner(task["id"])
    return JSONResponse(status_code=202, content={"taskId": task["id"], "task": task})


@router.post("/api/ai/tasks/{task_id}/stop")
def stop_ai_task(
    task_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    task, err = _require_ai_task(task_id, authorization)
    if err is not None:
        return err
    response = ai_service.stop_ai_task(task_id)
    if response is None:
        from server.main import _error

        return _error(404, "AI_TASK_NOT_FOUND", "AI task not found")
    return JSONResponse(status_code=200, content=response)


@router.get("/api/ai/tasks/{task_id}/stream", response_model=None)
def stream_ai_task(
    task_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse | StreamingResponse:
    task, err = _require_ai_task(task_id, authorization)
    if err is not None:
        return err

    async def event_iter() -> AsyncIterator[str]:
        async for event in ai_service.stream_ai_task_events(task_id):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_iter(), media_type="text/event-stream")
