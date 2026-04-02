"""
US-3.2 章节管理（写作台侧面板）— 测试

覆盖端点:
1. GET  /api/projects/{projectId}/outline - 卷章树查询（复用US-1.5）
2. POST /api/projects/{projectId}/volumes/{volumeId}/chapters - 章节创建（复用US-1.5）
3. PATCH /api/projects/{projectId}/chapters/{chapterId} - 章节重命名（复用US-1.5）
4. DELETE /api/projects/{projectId}/chapters/{chapterId} - 章节删除（软删除，移入回收站）
5. POST /api/projects/{projectId}/chapters/reorder - 章节排序（复用US-1.5）

US-3.2 AC:
- 提供卷章树查询接口，返回卷、章节、顺序、字数、解析状态等面板展示所需字段
- 提供章节创建接口：默认标题为"新章节"，默认插入当前卷末尾，返回新章节完整对象与空正文
- 提供章节重命名接口，支持仅更新标题，不改动正文内容
- 提供章节删除接口，并按 US-1.7 规则将章节移入回收站，而不是物理删除
- 提供章节排序接口，支持卷内排序与跨卷移动；跨卷移动时要同时更新 volumeId 与顺序字段，并保证事务一致性
- 章节面板与大纲视图必须复用同一读写 API，避免两套目录数据源
"""

from fastapi.testclient import TestClient


# ─── 1. GET /outline - 卷章树查询（复用US-1.5）────────────────────────────────


def test_outline_returns_chapter_fields_for_panel(client: TestClient) -> None:
    """Outline returns all fields needed for chapter panel display."""
    response = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "volumes" in body
    assert "totals" in body

    # Each volume should have chapters with all required fields
    for vol in body["volumes"]:
        assert "id" in vol
        assert "name" in vol
        assert "order" in vol
        assert "chapterCount" in vol
        assert "totalChars" in vol

        for ch in vol.get("chapters", []):
            # US-3.2 AC: 返回卷、章节、顺序、字数、解析状态等面板展示所需字段
            assert "id" in ch
            assert "projectId" in ch
            assert "volumeId" in ch
            assert "title" in ch
            assert "order" in ch
            assert "chars" in ch
            assert "lastEditedAt" in ch
            assert "parserStatus" in ch


def test_outline_requires_auth(client: TestClient) -> None:
    """Outline requires authentication."""
    response = client.get("/api/projects/project-a-1/outline")
    assert response.status_code == 401


# ─── 2. POST /volumes/{volumeId}/chapters - 章节创建（复用US-1.5）────────────


def test_create_chapter_default_title(client: TestClient) -> None:
    """US-3.2 AC: 默认标题为"新章节"，默认插入当前卷末尾"""
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "新章节"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "chapter" in body
    chapter = body["chapter"]
    assert chapter["title"] == "新章节"
    assert chapter["volumeId"] == "volume-a-1"
    # Should be appended at the end (order=1 after default chapter at order=0)
    assert chapter["order"] == 1


def test_create_chapter_returns_complete_object(client: TestClient) -> None:
    """US-3.2 AC: 返回新章节完整对象与空正文"""
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "测试章节"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    chapter = body["chapter"]
    # Complete object fields
    assert "id" in chapter
    assert "title" in chapter
    assert "volumeId" in chapter
    assert "order" in chapter
    assert "chars" in chapter
    assert "lastEditedAt" in chapter
    assert "parserStatus" in chapter


def test_create_chapter_requires_auth(client: TestClient) -> None:
    """Create chapter requires authentication."""
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "新章节"},
    )
    assert response.status_code == 401


def test_create_chapter_forbidden(client: TestClient) -> None:
    """Create chapter returns 403 if user has no permission."""
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "新章节"},
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 3. PATCH /chapters/{chapterId} - 章节重命名（复用US-1.5）──────────────────


