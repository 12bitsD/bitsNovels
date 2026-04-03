"""
US-5.1 Export — 红灯测试

覆盖端点:
1. POST /api/projects/:projectId/exports         — 创建导出任务
2. GET  /api/projects/:projectId/exports          — 获取最近10条导出任务
3. GET  /api/projects/:projectId/exports/:taskId  — 获取单个任务状态/进度
4. GET  /api/projects/:projectId/exports/:taskId/download — 下载文件
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient


# ─── 1. POST /exports — 创建导出任务 ─────────────────────────────────────────


def test_create_export_task_success(client: TestClient) -> None:
    """创建导出任务返回 taskId 和 pending 状态."""
    response = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "docx", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    assert "taskId" in body
    assert body["status"] == "pending"


def test_create_export_task_with_scope_ids(client: TestClient) -> None:
    """指定 volume 或 chapter 范围时接受 scopeIds."""
    response = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "txt", "scope": "volume", "scopeIds": ["volume-a-1"]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "pending"


def test_create_export_task_forbidden(client: TestClient) -> None:
    """跨用户创建导出返回 403."""
    response = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "docx", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403
    body = response.json()
    assert body["error"]["code"] == "FORBIDDEN"


def test_create_export_task_unauthorized(client: TestClient) -> None:
    """无 token 返回 401."""
    response = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "docx", "scope": "all"},
    )
    assert response.status_code == 401


def test_create_export_task_project_not_found(client: TestClient) -> None:
    """项目不存在返回 404."""
    response = client.post(
        "/api/projects/non-existent-project/exports",
        json={"format": "docx", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "PROJECT_NOT_FOUND"


def test_create_export_task_invalid_format(client: TestClient) -> None:
    """无效 format 返回 422."""
    response = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "invalid", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 422


# ─── 2. GET /exports — 获取最近10条任务 ───────────────────────────────────────


def test_list_exports_returns_last_10(client: TestClient) -> None:
    """返回该项目的最近10条导出任务，按 createdAt 倒序."""
    # 创建多个导出任务
    for i in range(12):
        client.post(
            "/api/projects/project-a-1/exports",
            json={"format": ["docx", "txt", "pdf", "markdown"][i % 4], "scope": "all"},
            headers={"Authorization": "Bearer token-of-user-a"},
        )
    response = client.get(
        "/api/projects/project-a-1/exports",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert len(body["items"]) == 10  # 最多返回10条
    # 验证倒序
    items = body["items"]
    for i in range(len(items) - 1):
        assert items[i]["createdAt"] >= items[i + 1]["createdAt"]


def test_list_exports_empty(client: TestClient) -> None:
    """无导出任务时返回空数组."""
    response = client.get(
        "/api/projects/project-a-1/exports",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["items"] == []


def test_list_exports_forbidden(client: TestClient) -> None:
    """跨用户列出导出返回 403."""
    response = client.get(
        "/api/projects/project-a-1/exports",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 3. GET /exports/:taskId — 获取任务状态/进度 ───────────────────────────────


def test_get_export_task_success(client: TestClient) -> None:
    """返回任务完整信息 including progress."""
    # 创建任务
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "markdown", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    response = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "task" in body
    task = body["task"]
    assert task["id"] == task_id
    assert task["status"] in {"pending", "generating", "done", "failed"}
    assert "progress" in task
    assert 0 <= task["progress"] <= 100
    assert task["format"] == "markdown"
    assert task["scope"] == "all"


def test_get_export_task_not_found(client: TestClient) -> None:
    """任务不存在返回 404."""
    response = client.get(
        "/api/projects/project-a-1/exports/non-existent-task",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404
    body = response.json()
    assert body["error"]["code"] == "EXPORT_TASK_NOT_FOUND"


def test_get_export_task_forbidden(client: TestClient) -> None:
    """跨用户获取任务返回 403."""
    # 创建任务
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "docx", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    # user-b 尝试获取
    response = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 4. GET /exports/:taskId/download — 下载文件 ───────────────────────────────


def test_download_export_not_ready(client: TestClient) -> None:
    """任务未完成时下载返回 409."""
    from server.main import app, _next_id, _iso_z, _now

    task_id = _next_id("export_task_counter", "export")

    app.state.export_tasks[task_id] = {
        "id": task_id,
        "projectId": "project-a-1",
        "userId": "user-a",
        "format": "docx",
        "scope": "all",
        "status": "pending",
        "progress": 0,
        "createdAt": _iso_z(_now()),
    }

    response = client.get(
        f"/api/projects/project-a-1/exports/{task_id}/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "EXPORT_NOT_READY"


def test_download_export_forbidden(client: TestClient) -> None:
    """跨用户下载返回 403."""
    # 创建任务
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "docx", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    # user-b 尝试下载
    response = client.get(
        f"/api/projects/project-a-1/exports/{task_id}/download",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 403


# ─── 5. 异步生成 + 进度更新 + 通知 ──────────────────────────────────────────


def test_export_task_progress_flow(client: TestClient) -> None:
    """任务从 pending → generating → done，progress 逐步更新."""
    from server.main import app, _next_id, _iso_z, _now
    from server.services.export_service import process_export_task

    task_id = _next_id("export_task_counter", "export")

    app.state.export_tasks[task_id] = {
        "id": task_id,
        "projectId": "project-a-1",
        "userId": "user-a",
        "format": "txt",
        "scope": "all",
        "status": "pending",
        "progress": 0,
        "createdAt": _iso_z(_now()),
    }

    assert app.state.export_tasks[task_id]["status"] == "pending"
    assert app.state.export_tasks[task_id]["progress"] == 0

    process_export_task(task_id, "project-a-1", "user-a", "txt", "all", None)

    assert app.state.export_tasks[task_id]["status"] == "done"
    assert app.state.export_tasks[task_id]["progress"] == 100


def test_export_task_notification_sent(client: TestClient, app_state: Any) -> None:
    """任务完成后发送 export_done 或 export_failed 通知."""
    from server.main import app
    from server.services.export_service import process_export_task

    task_id = "export-notif-test-1"

    app.state.export_tasks[task_id] = {
        "id": task_id,
        "projectId": "project-a-1",
        "userId": "user-a",
        "format": "docx",
        "scope": "all",
        "status": "pending",
        "progress": 0,
        "createdAt": "2026-03-26T00:00:00Z",
    }

    initial_count = len([n for n in app.state.notifications if n["userId"] == "user-a"])

    process_export_task(task_id, "project-a-1", "user-a", "docx", "all", None)

    final_count = len([n for n in app.state.notifications if n["userId"] == "user-a"])
    assert final_count == initial_count + 1

    new_notification = max(
        [n for n in app.state.notifications if n["userId"] == "user-a"],
        key=lambda n: n["createdAt"],
    )
    assert new_notification["type"] == "export_done"
    assert "fileUrl" in new_notification.get("actionTarget", {})


# ─── 6. 范围解析器 ────────────────────────────────────────────────────────────


def test_scope_resolver_all(client: TestClient) -> None:
    """scope=all 时包含项目所有卷章节."""
    # 创建任务
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "pdf", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    # 触发任务处理
    from server.services.export_service import process_export_task

    process_export_task(task_id, "project-a-1", "user-a", "pdf", "all", None)

    # 验证任务状态为 done
    get_resp = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task = get_resp.json()["task"]
    assert task["status"] == "done"
    assert task["progress"] == 100


def test_scope_resolver_volume(client: TestClient) -> None:
    """scope=volume 时只包含指定卷."""
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "txt", "scope": "volume", "scopeIds": ["volume-a-1"]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    from server.services.export_service import process_export_task

    process_export_task(
        task_id, "project-a-1", "user-a", "txt", "volume", ["volume-a-1"]
    )

    get_resp = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task = get_resp.json()["task"]
    assert task["status"] == "done"


def test_scope_resolver_chapter(client: TestClient) -> None:
    """scope=chapter 时只包含指定章节."""
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "markdown", "scope": "chapter", "scopeIds": ["chapter-a-1"]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    from server.services.export_service import process_export_task

    process_export_task(
        task_id, "project-a-1", "user-a", "markdown", "chapter", ["chapter-a-1"]
    )

    get_resp = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task = get_resp.json()["task"]
    assert task["status"] == "done"


# ─── 7. 格式生成器 ────────────────────────────────────────────────────────────


def test_format_generator_docx(client: TestClient) -> None:
    """DOCX 格式生成器正确生成文件."""
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "docx", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    from server.services.export_service import process_export_task

    process_export_task(task_id, "project-a-1", "user-a", "docx", "all", None)

    get_resp = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task = get_resp.json()["task"]
    assert task["status"] == "done"
    assert task["fileUrl"] is not None
    assert task["expiresAt"] is not None


def test_format_generator_txt(client: TestClient) -> None:
    """TXT 格式生成器正确生成文件."""
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "txt", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    from server.services.export_service import process_export_task

    process_export_task(task_id, "project-a-1", "user-a", "txt", "all", None)

    get_resp = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task = get_resp.json()["task"]
    assert task["status"] == "done"


def test_format_generator_pdf(client: TestClient) -> None:
    """PDF 格式生成器正确生成文件."""
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "pdf", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    from server.services.export_service import process_export_task

    process_export_task(task_id, "project-a-1", "user-a", "pdf", "all", None)

    get_resp = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task = get_resp.json()["task"]
    assert task["status"] == "done"


def test_format_generator_markdown(client: TestClient) -> None:
    """Markdown 格式生成器正确生成文件."""
    create_resp = client.post(
        "/api/projects/project-a-1/exports",
        json={"format": "markdown", "scope": "all"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task_id = create_resp.json()["taskId"]

    from server.services.export_service import process_export_task

    process_export_task(task_id, "project-a-1", "user-a", "markdown", "all", None)

    get_resp = client.get(
        f"/api/projects/project-a-1/exports/{task_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    task = get_resp.json()["task"]
    assert task["status"] == "done"


# ─── 8. 过期检查 ──────────────────────────────────────────────────────────────


def test_download_expired(client: TestClient, session_clock: Any) -> None:
    """文件过期后返回 410 Gone."""
    # 创建任务并直接设置过期
    from server.main import app, _next_id, _iso_z
    from datetime import datetime, timedelta, timezone

    task_id = _next_id("export_task_counter", "export")
    now = session_clock.now

    app.state.export_tasks[task_id] = {
        "id": task_id,
        "projectId": "project-a-1",
        "userId": "user-a",
        "format": "docx",
        "scope": "all",
        "status": "done",
        "progress": 100,
        "fileUrl": f"/exports/{task_id}/file.docx",
        "expiresAt": _iso_z(now - timedelta(hours=1)),  # 已过期
        "createdAt": _iso_z(now - timedelta(hours=2)),
    }

    response = client.get(
        f"/api/projects/project-a-1/exports/{task_id}/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 410
    body = response.json()
    assert body["error"]["code"] == "EXPORT_LINK_EXPIRED"


def test_download_valid(client: TestClient, session_clock: Any) -> None:
    """文件未过期时返回 200 并可下载."""
    from server.main import app, _next_id, _iso_z
    from datetime import timedelta, timezone

    task_id = _next_id("export_task_counter", "export")
    now = session_clock.now

    app.state.export_tasks[task_id] = {
        "id": task_id,
        "projectId": "project-a-1",
        "userId": "user-a",
        "format": "docx",
        "scope": "all",
        "status": "done",
        "progress": 100,
        "fileUrl": f"/exports/{task_id}/file.docx",
        "expiresAt": _iso_z(now + timedelta(days=7)),
        "createdAt": _iso_z(now - timedelta(hours=1)),
    }

    app.state.export_files[task_id] = {
        "fileUrl": f"/exports/{task_id}/file.docx",
        "format": "docx",
        "data": b"<html>test content</html>",
        "expiresAt": now + timedelta(days=7),
    }

    response = client.get(
        f"/api/projects/project-a-1/exports/{task_id}/download",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
