from fastapi.testclient import TestClient


def test_get_settings_requires_auth(client: TestClient) -> None:
    response = client.get("/api/projects/project-a-1/settings")
    assert response.status_code == 401


def test_get_settings_returns_project_and_stats(client: TestClient) -> None:
    response = client.get(
        "/api/projects/project-a-1/settings",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "project" in body
    assert "stats" in body
    assert "tabs" in body
    stats = body["stats"]
    assert "volumeCount" in stats
    assert "chapterCount" in stats
    assert "totalChars" in stats
    assert "kbEntryCount" in stats
    tabs = body["tabs"]
    assert isinstance(tabs, list)
    assert len(tabs) == 4
    tab_ids = [t["id"] for t in tabs]
    assert "basic" in tab_ids
    assert "goals" in tab_ids
    assert "ai" in tab_ids
    assert "backup" in tab_ids


def test_patch_project_updates_name(client: TestClient) -> None:
    response = client.patch(
        "/api/projects/project-a-1",
        json={"name": "New Project Name"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["project"]["name"] == "New Project Name"


def test_patch_project_validates_name_length(client: TestClient) -> None:
    long_name = "a" * 51
    response = client.patch(
        "/api/projects/project-a-1",
        json={"name": long_name},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400


def test_delete_requires_wrong_confirmation(client: TestClient) -> None:
    create = client.post(
        "/api/projects",
        json={
            "name": "ToDelete",
            "type": "novel",
            "tags": [],
            "structureMode": "blank",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    project_id = create.json()["projectId"]

    response = client.request(
        "DELETE",
        f"/api/projects/{project_id}",
        json={"confirmationName": "WrongName"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400


def test_delete_succeeds_with_correct_confirmation(client: TestClient) -> None:
    create = client.post(
        "/api/projects",
        json={
            "name": "ToDeleteConfirm",
            "type": "novel",
            "tags": [],
            "structureMode": "blank",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    project_id = create.json()["projectId"]

    response = client.request(
        "DELETE",
        f"/api/projects/{project_id}",
        json={"confirmationName": "ToDeleteConfirm"},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    assert response.json()["ok"] is True

    check = client.get(
        f"/api/projects/{project_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert check.status_code == 404
