from fastapi.testclient import TestClient


def test_archive_requires_auth(client: TestClient) -> None:
    """归档操作需要认证"""
    response = client.post("/api/projects/project-a-1/archive", json={})
    assert response.status_code == 401


def test_archive_marks_project_readonly(client: TestClient) -> None:
    """归档后项目标记为只读"""
    # 先归档项目
    archive_response = client.post(
        "/api/projects/project-a-1/archive",
        json={},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert archive_response.status_code == 200
    assert archive_response.json()["status"] == "archived"

    # 验证项目返回的 permissions.write 为 False
    get_response = client.get(
        "/api/projects/project-a-1",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert get_response.status_code == 200
    assert get_response.json()["permissions"]["write"] is False


def test_unarchive_requires_auth(client: TestClient) -> None:
    """取消归档操作需要认证"""
    response = client.post("/api/projects/project-a-1/unarchive", json={})
    assert response.status_code == 401


def test_unarchive_restores_write_permission(client: TestClient) -> None:
    """取消归档后恢复写权限"""
    # 先归档项目
    client.post(
        "/api/projects/project-a-1/archive",
        json={},
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    # 取消归档
    unarchive_response = client.post(
        "/api/projects/project-a-1/unarchive",
        json={},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert unarchive_response.status_code == 200
    assert unarchive_response.json()["status"] == "active"

    # 验证写权限已恢复
    get_response = client.get(
        "/api/projects/project-a-1",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert get_response.status_code == 200
    assert get_response.json()["permissions"]["write"] is True


def test_archived_project_hidden_from_default_list(client: TestClient) -> None:
    """归档项目在默认列表中隐藏（status=active 时不可见）"""
    # 归档 project-a-2
    client.post(
        "/api/projects/project-a-2/archive",
        json={},
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    # 获取默认列表（不指定 status）
    list_response = client.get(
        "/api/projects",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert list_response.status_code == 200
    project_ids = [p["id"] for p in list_response.json()["items"]]

    # project-a-2 应该不在默认列表中
    assert "project-a-2" not in project_ids

    # 获取归档列表（指定 status=archived）
    archived_list_response = client.get(
        "/api/projects?status=archived",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert archived_list_response.status_code == 200
    archived_ids = [p["id"] for p in archived_list_response.json()["items"]]

    # project-a-2 应该在归档列表中
    assert "project-a-2" in archived_ids


def test_patch_on_archived_project_returns_409(client: TestClient) -> None:
    """归档后的项目 PATCH 请求应返回 409/403"""
    # 先归档项目
    client.post(
        "/api/projects/project-a-1/archive",
        json={},
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    # 尝试修改项目名称
    patch_response = client.patch(
        "/api/projects/project-a-1",
        json={"name": "New Name"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    # 应返回 409 Conflict 或 403 Forbidden
    assert patch_response.status_code in (403, 409)
