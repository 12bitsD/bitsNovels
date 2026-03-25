from collections.abc import Generator
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient

from server.main import app


@dataclass
class MailMessage:
    to: str
    template: str
    token: str
    expires_at: datetime


@dataclass
class MailOutbox:
    messages: list[Any] = field(default_factory=list)

    def send(self, message: Any) -> None:
        self.messages.append(message)


@dataclass
class OAuthCallbackPayload:
    provider: str
    email: str
    nickname: str
    provider_user_id: str


@dataclass
class OAuthProviderStub:
    scenario: str = "success"
    callback_payload: OAuthCallbackPayload = field(
        default_factory=lambda: OAuthCallbackPayload(
            provider="google",
            email="oauth@example.com",
            nickname="oauth-user",
            provider_user_id="provider-user-1",
        )
    )

    def start(self, provider: str) -> str:
        if self.scenario == "provider_error":
            raise RuntimeError("provider_error")
        return f"https://oauth.example.com/{provider}/authorize"

    def callback(self, provider: str, code: str, state: str) -> OAuthCallbackPayload:
        if self.scenario == "user_denied":
            raise PermissionError("user_denied")
        if self.scenario == "provider_error":
            raise RuntimeError("provider_error")
        return OAuthCallbackPayload(
            provider=provider,
            email=self.callback_payload.email,
            nickname=self.callback_payload.nickname,
            provider_user_id=self.callback_payload.provider_user_id,
        )


@dataclass
class SessionClock:
    now: datetime = field(
        default_factory=lambda: datetime(2026, 3, 26, tzinfo=timezone.utc)
    )

    def advance(self, delta: timedelta) -> None:
        self.now = self.now + delta


@dataclass
class FakeDB:
    users: list[dict[str, str]] = field(default_factory=list)
    projects: list[dict[str, str]] = field(default_factory=list)
    failpoints: set[str] = field(default_factory=set)

    def add_failpoint(self, name: str) -> None:
        self.failpoints.add(name)

    def clear_failpoints(self) -> None:
        self.failpoints.clear()


@pytest.fixture
def mail_outbox() -> MailOutbox:
    return MailOutbox()


@pytest.fixture
def oauth_provider_stub() -> OAuthProviderStub:
    return OAuthProviderStub()


@pytest.fixture
def session_clock() -> SessionClock:
    return SessionClock()


@pytest.fixture
def fake_db() -> FakeDB:
    return FakeDB(
        users=[
            {"id": "user-a", "email": "a@example.com"},
            {"id": "user-b", "email": "b@example.com"},
        ],
        projects=[
            {"id": "project-a-1", "ownerId": "user-a", "name": "A-1"},
            {"id": "project-a-2", "ownerId": "user-a", "name": "A-2"},
            {"id": "project-b-1", "ownerId": "user-b", "name": "B-1"},
        ],
    )


@pytest.fixture(autouse=True)
def app_state(
    fake_db: FakeDB,
    mail_outbox: MailOutbox,
    oauth_provider_stub: OAuthProviderStub,
    session_clock: SessionClock,
) -> None:
    app.state.fake_db = fake_db
    app.state.mail_outbox = mail_outbox
    app.state.oauth_provider_stub = oauth_provider_stub
    app.state.session_clock = session_clock
    app.state.auth_users = {
        "user-a": {
            "id": "user-a",
            "email": "a@example.com",
            "nickname": "a",
            "authProvider": "email",
            "emailVerified": False,
            "password": "StrongPass1",
            "createdAt": session_clock.now.isoformat().replace("+00:00", "Z"),
            "updatedAt": session_clock.now.isoformat().replace("+00:00", "Z"),
        },
        "user-b": {
            "id": "user-b",
            "email": "b@example.com",
            "nickname": "b",
            "authProvider": "email",
            "emailVerified": False,
            "password": "StrongPass1",
            "createdAt": session_clock.now.isoformat().replace("+00:00", "Z"),
            "updatedAt": session_clock.now.isoformat().replace("+00:00", "Z"),
        },
    }
    app.state.email_index = {
        "a@example.com": "user-a",
        "b@example.com": "user-b",
    }
    app.state.verify_tokens = {}
    app.state.verify_token_first_seen = set()
    app.state.reset_tokens = {
        "reset-token-valid": {
            "userId": "user-a",
            "expiresAt": session_clock.now + timedelta(hours=1),
            "used": False,
        }
    }
    app.state.sessions = {"token-of-user-a": "user-a", "token-of-user-b": "user-b"}
    app.state.archived_project_ids = set()
    app.state.state_counter = 0
    app.state.session_counter = 0
    app.state.project_counter = 100
    app.state.user_counter = 100


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