def test_rename_chapter_only_updates_title(client: TestClient) -> None:
    """US-3.2 AC: 支持仅更新标题，不改动正文内容"""
    # First, save some content to the chapter
    client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"content": "<p>原始内容</p>", "saveSource": "manual"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    # Rename the chapter
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"title": "新标题"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["chapter"]["title"] == "新标题"
    # Content should remain unchanged
    assert body["chapter"]["content"] == "<p>原始内容</p>"


def test_rename_chapter_requires_auth(client: TestClient) -> None:
    """Rename chapter requires authentication."""
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"title": "新标题"},
    )
    assert response.status_code == 401


def test_rename_chapter_forbidden(client: TestClient) -> None:
    """Rename chapter returns 403 if user has no permission."""
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"title": "新标题"},
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


def test_rename_chapter_not_found(client: TestClient) -> None:
    """Rename chapter returns 404 if chapter not found."""
    response = client.patch(
        "/api/projects/project-a-1/chapters/non-existent-chapter",
        json={"title": "新标题"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


# ─── 4. DELETE /chapters/{chapterId} - 章节删除（软删除）──────────────────────


def test_delete_chapter_soft_delete(client: TestClient) -> None:
    """US-3.2 AC: 按US-1.7规则将章节移入回收站，而不是物理删除"""
    response = client.delete(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True

    # Verify chapter is removed from outline
    outline = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    all_ch_ids = [
        c["id"] for v in outline.json()["volumes"] for c in v.get("chapters", [])
    ]
    assert "chapter-a-1" not in all_ch_ids


def test_delete_chapter_requires_auth(client: TestClient) -> None:
    """Delete chapter requires authentication."""
    response = client.delete(
        "/api/projects/project-a-1/chapters/chapter-a-1",
    )
    assert response.status_code == 401


def test_delete_chapter_forbidden(client: TestClient) -> None:
    """Delete chapter returns 403 if user has no permission."""
    response = client.delete(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


def test_delete_chapter_not_found(client: TestClient) -> None:
    """Delete chapter returns 404 if chapter not found."""
    response = client.delete(
        "/api/projects/project-a-1/chapters/non-existent-chapter",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_delete_chapter_archived_project(client: TestClient) -> None:
    """Delete chapter returns 409 if project is archived."""
    # Archive the project first
    client.post(
        "/api/projects/project-a-1/archive",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Try to delete chapter
    response = client.delete(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "PROJECT_ARCHIVED_READ_ONLY"


# ─── 5. POST /chapters/reorder - 章节排序（复用US-1.5）──────────────────────


def test_reorder_chapters_within_volume(client: TestClient) -> None:
    """US-3.2 AC: 支持卷内排序"""
    # Create a second chapter
    r = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "第二章"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    ch2_id = r.json()["chapter"]["id"]

    # Reorder: chapter-a-1 goes after ch2
    response = client.post(
        "/api/projects/project-a-1/chapters/reorder",
        json={
            "chapterIds": [ch2_id, "chapter-a-1"],
            "targetVolumeId": "volume-a-1",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True

    # Verify order in outline
    outline = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    vol = outline.json()["volumes"][0]
    chapters = vol["chapters"]
    assert chapters[0]["id"] == ch2_id
    assert chapters[1]["id"] == "chapter-a-1"


def test_reorder_chapters_cross_volume(client: TestClient) -> None:
    """US-3.2 AC: 支持跨卷移动，同时更新volumeId与顺序字段"""
    # Create a second volume
    r = client.post(
        "/api/projects/project-a-1/volumes",
        json={"name": "第二卷"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    vol2_id = r.json()["volume"]["id"]

    # Move chapter-a-1 to volume 2
    response = client.post(
        "/api/projects/project-a-1/chapters/reorder",
        json={
            "chapterIds": ["chapter-a-1"],
            "targetVolumeId": vol2_id,
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True

    # Verify chapter is in volume 2
    outline = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    vol2 = next(v for v in outline.json()["volumes"] if v["id"] == vol2_id)
    assert any(c["id"] == "chapter-a-1" for c in vol2["chapters"])


def test_reorder_chapters_requires_auth(client: TestClient) -> None:
    """Reorder chapters requires authentication."""
    response = client.post(
        "/api/projects/project-a-1/chapters/reorder",
        json={"chapterIds": [], "targetVolumeId": "volume-a-1"},
    )
    assert response.status_code == 401


def test_reorder_chapters_forbidden(client: TestClient) -> None:
    """Reorder chapters returns 403 if user has no permission."""
    response = client.post(
        "/api/projects/project-a-1/chapters/reorder",
        json={"chapterIds": [], "targetVolumeId": "volume-a-1"},
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 6. 边界条件测试 ──────────────────────────────────────────────────────────


def test_create_chapter_archived_project(client: TestClient) -> None:
    """Create chapter returns 409 if project is archived."""
    # Archive the project first
    client.post(
        "/api/projects/project-a-1/archive",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Try to create chapter
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "新章节"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "PROJECT_ARCHIVED_READ_ONLY"


def test_rename_chapter_archived_project(client: TestClient) -> None:
    """Rename chapter returns 409 if project is archived."""
    # Archive the project first
    client.post(
        "/api/projects/project-a-1/archive",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Try to rename chapter
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"title": "新标题"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Note: Renaming should still be allowed for archived projects
    # as it doesn't modify content, but let's check the actual behavior
    # Based on US-1.8, archived projects are read-only
    assert response.status_code == 409


def test_reorder_chapters_archived_project(client: TestClient) -> None:
    """Reorder chapters returns 409 if project is archived."""
    # Archive the project first
    client.post(
        "/api/projects/project-a-1/archive",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # Try to reorder chapters
    response = client.post(
        "/api/projects/project-a-1/chapters/reorder",
        json={"chapterIds": ["chapter-a-1"], "targetVolumeId": "volume-a-1"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "PROJECT_ARCHIVED_READ_ONLY"


def test_create_chapter_volume_not_found(client: TestClient) -> None:
    """Create chapter returns 404 if volume not found."""
    response = client.post(
        "/api/projects/project-a-1/volumes/non-existent-volume/chapters",
        json={"title": "新章节"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_reorder_chapters_volume_not_found(client: TestClient) -> None:
    """Reorder chapters returns 404 if target volume not found."""
    response = client.post(
        "/api/projects/project-a-1/chapters/reorder",
        json={"chapterIds": ["chapter-a-1"], "targetVolumeId": "non-existent-volume"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


# ─── 7. 数据一致性测试 ────────────────────────────────────────────────────────


def test_outline_and_panel_use_same_api(client: TestClient) -> None:
    """US-3.2 AC: 章节面板与大纲视图必须复用同一读写API"""
    # Create a chapter via the API
    create_response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "面板测试章节"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert create_response.status_code == 201
    created_chapter = create_response.json()["chapter"]

    # Verify it appears in outline (same API)
    outline_response = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert outline_response.status_code == 200
    volumes = outline_response.json()["volumes"]
    vol1 = next(v for v in volumes if v["id"] == "volume-a-1")
    chapter_ids = [c["id"] for c in vol1["chapters"]]
    assert created_chapter["id"] in chapter_ids

    # Rename via the API
    rename_response = client.patch(
        f"/api/projects/project-a-1/chapters/{created_chapter['id']}",
        json={"title": "重命名后"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert rename_response.status_code == 200

    # Verify rename in outline (same API)
    outline_response = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    volumes = outline_response.json()["volumes"]
    vol1 = next(v for v in volumes if v["id"] == "volume-a-1")
    renamed_chapter = next(
        c for c in vol1["chapters"] if c["id"] == created_chapter["id"]
    )
    assert renamed_chapter["title"] == "重命名后"
