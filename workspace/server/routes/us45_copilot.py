from __future__ import annotations

from typing import Optional, cast

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from server.models.ai_models import (
    AppendStoryCopilotMessageRequest,
    AppendStoryCopilotMessageResponse,
    CreateStoryCopilotCardRequest,
    CreateStoryCopilotCardResponse,
    CreateStoryCopilotSessionRequest,
    CreateStoryCopilotSessionResponse,
    GetStoryCopilotSessionReplayResponse,
    ListStoryCopilotSessionsResponse,
    StoryCopilotCardActionRequest,
    StoryCopilotCardActionResponse,
)
from server.routes._deps import require_project as _require_project
from server.services import copilot_service, copilot_turn_service

router = APIRouter(tags=["us-4.copilot"])


class StoryCopilotTurnRequest(BaseModel):
    content: str
    chapterId: Optional[str] = None

    model_config = {"extra": "forbid"}


class StoryCopilotTurnResponse(BaseModel):
    events: list[dict]

    model_config = {"extra": "forbid"}


class StoryCopilotFeedbackRequest(BaseModel):
    suggestionId: str
    action: str
    comment: Optional[str] = None

    model_config = {"extra": "forbid"}


def _require_user_id_or_error(
    authorization: Optional[str],
) -> tuple[Optional[str], Optional[JSONResponse]]:
    from server.main import _require_user_id

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return None, maybe_user_id
    return cast(str, maybe_user_id), None


def _require_session_or_error(
    session_id: str,
    authorization: Optional[str],
) -> tuple[Optional[str], Optional[dict[str, object]], Optional[JSONResponse]]:
    from server.main import _error

    user_id, err = _require_user_id_or_error(authorization)
    if err is not None:
        return None, None, err
    replay = copilot_service.get_session_replay(
        session_id=session_id,
        user_id=cast(str, user_id),
    )
    if replay is None:
        return (
            cast(str, user_id),
            None,
            _error(404, "COPILOT_SESSION_NOT_FOUND", "Copilot session not found"),
        )
    if isinstance(replay, dict) and replay.get("forbidden"):
        return (
            cast(str, user_id),
            None,
            _error(403, "FORBIDDEN", "No permission for this session"),
        )
    session = cast(
        dict[str, object],
        cast(dict[str, object], replay).get("session", {}),
    )
    return cast(str, user_id), session, None


