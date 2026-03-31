"""RED tests for US-6.6 Notification Center API.

These tests define the expected behavior before implementation.
They MUST fail on the RED phase.
"""

from fastapi.testclient import TestClient


# ==============================================================================
# GET /api/me/notifications
# ==============================================================================


def test_list_notifications_success(client: TestClient) -> None:
    """Returns user's notifications only, sorted by createdAt desc."""
    response = client.get(
        "/api/me/notifications",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert "cursor" in body
    assert "hasMore" in body
    # Should only return user-a's notifications
    for item in body["items"]:
        assert item["userId"] == "user-a"


def test_list_notifications_filter_category(client: TestClient) -> None:
    """Filters notifications by category (ai_parse, system, etc.)."""
    # Create a notification with type 'parse_done' (belongs to ai_parse category)
    response = client.get(
        "/api/me/notifications?category=ai_parse",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    # All returned items should have types in ai_parse category
    ai_parse_types = ["parse_done", "parse_failed"]
    for item in body["items"]:
        assert item["type"] in ai_parse_types


def test_list_notifications_filter_read(client: TestClient) -> None:
    """Filters notifications by read status."""
    # Get only unread notifications
    response = client.get(
        "/api/me/notifications?read=false",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    for item in body["items"]:
        assert item["read"] is False

    # Get only read notifications
    response = client.get(
        "/api/me/notifications?read=true",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    for item in body["items"]:
        assert item["read"] is True


def test_list_notifications_pagination(client: TestClient) -> None:
    """Returns cursor and hasMore for pagination."""
    response = client.get(
        "/api/me/notifications?limit=2",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "cursor" in body
    assert "hasMore" in body
    assert len(body["items"]) <= 2


# ==============================================================================
# POST /api/me/notifications/{id}/read
# ==============================================================================


def test_mark_notification_read(client: TestClient) -> None:
    """Marks a single notification as read."""
    # First, get an unread notification
    response = client.get(
        "/api/me/notifications?read=false",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    if len(body["items"]) == 0:
        # Skip if no unread notifications
        return

    notification_id = body["items"][0]["id"]

    # Mark it as read
    response = client.post(
        f"/api/me/notifications/{notification_id}/read",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 204

    # Verify it's now read
    response = client.get(
        "/api/me/notifications?read=false",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    unread_ids = [item["id"] for item in body["items"]]
    assert notification_id not in unread_ids


def test_mark_notification_read_not_found(client: TestClient) -> None:
    """Returns 404 if notification not found."""
    response = client.post(
        "/api/me/notifications/non-existent-id/read",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


# ==============================================================================
# POST /api/me/notifications/read-all
# ==============================================================================


def test_mark_all_notifications_read(client: TestClient) -> None:
    """Marks all user's notifications as read."""
    response = client.post(
        "/api/me/notifications/read-all",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "count" in body

    # Verify all are now read
    response = client.get(
        "/api/me/notifications?read=false",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0


# ==============================================================================
# DELETE /api/me/notifications/{id}
# ==============================================================================


def test_delete_notification(client: TestClient) -> None:
    """Deletes a single notification."""
    # First, get a notification
    response = client.get(
        "/api/me/notifications",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    if len(body["items"]) == 0:
        # Skip if no notifications
        return

    notification_id = body["items"][0]["id"]
    total_before = body["total"]

    # Delete it
    response = client.delete(
        f"/api/me/notifications/{notification_id}",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 204

    # Verify it's gone
    response = client.get(
        "/api/me/notifications",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == total_before - 1
    ids = [item["id"] for item in body["items"]]
    assert notification_id not in ids


def test_delete_notification_not_found(client: TestClient) -> None:
    """Returns 404 if notification not found."""
    response = client.delete(
        "/api/me/notifications/non-existent-id",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 404


# ==============================================================================
# DELETE /api/me/notifications?scope=read
# ==============================================================================


def test_clear_read_notifications(client: TestClient) -> None:
    """Deletes all read notifications for user."""
    response = client.delete(
        "/api/me/notifications?scope=read",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "count" in body

    # Verify no read notifications remain
    response = client.get(
        "/api/me/notifications?read=true",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0


# ==============================================================================
# GET /api/me/notifications/unread-count
# ==============================================================================


def test_get_unread_count(client: TestClient) -> None:
    """Returns count of unread notifications."""
    response = client.get(
        "/api/me/notifications/unread-count",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "count" in body
    assert isinstance(body["count"], int)


# ==============================================================================
# Authorization & User Isolation
# ==============================================================================


def test_list_notifications_requires_auth(client: TestClient) -> None:
    """Request without auth header returns 401."""
    response = client.get("/api/me/notifications")
    assert response.status_code == 401


def test_user_isolation_notifications(client: TestClient) -> None:
    """User can only see their own notifications."""
    # Get user-a's notifications
    response_a = client.get(
        "/api/me/notifications",
        headers={"Authorization": "Bearer token-of-user-a"},
    )
    assert response_a.status_code == 200
    body_a = response_a.json()

    # Get user-b's notifications
    response_b = client.get(
        "/api/me/notifications",
        headers={"Authorization": "Bearer token-of-user-b"},
    )
    assert response_b.status_code == 200
    body_b = response_b.json()

    # Ensure they have different sets
    ids_a = {item["id"] for item in body_a["items"]}
    ids_b = {item["id"] for item in body_b["items"]}
    assert ids_a.isdisjoint(ids_b), "Users should not see each other's notifications"
