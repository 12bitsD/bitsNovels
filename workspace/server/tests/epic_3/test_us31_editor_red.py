"""
US-3.1 编辑器核心 — 红灯测试

覆盖 2 个端点:
1. GET  /api/projects/:projectId/chapters/:chapterId
2. PATCH /api/projects/:projectId/chapters/:chapterId
"""

from fastapi.testclient import TestClient


# ─── 1. GET /chapters/:chapterId ─────────────────────────────────────────────


def test_get_chapter_success(client: TestClient) -> None:
    """Returns chapter with content, charCount, metadata."""
    response = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "chapter" in body
    chapter = body["chapter"]
    assert chapter["id"] == "chapter-a-1"
    assert chapter["projectId"] == "project-a-1"
    assert chapter["volumeId"] == "volume-a-1"
    assert "title" in chapter
    assert "content" in chapter
    assert "charCount" in chapter
    assert "parseStatus" in chapter
    assert "lastEditedAt" in chapter
    assert "updatedAt" in chapter
    assert "createdAt" in chapter


def test_get_chapter_not_found(client: TestClient) -> None:
    """Returns 404 if chapter not found."""
    response = client.get(
        "/api/projects/project-a-1/chapters/non-existent-chapter",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "CHAPTER_NOT_FOUND"


def test_get_chapter_forbidden(client: TestClient) -> None:
    """Returns 403 if user has no permission for the project."""
    # user-b tries to access user-a's project
    response = client.get(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403
    body = response.json()
    assert body["error"]["code"] == "FORBIDDEN"


# ─── 2. PATCH /chapters/:chapterId ───────────────────────────────────────────


def test_save_chapter_manual(client: TestClient) -> None:
    """Updates content, returns new charCount."""
    content = "<p>这是新内容</p><p>第二段</p>"
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"content": content, "saveSource": "manual"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "chapter" in body
    chapter = body["chapter"]
    assert chapter["content"] == content
    # charCount should be calculated (Chinese chars + alphanumeric)
    assert chapter["charCount"] == 8  # "这是新内容第二段" = 8 chars
    assert "lastEditedAt" in chapter
    assert "updatedAt" in chapter


def test_save_chapter_auto(client: TestClient) -> None:
    """Accepts auto source."""
    content = "<p>自动保存内容</p>"
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"content": content, "saveSource": "auto"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "chapter" in body
    assert body["chapter"]["content"] == content


def test_save_chapter_archived(client: TestClient) -> None:
    """Returns 409 error if project is archived."""
    # First archive the project
    client.post(
        "/api/projects/project-a-1/archive",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Try to save chapter
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"content": "<p>新内容</p>", "saveSource": "manual"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "PROJECT_ARCHIVED_READ_ONLY"


def test_save_chapter_idempotent(client: TestClient) -> None:
    """Same content, same result (idempotent)."""
    content = "<p>幂等测试内容</p>"
    # First save
    response1 = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"content": content, "saveSource": "manual"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response1.status_code == 200
    body1 = response1.json()
    # Second save with same content
    response2 = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"content": content, "saveSource": "manual"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response2.status_code == 200
    body2 = response2.json()
    # Should have same charCount
    assert body1["chapter"]["charCount"] == body2["chapter"]["charCount"]
    assert body1["chapter"]["content"] == body2["chapter"]["content"]
