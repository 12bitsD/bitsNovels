from __future__ import annotations

from typing import Any, Optional, cast

from server.models.ai_models import (
    StoryCopilotCard,
    StoryCopilotCardAction,
    StoryCopilotCardActionType,
    StoryCopilotCardKind,
    StoryCopilotCardStatus,
    StoryCopilotEvent,
    StoryCopilotEventType,
    StoryCopilotMessage,
    StoryCopilotMessageRole,
    StoryCopilotMode,
    StoryCopilotSession,
)
from server.services import chapter_note_service, kb_setting_service
from server.services._base import _iso_z, _main_module, app

_ALLOWED_MODES: set[str] = {"worldbuild", "plot_derive_lite", "story_diagnose"}
_ALLOWED_ROLES: set[str] = {"user", "assistant", "system"}
_ALLOWED_CARD_KINDS: set[str] = {"draft", "result"}
_ALLOWED_CARD_ACTIONS: set[str] = {"adopt", "dismiss", "regenerate"}


def ensure_copilot_state() -> None:
    if not hasattr(app.state, "copilot_sessions"):
        app.state.copilot_sessions = {}
    if not hasattr(app.state, "copilot_session_counter"):
        app.state.copilot_session_counter = 0
    if not hasattr(app.state, "copilot_event_counter"):
        app.state.copilot_event_counter = 0
    if not hasattr(app.state, "copilot_card_counter"):
        app.state.copilot_card_counter = 0
    if not hasattr(app.state, "copilot_message_counter"):
        app.state.copilot_message_counter = 0
    if not hasattr(app.state, "copilot_events"):
        app.state.copilot_events = {}
    if not hasattr(app.state, "copilot_cards"):
        app.state.copilot_cards = {}
    if not hasattr(app.state, "copilot_feedback"):
        app.state.copilot_feedback = {}


def _now_iso() -> str:
    return _iso_z(_main_module()._now())


def _next_id(counter_key: str, prefix: str) -> str:
    ensure_copilot_state()
    current = int(getattr(app.state, counter_key, 0)) + 1
    setattr(app.state, counter_key, current)
    return f"{prefix}-{current}"


def validate_mode(mode: str) -> Optional[str]:
    candidate = (mode or "").strip()
    if candidate not in _ALLOWED_MODES:
        return None
    return candidate


def validate_role(role: str) -> Optional[str]:
    candidate = (role or "").strip()
    if candidate not in _ALLOWED_ROLES:
        return None
    return candidate


def validate_card_kind(kind: str) -> Optional[str]:
    candidate = (kind or "").strip()
    if candidate not in _ALLOWED_CARD_KINDS:
        return None
    return candidate


def validate_card_action(action: str) -> Optional[str]:
    candidate = (action or "").strip()
    if candidate not in _ALLOWED_CARD_ACTIONS:
        return None
    return candidate


def create_session(
    *,
    project_id: str,
    user_id: str,
    mode: StoryCopilotMode,
    title: Optional[str],
) -> dict[str, Any]:
    ensure_copilot_state()
    now = _now_iso()
    session_id = _next_id("copilot_session_counter", "copilot-session")
    session: dict[str, Any] = {
        "id": session_id,
        "projectId": project_id,
        "mode": mode,
        "title": title,
        "status": "active",
        "createdAt": now,
        "updatedAt": now,
        # internal fields
        "userId": user_id,
    }
    cast(dict[str, Any], app.state.copilot_sessions)[session_id] = session
    cast(dict[str, Any], app.state.copilot_events)[session_id] = []
    cast(dict[str, Any], app.state.copilot_cards)[session_id] = {}
    return StoryCopilotSession(**_public_session(session)).model_dump()


def list_sessions(
    *,
    project_id: str,
    user_id: str,
    mode: Optional[StoryCopilotMode],
    limit: int,
) -> list[dict[str, Any]]:
    ensure_copilot_state()
    sessions_by_id = cast(dict[str, Any], app.state.copilot_sessions)
    sessions = [
        _public_session(session)
        for session in sessions_by_id.values()
        if session.get("projectId") == project_id
        and session.get("userId") == user_id
    ]
    if mode is not None:
        sessions = [session for session in sessions if session.get("mode") == mode]
    sessions.sort(
        key=lambda s: cast(str, s.get("updatedAt", "")),
        reverse=True,
    )
    return [
        StoryCopilotSession(**session).model_dump()
        for session in sessions[: max(0, limit)]
    ]


