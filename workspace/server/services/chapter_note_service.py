from __future__ import annotations

import re
from datetime import datetime
from typing import Any, cast

from server.services._base import app, _iso_z, _main_module


def _now() -> datetime:
    return cast(datetime, _main_module()._now())


def ensure_chapter_note_state() -> None:
    if not hasattr(app.state, "chapter_notes"):
        app.state.chapter_notes = {}


def calculate_note_char_count(content: str) -> int:
    text_only = re.sub(r"<[^>]+>", "", content)
    text_only = " ".join(text_only.split())
    count = 0
    for char in text_only:
        if "\u4e00" <= char <= "\u9fff":
            count += 1
        elif char.isalnum():
            count += 1
    return count


def get_note(chapter: dict[str, Any]) -> dict[str, Any]:
    ensure_chapter_note_state()
    existing = app.state.chapter_notes.get(chapter["id"])
    if existing is not None:
        return cast(dict[str, Any], existing)
    return {
        "chapterId": chapter["id"],
        "projectId": chapter["projectId"],
        "content": "",
        "charCount": 0,
        "hasNote": False,
        "updatedAt": chapter.get("updatedAt"),
    }


def save_note(chapter: dict[str, Any], content: str) -> dict[str, Any]:
    ensure_chapter_note_state()
    char_count = calculate_note_char_count(content)
    has_note = bool(content.strip())
    note = {
        "chapterId": chapter["id"],
        "projectId": chapter["projectId"],
        "content": content,
        "charCount": char_count,
        "hasNote": has_note,
        "updatedAt": _iso_z(_now()),
    }
    app.state.chapter_notes[chapter["id"]] = note
    chapter["hasNote"] = has_note
    chapter["updatedAt"] = note["updatedAt"]
    return note
