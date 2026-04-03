"""
US-5.5 Restore — 红灯测试

覆盖端点:
1. GET  /api/projects/:projectId/backups/:backupId/preview   — 预览备份内容
2. POST /api/projects/:projectId/backups/:backupId/restore  — 恢复备份
"""

import base64
import json
from io import BytesIO
from zipfile import ZipFile

import pytest
from fastapi.testclient import TestClient


def _make_valid_backup_zip(
    project_name: str = "Test Project",
    chars: int = 10000,
    chapters: int = 5,
    kb_entries: int = 3,
) -> bytes:
    """Create a valid backup ZIP with manifest."""
    manifest = {
        "version": "1.0",
        "backupType": "manual",
        "projectId": "project-a-1",
        "projectName": project_name,
        "exportedAt": "2026-03-26T00:00:00Z",
        "counts": {
            "volumes": 2,
            "chapters": chapters,
            "knowledgeBaseEntries": kb_entries,
            "snapshots": 0,
            "annotations": 0,
        },
    }
    buf = BytesIO()
    with ZipFile(buf, "w") as zf:
        zf.writestr("manifest.json", json.dumps(manifest))
        zf.writestr(
            "project/project.json",
            json.dumps(
                {
                    "id": "project-a-1",
                    "name": project_name,
                    "type": "novel",
                    "tags": [],
                    "totalChars": chars,
                    "chapterCount": chapters,
                }
            ),
        )
        zf.writestr(
            "project/volumes.json", json.dumps([{"id": "vol-1", "name": "第一卷"}])
        )
        zf.writestr(
            "project/chapters.json",
            json.dumps([{"id": "ch-1", "title": "第一章", "volumeId": "vol-1"}]),
        )
        zf.writestr(
            "knowledge-base/data.json",
            json.dumps(
                {
                    "characters": [{"id": "char-1", "name": "角色1"}],
                    "locations": [],
                    "items": [],
                    "factions": [],
                    "foreshadows": [],
                    "settings": [],
                }
            ),
        )
    return buf.getvalue()


def _make_invalid_backup_zip() -> bytes:
    """Create an invalid ZIP with missing manifest."""
    buf = BytesIO()
    with ZipFile(buf, "w") as zf:
        zf.writestr("project/project.json", json.dumps({"name": "No manifest here"}))
    return buf.getvalue()


# ─── 1. GET /backups/:backupId/preview ────────────────────────────────────────


def test_preview_requires_auth(client: TestClient) -> None:
    """无 token 返回 401."""
    response = client.get(
        "/api/projects/project-a-1/backups/backup-1/preview",
    )
    assert response.status_code == 401


def test_preview_returns_summary(client: TestClient, app_state: object) -> None:
    """预览返回 projectName, totalChars, chapterCount, kbEntries, backupDate."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(
        _make_valid_backup_zip(
            project_name="My Novel",
            chars=5000,
            chapters=10,
            kb_entries=7,
        )
    ).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.get(
        f"/api/projects/project-a-1/backups/{backup_id}/preview",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["projectName"] == "My Novel"
    assert body["totalChars"] == 5000
    assert body["chapterCount"] == 10
    assert body["kbEntries"] == 7
    assert body["backupDate"] == "2026-03-26T00:00:00Z"
    assert body["version"] == "1.0"


def test_preview_invalid_zip(client: TestClient, app_state: object) -> None:
    """无效 ZIP 返回 400 并包含错误信息."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(_make_invalid_backup_zip()).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.get(
        f"/api/projects/project-a-1/backups/{backup_id}/preview",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "INVALID_BACKUP"
    assert "备份文件无效或已损坏" in body["error"]["message"]


