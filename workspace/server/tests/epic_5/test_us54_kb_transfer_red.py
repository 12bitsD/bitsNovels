"""
US-5.4 Knowledge Base Transfer — 红灯测试

覆盖 KB JSON 导出/导入端点:
1. POST /api/projects/:projectId/kb/export        — 创建 KB JSON 导出
2. GET  /api/projects/:projectId/kb/export/:exportId/download — 下载导出文件
3. POST /api/projects/:projectId/kb/import        — 导入 KB JSON
"""

from typing import Any

from fastapi.testclient import TestClient

# ==============================================================================
# Export fixtures / helpers
# ==============================================================================


def _sample_kb_export_json(
    project_id: str = "project-a-1", project_name: str = "A-1"
) -> dict[str, Any]:
    """Returns a minimal valid KnowledgeBaseExportFile structure."""
    return {
        "version": "1.0.0",
        "projectMeta": {
            "projectId": project_id,
            "projectName": project_name,
        },
        "exportedAt": "2026-04-03T00:00:00Z",
        "scope": {
            "mode": "all",
        },
        "knowledgeBase": {
            "characters": [
                {
                    "id": "char-export-1",
                    "projectId": project_id,
                    "type": "character",
                    "name": "张三",
                    "aliases": ["小张"],
                    "gender": "男",
                    "occupation": "剑客",
                    "appearance": "高大威猛",
                    "personalityTags": ["正直", "勇敢"],
                    "factionId": None,
                    "chapterIds": [],
                    "firstAppearanceChapterId": None,
                    "lastAppearanceChapterId": None,
                    "appearanceCount": 0,
                    "source": "manual",
                    "confirmed": True,
                    "createdAt": "2026-04-01T00:00:00Z",
                    "updatedAt": "2026-04-01T00:00:00Z",
                    "deletedAt": None,
                    "restoreUntil": None,
                }
            ],
            "locations": [
                {
                    "id": "loc-export-1",
                    "projectId": project_id,
                    "type": "location",
                    "name": "长安城",
                    "aliases": ["都城"],
                    "locationType": "city",
                    "parentId": None,
                    "description": "繁华都市",
                    "characterIds": [],
                    "chapterIds": [],
                    "source": "manual",
                    "confirmed": True,
                    "createdAt": "2026-04-01T00:00:00Z",
                    "updatedAt": "2026-04-01T00:00:00Z",
                    "deletedAt": None,
                    "restoreUntil": None,
                }
            ],
            "items": [
                {
                    "id": "item-export-1",
                    "projectId": project_id,
                    "type": "item",
                    "name": "玄铁剑",
                    "aliases": ["黑剑"],
                    "itemType": "weapon",
                    "summary": "神兵利器",
                    "ownerCharacterId": None,
                    "ownershipHistory": [],
                    "chapterIds": [],
                    "source": "manual",
                    "confirmed": True,
                    "createdAt": "2026-04-01T00:00:00Z",
                    "updatedAt": "2026-04-01T00:00:00Z",
                    "deletedAt": None,
                    "restoreUntil": None,
                }
            ],
            "factions": [],
            "foreshadows": [],
            "settings": [],
            "relations": [],
        },
    }


# ==============================================================================
# 1. POST /kb/export — 创建 KB JSON 导出
# ==============================================================================


def test_export_kb_all_scope(client: TestClient) -> None:
    """Exports all KB entities when mode='all'."""
    response = client.post(
        "/api/projects/project-a-1/kb/export",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"scope": {"mode": "all"}},
    )
    assert response.status_code == 201
    body = response.json()
    assert "exportId" in body
    assert body["projectId"] == "project-a-1"
    assert body["scope"]["mode"] == "all"
    assert "createdAt" in body


def test_export_kb_types_scope(client: TestClient) -> None:
    """Exports only specified KB types when mode='types'."""
    response = client.post(
        "/api/projects/project-a-1/kb/export",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"scope": {"mode": "types", "types": ["characters", "items"]}},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["scope"]["mode"] == "types"
    assert body["scope"]["types"] == ["characters", "items"]


def test_export_kb_requires_auth(client: TestClient) -> None:
    """Returns 401 if no authorization header."""
    response = client.post(
        "/api/projects/project-a-1/kb/export",
        json={"scope": {"mode": "all"}},
    )
    assert response.status_code == 401


def test_export_kb_project_not_found(client: TestClient) -> None:
    """Returns 404 if project does not exist."""
    response = client.post(
        "/api/projects/non-existent-project/kb/export",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"scope": {"mode": "all"}},
    )
    assert response.status_code == 404


def test_export_kb_forbidden(client: TestClient) -> None:
    """Returns 403 if user does not own the project."""
    response = client.post(
        "/api/projects/project-b-1/kb/export",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"scope": {"mode": "all"}},
    )
    assert response.status_code == 403


# ==============================================================================
# 2. GET /kb/export/:exportId/download — 下载导出文件
# ==============================================================================


