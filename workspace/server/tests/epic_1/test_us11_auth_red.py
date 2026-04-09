from datetime import timedelta
from typing import Any

from fastapi.testclient import TestClient


def test_register_reject_invalid_email_red(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "invalid-email", "password": "StrongPass1"},
    )
    assert response.status_code == 400


def test_register_reject_weak_password_red(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"email": "writer@example.com", "password": "weakpass"},
    )
    assert response.status_code == 400


def test_register_reject_duplicate_email_red(client: TestClient) -> None:
    payload = {"email": "dup@example.com", "password": "StrongPass1"}
    first = client.post("/api/auth/register", json=payload)
    second = client.post("/api/auth/register", json=payload)

    assert first.status_code in {200, 201}
    assert second.status_code == 409


def test_verify_email_token_expired_or_reused_red(
    client: TestClient, session_clock: Any
) -> None:
    token = "verify-token-1"
    session_clock.advance(timedelta(hours=25))

    expired = client.post("/api/auth/verify-email", json={"token": token})
    reused = client.post("/api/auth/verify-email", json={"token": token})

    assert expired.status_code == 410
    assert reused.status_code in {400, 409}


def test_login_session_ttl_by_remember_me_red(client: TestClient) -> None:
    response_short = client.post(
        "/api/auth/login",
        json={
            "email": "writer@example.com",
            "password": "StrongPass1",
            "rememberMe": False,
        },
    )
    response_long = client.post(
        "/api/auth/login",
        json={
            "email": "writer@example.com",
            "password": "StrongPass1",
            "rememberMe": True,
        },
    )

    assert response_short.status_code == 200
    assert response_long.status_code == 200
    assert response_short.json()["expiresAt"] != response_long.json()["expiresAt"]


def test_oauth_start_only_google_github_red(client: TestClient) -> None:
    unsupported = client.get("/api/auth/oauth/twitter/start")
    google = client.get("/api/auth/oauth/google/start", follow_redirects=False)
    github = client.get("/api/auth/oauth/github/start", follow_redirects=False)

    assert unsupported.status_code == 400
    assert google.status_code == 302
    assert github.status_code == 302


def test_oauth_callback_create_or_bind_user_red(client: TestClient) -> None:
    response = client.get(
        "/api/auth/oauth/google/callback?code=code-1&state=state-1",
        follow_redirects=False,
    )
    assert response.status_code == 302


def test_register_success_and_verify_email_red(
    client: TestClient, mail_outbox: Any
) -> None:
    register = client.post(
        "/api/auth/register",
        json={"email": "verifyme@example.com", "password": "StrongPass1"},
    )
    assert register.status_code in {200, 201}

    sent_token = mail_outbox.messages[-1]["token"]
    verify = client.post("/api/auth/verify-email", json={"token": sent_token})

    assert verify.status_code == 200
    assert verify.json()["user"]["emailVerified"] is True


def test_resend_verification_with_email_red(client: TestClient) -> None:
    response = client.post(
        "/api/auth/resend-verification",
        json={"email": "writer@example.com"},
    )

    assert response.status_code == 200
    assert response.json()["ok"] is True
    assert response.json()["resentAt"]


def test_logout_invalidates_session_red(client: TestClient) -> None:
    login = client.post(
        "/api/auth/login",
        json={
            "email": "writer@example.com",
            "password": "StrongPass1",
            "rememberMe": False,
        },
    )
    token = login.json()["token"]
    logout = client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert login.status_code == 200
    assert logout.status_code == 200
    assert logout.json()["ok"] is True


def test_forgot_password_always_ok_red(client: TestClient) -> None:
    existing = client.post(
        "/api/auth/forgot-password",
        json={"email": "writer@example.com"},
    )
    not_exists = client.post(
        "/api/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )

    assert existing.status_code == 200
    assert not_exists.status_code == 200
    assert existing.json() == not_exists.json()


def test_reset_password_token_lifecycle_red(client: TestClient) -> None:
    success = client.post(
        "/api/auth/reset-password",
        json={"token": "reset-token-valid", "newPassword": "StrongerPass2"},
    )
    reused = client.post(
        "/api/auth/reset-password",
        json={"token": "reset-token-valid", "newPassword": "StrongerPass2"},
    )

    assert success.status_code == 200
    assert reused.status_code in {400, 409, 410}


def test_mail_fixture_records_verification_and_reset_token_ttl(
    mail_outbox: Any, session_clock: Any
) -> None:
    now_plus_24h = session_clock.now + timedelta(hours=24)
    now_plus_1h = session_clock.now + timedelta(hours=1)

    mail_outbox.send(
        {
            "to": "writer@example.com",
            "template": "verify_email",
            "token": "verify-token",
            "expires_at": now_plus_24h,
        }
    )
    mail_outbox.send(
        {
            "to": "writer@example.com",
            "template": "reset_password",
            "token": "reset-token",
            "expires_at": now_plus_1h,
        }
    )

    assert len(mail_outbox.messages) == 2
    assert mail_outbox.messages[0]["template"] == "verify_email"
    assert mail_outbox.messages[1]["template"] == "reset_password"
    assert mail_outbox.messages[0]["expires_at"] > mail_outbox.messages[1]["expires_at"]