def test_preview_backup_not_found(client: TestClient) -> None:
    """备份不存在返回 404."""
    response = client.get(
        "/api/projects/project-a-1/backups/non-existent/preview",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "BACKUP_NOT_FOUND"


def test_preview_backup_file_not_found(client: TestClient, app_state: object) -> None:
    """备份记录存在但文件不存在返回 404."""
    from server.main import app

    backup_id = "backup-missing-file"
    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = None

    response = client.get(
        f"/api/projects/project-a-1/backups/{backup_id}/preview",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "BACKUP_FILE_NOT_FOUND"


def test_preview_forbidden(client: TestClient, app_state: object) -> None:
    """跨用户预览返回 403."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(_make_valid_backup_zip()).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.get(
        f"/api/projects/project-a-1/backups/{backup_id}/preview",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 2. POST /backups/:backupId/restore — create_new mode ─────────────────────


def test_restore_create_new_requires_auth(client: TestClient) -> None:
    """无 token 返回 401."""
    response = client.post(
        "/api/projects/project-a-1/backups/backup-1/restore",
        json={"mode": "create_new"},
    )
    assert response.status_code == 401


def test_restore_create_new_creates_project(
    client: TestClient, app_state: object
) -> None:
    """mode=create_new 创建新项目并返回新 ID."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(
        _make_valid_backup_zip(
            project_name="Original Name",
            chars=3000,
            chapters=8,
            kb_entries=4,
        )
    ).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    initial_project_count = len(app.state.fake_db.projects)

    response = client.post(
        f"/api/projects/project-a-1/backups/{backup_id}/restore",
        json={"mode": "create_new"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["projectId"] != "project-a-1"
    assert body["mode"] == "create_new"
    assert "message" in body

    # Verify new project was created
    assert len(app.state.fake_db.projects) == initial_project_count + 1
    new_project = next(
        p for p in app.state.fake_db.projects if p["id"] == body["projectId"]
    )
    assert new_project["ownerId"] == "user-a"
    assert new_project["name"] == "Original Name"


def test_restore_create_new_invalid_mode(client: TestClient, app_state: object) -> None:
    """无效 mode 返回 422."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(_make_valid_backup_zip()).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.post(
        f"/api/projects/project-a-1/backups/{backup_id}/restore",
        json={"mode": "invalid_mode"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "INVALID_MODE"


# ─── 3. POST /backups/:backupId/restore — overwrite mode ──────────────────────


def test_restore_overwrite_requires_auth(client: TestClient) -> None:
    """无 token 返回 401."""
    response = client.post(
        "/api/projects/project-a-1/backups/backup-1/restore",
        json={"mode": "overwrite", "project_name": "A-1"},
    )
    assert response.status_code == 401


def test_restore_overwrite_requires_confirmation(
    client: TestClient, app_state: object
) -> None:
    """mode=overwrite 但未提供 project_name 返回 422."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(_make_valid_backup_zip()).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.post(
        f"/api/projects/project-a-1/backups/{backup_id}/restore",
        json={"mode": "overwrite"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"]["code"] == "CONFIRMATION_REQUIRED"


def test_restore_overwrite_name_mismatch(client: TestClient, app_state: object) -> None:
    """mode=overwrite 但 project_name 不匹配返回 400."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(_make_valid_backup_zip()).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.post(
        f"/api/projects/project-a-1/backups/{backup_id}/restore",
        json={"mode": "overwrite", "project_name": "Wrong Name"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "NAME_MISMATCH"


def test_restore_overwrite_success(client: TestClient, app_state: object) -> None:
    """mode=overwrite 确认后成功覆盖项目数据."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(
        _make_valid_backup_zip(
            project_name="Updated Novel",
            chars=9999,
            chapters=20,
            kb_entries=15,
        )
    ).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.post(
        f"/api/projects/project-a-1/backups/{backup_id}/restore",
        json={"mode": "overwrite", "project_name": "A-1"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["projectId"] == "project-a-1"
    assert body["mode"] == "overwrite"
    assert "message" in body


def test_restore_overwrite_forbidden(client: TestClient, app_state: object) -> None:
    """跨用户恢复返回 403."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(_make_valid_backup_zip()).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.post(
        f"/api/projects/project-a-1/backups/{backup_id}/restore",
        json={"mode": "overwrite", "project_name": "A-1"},
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 4. Invalid ZIP handling ──────────────────────────────────────────────────


def test_restore_invalid_zip(client: TestClient, app_state: object) -> None:
    """无效 ZIP 返回 400 并包含 '备份文件无效或已损坏'."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")
    zip_data = base64.b64encode(_make_invalid_backup_zip()).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.post(
        f"/api/projects/project-a-1/backups/{backup_id}/restore",
        json={"mode": "create_new"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "INVALID_BACKUP"
    assert "备份文件无效或已损坏" in body["error"]["message"]


def test_preview_version_incompatible(client: TestClient, app_state: object) -> None:
    """不支持的备份版本返回 400."""
    from server.main import app, _next_id

    backup_id = _next_id("backup_counter", "backup")

    manifest = {
        "version": "99.0",
        "backupType": "manual",
        "projectId": "project-a-1",
        "projectName": "Bad Version",
        "exportedAt": "2026-03-26T00:00:00Z",
        "counts": {
            "volumes": 1,
            "chapters": 1,
            "knowledgeBaseEntries": 0,
            "snapshots": 0,
            "annotations": 0,
        },
    }
    buf = BytesIO()
    with ZipFile(buf, "w") as zf:
        zf.writestr("manifest.json", json.dumps(manifest))
        zf.writestr("project/project.json", json.dumps({"name": "Test"}))
        zf.writestr("project/volumes.json", json.dumps([]))
        zf.writestr("project/chapters.json", json.dumps([]))
        zf.writestr(
            "knowledge-base/data.json",
            json.dumps(
                {
                    "characters": [],
                    "locations": [],
                    "items": [],
                    "factions": [],
                    "foreshadows": [],
                    "settings": [],
                }
            ),
        )
    zip_data = base64.b64encode(buf.getvalue()).decode()

    app.state.backups["project-a-1"] = [{"id": backup_id, "projectId": "project-a-1"}]
    app.state.backup_files[backup_id] = zip_data

    response = client.get(
        f"/api/projects/project-a-1/backups/{backup_id}/preview",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "VERSION_INCOMPATIBLE"
