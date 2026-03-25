from fastapi.testclient import TestClient

from server.main import app


def test_health_endpoint_returns_ready_payload() -> None:
    client = TestClient(app)

    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "name": "bitsNovels API",
        "status": "ok",
        "version": "0.1.0",
    }
