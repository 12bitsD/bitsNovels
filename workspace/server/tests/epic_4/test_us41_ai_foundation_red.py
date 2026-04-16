import json
import os
from typing import Any

import pytest
from fastapi.testclient import TestClient

from server.main import app


def _auth_headers() -> dict[str, str]:
    return {"Authorization": "Bearer token-of-user-a"}


def _parse_sse_events(raw_text: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for line in raw_text.splitlines():
        if line.startswith("data: "):
            events.append(json.loads(line[6:]))
    return events


def _seed_ai_context() -> None:
    app.state.ai_user_defaults = {
        "user-a": {
            "model": "gpt-4.1",
            "temperature": 0.35,
            "maxLength": 1600,
            "parseDepth": "deep",
        }
    }
    app.state.fake_db.chapters.insert(
        0,
        {
            "id": "chapter-a-0",
            "projectId": "project-a-1",
            "volumeId": "volume-a-1",
            "title": "序章",
            "order": -1,
            "chars": 4800,
            "lastEditedAt": "2026-03-25T00:00:00Z",
            "parserStatus": "parsed",
        },
    )
    app.state.chapter_contents["chapter-a-0"] = {
        "content": "前章尾声" * 450,
    }
    app.state.chapter_contents["chapter-a-1"] = {
        "content": "当前章节正文" * 500,
    }
    app.state.kb_characters["character-1"] = {
        "id": "character-1",
        "projectId": "project-a-1",
        "name": "沈砚",
        "summary": "男主角，擅长谋略。",
        "source": "manual",
        "confirmed": True,
    }
    app.state.kb_settings["setting-1"] = {
        "id": "setting-1",
        "projectId": "project-a-1",
        "title": "世界法则",
        "content": "灵气失衡会导致角色失控。",
        "source": "manual",
        "confirmed": True,
    }


def test_get_ai_config_applies_field_level_precedence(client: TestClient) -> None:
    _seed_ai_context()

    response = client.get(
        "/api/projects/project-a-1/ai-config",
        headers=_auth_headers(),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["config"]["projectId"] == "project-a-1"
    assert body["config"]["model"] is None
    assert body["effectiveConfig"] == {
        "model": "gpt-4.1",
        "temperature": 0.35,
        "maxLength": 1600,
        "parseDepth": "deep",
    }
    assert body["sources"] == {
        "model": "global",
        "temperature": "global",
        "maxLength": "global",
        "parseDepth": "global",
    }


def test_put_ai_config_updates_only_project_overrides(client: TestClient) -> None:
    _seed_ai_context()

    response = client.put(
        "/api/projects/project-a-1/ai-config",
        headers=_auth_headers(),
        json={
            "temperature": 0.42,
            "maxLength": 900,
            "useGlobalAsDefault": False,
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["config"]["projectId"] == "project-a-1"
    assert body["config"]["temperature"] == 0.42
    assert body["config"]["maxLength"] == 900
    assert body["config"]["useGlobalAsDefault"] is False
    assert body["config"]["model"] is None
    assert body["effectiveConfig"] == {
        "model": "gpt-4.1",
        "temperature": 0.42,
        "maxLength": 900,
        "parseDepth": "deep",
    }
    assert body["sources"]["model"] == "global"
    assert body["sources"]["temperature"] == "project"
    assert body["sources"]["maxLength"] == "project"
    assert body["sources"]["parseDepth"] == "global"


def test_create_continue_task_snapshots_config_and_trims_low_priority_context(
    client: TestClient,
) -> None:
    _seed_ai_context()
    client.put(
        "/api/projects/project-a-1/ai-config",
        headers=_auth_headers(),
        json={
            "model": "gpt-4o-mini",
            "temperature": 0.5,
            "maxLength": 700,
            "parseDepth": "standard",
            "useGlobalAsDefault": True,
        },
    )

    response = client.post(
        "/api/ai/tasks",
        headers=_auth_headers(),
        json={
            "projectId": "project-a-1",
            "type": "continue",
            "chapterId": "chapter-a-1",
            "cursorOffset": 120,
            "parameters": {
                "maxLength": 600,
                "contextTokenLimit": 260,
            },
        },
    )

    assert response.status_code == 202
    task = response.json()["task"]
    assert task["configSnapshot"] == {
        "model": "gpt-4o-mini",
        "temperature": 0.5,
        "maxLength": 700,
        "parseDepth": "standard",
    }
    assert [block["source"] for block in task["contextBlocks"][:4]] == [
        "system_instruction",
        "task_instruction",
        "ai_config",
        "current_chapter",
    ]
    assert any(
        block["source"].startswith("kb:") and block["included"]
        for block in task["contextBlocks"]
    )
    assert any(
        block["source"] == "previous_chapter_tail" and not block["included"]
        for block in task["contextBlocks"]
    )


def test_stop_task_preserves_partial_text_and_stream_reports_stopped(
    client: TestClient,
) -> None:
    if os.getenv("ENABLE_LIVE_LLM_TESTS") != "true":
        pytest.skip("ENABLE_LIVE_LLM_TESTS not enabled")
    if os.getenv("MOONSHOT_API_KEY") is None:
        pytest.skip("MOONSHOT_API_KEY not set")
    _seed_ai_context()
    create_response = client.post(
        "/api/ai/tasks",
        headers=_auth_headers(),
        json={
            "projectId": "project-a-1",
            "type": "continue",
            "chapterId": "chapter-a-1",
            "parameters": {"maxLength": 400},
        },
    )
    assert create_response.status_code == 202
    task_id = create_response.json()["task"]["id"]

    stop_response = client.post(
        f"/api/ai/tasks/{task_id}/stop",
        headers=_auth_headers(),
    )

    assert stop_response.status_code == 200
    stop_body = stop_response.json()
    assert stop_body["result"]["status"] == "stopped"
    assert stop_body["result"]["payloadType"] == "text"
    assert "content" in stop_body["result"]["payload"]

    stream_response = client.get(
        f"/api/ai/tasks/{task_id}/stream",
        headers=_auth_headers(),
    )
    assert stream_response.status_code == 200
    events = _parse_sse_events(stream_response.text)
    assert events[-1]["type"] == "task.stopped"
    assert events[-1]["result"]["status"] == "stopped"


def test_streaming_task_emits_started_delta_and_completed_events(
    client: TestClient,
) -> None:
    if os.getenv("ENABLE_LIVE_LLM_TESTS") != "true":
        pytest.skip("ENABLE_LIVE_LLM_TESTS not enabled")
    if os.getenv("MOONSHOT_API_KEY") is None:
        pytest.skip("MOONSHOT_API_KEY not set")
    _seed_ai_context()
    create_response = client.post(
        "/api/ai/tasks",
        headers=_auth_headers(),
        json={
            "projectId": "project-a-1",
            "type": "dialogue",
            "chapterId": "chapter-a-1",
            "parameters": {"characterName": "沈砚"},
        },
    )
    assert create_response.status_code == 202
    task_id = create_response.json()["task"]["id"]

    stream_response = client.get(
        f"/api/ai/tasks/{task_id}/stream",
        headers=_auth_headers(),
    )

    assert stream_response.status_code == 200
    events = _parse_sse_events(stream_response.text)
    assert events[0]["type"] == "task.started"
    assert events[-1]["type"] in {"task.completed", "task.failed"}
    assert any(event["type"] == "task.delta" for event in events)
    if events[-1]["type"] == "task.completed":
        assert events[-1]["result"]["status"] == "done"
        assert events[-1]["result"]["payloadType"] == "text"
