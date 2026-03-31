"""RED tests for US-1.6 Writing Goals API.

These tests define the expected behavior before implementation.
They MUST fail on the RED phase.
"""

from fastapi.testclient import TestClient


# ==============================================================================
# GET /api/projects/:projectId/goals
# ==============================================================================


def test_get_goals_requires_auth(client: TestClient) -> None:
    """Request without auth header returns 401."""
    response = client.get("/api/projects/project-a-1/goals")
    assert response.status_code == 401


def test_get_goals_returns_existing_goals(client: TestClient) -> None:
    """Returns the project's goals when they are set."""
    response = client.get(
        "/api/projects/project-a-1/goals",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    # Goals are pre-seeded in conftest: dailyWordTarget=3000, totalWordTarget=500000, deadline=2026-12-31
    assert "dailyWordTarget" in body
    assert "totalWordTarget" in body
    assert "deadline" in body


def test_get_goals_returns_empty_when_not_set(client: TestClient) -> None:
    """Returns null values when no goals are set for the project."""
    response = client.get(
        "/api/projects/project-a-2/goals",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body.get("dailyWordTarget") is None
    assert body.get("totalWordTarget") is None
    assert body.get("deadline") is None


# ==============================================================================
# PUT /api/projects/:projectId/goals
# ==============================================================================


def test_put_goals_validates_daily_word_target_min(client: TestClient) -> None:
    """dailyWordTarget below 100 returns 400."""
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={"dailyWordTarget": 50},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_put_goals_validates_daily_word_target_max(client: TestClient) -> None:
    """dailyWordTarget above 50000 returns 400."""
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={"dailyWordTarget": 60000},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_put_goals_validates_total_word_target_min(client: TestClient) -> None:
    """totalWordTarget below 1000 returns 400."""
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={"totalWordTarget": 500},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_put_goals_validates_total_word_target_max(client: TestClient) -> None:
    """totalWordTarget above 5000000 returns 400."""
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={"totalWordTarget": 6000000},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_put_goals_validates_deadline_not_in_past(client: TestClient) -> None:
    """deadline in the past returns 400."""
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={"deadline": "2020-01-01"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_put_goals_succeeds_with_valid_data(client: TestClient) -> None:
    """Valid goals payload returns 200 and sets goals."""
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={
            "dailyWordTarget": 5000,
            "totalWordTarget": 800000,
            "deadline": "2027-12-31",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["goals"]["dailyWordTarget"] == 5000
    assert body["goals"]["totalWordTarget"] == 800000
    assert body["goals"]["deadline"] == "2027-12-31"


def test_put_goals_partial_update(client: TestClient) -> None:
    """Can update just dailyWordTarget without affecting other fields."""
    # First set full goals
    client.put(
        "/api/projects/project-a-1/goals",
        json={
            "dailyWordTarget": 3000,
            "totalWordTarget": 500000,
            "deadline": "2027-12-31",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Then update only daily
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={"dailyWordTarget": 4000},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["goals"]["dailyWordTarget"] == 4000
    assert body["goals"]["totalWordTarget"] == 500000
    assert body["goals"]["deadline"] == "2027-12-31"


def test_put_goals_requires_auth(client: TestClient) -> None:
    """PUT without auth returns 401."""
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={"dailyWordTarget": 2000},
    )
    assert response.status_code == 401


def test_put_goals_rejected_for_archived_project(client: TestClient) -> None:
    """PUT goals on archived project returns 409 PROJECT_ARCHIVED_READ_ONLY."""
    # Archive the project
    client.post(
        "/api/projects/project-a-1/archive",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Try to update goals
    response = client.put(
        "/api/projects/project-a-1/goals",
        json={"dailyWordTarget": 5000},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PROJECT_ARCHIVED_READ_ONLY"


# ==============================================================================
# DELETE /api/projects/:projectId/goals
# ==============================================================================


def test_delete_goals_requires_auth(client: TestClient) -> None:
    """DELETE without auth returns 401."""
    response = client.delete("/api/projects/project-a-1/goals")
    assert response.status_code == 401


def test_delete_goals_rejected_for_archived_project(client: TestClient) -> None:
    """DELETE goals on archived project returns 409 PROJECT_ARCHIVED_READ_ONLY."""
    # Archive the project
    client.post(
        "/api/projects/project-a-1/archive",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Try to delete goals
    response = client.delete(
        "/api/projects/project-a-1/goals",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "PROJECT_ARCHIVED_READ_ONLY"


def test_delete_goals_clears_all_goals(client: TestClient) -> None:
    """DELETE removes all goals from the project."""
    # First set goals
    client.put(
        "/api/projects/project-a-1/goals",
        json={
            "dailyWordTarget": 3000,
            "totalWordTarget": 500000,
            "deadline": "2027-12-31",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Then delete
    response = client.delete(
        "/api/projects/project-a-1/goals",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True
    # Verify goals are cleared
    get_response = client.get(
        "/api/projects/project-a-1/goals",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    goals = get_response.json()
    assert goals.get("dailyWordTarget") is None
    assert goals.get("totalWordTarget") is None
    assert goals.get("deadline") is None


# ==============================================================================
# GET /api/projects/:projectId/writing-stats
# ==============================================================================


def test_get_writing_stats_requires_auth(client: TestClient) -> None:
    """Request without auth returns 401."""
    response = client.get("/api/projects/project-a-1/writing-stats?range=30d")
    assert response.status_code == 401


def test_get_writing_stats_returns_required_fields(client: TestClient) -> None:
    """Returns todayWrittenChars, trend30d, totalProgress, totalWrittenChars, totalTarget."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats?range=30d",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "todayWrittenChars" in body
    assert "trend30d" in body
    assert "totalProgress" in body
    assert "totalWrittenChars" in body
    assert "totalTarget" in body
    assert isinstance(body["trend30d"], list)


def test_get_writing_stats_with_no_goals_returns_zero_progress(
    client: TestClient,
) -> None:
    """When no goals are set, totalProgress is 0 and estimatedCompletionDate is null."""
    # project-a-2 has no goals set
    response = client.get(
        "/api/projects/project-a-2/writing-stats?range=30d",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["totalProgress"] == 0
    assert body.get("estimatedCompletionDate") is None
