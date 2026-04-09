import importlib
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Optional, Union

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from .config import get_settings
from .models.request_models import ErrorBody, ErrorEnvelope, HealthResponse


class _FakeDb:
    def __init__(self) -> None:
        self.projects: list[dict[str, Any]] = []
        self.volumes: list[dict[str, Any]] = []
        self.chapters: list[dict[str, Any]] = []
        self.failpoints: set[str] = set()


def _reset_app_state() -> None:
    _reset_core_state()
    _reset_auth_state()
    _reset_export_state()
    _reset_kb_state()
    _reset_parser_state()
    _reset_editor_aux_state()


def _reset_core_state() -> None:
    app.state.fake_db = _FakeDb()
    app.state.archived_project_ids = set()
    app.state.state_counter = 0
    app.state.project_counter = 0


def _reset_auth_state() -> None:
    app.state.auth_users = {}
    app.state.email_index = {}
    app.state.sessions = {}
    app.state.session_counter = 0
    app.state.user_counter = 0
    app.state.verify_tokens = {}
    app.state.verify_token_first_seen = set()
    app.state.reset_tokens = {}


def _reset_export_state() -> None:
    app.state.export_templates = {}
    app.state.template_counter = 0
    app.state.export_tasks = {}
    app.state.export_files = {}
    app.state.backups = {}
    app.state.backup_files = {}
    app.state.backup_counter = 0
    app.state.kb_exports = {}


def _reset_kb_state() -> None:
    app.state.kb_items = {}
    app.state.kb_item_counter = 0
    app.state.kb_characters = {}
    app.state.kb_locations = {}
    app.state.kb_factions = {}
    app.state.kb_foreshadows = {}
    app.state.kb_settings = {}


def _reset_parser_state() -> None:
    app.state.parser_queue = []
    app.state.parser_tasks = {}
    app.state.parser_states = {}
    app.state.parser_jobs = {}
    app.state.parser_active_task_ids = []
    app.state.parser_task_history = []
    app.state.parser_task_counter = 0
    app.state.parser_job_counter = 0


def _reset_editor_aux_state() -> None:
    app.state.annotations = []
    app.state.annotation_counter = 0
    app.state.chapter_notes = {}
    app.state.timer_sessions = []
    app.state.timer_session_counter = 0


@asynccontextmanager
async def lifespan(fapp: FastAPI) -> AsyncGenerator[None, None]:
    if not hasattr(fapp.state, "email_index"):
        _reset_app_state()
    yield


settings = get_settings()