@router.post(
    "/api/projects/{project_id}/copilot/sessions",
    response_model=CreateStoryCopilotSessionResponse,
)
def create_copilot_session(
    project_id: str,
    payload: CreateStoryCopilotSessionRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, err = _require_user_id_or_error(authorization)
    if err is not None:
        return err
    _, project_err = _require_project(project_id, cast(str, user_id))
    if project_err is not None:
        return project_err

    mode = copilot_service.validate_mode(payload.mode)
    if mode is None:
        return _error(400, "VALIDATION_ERROR", "mode is invalid")

    title = payload.title.strip() if isinstance(payload.title, str) else None
    if title is not None and len(title) > 80:
        return _error(
            400,
            "VALIDATION_ERROR",
            "title must be <= 80 characters",
        )

    session = copilot_service.create_session(
        project_id=project_id,
        user_id=cast(str, user_id),
        mode=cast(object, mode),  # validated above
        title=title,
    )
    return JSONResponse(status_code=201, content={"session": session})


@router.get(
    "/api/projects/{project_id}/copilot/sessions",
    response_model=ListStoryCopilotSessionsResponse,
)
def list_copilot_sessions(
    project_id: str,
    mode: Optional[str] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, err = _require_user_id_or_error(authorization)
    if err is not None:
        return err
    _, project_err = _require_project(project_id, cast(str, user_id))
    if project_err is not None:
        return project_err

    parsed_mode: Optional[str] = None
    if mode is not None:
        parsed_mode = copilot_service.validate_mode(mode)
        if parsed_mode is None:
            return _error(400, "VALIDATION_ERROR", "mode is invalid")

    sessions = copilot_service.list_sessions(
        project_id=project_id,
        user_id=cast(str, user_id),
        mode=cast(Optional[object], parsed_mode),
        limit=limit,
    )
    return JSONResponse(status_code=200, content={"sessions": sessions})


@router.get(
    "/api/copilot/sessions/{session_id}",
    response_model=GetStoryCopilotSessionReplayResponse,
)
def get_copilot_session_replay(
    session_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, err = _require_user_id_or_error(authorization)
    if err is not None:
        return err
    replay = copilot_service.get_session_replay(
        session_id=session_id,
        user_id=cast(str, user_id),
    )
    if replay is None:
        return _error(404, "COPILOT_SESSION_NOT_FOUND", "Copilot session not found")
    if isinstance(replay, dict) and replay.get("forbidden"):
        return _error(403, "FORBIDDEN", "No permission for this session")
    return JSONResponse(status_code=200, content=replay)


@router.post(
    "/api/copilot/sessions/{session_id}/messages",
    response_model=AppendStoryCopilotMessageResponse,
)
def append_copilot_message(
    session_id: str,
    payload: AppendStoryCopilotMessageRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, _, err = _require_session_or_error(session_id, authorization)
    if err is not None:
        return err

    role = copilot_service.validate_role(payload.role)
    if role is None:
        return _error(400, "VALIDATION_ERROR", "role is invalid")
    content = payload.content.strip() if isinstance(payload.content, str) else ""
    if not content:
        return _error(400, "VALIDATION_ERROR", "content is required")
    if len(content) > 8000:
        return _error(
            400,
            "VALIDATION_ERROR",
            "content must be <= 8000 characters",
        )

    result = copilot_service.append_message(
        session_id=session_id,
        user_id=cast(str, user_id),
        role=cast(object, role),
        content=content,
    )
    if result is None:
        return _error(404, "COPILOT_SESSION_NOT_FOUND", "Copilot session not found")
    if isinstance(result, dict) and result.get("forbidden"):
        return _error(403, "FORBIDDEN", "No permission for this session")
    return JSONResponse(status_code=201, content=result)


@router.post(
    "/api/copilot/sessions/{session_id}/cards",
    response_model=CreateStoryCopilotCardResponse,
)
def create_copilot_card(
    session_id: str,
    payload: CreateStoryCopilotCardRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, _, err = _require_session_or_error(session_id, authorization)
    if err is not None:
        return err

    kind = copilot_service.validate_card_kind(payload.kind)
    if kind is None:
        return _error(400, "VALIDATION_ERROR", "kind is invalid")

    title = payload.title.strip() if isinstance(payload.title, str) else ""
    summary = payload.summary.strip() if isinstance(payload.summary, str) else ""
    if not title:
        return _error(400, "VALIDATION_ERROR", "title is required")
    if not summary:
        return _error(400, "VALIDATION_ERROR", "summary is required")
    if len(title) > 120:
        return _error(
            400,
            "VALIDATION_ERROR",
            "title must be <= 120 characters",
        )
    if len(summary) > 2000:
        return _error(
            400,
            "VALIDATION_ERROR",
            "summary must be <= 2000 characters",
        )

    result = copilot_service.create_card(
        session_id=session_id,
        user_id=cast(str, user_id),
        kind=cast(object, kind),
        title=title,
        summary=summary,
        payload=payload.payload,
    )
    if result is None:
        return _error(404, "COPILOT_SESSION_NOT_FOUND", "Copilot session not found")
    if isinstance(result, dict) and result.get("forbidden"):
        return _error(403, "FORBIDDEN", "No permission for this session")
    return JSONResponse(status_code=201, content=result)


@router.post(
    "/api/copilot/sessions/{session_id}/cards/{card_id}/actions",
    response_model=StoryCopilotCardActionResponse,
)
def copilot_card_action(
    session_id: str,
    card_id: str,
    payload: StoryCopilotCardActionRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, _, err = _require_session_or_error(session_id, authorization)
    if err is not None:
        return err

    action = copilot_service.validate_card_action(payload.action)
    if action is None:
        return _error(400, "VALIDATION_ERROR", "action is invalid")

    result = copilot_service.apply_card_action(
        session_id=session_id,
        user_id=cast(str, user_id),
        card_id=card_id,
        action=cast(object, action),
    )
    if result is None:
        return _error(404, "COPILOT_SESSION_NOT_FOUND", "Copilot session not found")
    if isinstance(result, dict) and result.get("forbidden"):
        return _error(403, "FORBIDDEN", "No permission for this session")
    if isinstance(result, dict) and result.get("card_not_found"):
        return _error(404, "COPILOT_CARD_NOT_FOUND", "Copilot card not found")
    return JSONResponse(status_code=200, content=result)


@router.post(
    "/api/copilot/sessions/{session_id}/turn",
    response_model=StoryCopilotTurnResponse,
)
async def copilot_turn(
    session_id: str,
    payload: StoryCopilotTurnRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, session, err = _require_session_or_error(session_id, authorization)
    if err is not None:
        return err

    content = payload.content.strip() if isinstance(payload.content, str) else ""
    if not content:
        return _error(400, "VALIDATION_ERROR", "content is required")
    if len(content) > 8000:
        return _error(400, "VALIDATION_ERROR", "content must be <= 8000 characters")

    # 1) Append user message
    user_result = copilot_service.append_message(
        session_id=session_id,
        user_id=cast(str, user_id),
        role=cast(object, "user"),
        content=content,
    )
    if user_result is None:
        return _error(404, "COPILOT_SESSION_NOT_FOUND", "Copilot session not found")
    if isinstance(user_result, dict) and user_result.get("forbidden"):
        return _error(403, "FORBIDDEN", "No permission for this session")

    new_events: list[dict] = [cast(dict, user_result["event"])]

    # 2) Generate assistant response + cards (stubbed in tests)
    assistant_text, cards = await copilot_turn_service.generate_turn(
        mode=cast(str, session.get("mode", "")),
        project_id=cast(str, session.get("projectId", "")),
        user_id=cast(str, user_id),
        content=content,
        chapter_id=payload.chapterId,
    )

    assistant_text = assistant_text.strip()
    if assistant_text:
        assistant_result = copilot_service.append_message(
            session_id=session_id,
            user_id=cast(str, user_id),
            role=cast(object, "assistant"),
            content=assistant_text,
        )
        if isinstance(assistant_result, dict) and assistant_result.get("event"):
            new_events.append(cast(dict, assistant_result["event"]))

    for card in cards:
        result = copilot_service.create_card(
            session_id=session_id,
            user_id=cast(str, user_id),
            kind=cast(object, card.get("kind", "result")),
            title=cast(str, card.get("title", "")),
            summary=cast(str, card.get("summary", "")),
            payload=cast(Optional[dict], card.get("payload")),
        )
        if isinstance(result, dict) and result.get("event"):
            new_events.append(cast(dict, result["event"]))

    return JSONResponse(status_code=200, content={"events": new_events})


@router.post("/api/copilot/sessions/{session_id}/feedback")
def copilot_feedback(
    session_id: str,
    payload: StoryCopilotFeedbackRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _error

    user_id, _, err = _require_session_or_error(session_id, authorization)
    if err is not None:
        return err

    suggestion_id = payload.suggestionId.strip() if isinstance(payload.suggestionId, str) else ""
    action = payload.action.strip() if isinstance(payload.action, str) else ""
    comment = payload.comment.strip() if isinstance(payload.comment, str) else None
    if not suggestion_id:
        return _error(400, "VALIDATION_ERROR", "suggestionId is required")
    if action not in {"helpful", "not_helpful", "dismissed"}:
        return _error(400, "VALIDATION_ERROR", "action is invalid")
    if comment and len(comment) > 500:
        return _error(400, "VALIDATION_ERROR", "comment must be <= 500 characters")

    result = copilot_service.record_feedback(
        session_id=session_id,
        user_id=cast(str, user_id),
        suggestion_id=suggestion_id,
        action=action,
        comment=comment,
    )
    if result is None:
        return _error(404, "COPILOT_SESSION_NOT_FOUND", "Copilot session not found")
    if isinstance(result, dict) and result.get("forbidden"):
        return _error(403, "FORBIDDEN", "No permission for this session")
    if isinstance(result, dict) and result.get("card_not_found"):
        return _error(404, "COPILOT_CARD_NOT_FOUND", "Copilot card not found")
    return JSONResponse(status_code=200, content={"feedback": result})