def get_session_internal(session_id: str) -> Optional[dict[str, Any]]:
    ensure_copilot_state()
    sessions = cast(dict[str, Any], app.state.copilot_sessions)
    return cast(Optional[dict[str, Any]], sessions.get(session_id))


def get_session_replay(
    *,
    session_id: str,
    user_id: str,
) -> Optional[dict[str, Any]]:
    session = get_session_internal(session_id)
    if session is None:
        return None
    if session.get("userId") != user_id:
        return {"forbidden": True}
    events_by_session = cast(dict[str, Any], app.state.copilot_events)
    events = cast(list[dict[str, Any]], events_by_session.get(session_id, []))
    return {
        "session": StoryCopilotSession(**_public_session(session)).model_dump(),
        "events": [StoryCopilotEvent(**event).model_dump() for event in events],
    }


def append_message(
    *,
    session_id: str,
    user_id: str,
    role: StoryCopilotMessageRole,
    content: str,
) -> Optional[dict[str, Any]]:
    session = get_session_internal(session_id)
    if session is None:
        return None
    if session.get("userId") != user_id:
        return {"forbidden": True}
    now = _now_iso()
    message_id = _next_id("copilot_message_counter", "copilot-message")
    message = StoryCopilotMessage(id=message_id, role=role, content=content).model_dump()
    event_id = _next_id("copilot_event_counter", "copilot-event")
    event = StoryCopilotEvent(
        id=event_id,
        type=cast(StoryCopilotEventType, "message"),
        createdAt=now,
        message=StoryCopilotMessage(**message),
    ).model_dump()
    events_by_session = cast(dict[str, Any], app.state.copilot_events)
    cast(list[dict[str, Any]], events_by_session[session_id]).append(event)
    session["updatedAt"] = now
    return {"message": message, "event": event}


