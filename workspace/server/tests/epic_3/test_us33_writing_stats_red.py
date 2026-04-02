"""
US-3.3 写作统计 — 红灯测试

覆盖 6 个端点:
1. GET  /api/projects/:projectId/writing-stats/summary
2. GET  /api/projects/:projectId/writing-stats/daily?range=30d
3. GET  /api/projects/:projectId/writing-stats/weekly?range=12w
4. GET  /api/projects/:projectId/writing-stats/heatmap
5. GET  /api/projects/:projectId/writing-stats/by-volume
6. GET  /api/projects/:projectId/writing-stats/by-chapter
"""

from fastapi.testclient import TestClient


# ─── 1. GET /writing-stats/summary ─────────────────────────────────────────────


def test_get_writing_stats_summary_success(client: TestClient) -> None:
    """Returns summary with today/week/month/total stats."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/summary",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    # Required fields
    assert "todayChars" in body
    assert "weekChars" in body
    assert "monthChars" in body
    assert "totalChars" in body
    assert "dailyAverage" in body
    assert "consecutiveDays" in body
    assert "highestDayChars" in body
    assert "highestDayDate" in body


def test_get_writing_stats_summary_not_found(client: TestClient) -> None:
    """Returns 404 if project not found."""
    response = client.get(
        "/api/projects/non-existent-project/writing-stats/summary",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "PROJECT_NOT_FOUND"


def test_get_writing_stats_summary_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/summary",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403
    body = response.json()
    assert body["error"]["code"] == "FORBIDDEN"


def test_get_writing_stats_summary_requires_auth(client: TestClient) -> None:
    """Returns 401 if no auth token."""
    response = client.get("/api/projects/project-a-1/writing-stats/summary")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "UNAUTHORIZED"


def test_get_writing_stats_summary_calculations(client: TestClient) -> None:
    """Calculates daily average and consecutive days correctly."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/summary",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    # Daily average should be based on days with writing records
    # Consecutive days should count natural consecutive days
    assert isinstance(body["dailyAverage"], (int, float))
    assert body["dailyAverage"] >= 0
    assert isinstance(body["consecutiveDays"], int)
    assert body["consecutiveDays"] >= 0


# ─── 2. GET /writing-stats/daily ───────────────────────────────────────────────


def test_get_writing_stats_daily_success(client: TestClient) -> None:
    """Returns daily trend for last 30 days."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/daily?range=30d",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    # Should return 30 days of data
    assert len(body["data"]) == 30
    # Each item should have date and chars
    for item in body["data"]:
        assert "date" in item
        assert "chars" in item


def test_get_writing_stats_daily_custom_range(client: TestClient) -> None:
    """Accepts custom range parameter."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/daily?range=7d",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 7


def test_get_writing_stats_daily_not_found(client: TestClient) -> None:
    """Returns 404 if project not found."""
    response = client.get(
        "/api/projects/non-existent/writing-stats/daily",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_get_writing_stats_daily_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/daily",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 3. GET /writing-stats/weekly ──────────────────────────────────────────────


def test_get_writing_stats_weekly_success(client: TestClient) -> None:
    """Returns weekly trend for last 12 weeks."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/weekly?range=12w",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    # Should return 12 weeks of data
    assert len(body["data"]) == 12
    # Each item should have weekStart and chars
    for item in body["data"]:
        assert "weekStart" in item
        assert "chars" in item


def test_get_writing_stats_weekly_custom_range(client: TestClient) -> None:
    """Accepts custom range parameter."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/weekly?range=4w",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["data"]) == 4


