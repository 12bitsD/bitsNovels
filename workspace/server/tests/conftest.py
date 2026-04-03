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
    volumes: list[dict[str, Any]] = field(default_factory=list)
    chapters: list[dict[str, Any]] = field(default_factory=list)
    goals: dict[str, dict[str, Any]] = field(default_factory=dict)
    writing_stats: dict[str, list[dict[str, Any]]] = field(default_factory=dict)
    trash_items: list[dict[str, Any]] = field(default_factory=list)
    failpoints: set[str] = field(default_factory=set)
    # Sprint 3 fixtures: chapter_contents, notifications, snapshots
    chapter_contents: dict[str, dict[str, Any]] = field(default_factory=dict)
    notifications: list[dict[str, Any]] = field(default_factory=list)
    snapshots: list[dict[str, Any]] = field(default_factory=list)
    notification_counter: int = 0
    snapshot_counter: int = 0

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
    # Sprint 2 fixtures: volumes, chapters, goals, writing_stats, trash_items
    app.state.volumes = []
    app.state.chapters = []
    app.state.goals = {}
    app.state.writing_stats = {}
    app.state.trash_items = []
    app.state.volume_counter = 0
    app.state.chapter_counter = 0
    # Sprint 3 fixtures: chapter_contents, notifications, snapshots
    app.state.chapter_contents = {}
    app.state.notifications = []
    app.state.notification_counter = 0
    app.state.snapshots = []
    app.state.snapshot_counter = 0
    # Sprint 5 fixtures: export_templates
    app.state.export_templates = {}
    app.state.template_counter = 0
    # Sprint 5 fixtures: kb_exports
    app.state.kb_exports = {}
    app.state.kb_export_counter = 0
    app.state.kb_import_counter = 0
    # Sprint 5 fixtures: kb_items
    app.state.kb_items = {}
    app.state.kb_item_counter = 0
    # Sprint 5 fixtures: kb entity stores
    app.state.kb_characters = {}
    app.state.kb_locations = {}
    app.state.kb_factions = {}
    app.state.kb_foreshadows = {}
    app.state.kb_settings = {}
    # Sprint 5 fixtures: export_tasks, export_files
    app.state.export_tasks = {}
    app.state.export_files = {}
    app.state.export_task_counter = 0
    # Sprint 5 fixtures: backups
    app.state.backups = {}
    app.state.backup_files = {}
    app.state.backup_counter = 0
    # Default data for user-a project-a-1: one volume with one chapter
    now_iso = session_clock.now.isoformat().replace("+00:00", "Z")
    fake_db.volumes = [
        {
            "id": "volume-a-1",
            "projectId": "project-a-1",
            "name": "第一卷",
            "description": "",
            "order": 0,
            "ownerId": "user-a",
        }
    ]
    fake_db.chapters = [
        {
            "id": "chapter-a-1",
            "projectId": "project-a-1",
            "volumeId": "volume-a-1",
            "title": "第一章",
            "order": 0,
            "chars": 5000,
            "lastEditedAt": now_iso,
            "parserStatus": "parsed",
        }
    ]
    fake_db.goals = {
        "project-a-1": {
            "dailyWordTarget": 3000,
            "totalWordTarget": 500000,
            "deadline": "2026-12-31",
        }
    }
    # Writing stats for project-a-1: last 2 days
    fake_db.writing_stats = {
        "project-a-1": [
            {"date": "2026-03-25", "writtenChars": 3500},
            {"date": "2026-03-26", "writtenChars": 2800},
        ]
    }
    fake_db.trash_items = []
    now_iso = session_clock.now.isoformat().replace("+00:00", "Z")
    fake_db.notifications = [
        {
            "id": "notif-a-1",
            "userId": "user-a",
            "type": "parse_done",
            "title": "解析完成",
            "body": "《A-1》知识库解析已完成",
            "projectId": "project-a-1",
            "read": False,
            "createdAt": now_iso,
            "actionTarget": {"kind": "project_settings", "projectId": "project-a-1"},
        },
        {
            "id": "notif-a-2",
            "userId": "user-a",
            "type": "backup_done",
            "title": "备份完成",
            "body": "自动备份已完成",
            "read": True,
            "createdAt": now_iso,
            "actionTarget": {"kind": "download"},
        },
        {
            "id": "notif-a-3",
            "userId": "user-a",
            "type": "storage_warning",
            "title": "存储空间警告",
            "body": "存储使用率超过80%",
            "read": False,
            "createdAt": now_iso,
            "actionTarget": {"kind": "storage_settings"},
        },
        {
            "id": "notif-b-1",
            "userId": "user-b",
            "type": "parse_failed",
            "title": "解析失败",
            "body": "《B-1》知识库解析失败",
            "projectId": "project-b-1",
            "read": False,
            "createdAt": now_iso,
            "actionTarget": {"kind": "project_settings", "projectId": "project-b-1"},
        },
    ]
    fake_db.notification_counter = 4


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
