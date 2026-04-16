from typing import Any

from fastapi.testclient import TestClient


def _auth_headers(user: str = "user-a") -> dict[str, str]:
    token = "token-of-user-a" if user == "user-a" else "token-of-user-b"
    return {"Authorization": f"Bearer {token}"}


def test_copilot_session_happy_path_replays_events_in_order_red(client: TestClient) -> None:
    create_response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "worldbuild", "title": "世界观草稿"},
    )
    assert create_response.status_code == 201
    session = create_response.json()["session"]
    session_id = session["id"]

    message_response = client.post(
        f"/api/copilot/sessions/{session_id}/messages",
        headers=_auth_headers("user-a"),
        json={"role": "user", "content": "我想设定一个帝国的地理与年代。"},
    )
    assert message_response.status_code == 201
    message = message_response.json()["message"]
    assert message["role"] == "user"

    card_response = client.post(
        f"/api/copilot/sessions/{session_id}/cards",
        headers=_auth_headers("user-a"),
        json={
            "kind": "draft",
            "title": "帝国首都的行政层级",
            "summary": "补齐都城、属地与骑士团之间的治理关系。",
            "payload": {"category": "地理", "confidence": "medium"},
        },
    )
    assert card_response.status_code == 201
    card = card_response.json()["card"]
    assert card["status"] == "pending"

    action_response = client.post(
        f"/api/copilot/sessions/{session_id}/cards/{card['id']}/actions",
        headers=_auth_headers("user-a"),
        json={"action": "adopt"},
    )
    assert action_response.status_code == 200
    updated_card = action_response.json()["card"]
    assert updated_card["status"] == "adopted"

    replay_response = client.get(
        f"/api/copilot/sessions/{session_id}",
        headers=_auth_headers("user-a"),
    )
    assert replay_response.status_code == 200
    body = replay_response.json()
    assert body["session"]["id"] == session_id
    events: list[dict[str, Any]] = body["events"]
    assert [event["type"] for event in events] == ["message", "card", "card_action"]


def test_copilot_session_rejects_invalid_mode_red(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "bad_mode"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_copilot_card_action_rejects_invalid_action_red(client: TestClient) -> None:
    create_response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "worldbuild"},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["session"]["id"]

    card_response = client.post(
        f"/api/copilot/sessions/{session_id}/cards",
        headers=_auth_headers("user-a"),
        json={"kind": "draft", "title": "T", "summary": "S"},
    )
    assert card_response.status_code == 201
    card_id = card_response.json()["card"]["id"]

    action_response = client.post(
        f"/api/copilot/sessions/{session_id}/cards/{card_id}/actions",
        headers=_auth_headers("user-a"),
        json={"action": "bad_action"},
    )
    assert action_response.status_code == 400
    assert action_response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_copilot_session_enforces_owner_scope_red(client: TestClient) -> None:
    create_response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "worldbuild"},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["session"]["id"]

    forbidden = client.get(
        f"/api/copilot/sessions/{session_id}",
        headers=_auth_headers("user-b"),
    )
    assert forbidden.status_code == 403


def test_worldbuild_adopt_writes_kb_setting_idempotent_red(client: TestClient) -> None:
    create_response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "worldbuild"},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["session"]["id"]

    card_response = client.post(
        f"/api/copilot/sessions/{session_id}/cards",
        headers=_auth_headers("user-a"),
        json={
            "kind": "draft",
            "title": "帝国纪年体系",
            "summary": "确立纪年分段与命名规则。",
            "payload": {"category": "历史", "content": "奠基纪/扩张纪/裂变纪。"},
        },
    )
    assert card_response.status_code == 201
    card_id = card_response.json()["card"]["id"]

    first_adopt = client.post(
        f"/api/copilot/sessions/{session_id}/cards/{card_id}/actions",
        headers=_auth_headers("user-a"),
        json={"action": "adopt"},
    )
    assert first_adopt.status_code == 200
    assert first_adopt.json()["card"]["status"] == "adopted"

    settings = client.get(
        "/api/projects/project-a-1/kb/settings",
        headers=_auth_headers("user-a"),
    )
    assert settings.status_code == 200
    assert settings.json()["total"] == 1
    assert settings.json()["items"][0]["title"] == "帝国纪年体系"

    second_adopt = client.post(
        f"/api/copilot/sessions/{session_id}/cards/{card_id}/actions",
        headers=_auth_headers("user-a"),
        json={"action": "adopt"},
    )
    assert second_adopt.status_code == 200

    settings_after = client.get(
        "/api/projects/project-a-1/kb/settings",
        headers=_auth_headers("user-a"),
    )
    assert settings_after.status_code == 200
    assert settings_after.json()["total"] == 1


def test_plot_adopt_appends_to_chapter_note_idempotent_red(client: TestClient) -> None:
    create_response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "plot_derive_lite"},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["session"]["id"]

    card_response = client.post(
        f"/api/copilot/sessions/{session_id}/cards",
        headers=_auth_headers("user-a"),
        json={
            "kind": "result",
            "title": "大纲方向 A",
            "summary": "主角先成功再失去。",
            "payload": {
                "writeTarget": "chapter_note",
                "chapterId": "chapter-a-1",
                "content": "方向A：先给主角一场小胜利，再用制度打回原形。",
            },
        },
    )
    assert card_response.status_code == 201
    card_id = card_response.json()["card"]["id"]

    first_adopt = client.post(
        f"/api/copilot/sessions/{session_id}/cards/{card_id}/actions",
        headers=_auth_headers("user-a"),
        json={"action": "adopt"},
    )
    assert first_adopt.status_code == 200

    note = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1/note",
        headers=_auth_headers("user-a"),
    )
    assert note.status_code == 200
    content = note.json()["note"]["content"]
    assert "方向A：" in content

    second_adopt = client.post(
        f"/api/copilot/sessions/{session_id}/cards/{card_id}/actions",
        headers=_auth_headers("user-a"),
        json={"action": "adopt"},
    )
    assert second_adopt.status_code == 200

    note_after = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1/note",
        headers=_auth_headers("user-a"),
    )
    assert note_after.status_code == 200
    content_after = note_after.json()["note"]["content"]
    assert content_after.count("方向A：") == 1