def test_get_writing_stats_weekly_not_found(client: TestClient) -> None:
    """Returns 404 if project not found."""
    response = client.get(
        "/api/projects/non-existent/writing-stats/weekly",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_get_writing_stats_weekly_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/weekly",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 4. GET /writing-stats/heatmap ──────────────────────────────────────────────


def test_get_writing_stats_heatmap_success(client: TestClient) -> None:
    """Returns hourly heatmap data."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/heatmap",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    # Should return 24 hours of data (0-23)
    assert len(body["data"]) == 24
    # Each item should have hour and chars
    for item in body["data"]:
        assert "hour" in item
        assert "chars" in item
        assert 0 <= item["hour"] <= 23


def test_get_writing_stats_heatmap_not_found(client: TestClient) -> None:
    """Returns 404 if project not found."""
    response = client.get(
        "/api/projects/non-existent/writing-stats/heatmap",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_get_writing_stats_heatmap_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/heatmap",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 5. GET /writing-stats/by-volume ────────────────────────────────────────────


def test_get_writing_stats_by_volume_success(client: TestClient) -> None:
    """Returns stats grouped by volume."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/by-volume",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    # Each volume should have id, name, totalChars, chapterCount
    for volume in body["data"]:
        assert "id" in volume
        assert "name" in volume
        assert "totalChars" in volume
        assert "chapterCount" in volume


def test_get_writing_stats_by_volume_with_sort(client: TestClient) -> None:
    """Supports server-side sorting."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/by-volume?sort=totalChars&order=desc",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    # Should be sorted by totalChars descending
    data = body["data"]
    if len(data) > 1:
        for i in range(len(data) - 1):
            assert data[i]["totalChars"] >= data[i + 1]["totalChars"]


def test_get_writing_stats_by_volume_not_found(client: TestClient) -> None:
    """Returns 404 if project not found."""
    response = client.get(
        "/api/projects/non-existent/writing-stats/by-volume",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_get_writing_stats_by_volume_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/by-volume",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 6. GET /writing-stats/by-chapter ───────────────────────────────────────────


def test_get_writing_stats_by_chapter_success(client: TestClient) -> None:
    """Returns stats grouped by chapter."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/by-chapter",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert isinstance(body["data"], list)
    # Each chapter should have id, title, volumeId, charCount
    for chapter in body["data"]:
        assert "id" in chapter
        assert "title" in chapter
        assert "volumeId" in chapter
        assert "charCount" in chapter


def test_get_writing_stats_by_chapter_with_sort(client: TestClient) -> None:
    """Supports server-side sorting."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/by-chapter?sort=charCount&order=desc",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    # Should be sorted by charCount descending
    data = body["data"]
    if len(data) > 1:
        for i in range(len(data) - 1):
            assert data[i]["charCount"] >= data[i + 1]["charCount"]


def test_get_writing_stats_by_chapter_not_found(client: TestClient) -> None:
    """Returns 404 if project not found."""
    response = client.get(
        "/api/projects/non-existent/writing-stats/by-chapter",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_get_writing_stats_by_chapter_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission."""
    response = client.get(
        "/api/projects/project-a-1/writing-stats/by-chapter",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── Edge Cases ────────────────────────────────────────────────────────────────


def test_get_writing_stats_summary_empty_project(client: TestClient) -> None:
    """Returns zeros for project with no writing stats."""
    # Create a new project with no stats
    response = client.post(
        "/api/projects",
        json={
            "name": "Empty Project",
            "type": "novel",
            "tags": ["玄幻"],
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    project_id = response.json()["projectId"]

    # Get stats for empty project
    response = client.get(
        f"/api/projects/{project_id}/writing-stats/summary",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["todayChars"] == 0
    assert body["weekChars"] == 0
    assert body["monthChars"] == 0
    assert body["totalChars"] == 0
    assert body["dailyAverage"] == 0
    assert body["consecutiveDays"] == 0
    assert body["highestDayChars"] == 0


def test_get_writing_stats_daily_empty_project(client: TestClient) -> None:
    """Returns zeros for project with no stats."""
    response = client.post(
        "/api/projects",
        json={
            "name": "Empty Project 2",
            "type": "novel",
            "tags": ["玄幻"],
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    project_id = response.json()["projectId"]

    response = client.get(
        f"/api/projects/{project_id}/writing-stats/daily?range=7d",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    # All days should have 0 chars
    for item in body["data"]:
        assert item["chars"] == 0