us21_parser_router = getattr(
    importlib.import_module("server.routes.us21_parser"), "router"
)
us22_character_router = getattr(
    importlib.import_module("server.routes.us22_character"), "router"
)
us23_location_router = getattr(
    importlib.import_module("server.routes.us23_location"), "router"
)
us14_settings_router = getattr(
    importlib.import_module("server.routes.us14_settings"), "router"
)
us15_outline_router = getattr(
    importlib.import_module("server.routes.us15_outline"), "router"
)
us16_goals_router = getattr(
    importlib.import_module("server.routes.us16_goals"), "router"
)
us17_trash_router = getattr(
    importlib.import_module("server.routes.us17_trash"), "router"
)
us18_archive_router = getattr(
    importlib.import_module("server.routes.us18_archive"), "router"
)
us24_item_router = getattr(importlib.import_module("server.routes.us24_item"), "router")
us25_faction_router = getattr(
    importlib.import_module("server.routes.us25_faction"), "router"
)
us26_foreshadow_router = getattr(
    importlib.import_module("server.routes.us26_foreshadow"), "router"
)
us31_editor_router = getattr(
    importlib.import_module("server.routes.us31_editor"), "router"
)
us33_writing_stats_router = getattr(
    importlib.import_module("server.routes.us33_writing_stats"), "router"
)
us36_snapshots_router = getattr(
    importlib.import_module("server.routes.us36_snapshots"), "router"
)
us37_annotations_router = getattr(
    importlib.import_module("server.routes.us37_annotations"), "router"
)
us38_chapter_notes_router = getattr(
    importlib.import_module("server.routes.us38_chapter_notes"), "router"
)
us39_timer_router = getattr(
    importlib.import_module("server.routes.us39_timer"), "router"
)
us51_export_router = getattr(
    importlib.import_module("server.routes.us51_export"), "router"
)
us52_backup_router = getattr(
    importlib.import_module("server.routes.us52_backup"), "router"
)
us53_templates_router = getattr(
    importlib.import_module("server.routes.us53_templates"), "router"
)
us54_kb_transfer_router = getattr(
    importlib.import_module("server.routes.us54_kb_transfer"), "router"
)
us55_restore_router = getattr(
    importlib.import_module("server.routes.us55_restore"), "router"
)
us66_notifications_router = getattr(
    importlib.import_module("server.routes.us66_notifications"), "router"
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

PROJECT_TAGS = {"玄幻", "都市", "科幻", "历史", "言情", "悬疑", "其他"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _now() -> datetime:
    clock = getattr(app.state, "session_clock", None)
    if clock is not None:
        return clock.now  # type: ignore[no-any-return]
    return datetime.now(timezone.utc)


def _iso_z(ts: datetime) -> str:
    return (
        ts.astimezone(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _error(
    status_code: int,
    code: str,
    message: str,
    details: Optional[dict[str, Any]] = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content=ErrorEnvelope(
            error=ErrorBody(
                code=code,
                message=message,
                details=details or {},
            )
        ).model_dump(),
    )


def _password_strong(password: str) -> bool:
    has_upper = any(ch.isupper() for ch in password)
    has_lower = any(ch.islower() for ch in password)
    has_digit = any(ch.isdigit() for ch in password)
    return len(password) >= 8 and has_upper and has_lower and has_digit


def _email_valid(email: str) -> bool:
    return EMAIL_RE.match(email) is not None


def _next_id(counter_key: str, prefix: str) -> str:
    current = getattr(app.state, counter_key, 0) + 1
    setattr(app.state, counter_key, current)
    return f"{prefix}-{current}"


def _ensure_user(
    email: str, password: str, auth_provider: str = "email"
) -> dict[str, Any]:
    existing_user_id = app.state.email_index.get(email)
    if existing_user_id is not None:
        return app.state.auth_users[existing_user_id]  # type: ignore[no-any-return]
    user_id = _next_id("user_counter", "user")
    now_iso = _iso_z(_now())
    user = {
        "id": user_id,
        "email": email,
        "nickname": email.split("@")[0],
        "authProvider": auth_provider,
        "emailVerified": False,
        "password": password,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    app.state.auth_users[user_id] = user
    app.state.email_index[email] = user_id
    return user


def _resolve_user_id(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ", 1)[1]
    return app.state.sessions.get(token)  # type: ignore[no-any-return]


def _require_user_id(authorization: Optional[str]) -> Union[str, JSONResponse]:
    user_id = _resolve_user_id(authorization)
    if user_id is None:
        return _error(401, "UNAUTHORIZED", "Authentication required")
    return user_id


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        name=settings.app_name,
        status="ok",
        version=settings.app_version,
    )


auth_router = getattr(
    importlib.import_module("server.routes.auth"), "router"
)
projects_router = getattr(
    importlib.import_module("server.routes.projects"), "router"
)
app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(us21_parser_router)
app.include_router(us22_character_router)
app.include_router(us23_location_router)
app.include_router(us14_settings_router)
app.include_router(us15_outline_router)
app.include_router(us16_goals_router)
app.include_router(us17_trash_router)
app.include_router(us18_archive_router)
app.include_router(us24_item_router)
app.include_router(us25_faction_router)
app.include_router(us26_foreshadow_router)
app.include_router(us31_editor_router)
app.include_router(us33_writing_stats_router)
app.include_router(us37_annotations_router)
app.include_router(us38_chapter_notes_router)
app.include_router(us39_timer_router)
app.include_router(us36_snapshots_router)
app.include_router(us66_notifications_router)
app.include_router(us51_export_router)
app.include_router(us52_backup_router)
app.include_router(us53_templates_router)
app.include_router(us54_kb_transfer_router)
app.include_router(us55_restore_router)


if os.getenv("TESTING") == "true":

    @app.post("/api/test/reset")
    def test_reset() -> dict[str, bool]:
        _reset_app_state()
        return {"ok": True}