def test_download_export_success(client: TestClient) -> None:
    """Downloads the exported JSON file."""
    # Create export first
    create_resp = client.post(
        "/api/projects/project-a-1/kb/export",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"scope": {"mode": "all"}},
    )
    export_id = create_resp.json()["exportId"]

    # Download it
    response = client.get(
        f"/api/projects/project-a-1/kb/export/{export_id}/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "1.0.0"
    assert "projectMeta" in body
    assert "knowledgeBase" in body
    assert "characters" in body["knowledgeBase"]


def test_download_export_not_found(client: TestClient) -> None:
    """Returns 404 if export does not exist."""
    response = client.get(
        "/api/projects/project-a-1/kb/export/non-existent-id/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_download_export_forbidden(client: TestClient) -> None:
    """Returns 403 if user does not own the project."""
    # Create export as user-a
    create_resp = client.post(
        "/api/projects/project-a-1/kb/export",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"scope": {"mode": "all"}},
    )
    export_id = create_resp.json()["exportId"]

    # Try to download as user-b
    response = client.get(
        f"/api/projects/project-a-1/kb/export/{export_id}/download",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ==============================================================================
# 3. POST /kb/import — 导入 KB JSON
# ==============================================================================


def test_import_kb_success(client: TestClient) -> None:
    """Imports valid KB JSON with no conflicts."""
    kb_json = _sample_kb_export_json()

    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "strategy": "skip",
            "data": kb_json,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 3  # 1 char + 1 loc + 1 item
    assert body["skipped"] == 0
    assert body["overwritten"] == 0
    assert body["renamed"] == 0


def test_import_kb_validates_version(client: TestClient) -> None:
    """Returns 400 if version field is missing."""
    kb_json = _sample_kb_export_json()
    del kb_json["version"]

    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "skip", "data": kb_json},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_KB_SCHEMA"


def test_import_kb_validates_project_meta(client: TestClient) -> None:
    """Returns 400 if projectMeta is missing."""
    kb_json = _sample_kb_export_json()
    del kb_json["projectMeta"]

    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "skip", "data": kb_json},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_KB_SCHEMA"


def test_import_kb_validates_knowledge_base(client: TestClient) -> None:
    """Returns 400 if knowledgeBase is missing."""
    kb_json = _sample_kb_export_json()
    del kb_json["knowledgeBase"]

    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "skip", "data": kb_json},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_KB_SCHEMA"


def test_import_kb_requires_auth(client: TestClient) -> None:
    """Returns 401 if no authorization header."""
    response = client.post(
        "/api/projects/project-a-1/kb/import",
        json={"strategy": "skip", "data": _sample_kb_export_json()},
    )
    assert response.status_code == 401


def test_import_kb_forbidden(client: TestClient) -> None:
    """Returns 403 if user does not own the project."""
    response = client.post(
        "/api/projects/project-b-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "skip", "data": _sample_kb_export_json()},
    )
    assert response.status_code == 403


# ==============================================================================
# Conflict Detection: skip strategy
# ==============================================================================


def test_import_conflict_skip(client: TestClient) -> None:
    """When strategy='skip', existing entities with same type+name are not imported."""
    # Pre-create an item with the same name
    client.post(
        "/api/projects/project-a-1/kb/item",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "玄铁剑",  # Same name as in export
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
    )

    # Import with skip strategy
    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "skip", "data": _sample_kb_export_json()},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 2  # char + loc, not item
    assert body["skipped"] == 1  # item was skipped


# ==============================================================================
# Conflict Detection: overwrite strategy
# ==============================================================================


def test_import_conflict_overwrite(client: TestClient) -> None:
    """When strategy='overwrite', existing entities are replaced."""
    # Pre-create an item with the same name
    client.post(
        "/api/projects/project-a-1/kb/item",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "玄铁剑",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
    )

    # Import with overwrite strategy
    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "overwrite", "data": _sample_kb_export_json()},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 3  # all 3 imported
    assert body["overwritten"] == 1  # item was overwritten


# ==============================================================================
# Conflict Detection: keep_both strategy
# ==============================================================================


def test_import_conflict_keep_both(client: TestClient) -> None:
    """When strategy='keep_both', conflicting entities are renamed."""
    # Pre-create an item with the same name
    client.post(
        "/api/projects/project-a-1/kb/item",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "玄铁剑",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
    )

    # Import with keep_both strategy
    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "keep_both", "data": _sample_kb_export_json()},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 3  # all 3 imported (with rename)
    assert body["renamed"] == 1  # item was renamed


def test_import_keep_both_generates_unique_name(client: TestClient) -> None:
    """keep_both renames to 'name (1)', 'name (2)' etc."""
    # Pre-create items with the same names
    client.post(
        "/api/projects/project-a-1/kb/item",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "玄铁剑",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
    )
    client.post(
        "/api/projects/project-a-1/kb/item",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "玄铁剑 (1)",
            "aliases": [],
            "itemType": "weapon",
            "source": "manual",
        },
    )

    # Import with keep_both strategy
    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "keep_both", "data": _sample_kb_export_json()},
    )
    assert response.status_code == 200
    body = response.json()
    # The imported item should be renamed to "玄铁剑 (2)"
    assert body["renamed"] == 1


def test_import_invalid_strategy(client: TestClient) -> None:
    """Returns 400 if strategy is not one of skip/overwrite/keep_both."""
    response = client.post(
        "/api/projects/project-a-1/kb/import",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"strategy": "invalid", "data": _sample_kb_export_json()},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_STRATEGY"