def create_card(
    *,
    session_id: str,
    user_id: str,
    kind: StoryCopilotCardKind,
    title: str,
    summary: str,
    payload: Optional[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    session = get_session_internal(session_id)
    if session is None:
        return None
    if session.get("userId") != user_id:
        return {"forbidden": True}
    now = _now_iso()
    card_id = _next_id("copilot_card_counter", "copilot-card")
    card = StoryCopilotCard(
        id=card_id,
        kind=kind,
        title=title,
        summary=summary,
        status=cast(StoryCopilotCardStatus, "pending"),
        payload=payload,
    ).model_dump()
    cards_by_session = cast(dict[str, Any], app.state.copilot_cards)
    cast(dict[str, Any], cards_by_session[session_id])[card_id] = card
    event_id = _next_id("copilot_event_counter", "copilot-event")
    event = StoryCopilotEvent(
        id=event_id,
        type=cast(StoryCopilotEventType, "card"),
        createdAt=now,
        card=StoryCopilotCard(**card),
    ).model_dump()
    events_by_session = cast(dict[str, Any], app.state.copilot_events)
    cast(list[dict[str, Any]], events_by_session[session_id]).append(event)
    session["updatedAt"] = now
    return {"card": card, "event": event}


def apply_card_action(
    *,
    session_id: str,
    user_id: str,
    card_id: str,
    action: StoryCopilotCardActionType,
) -> Optional[dict[str, Any]]:
    session = get_session_internal(session_id)
    if session is None:
        return None
    if session.get("userId") != user_id:
        return {"forbidden": True}
    cards_by_session = cast(dict[str, Any], app.state.copilot_cards)
    cards = cast(dict[str, Any], cards_by_session.get(session_id, {}))
    card = cast(Optional[dict[str, Any]], cards.get(card_id))
    if card is None:
        return {"card_not_found": True}
    if action == "adopt":
        _maybe_write_worldbuild_setting(session, card)
        _maybe_append_chapter_note(session, card)
        card["status"] = "adopted"
    elif action == "dismiss":
        card["status"] = "dismissed"
    else:
        # regenerate is a no-op on card status in Phase A; higher layers can
        # create a new card.
        card["status"] = card.get("status", "pending")
    now = _now_iso()
    action_id = _next_id("copilot_event_counter", "copilot-action")
    card_action = StoryCopilotCardAction(
        id=action_id,
        cardId=card_id,
        action=action,
    ).model_dump()
    event_id = _next_id("copilot_event_counter", "copilot-event")
    event = StoryCopilotEvent(
        id=event_id,
        type=cast(StoryCopilotEventType, "card_action"),
        createdAt=now,
        cardAction=StoryCopilotCardAction(**card_action),
    ).model_dump()
    events_by_session = cast(dict[str, Any], app.state.copilot_events)
    cast(list[dict[str, Any]], events_by_session[session_id]).append(event)
    session["updatedAt"] = now
    return {"card": StoryCopilotCard(**card).model_dump(), "event": event}


def _public_session(session: dict[str, Any]) -> dict[str, Any]:
    # Hide internal fields like userId from API responses.
    return {
        "id": session.get("id"),
        "projectId": session.get("projectId"),
        "mode": session.get("mode"),
        "title": session.get("title"),
        "status": session.get("status"),
        "createdAt": session.get("createdAt"),
        "updatedAt": session.get("updatedAt"),
    }


def record_feedback(
    *,
    session_id: str,
    user_id: str,
    suggestion_id: str,
    action: str,
    comment: Optional[str],
) -> Optional[dict[str, Any]]:
    session = get_session_internal(session_id)
    if session is None:
        return None
    if session.get("userId") != user_id:
        return {"forbidden": True}

    cards_by_session = cast(dict[str, Any], app.state.copilot_cards)
    cards = cast(dict[str, Any], cards_by_session.get(session_id, {}))
    if suggestion_id not in cards:
        return {"card_not_found": True}

    feedback_by_session = cast(dict[str, Any], app.state.copilot_feedback)
    entries = cast(list[dict[str, Any]], feedback_by_session.setdefault(session_id, []))
    entry = {
        "id": _next_id("copilot_event_counter", "copilot-feedback"),
        "suggestionId": suggestion_id,
        "action": action,
        "comment": comment,
        "createdAt": _now_iso(),
    }
    entries.append(entry)
    return entry


def _maybe_write_worldbuild_setting(session: dict[str, Any], card: dict[str, Any]) -> None:
    # Worldbuild mode: adopting a draft card can write a KBSetting, but only on
    # explicit confirm (adopt) and must be idempotent.
    if session.get("mode") != "worldbuild":
        return
    if card.get("kind") != "draft":
        return
    payload = card.get("payload")
    if not isinstance(payload, dict):
        return
    if payload.get("kbSettingId"):
        return

    title = cast(str, card.get("title") or "").strip()
    category = cast(str, payload.get("category") or "").strip()
    content = cast(str, payload.get("content") or "").strip()
    if not title or not category or not content:
        return

    setting = kb_setting_service.create_setting(
        cast(str, session.get("projectId") or ""),
        {
            "title": title,
            "category": category,
            "content": content,
            "source": "ai",
            "confirmed": True,
            "rawAI": payload.get("rawAI"),
            "relatedEntityRefs": payload.get("relatedEntityRefs", []),
        },
    )
    payload["kbSettingId"] = setting["id"]
    card["payload"] = payload


def _maybe_append_chapter_note(session: dict[str, Any], card: dict[str, Any]) -> None:
    # Plot/outline: adopting a result card can append guidance to a chapter note.
    payload = card.get("payload")
    if not isinstance(payload, dict):
        return
    if payload.get("writeTarget") != "chapter_note":
        return
    if payload.get("chapterNoteWritten"):
        return

    chapter_id = cast(str, payload.get("chapterId") or "").strip()
    append_content = cast(str, payload.get("content") or "").strip()
    if not chapter_id or not append_content:
        return

    fake_db = getattr(app.state, "fake_db", None)
    chapters = getattr(fake_db, "chapters", []) if fake_db is not None else []
    chapter = next(
        (c for c in chapters if isinstance(c, dict) and c.get("id") == chapter_id),
        None,
    )
    if not isinstance(chapter, dict) or chapter.get("projectId") != session.get("projectId"):
        return

    existing = chapter_note_service.get_note(chapter)
    base = cast(str, existing.get("content") or "")
    next_content = (base.rstrip() + "\n\n" + append_content).strip() if base.strip() else append_content

    if chapter_note_service.calculate_note_char_count(next_content) > 2000:
        return

    chapter_note_service.save_note(chapter, next_content)
    payload["chapterNoteWritten"] = True
    card["payload"] = payload
