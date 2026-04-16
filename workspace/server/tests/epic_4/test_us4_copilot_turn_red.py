from typing import Any

from fastapi.testclient import TestClient

from server.main import _FakeDb


def _auth_headers(user: str = "user-a") -> dict[str, str]:
    token = "token-of-user-a" if user == "user-a" else "token-of-user-b"
    return {"Authorization": f"Bearer {token}"}


def test_copilot_turn_generates_cards_worldbuild_stub_red(
    client: TestClient, fake_db: _FakeDb
) -> None:
    fake_db.failpoints.add("copilot_turn_stub")

    create_response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "worldbuild"},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["session"]["id"]

    turn = client.post(
        f"/api/copilot/sessions/{session_id}/turn",
        headers=_auth_headers("user-a"),
        json={"content": "我想设定帝国的纪年与地理。"},
    )
    assert turn.status_code == 200
    new_events: list[dict[str, Any]] = turn.json()["events"]
    assert [event["type"] for event in new_events][:2] == ["message", "message"]
    assert any(event["type"] == "card" for event in new_events)

    replay = client.get(
        f"/api/copilot/sessions/{session_id}",
        headers=_auth_headers("user-a"),
    )
    assert replay.status_code == 200
    events = replay.json()["events"]
    assert any(event["type"] == "card" for event in events)


def test_copilot_turn_requires_permission_red(client: TestClient, fake_db: _FakeDb) -> None:
    fake_db.failpoints.add("copilot_turn_stub")

    create_response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "worldbuild"},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["session"]["id"]

    forbidden = client.post(
        f"/api/copilot/sessions/{session_id}/turn",
        headers=_auth_headers("user-b"),
        json={"content": "test"},
    )
    assert forbidden.status_code == 403


def test_copilot_feedback_records_action_red(client: TestClient, fake_db: _FakeDb) -> None:
    fake_db.failpoints.add("copilot_turn_stub")

    create_response = client.post(
        "/api/projects/project-a-1/copilot/sessions",
        headers=_auth_headers("user-a"),
        json={"mode": "story_diagnose"},
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["session"]["id"]

    turn = client.post(
        f"/api/copilot/sessions/{session_id}/turn",
        headers=_auth_headers("user-a"),
        json={"content": "给我写作建议", "chapterId": "chapter-a-1"},
    )
    assert turn.status_code == 200
    events: list[dict[str, Any]] = turn.json()["events"]
    card_event = next((e for e in events if e["type"] == "card"), None)
    assert card_event is not None
    card_id = card_event["card"]["id"]

    fb = client.post(
        f"/api/copilot/sessions/{session_id}/feedback",
        headers=_auth_headers("user-a"),
        json={"suggestionId": card_id, "action": "helpful", "comment": "OK"},
    )
    assert fb.status_code == 200
