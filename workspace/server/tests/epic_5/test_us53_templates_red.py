"""RED tests for US-5.3 Export Templates API.

These tests define the expected behavior before implementation.
They MUST fail on the RED phase.
"""

import pytest
from fastapi.testclient import TestClient


# ==============================================================================
# POST /api/me/export-templates
# ==============================================================================


def test_create_export_template_success(client: TestClient) -> None:
    """Creates an export template with valid data."""
    response = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "我的导出模板",
            "format": "docx",
            "options": {
                "font": "宋体",
                "fontSize": "12pt",
                "lineSpacing": 1.5,
                "includeVolumeTitle": True,
                "includeChapterNumber": True,
            },
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert "id" in body
    assert body["name"] == "我的导出模板"
    assert body["format"] == "docx"
    assert body["userId"] == "user-a"
    assert "createdAt" in body
    assert "updatedAt" in body


def test_create_export_template_with_minimal_options(client: TestClient) -> None:
    """Creates template with only required fields."""
    response = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "简单模板",
            "format": "txt",
            "options": {
                "txtEncoding": "utf8",
                "txtSeparator": "blank",
            },
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["format"] == "txt"


def test_create_export_template_name_max_length(client: TestClient) -> None:
    """Template name can be 30 characters max."""
    response = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "a" * 30,
            "format": "markdown",
            "options": {},
        },
    )
    assert response.status_code == 201


def test_create_export_template_name_too_long(client: TestClient) -> None:
    """Template name over 30 chars returns 400."""
    response = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "a" * 31,
            "format": "markdown",
            "options": {},
        },
    )
    assert response.status_code == 400
    body = response.json()
    assert body["error"]["code"] == "TEMPLATE_NAME_TOO_LONG"


def test_create_export_template_invalid_format(client: TestClient) -> None:
    """Invalid format returns 400."""
    response = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "测试模板",
            "format": "invalid_format",
            "options": {},
        },
    )
    assert response.status_code == 400


def test_create_export_template_limit_20_per_user(client: TestClient) -> None:
    """User cannot create more than 20 templates."""
    # Create 20 templates
    for i in range(20):
        response = client.post(
            "/api/me/export-templates",
            headers={"Authorization": "Bearer token-of-user-a"},
            json={
                "name": f"模板{i}",
                "format": "docx",
                "options": {},
            },
        )
        assert response.status_code == 201

    # 21st should fail
    response = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={
            "name": "超限模板",
            "format": "docx",
            "options": {},
        },
    )
    assert response.status_code == 409
    body = response.json()
    assert body["error"]["code"] == "TEMPLATE_LIMIT_REACHED"


# ==============================================================================
# GET /api/me/export-templates
# ==============================================================================


def test_list_export_templates_success(client: TestClient) -> None:
    """Returns user's templates only."""
    # Create a template first
    client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "用户A模板", "format": "docx", "options": {}},
    )

    response = client.get(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "templates" in body
    # All templates should belong to user-a
    for t in body["templates"]:
        assert t["userId"] == "user-a"


def test_list_export_templates_user_isolation(client: TestClient) -> None:
    """User cannot see other users' templates."""
    # User-a creates a template
    client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "用户A模板", "format": "docx", "options": {}},
    )

    # User-b lists templates
    response = client.get(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 200
    body = response.json()
    # User-b should see no templates
    assert len(body["templates"]) == 0


# ==============================================================================
# PATCH /api/me/export-templates/{id}
# ==============================================================================


def test_update_export_template_name(client: TestClient) -> None:
    """Updates template name."""
    # Create a template
    create_resp = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "原名称", "format": "docx", "options": {}},
    )
    template_id = create_resp.json()["id"]

    # Update name
    response = client.patch(
        f"/api/me/export-templates/{template_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "新名称"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "新名称"


def test_update_export_template_options(client: TestClient) -> None:
    """Updates template options."""
    # Create a template
    create_resp = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "模板", "format": "docx", "options": {"font": "宋体"}},
    )
    template_id = create_resp.json()["id"]

    # Update options
    response = client.patch(
        f"/api/me/export-templates/{template_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"options": {"font": "黑体", "includeNotes": True}},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["options"]["font"] == "黑体"
    assert body["options"]["includeNotes"] is True


def test_update_export_template_not_found(client: TestClient) -> None:
    """Returns 404 if template not found."""
    response = client.patch(
        "/api/me/export-templates/non-existent-id",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "新名称"},
    )
    assert response.status_code == 404


def test_update_other_user_template_forbidden(client: TestClient) -> None:
    """User cannot update another user's template."""
    # User-a creates a template
    create_resp = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "用户A模板", "format": "docx", "options": {}},
    )
    template_id = create_resp.json()["id"]

    # User-b tries to update it
    response = client.patch(
        f"/api/me/export-templates/{template_id}",
        headers={"Authorization": "Bearer token-of-user-b"},
        json={"name": "偷改"},
    )
    assert response.status_code == 404


# ==============================================================================
# DELETE /api/me/export-templates/{id}
# ==============================================================================


def test_delete_export_template_success(client: TestClient) -> None:
    """Deletes a template."""
    # Create a template
    create_resp = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "待删除模板", "format": "docx", "options": {}},
    )
    template_id = create_resp.json()["id"]

    # Delete it
    response = client.delete(
        f"/api/me/export-templates/{template_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 204

    # Verify it's gone
    list_resp = client.get(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    templates = list_resp.json()["templates"]
    assert template_id not in [t["id"] for t in templates]


def test_delete_export_template_not_found(client: TestClient) -> None:
    """Returns 404 if template not found."""
    response = client.delete(
        "/api/me/export-templates/non-existent-id",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


def test_delete_other_user_template_forbidden(client: TestClient) -> None:
    """User cannot delete another user's template."""
    # User-a creates a template
    create_resp = client.post(
        "/api/me/export-templates",
        headers={"Authorization": "Bearer token-of-user-a"},
        json={"name": "用户A模板", "format": "docx", "options": {}},
    )
    template_id = create_resp.json()["id"]

    # User-b tries to delete it
    response = client.delete(
        f"/api/me/export-templates/{template_id}",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response.status_code == 404


# ==============================================================================
# Authorization - All endpoints require auth
# ==============================================================================


def test_create_export_template_requires_auth(client: TestClient) -> None:
    """POST without auth returns 401."""
    response = client.post(
        "/api/me/export-templates",
        json={"name": "测试", "format": "docx", "options": {}},
    )
    assert response.status_code == 401


def test_list_export_templates_requires_auth(client: TestClient) -> None:
    """GET without auth returns 401."""
    response = client.get("/api/me/export-templates")
    assert response.status_code == 401


def test_update_export_template_requires_auth(client: TestClient) -> None:
    """PATCH without auth returns 401."""
    response = client.patch(
        "/api/me/export-templates/some-id",
        json={"name": "测试"},
    )
    assert response.status_code == 401


def test_delete_export_template_requires_auth(client: TestClient) -> None:
    """DELETE without auth returns 401."""
    response = client.delete("/api/me/export-templates/some-id")
    assert response.status_code == 401
