from fastapi.testclient import TestClient


def test_projects_list_requires_auth_red(client: TestClient) -> None:
    response = client.get("/api/projects")
    assert response.status_code == 401


def test_projects_list_only_owner_data_red(client: TestClient) -> None:
    response = client.get(
        "/api/projects",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    ids = {item["id"] for item in response.json()["items"]}
    assert "project-b-1" not in ids


def test_projects_list_support_sort_filter_search_red(client: TestClient) -> None:
    response = client.get(
        "/api/projects?sort=updatedAt&type=novel&status=active&search=雾都",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert "items" in response.json()
    assert "total" in response.json()


def test_projects_dashboard_shape_red(client: TestClient) -> None:
    response = client.get(
        "/api/projects",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    item = response.json()["items"][0]
    assert "coverColor" in item
    assert "type" in item
    assert "totalChars" in item
    assert "chapterCount" in item
    assert "lastEditedChapterId" in item


def test_archived_project_is_read_only_red(client: TestClient) -> None:
    archive_response = client.post(
        "/api/projects/project-a-1/archive",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    write_response = client.patch(
        "/api/projects/project-a-1",
        json={"name": "new name after archived"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert archive_response.status_code == 200
    assert write_response.status_code in {403, 409}


def test_project_detail_quick_action_payload_red(client: TestClient) -> None:
    response = client.get(
        "/api/projects/project-a-1",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "project" in body
    assert "lastEditedChapterId" in body
    assert "permissions" in body


def test_delete_project_requires_confirmation_name_red(client: TestClient) -> None:
    create = client.post(
        "/api/projects",
        json={"name": "ToDelete", "type": "novel", "tags": [], "structureMode": "blank"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    project_id = create.json()["projectId"]

    mismatch = client.request(
        "DELETE",
        f"/api/projects/{project_id}",
        json={"confirmationName": "Mismatch"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    deleted = client.request(
        "DELETE",
        f"/api/projects/{project_id}",
        json={"confirmationName": "ToDelete"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    check = client.get(
        f"/api/projects/{project_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert create.status_code == 201
    assert mismatch.status_code == 400
    assert deleted.status_code == 200
    assert deleted.json()["ok"] is True
    assert check.status_code == 404
