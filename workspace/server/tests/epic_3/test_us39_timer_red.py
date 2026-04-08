from datetime import timedelta

from fastapi.testclient import TestClient

from server.main import app


def test_start_stopwatch_session_success(client: TestClient) -> None:
    response = client.post(
        "/api/sessions",
        json={
            "projectId": "project-a-1",
            "mode": "stopwatch",
            "chapterId": "chapter-a-1",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 201
    session = response.json()["session"]
    assert session["projectId"] == "project-a-1"
    assert session["chapterId"] == "chapter-a-1"
    assert session["mode"] == "stopwatch"
    assert session["status"] == "running"
    assert session["elapsedSeconds"] == 0
    assert session["startChars"] == 0


def test_start_countdown_requires_target_duration(client: TestClient) -> None:
    response = client.post(
        "/api/sessions",
        json={"projectId": "project-a-1", "mode": "countdown"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "TIMER_DURATION_REQUIRED"


def test_timer_heartbeat_updates_elapsed_and_status(client: TestClient) -> None:
    headers = {"Authorization": "Bearer token-of-user-a"}
    start_response = client.post(
        "/api/sessions",
        json={"projectId": "project-a-1", "mode": "stopwatch"},
        headers=headers,
    )
    session_id = start_response.json()["session"]["id"]
    app.state.session_clock.advance(timedelta(seconds=90))

    response = client.patch(
        f"/api/sessions/{session_id}",
        json={"status": "paused"},
        headers=headers,
    )

    assert response.status_code == 200
    session = response.json()["session"]
    assert session["status"] == "paused"
    assert session["elapsedSeconds"] == 90


def test_end_timer_session_returns_char_delta(client: TestClient) -> None:
    headers = {"Authorization": "Bearer token-of-user-a"}
    start_response = client.post(
        "/api/sessions",
        json={
            "projectId": "project-a-1",
            "mode": "stopwatch",
            "chapterId": "chapter-a-1",
        },
        headers=headers,
    )
    session_id = start_response.json()["session"]["id"]

    client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"content": "<p>新增了五个字内容</p>", "saveSource": "manual"},
        headers=headers,
    )

    response = client.post(f"/api/sessions/{session_id}/end", headers=headers)

    assert response.status_code == 200
    result = response.json()["session"]
    assert result["status"] == "completed"
    assert result["endChars"] == 8
    assert result["deltaChars"] == 8


def test_list_timer_sessions_history(client: TestClient) -> None:
    headers = {"Authorization": "Bearer token-of-user-a"}
    start_response = client.post(
        "/api/sessions",
        json={
            "projectId": "project-a-1",
            "mode": "countdown",
            "targetDurationSeconds": 1500,
        },
        headers=headers,
    )
    session_id = start_response.json()["session"]["id"]
    client.post(f"/api/sessions/{session_id}/end", headers=headers)

    response = client.get(
        "/api/projects/project-a-1/sessions",
        headers=headers,
    )

    assert response.status_code == 200
    sessions = response.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["id"] == session_id
    assert sessions[0]["mode"] == "countdown"


def test_timer_forbidden(client: TestClient) -> None:
    response = client.get(
        "/api/projects/project-a-1/sessions",
        headers={"Authorization": "Bearer token-of-user-b"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
