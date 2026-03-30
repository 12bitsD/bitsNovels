"""
US-1.5 卷章目录管理 — 红灯测试

覆盖 10 个端点:
1. GET  /api/projects/:projectId/outline
2. POST /api/projects/:projectId/volumes
3. PATCH /api/projects/:projectId/volumes/:volumeId
4. DELETE /api/projects/:projectId/volumes/:volumeId
5. POST /api/projects/:projectId/outline/reorder-volumes
6. POST /api/projects/:projectId/volumes/:volumeId/chapters
7. PATCH /api/projects/:projectId/chapters/:chapterId
8. POST /api/projects/:projectId/chapters/reorder
9. POST /api/projects/:projectId/chapters/bulk-move
10. POST /api/projects/:projectId/chapters/bulk-trash
"""

from fastapi.testclient import TestClient


# ─── 1. GET /outline ────────────────────────────────────────────────────────


def test_outline_requires_auth(client: TestClient) -> None:
    response = client.get("/api/projects/project-a-1/outline")
    assert response.status_code == 401


def test_outline_returns_volumes_and_totals(client: TestClient) -> None:
    """Outline returns volumes list with chapterCount/totalChars and root totals."""
    response = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "volumes" in body
    assert "totals" in body
    assert "updatedAt" in body
    volumes = body["volumes"]
    totals = body["totals"]
    # conftest seeds: 1 volume, 1 chapter
    assert totals["volumeCount"] >= 1
    assert totals["chapterCount"] >= 1
    assert totals["totalChars"] >= 0
    # Each volume needs chapterCount, totalChars, id, name, order
    for v in volumes:
        assert "id" in v
        assert "name" in v
        assert "order" in v
        assert "chapterCount" in v
        assert "totalChars" in v


# ─── 2. POST /volumes ────────────────────────────────────────────────────────


def test_create_volume_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/volumes",
        json={"name": "新卷"},
    )
    assert response.status_code == 401


