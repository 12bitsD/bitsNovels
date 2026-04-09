"""
US-5.2 Auto Backup — 红灯测试

覆盖端点:
1. POST /api/projects/:projectId/backups/auto/trigger — 创建自动备份
2. GET  /api/projects/:projectId/backups                    — 列出自动+手动备份
3. GET  /api/projects/:projectId/backups/:backupId/download — 下载备份ZIP
"""

import base64
import zipfile
from io import BytesIO
from typing import Any

from fastapi.testclient import TestClient

# ─── 1. POST /backups/auto/trigger — 创建自动备份 ─────────────────────────────


def test_trigger_backup_requires_auth(client: TestClient) -> None:
    """无 token 返回 401."""
    response = client.post("/api/projects/project-a-1/backups/auto/trigger")
    assert response.status_code == 401


def test_trigger_backup_creates_backup(client: TestClient) -> None:
    """创建自动备份返回 201 和 backupId."""
    response = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "backupId" in body
    assert "manifest" in body


def test_trigger_backup_creates_zip_with_manifest(
    client: TestClient, app_state: Any
) -> None:
    """备份创建后 ZIP 数据被存储，manifest 包含正确字段."""
    from server.main import app

    response = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    backup_id = body["backupId"]
    manifest = body["manifest"]

    # 验证 manifest 字段
    assert manifest["version"] == "1.0"
    assert manifest["backupType"] == "auto"
    assert manifest["projectId"] == "project-a-1"
    assert "exportedAt" in manifest
    assert "counts" in manifest
    assert "volumes" in manifest["counts"]
    assert "chapters" in manifest["counts"]
    assert "knowledgeBaseEntries" in manifest["counts"]
    assert "snapshots" in manifest["counts"]
    assert "annotations" in manifest["counts"]

    # 验证 ZIP 文件存在
    assert backup_id in app.state.backup_files
    zip_data = app.state.backup_files[backup_id]
    assert zip_data is not None

    # 验证 ZIP 可解压且包含 manifest.json
    zip_bytes = base64.b64decode(zip_data)
    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        assert "manifest.json" in zf.namelist()


def test_trigger_backup_creates_zip_structure(
    client: TestClient, app_state: Any
) -> None:
    """ZIP 包含所有必需文件: manifest.json, project/, knowledge-base/, snapshots/, annotations/, config/."""
    from server.main import app

    response = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    backup_id = response.json()["backupId"]
    zip_data = app.state.backup_files[backup_id]
    zip_bytes = base64.b64decode(zip_data)

    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        # 必须包含的文件
        assert "manifest.json" in names
        assert any(f.startswith("project/") for f in names)
        assert any(f.startswith("knowledge-base/") for f in names)
        assert any(f.startswith("snapshots/") for f in names)
        assert any(f.startswith("annotations/") for f in names)
        assert any(f.startswith("config/") for f in names)


def test_trigger_backup_forbidden(client: TestClient) -> None:
    """跨用户创建备份返回 403."""
    response = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


