from typing import Optional

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.routes.us24_item import _require_project
from server.routes.us31_editor import _require_chapter
from server.services import parser_service

router = APIRouter(prefix="/api/projects", tags=["us-2.1"])


class TriggerParserRequest(BaseModel):
    content: str = ""

    model_config = {"extra": "forbid"}


class BatchParserRequest(BaseModel):
    scope: str
    volumeId: Optional[str] = None
    chapterIds: Optional[list[str]] = None

    model_config = {"extra": "forbid"}


@router.post("/{project_id}/parser/chapters/{chapter_id}/trigger")
def trigger_parser(
    project_id: str,
    chapter_id: str,
    payload: TriggerParserRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    chapter, err = _require_chapter(project_id, chapter_id, maybe_user_id)
    if err is not None:
        return err
    task = parser_service.enqueue_parse_task(
        project_id, chapter_id, "manual", payload.content
    )
    return JSONResponse(status_code=202, content={"task": task})


@router.post("/{project_id}/parser/chapters/{chapter_id}/auto-trigger")
def auto_trigger_parser(
    project_id: str,
    chapter_id: str,
    payload: TriggerParserRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    chapter, err = _require_chapter(project_id, chapter_id, maybe_user_id)
    if err is not None:
        return err
    task = parser_service.enqueue_parse_task(
        project_id, chapter_id, "auto", payload.content
    )
    return JSONResponse(status_code=202, content={"task": task})


@router.post("/{project_id}/parser/batch")
def create_batch_parser_job(
    project_id: str,
    payload: BatchParserRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    project, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    if payload.scope not in {"all", "volume", "selected"}:
        return _error(400, "INVALID_BATCH_SCOPE", "Invalid batch parse scope")
    job = parser_service.create_batch_job(
        project_id,
        payload.scope,
        payload.volumeId,
        payload.chapterIds,
        maybe_user_id,
    )
    return JSONResponse(status_code=202, content={"job": job})


@router.post("/{project_id}/parser/batch/{job_id}/cancel")
def cancel_batch_parser_job(
    project_id: str,
    job_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    project, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    job = parser_service.cancel_batch_job(project_id, job_id)
    if job is None:
        return _error(404, "BATCH_JOB_NOT_FOUND", "Batch parse job not found")
    return JSONResponse(status_code=200, content={"job": job})


@router.get("/{project_id}/parser/batch/{job_id}/progress")
def get_batch_parser_job_progress(
    project_id: str,
    job_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error, _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    project, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    job = parser_service.app.state.parser_jobs.get(job_id)
    if job is None or job["projectId"] != project_id:
        return _error(404, "BATCH_JOB_NOT_FOUND", "Batch parse job not found")
    finished = (
        job["completedChapters"] + job["failedChapters"] + job["cancelledChapters"]
    )
    progress = 0
    if job["totalChapters"] > 0:
        progress = int(finished * 100 / job["totalChapters"])
    return JSONResponse(status_code=200, content={"job": {**job, "progress": progress}})


@router.get("/{project_id}/parser/status")
def get_parser_project_status(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    project, err = _require_project(project_id, maybe_user_id)
    if err is not None:
        return err
    return JSONResponse(
        status_code=200, content=parser_service.get_project_status(project_id)
    )


@router.get("/{project_id}/parser/chapters/{chapter_id}/status")
def get_parser_chapter_status(
    project_id: str,
    chapter_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    chapter, err = _require_chapter(project_id, chapter_id, maybe_user_id)
    if err is not None:
        return err
    return JSONResponse(
        status_code=200,
        content={"state": parser_service.get_chapter_status(project_id, chapter_id)},
    )