def test_create_volume_ok(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/volumes",
        json={"name": "第二卷"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "volume" in body
    assert body["volume"]["name"] == "第二卷"
    assert body["volume"]["order"] == 1  # appended after default volume (order=0)


def test_create_volume_name_required(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/volumes",
        json={},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400


def test_create_volume_name_max_30_chars(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/volumes",
        json={"name": "a" * 31},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400


# ─── 3. PATCH /volumes/:volumeId ─────────────────────────────────────────────


def test_patch_volume_requires_auth(client: TestClient) -> None:
    response = client.patch(
        "/api/projects/project-a-1/volumes/volume-a-1",
        json={"name": "改名"},
    )
    assert response.status_code == 401


def test_patch_volume_rename_ok(client: TestClient) -> None:
    response = client.patch(
        "/api/projects/project-a-1/volumes/volume-a-1",
        json={"name": "改名后的卷"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["volume"]["name"] == "改名后的卷"


def test_patch_volume_description_ok(client: TestClient) -> None:
    response = client.patch(
        "/api/projects/project-a-1/volumes/volume-a-1",
        json={"description": "这是卷简介"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["volume"]["description"] == "这是卷简介"


# ─── 4. DELETE /volumes/:volumeId ───────────────────────────────────────────


def test_delete_volume_requires_auth(client: TestClient) -> None:
    response = client.delete(
        "/api/projects/project-a-1/volumes/volume-a-1",
    )
    assert response.status_code == 401


def test_delete_volume_with_chapters_moves_to_trash(client: TestClient) -> None:
    """Deleting a volume with chapters should soft-delete them (move to trash)."""
    # Default conftest has volume-a-1 with chapter-a-1
    response = client.delete(
        "/api/projects/project-a-1/volumes/volume-a-1",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["trashedChapterCount"] == 1


# ─── 5. POST /outline/reorder-volumes ──────────────────────────────────────


def test_reorder_volumes_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/outline/reorder-volumes",
        json={"volumeIds": []},
    )
    assert response.status_code == 401


def test_reorder_volumes_ok(client: TestClient) -> None:
    # Create two volumes first
    r1 = client.post(
        "/api/projects/project-a-1/volumes",
        json={"name": "第二卷"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert r1.status_code == 201
    second_vol_id = r1.json()["volume"]["id"]

    # Reorder: second volume first, first volume second
    response = client.post(
        "/api/projects/project-a-1/outline/reorder-volumes",
        json={"volumeIds": [second_vol_id, "volume-a-1"]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True

    # Verify new order via outline
    outline = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    volumes = outline.json()["volumes"]
    assert volumes[0]["id"] == second_vol_id
    assert volumes[1]["id"] == "volume-a-1"


# ─── 6. POST /volumes/:volumeId/chapters ───────────────────────────────────


def test_create_chapter_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "新章节"},
    )
    assert response.status_code == 401


def test_create_chapter_ok(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "第二章"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "chapter" in body
    assert body["chapter"]["title"] == "第二章"
    assert body["chapter"]["volumeId"] == "volume-a-1"
    assert body["chapter"]["order"] == 1  # appended after default chapter (order=0)


def test_create_chapter_title_required(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400


def test_create_chapter_title_max_50_chars(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "a" * 51},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400


# ─── 7. PATCH /chapters/:chapterId ───────────────────────────────────────────


def test_patch_chapter_requires_auth(client: TestClient) -> None:
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"title": "改名章节"},
    )
    assert response.status_code == 401


def test_patch_chapter_rename_ok(client: TestClient) -> None:
    response = client.patch(
        "/api/projects/project-a-1/chapters/chapter-a-1",
        json={"title": "第一章：新的开始"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["chapter"]["title"] == "第一章：新的开始"


# ─── 8. POST /chapters/reorder ──────────────────────────────────────────────


def test_reorder_chapters_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/chapters/reorder",
        json={"chapterIds": [], "targetVolumeId": "volume-a-1"},
    )
    assert response.status_code == 401


def test_reorder_chapters_ok(client: TestClient) -> None:
    """Reorder within same volume."""
    # Default: chapter-a-1 at order=0
    # Create a second chapter
    r = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "第二章"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    ch2_id = r.json()["chapter"]["id"]

    # Swap order: chapter-a-1 goes after ch2
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


# ─── 9. POST /chapters/bulk-move ────────────────────────────────────────────


def test_bulk_move_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/chapters/bulk-move",
        json={"chapterIds": [], "targetVolumeId": "volume-a-1"},
    )
    assert response.status_code == 401


def test_bulk_move_ok(client: TestClient) -> None:
    """Bulk move one chapter to a newly created volume."""
    # Create target volume
    r = client.post(
        "/api/projects/project-a-1/volumes",
        json={"name": "目标卷"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    target_vol_id = r.json()["volume"]["id"]

    # Create a chapter to move
    r2 = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "待移动章节"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    ch_id = r2.json()["chapter"]["id"]

    response = client.post(
        "/api/projects/project-a-1/chapters/bulk-move",
        json={"chapterIds": [ch_id], "targetVolumeId": target_vol_id},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["movedCount"] == 1

    # Verify chapter is now in target volume
    outline = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    volumes = outline.json()["volumes"]
    target_vol = next(v for v in volumes if v["id"] == target_vol_id)
    assert any(c["id"] == ch_id for c in target_vol.get("chapters", []))


# ─── 10. POST /chapters/bulk-trash ─────────────────────────────────────────


def test_bulk_trash_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/api/projects/project-a-1/chapters/bulk-trash",
        json={"chapterIds": []},
    )
    assert response.status_code == 401


def test_bulk_trash_ok(client: TestClient) -> None:
    """Bulk trash one chapter."""
    # Create a chapter to trash
    r = client.post(
        "/api/projects/project-a-1/volumes/volume-a-1/chapters",
        json={"title": "待删除章节"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    ch_id = r.json()["chapter"]["id"]

    response = client.post(
        "/api/projects/project-a-1/chapters/bulk-trash",
        json={"chapterIds": [ch_id]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["trashedCount"] == 1

    # Verify chapter no longer appears in outline
    outline = client.get(
        "/api/projects/project-a-1/outline",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    all_ch_ids = [
        c["id"] for v in outline.json()["volumes"] for c in v.get("chapters", [])
    ]
    assert ch_id not in all_ch_ids