def test_trigger_backup_project_not_found(client: TestClient) -> None:
    """项目不存在返回 404."""
    response = client.post(
        "/api/projects/non-existent-project/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "PROJECT_NOT_FOUND"


def test_trigger_backup_skips_archived(client: TestClient) -> None:
    """归档项目返回 409 Conflict."""
    from server.main import app

    # 将项目设为归档状态
    project = next(p for p in app.state.fake_db.projects if p["id"] == "project-a-1")
    project["status"] = "archived"

    response = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "PROJECT_ARCHIVED"


def test_trigger_backup_enforces_retention(client: TestClient) -> None:
    """超过 7 个自动备份时删除最旧的."""
    from server.main import app

    # 创建 7 个自动备份
    backup_ids = []
    for _ in range(7):
        response = client.post(
            "/api/projects/project-a-1/backups/auto/trigger",
            headers={"Authorization": "Bearer token-of-user-a"},
        )
        assert response.status_code == 201
        backup_ids.append(response.json()["backupId"])

    # 验证所有 7 个备份都存在
    assert len(app.state.backups["project-a-1"]) == 7

    # 创建第 8 个备份
    response = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    new_backup_id = response.json()["backupId"]

    # 验证备份数量仍为 7
    auto_backups = [
        b
        for b in app.state.backups.get("project-a-1", [])
        if b.get("backupType") == "auto"
    ]
    assert len(auto_backups) == 7

    # 验证最旧的备份已被删除
    assert backup_ids[0] not in app.state.backup_files
    # 验证新的备份存在
    assert new_backup_id in app.state.backup_files


def test_trigger_backup_sends_notification(client: TestClient) -> None:
    """备份创建后发送 backup_done 通知."""
    from server.main import app

    initial_count = len([n for n in app.state.notifications if n["userId"] == "user-a"])

    response = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201

    final_count = len([n for n in app.state.notifications if n["userId"] == "user-a"])
    assert final_count == initial_count + 1

    new_notification = max(
        [n for n in app.state.notifications if n["userId"] == "user-a"],
        key=lambda n: n["createdAt"],
    )
    assert new_notification["type"] == "backup_done"


# ─── 2. GET /backups — 列出备份 ───────────────────────────────────────────────


def test_list_backups_requires_auth(client: TestClient) -> None:
    """无 token 返回 401."""
    response = client.get("/api/projects/project-a-1/backups")
    assert response.status_code == 401


def test_list_backups_returns_items(client: TestClient) -> None:
    """返回备份列表，按 createdAt 倒序."""
    # 创建几个备份
    for _ in range(3):
        client.post(
            "/api/projects/project-a-1/backups/auto/trigger",
            headers={"Authorization": "Bearer token-of-user-a"},
        )

    response = client.get(
        "/api/projects/project-a-1/backups",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert len(body["items"]) == 3

    # 验证倒序
    items = body["items"]
    for i in range(len(items) - 1):
        assert items[i]["createdAt"] >= items[i + 1]["createdAt"]


def test_list_backups_empty(client: TestClient) -> None:
    """无备份时返回空数组."""
    response = client.get(
        "/api/projects/project-a-1/backups",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []


def test_list_backups_forbidden(client: TestClient) -> None:
    """跨用户列出备份返回 403."""
    response = client.get(
        "/api/projects/project-a-1/backups",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


def test_list_backups_project_not_found(client: TestClient) -> None:
    """项目不存在返回 404."""
    response = client.get(
        "/api/projects/non-existent-project/backups",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_list_backups_includes_manual_and_auto(
    client: TestClient, app_state: Any
) -> None:
    """列表包含手动备份和自动备份."""
    from server.main import app

    # 创建自动备份
    client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    # 手动添加一个手动备份
    manual_backup_id = "manual-backup-1"
    app.state.backups["project-a-1"].append(
        {
            "id": manual_backup_id,
            "version": "1.0",
            "backupType": "manual",
            "projectId": "project-a-1",
            "projectName": "A-1",
            "exportedAt": "2026-03-26T12:00:00Z",
            "counts": {
                "volumes": 1,
                "chapters": 1,
                "knowledgeBaseEntries": 0,
                "snapshots": 0,
                "annotations": 0,
            },
            "createdAt": "2026-03-26T12:00:00Z",
        }
    )

    response = client.get(
        "/api/projects/project-a-1/backups",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 2
    types = {item["backupType"] for item in body["items"]}
    assert "auto" in types
    assert "manual" in types


# ─── 3. GET /backups/:backupId/download — 下载备份 ───────────────────────────


def test_download_backup_requires_auth(client: TestClient) -> None:
    """无 token 返回 401."""
    response = client.get("/api/projects/project-a-1/backups/some-backup-id/download")
    assert response.status_code == 401


def test_download_backup_returns_zip(client: TestClient) -> None:
    """下载返回 200 和 ZIP 文件."""
    # 先创建一个备份
    create_resp = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert create_resp.status_code == 201
    backup_id = create_resp.json()["backupId"]

    # 下载
    response = client.get(
        f"/api/projects/project-a-1/backups/{backup_id}/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "attachment" in response.headers["content-disposition"]


def test_download_backup_not_found(client: TestClient) -> None:
    """备份不存在返回 404."""
    response = client.get(
        "/api/projects/project-a-1/backups/non-existent-backup/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "BACKUP_NOT_FOUND"


def test_download_backup_file_not_found(client: TestClient) -> None:
    """备份记录存在但文件不存在返回 404."""
    from server.main import app

    app.state.backups["project-a-1"] = []
    # 添加备份记录但不添加文件
    app.state.backups["project-a-1"].append(
        {
            "id": "orphan-backup",
            "version": "1.0",
            "backupType": "auto",
            "projectId": "project-a-1",
            "projectName": "A-1",
            "exportedAt": "2026-03-26T12:00:00Z",
            "counts": {
                "volumes": 0,
                "chapters": 0,
                "knowledgeBaseEntries": 0,
                "snapshots": 0,
                "annotations": 0,
            },
            "createdAt": "2026-03-26T12:00:00Z",
        }
    )

    response = client.get(
        "/api/projects/project-a-1/backups/orphan-backup/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "BACKUP_FILE_NOT_FOUND"


def test_download_backup_forbidden(client: TestClient) -> None:
    """跨用户下载返回 403."""
    # 创建一个备份
    create_resp = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    backup_id = create_resp.json()["backupId"]

    # user-b 尝试下载
    response = client.get(
        f"/api/projects/project-a-1/backups/{backup_id}/download",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


def test_download_backup_project_not_found(client: TestClient) -> None:
    """项目不存在返回 404."""
    response = client.get(
        "/api/projects/non-existent-project/backups/some-backup/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_download_backup_returns_valid_zip(client: TestClient, app_state: Any) -> None:
    """下载的 ZIP 可正常解压且包含必需文件."""
    # 创建备份
    create_resp = client.post(
        "/api/projects/project-a-1/backups/auto/trigger",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    backup_id = create_resp.json()["backupId"]

    # 下载
    response = client.get(
        f"/api/projects/project-a-1/backups/{backup_id}/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200

    # 验证 ZIP 有效
    zip_bytes = response.content
    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        names = zf.namelist()
        assert "manifest.json" in names
        assert any(f.startswith("project/") for f in names)
        assert any(f.startswith("knowledge-base/") for f in names)

    # 验证 manifest 内容
    with zipfile.ZipFile(BytesIO(zip_bytes)) as zf:
        import json

        manifest_data = json.loads(zf.read("manifest.json"))
        assert manifest_data["projectId"] == "project-a-1"
        assert manifest_data["backupType"] == "auto"
