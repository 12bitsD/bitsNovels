from typing import Any

from fastapi.testclient import TestClient


def test_create_project_name_trim_and_length_red(client: TestClient) -> None:
    response_empty = client.post(
        "/api/projects",
        json={"name": "   ", "type": "novel", "tags": []},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    response_too_long = client.post(
        "/api/projects",
        json={"name": "x" * 51, "type": "novel", "tags": []},
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response_empty.status_code == 400
    assert response_too_long.status_code == 400


def test_create_project_name_unique_per_user_red(client: TestClient) -> None:
    payload = {"name": "雾都夜行录", "type": "novel", "tags": ["悬疑"]}
    first = client.post(
        "/api/projects",
        json=payload,
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    second = client.post(
        "/api/projects",
        json=payload,
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert first.status_code in {200, 201}
    assert second.status_code == 409


def test_create_project_tags_enum_and_max5_red(client: TestClient) -> None:
    response_invalid_tag = client.post(
        "/api/projects",
        json={"name": "P1", "type": "novel", "tags": ["悬疑", "invalid"]},
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    response_too_many = client.post(
        "/api/projects",
        json={
            "name": "P2",
            "type": "novel",
            "tags": ["玄幻", "都市", "科幻", "历史", "言情", "悬疑"],
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response_invalid_tag.status_code == 400
    assert response_too_many.status_code == 400


def test_create_project_description_max500_red(client: TestClient) -> None:
    response = client.post(
        "/api/projects",
        json={
            "name": "P3",
            "type": "novel",
            "tags": [],
            "description": "d" * 501,
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 400


def test_create_project_success_default_fields_red(client: TestClient) -> None:
    response = client.post(
        "/api/projects",
        json={
            "name": "P4",
            "type": "novel",
            "tags": ["玄幻"],
            "structureMode": "blank",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["projectId"]
    assert body["defaultVolumeId"]
    assert body["firstChapterId"]
    assert "importedEntryCount" in body


def test_create_project_atomicity_red(client: TestClient, fake_db: Any) -> None:
    fake_db.add_failpoint("create_project_after_insert_before_outline")

    response = client.post(
        "/api/projects",
        json={
            "name": "P5",
            "type": "novel",
            "tags": [],
            "structureMode": "blank",
        },
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code in {400, 500}
    assert "P5" not in {project["name"] for project in fake_db.projects}
