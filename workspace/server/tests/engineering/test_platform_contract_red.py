from fastapi.testclient import TestClient


def test_error_response_shape_red(client: TestClient) -> None:
    response = client.get("/api/projects")
    body = response.json()

    assert response.status_code == 401
    assert isinstance(body, dict)
    assert "error" in body
    assert body["error"]["code"]
    assert body["error"]["message"]
    assert isinstance(body["error"]["details"], dict)


def test_auth_guard_red(client: TestClient) -> None:
    response = client.get("/api/projects")
    assert response.status_code == 401


def test_iso8601_utc_time_format_red(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={
            "email": "demo@example.com",
            "password": "StrongPass1",
            "rememberMe": False,
        },
    )

    assert response.status_code == 200
    assert response.json()["expiresAt"].endswith("Z")


def test_project_scope_isolation_red(client: TestClient) -> None:
    response = client.get(
        "/api/projects/project-belongs-to-user-b",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code in {403, 404}


def test_pagination_contract_red(client: TestClient) -> None:
    response = client.get(
        "/api/projects?page=1&limit=20",
        headers={"Authorization": "Bearer token-of-user-a"},
    )

    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "total" in body
    assert "page" in body
    assert "limit" in body


def test_session_ttl_policy_red(client: TestClient) -> None:
    response_default = client.post(
        "/api/auth/login",
        json={
            "email": "demo@example.com",
            "password": "StrongPass1",
            "rememberMe": False,
        },
    )
    response_remember = client.post(
        "/api/auth/login",
        json={
            "email": "demo@example.com",
            "password": "StrongPass1",
            "rememberMe": True,
        },
    )

    assert response_default.status_code == 200
    assert response_remember.status_code == 200
    assert response_default.json()["expiresAt"] != response_remember.json()["expiresAt"]
