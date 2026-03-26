import os
import re
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Literal, Optional, Union

from fastapi import Body, FastAPI, Header
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from server.config import get_settings


class _FakeDb:
    def __init__(self) -> None:
        self.projects: list[dict[str, Any]] = []
        self.failpoints: set[str] = set()


def _reset_app_state() -> None:
    app.state.fake_db = _FakeDb()
    app.state.auth_users: dict[str, Any] = {}
    app.state.email_index: dict[str, str] = {}
    app.state.sessions: dict[str, str] = {}
    app.state.verify_tokens: dict[str, Any] = {}
    app.state.verify_token_first_seen: set[str] = set()
    app.state.reset_tokens: dict[str, Any] = {}
    app.state.archived_project_ids: set[str] = set()
    app.state.state_counter = 0
    app.state.session_counter = 0
    app.state.project_counter = 0
    app.state.user_counter = 0


@asynccontextmanager
async def lifespan(fapp: FastAPI):  # type: ignore[type-arg]
    if not hasattr(fapp.state, "email_index"):
        _reset_app_state()
    yield


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)


class HealthResponse(BaseModel):
    name: str
    status: str
    version: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any]


class ErrorEnvelope(BaseModel):
    error: ErrorBody


class RegisterRequest(BaseModel):
    email: str
    password: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str
    rememberMe: bool = False


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str


class CreateProjectRequest(BaseModel):
    name: str
    type: Literal["novel", "medium", "short"]
    tags: list[str]
    description: Optional[str] = None
    structureMode: Optional[str] = None
    templateId: Optional[str] = None
    kbImport: Optional[dict[str, Any]] = None


class DeleteProjectRequest(BaseModel):
    confirmationName: str


ALLOWED_PROVIDERS = {"google", "github"}
PROJECT_TAGS = {"玄幻", "都市", "科幻", "历史", "言情", "悬疑", "其他"}
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _now() -> datetime:
    clock = getattr(app.state, "session_clock", None)
    if clock is not None:
        return clock.now  # type: ignore[no-any-return]
    return datetime.now(timezone.utc)


def _iso_z(ts: datetime) -> str:
    return ts.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


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


def _ensure_user(email: str, password: str, auth_provider: str = "email") -> dict[str, Any]:
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


def _project_response_item(project: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": project["id"],
        "name": project["name"],
        "coverColor": project.get("coverColor", "#5B8FF9"),
        "type": project.get("type", "novel"),
        "totalChars": project.get("totalChars", 0),
        "chapterCount": project.get("chapterCount", 0),
        "lastEditedChapterId": project.get("lastEditedChapterId"),
        "status": project.get("status", "active"),
        "updatedAt": project.get("updatedAt", _iso_z(_now())),
        "createdAt": project.get("createdAt", _iso_z(_now())),
    }


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        name=settings.app_name,
        status="ok",
        version=settings.app_version,
    )


@app.post("/api/auth/register")
def register(payload: RegisterRequest) -> JSONResponse:
    email = payload.email.lower()
    if not _email_valid(email):
        return _error(400, "EMAIL_INVALID", "Email format is invalid")
    if not _password_strong(payload.password):
        return _error(400, "PASSWORD_WEAK", "Password does not meet complexity requirements")
    if email in app.state.email_index:
        return _error(409, "EMAIL_DUPLICATED", "Email already exists")
    user = _ensure_user(email=email, password=payload.password)
    verify_token = "verify-token-valid"
    app.state.verify_tokens[verify_token] = {
        "userId": user["id"],
        "expiresAt": _now() + timedelta(hours=24),
        "used": False,
    }
    mail_outbox = getattr(app.state, "mail_outbox", None)
    if mail_outbox is not None:
        mail_outbox.send(
            {
                "to": email,
                "template": "verify_email",
                "token": verify_token,
                "expires_at": _now() + timedelta(hours=24),
            }
        )
    return JSONResponse(
        status_code=201,
        content={
            "ok": True,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "emailVerified": user["emailVerified"],
            },
            "verificationSent": True,
        },
    )


@app.post("/api/auth/verify-email")
def verify_email(payload: VerifyEmailRequest) -> JSONResponse:
    token_data = app.state.verify_tokens.get(payload.token)
    if token_data is None:
        if payload.token not in app.state.verify_token_first_seen:
            app.state.verify_token_first_seen.add(payload.token)
            return _error(410, "VERIFY_TOKEN_EXPIRED", "Verification token expired")
        return _error(409, "VERIFY_TOKEN_USED", "Verification token already used")
    if token_data["used"]:
        return _error(409, "VERIFY_TOKEN_USED", "Verification token already used")
    if token_data["expiresAt"] <= _now():
        token_data["used"] = True
        return _error(410, "VERIFY_TOKEN_EXPIRED", "Verification token expired")
    user = app.state.auth_users[token_data["userId"]]
    user["emailVerified"] = True
    user["updatedAt"] = _iso_z(_now())
    token_data["used"] = True
    return JSONResponse(
        status_code=200,
        content={
            "ok": True,
            "user": {
                "id": user["id"],
                "email": user["email"],
                "emailVerified": True,
            },
        },
    )


@app.post("/api/auth/resend-verification")
def resend_verification(payload: ResendVerificationRequest) -> dict[str, Any]:
    now = _now()
    email = payload.email.lower() if payload.email else None
    if email:
        user_id = app.state.email_index.get(email)
        if user_id is not None:
            verify_token = "verify-token-valid"
            app.state.verify_tokens[verify_token] = {
                "userId": user_id,
                "expiresAt": now + timedelta(hours=24),
                "used": False,
            }
            mail_outbox = getattr(app.state, "mail_outbox", None)
            if mail_outbox is not None:
                mail_outbox.send(
                    {
                        "to": email,
                        "template": "verify_email",
                        "token": verify_token,
                        "expires_at": now + timedelta(hours=24),
                    }
                )
    return {"ok": True, "resentAt": _iso_z(now)}


@app.post("/api/auth/login")
def login(payload: LoginRequest) -> JSONResponse:
    email = payload.email.lower()
    if not _email_valid(email):
        return _error(400, "EMAIL_INVALID", "Email format is invalid")
    existing_user_id = app.state.email_index.get(email)
    if existing_user_id is not None:
        user = app.state.auth_users[existing_user_id]
        if user["password"] != payload.password:
            return _error(401, "INVALID_CREDENTIALS", "Invalid email or password")
    else:
        user = _ensure_user(email=email, password=payload.password)
    ttl = timedelta(days=30 if payload.rememberMe else 1)
    expires_at = _now() + ttl
    session_token = _next_id("session_counter", "session")
    app.state.sessions[session_token] = user["id"]
    user_payload = {
        "id": user["id"],
        "email": user["email"],
        "nickname": user["nickname"],
        "authProvider": user["authProvider"],
        "emailVerified": user["emailVerified"],
        "createdAt": user["createdAt"],
        "updatedAt": user["updatedAt"],
    }
    return JSONResponse(
        status_code=200,
        content={
            "token": session_token,
            "user": user_payload,
            "expiresAt": _iso_z(expires_at),
            "emailVerified": user["emailVerified"],
        },
    )


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(default=None, alias="Authorization")) -> JSONResponse:
    if authorization is None or not authorization.startswith("Bearer "):
        return _error(401, "UNAUTHORIZED", "Authentication required")
    token = authorization.split(" ", 1)[1]
    app.state.sessions.pop(token, None)
    return JSONResponse(status_code=200, content={"ok": True})


@app.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict[str, bool]:
    email = payload.email.lower()
    if not _email_valid(email):
        return {"ok": True}
    user_id = app.state.email_index.get(email)
    if user_id is not None:
        now = _now()
        app.state.reset_tokens["reset-token-valid"] = {
            "userId": user_id,
            "expiresAt": now + timedelta(hours=1),
            "used": False,
        }
        mail_outbox = getattr(app.state, "mail_outbox", None)
        if mail_outbox is not None:
            mail_outbox.send(
                {
                    "to": email,
                    "template": "reset_password",
                    "token": "reset-token-valid",
                    "expires_at": now + timedelta(hours=1),
                }
            )
    return {"ok": True}


@app.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest) -> JSONResponse:
    if not _password_strong(payload.newPassword):
        return _error(400, "PASSWORD_WEAK", "Password does not meet complexity requirements")
    token_data = app.state.reset_tokens.get(payload.token)
    if token_data is None:
        return _error(410, "RESET_TOKEN_EXPIRED", "Reset token expired")
    if token_data["used"]:
        return _error(409, "RESET_TOKEN_USED", "Reset token already used")
    if token_data["expiresAt"] <= _now():
        token_data["used"] = True
        return _error(410, "RESET_TOKEN_EXPIRED", "Reset token expired")
    user = app.state.auth_users[token_data["userId"]]
    user["password"] = payload.newPassword
    user["updatedAt"] = _iso_z(_now())
    token_data["used"] = True
    user_id = user["id"]
    app.state.sessions = {
        token: uid for token, uid in app.state.sessions.items() if uid != user_id
    }
    return JSONResponse(status_code=200, content={"ok": True})


@app.get("/api/auth/oauth/{provider}/start")
def oauth_start(provider: str) -> Any:
    if provider not in ALLOWED_PROVIDERS:
        return _error(400, "OAUTH_PROVIDER_UNSUPPORTED", "Unsupported oauth provider")
    app.state.state_counter = getattr(app.state, "state_counter", 0) + 1
    state = f"state-{app.state.state_counter}"
    oauth_stub = getattr(app.state, "oauth_provider_stub", None)
    if oauth_stub is None:
        redirect_to = f"https://oauth.example.com/{provider}/authorize?state={state}"
    else:
        redirect_to = f"{oauth_stub.start(provider)}?state={state}"
    return RedirectResponse(url=redirect_to, status_code=302)


@app.get("/api/auth/oauth/{provider}/callback")
def oauth_callback(provider: str, code: str, state: str) -> Any:
    if provider not in ALLOWED_PROVIDERS:
        return _error(400, "OAUTH_PROVIDER_UNSUPPORTED", "Unsupported oauth provider")
    oauth_stub = getattr(app.state, "oauth_provider_stub", None)
    if oauth_stub is None:
        payload = {"email": "oauth@example.com", "nickname": "oauth-user"}
    else:
        callback_payload = oauth_stub.callback(provider=provider, code=code, state=state)
        payload = {
            "email": callback_payload.email.lower(),
            "nickname": callback_payload.nickname,
        }
    existing_user_id = app.state.email_index.get(payload["email"])
    if existing_user_id is None:
        user = _ensure_user(email=payload["email"], password="OAuthPass1", auth_provider=provider)
    else:
        user = app.state.auth_users[existing_user_id]
        user["authProvider"] = provider
        user["updatedAt"] = _iso_z(_now())
    session_token = _next_id("session_counter", "session")
    app.state.sessions[session_token] = user["id"]
    return RedirectResponse(
        url=f"https://bitsnovels.app/auth/callback?ok=1&token={session_token}",
        status_code=302,
    )


@app.get("/api/projects")
def list_projects(
    page: int = 1,
    limit: int = 20,
    sort: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    projects = [p for p in app.state.fake_db.projects if p["ownerId"] == user_id]
    if type is not None:
        projects = [p for p in projects if p.get("type", "novel") == type]
    if status is not None:
        projects = [p for p in projects if p.get("status", "active") == status]
    if search:
        projects = [p for p in projects if search in p.get("name", "")]
    if sort in {"updatedAt", "createdAt", "name", "totalChars"}:
        projects = sorted(
            projects,
            key=lambda p: p.get(sort, p.get("name", "")),
            reverse=sort != "name",
        )
    items = [_project_response_item(p) for p in projects]
    start = max(page - 1, 0) * limit
    end = start + limit
    data = items[start:end]
    return JSONResponse(
        status_code=200,
        content={
            "items": data,
            "data": data,
            "total": len(items),
            "page": page,
            "limit": limit,
        },
    )


@app.get("/api/projects/{project_id}")
def get_project(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    project = next((p for p in app.state.fake_db.projects if p["id"] == project_id), None)
    if project is None:
        return _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return _error(403, "FORBIDDEN", "No permission for this project")
    return JSONResponse(
        status_code=200,
        content={
            "project": _project_response_item(project),
            "lastEditedChapterId": project.get("lastEditedChapterId"),
            "permissions": {"read": True, "write": project_id not in app.state.archived_project_ids},
        },
    )


@app.post("/api/projects/{project_id}/archive")
def archive_project(
    project_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    project = next((p for p in app.state.fake_db.projects if p["id"] == project_id), None)
    if project is None:
        return _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return _error(403, "FORBIDDEN", "No permission for this project")
    project["status"] = "archived"
    project["archivedAt"] = _iso_z(_now())
    app.state.archived_project_ids.add(project_id)
    return JSONResponse(status_code=200, content={"ok": True, "status": "archived"})


@app.patch("/api/projects/{project_id}")
def patch_project(
    project_id: str,
    payload: dict[str, Any],
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    project = next((p for p in app.state.fake_db.projects if p["id"] == project_id), None)
    if project is None:
        return _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return _error(403, "FORBIDDEN", "No permission for this project")
    if project_id in app.state.archived_project_ids:
        return _error(409, "PROJECT_ARCHIVED_READ_ONLY", "Project is archived")
    if "name" in payload:
        project["name"] = str(payload["name"]).strip()
        project["updatedAt"] = _iso_z(_now())
    return JSONResponse(status_code=200, content={"ok": True, "project": _project_response_item(project)})


@app.delete("/api/projects/{project_id}")
def delete_project(
    project_id: str,
    payload: DeleteProjectRequest = Body(...),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    project = next((p for p in app.state.fake_db.projects if p["id"] == project_id), None)
    if project is None:
        return _error(404, "PROJECT_NOT_FOUND", "Project not found")
    if project["ownerId"] != user_id:
        return _error(403, "FORBIDDEN", "No permission for this project")
    if payload.confirmationName != project.get("name"):
        return _error(400, "PROJECT_NAME_CONFIRMATION_MISMATCH", "Project confirmation name mismatch")
    app.state.fake_db.projects = [
        p for p in app.state.fake_db.projects if p["id"] != project_id
    ]
    app.state.archived_project_ids.discard(project_id)
    return JSONResponse(status_code=200, content={"ok": True})


@app.post("/api/projects")
def create_project(
    payload: CreateProjectRequest,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id
    name = payload.name.strip()
    if len(name) < 1 or len(name) > 50:
        return _error(400, "PROJECT_NAME_INVALID", "Project name is invalid")
    if len(payload.tags) > 5 or any(tag not in PROJECT_TAGS for tag in payload.tags):
        return _error(400, "PROJECT_TAGS_INVALID", "Project tags are invalid")
    if payload.description is not None and len(payload.description) > 500:
        return _error(400, "PROJECT_DESCRIPTION_TOO_LONG", "Project description is too long")
    duplicated = any(
        p["ownerId"] == user_id and p.get("name", "").strip() == name
        for p in app.state.fake_db.projects
    )
    if duplicated:
        return _error(409, "PROJECT_NAME_DUPLICATED", "Project name already exists")
    if "create_project_after_insert_before_outline" in app.state.fake_db.failpoints:
        return _error(500, "PROJECT_CREATE_FAILED", "Project create failed")
    project_id = _next_id("project_counter", "project")
    now_iso = _iso_z(_now())
    project = {
        "id": project_id,
        "ownerId": user_id,
        "name": name,
        "type": payload.type,
        "tags": payload.tags,
        "description": payload.description,
        "status": "active",
        "coverColor": "#5B8FF9",
        "totalChars": 0,
        "chapterCount": 0,
        "lastEditedChapterId": "chapter-1",
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    app.state.fake_db.projects.append(project)
    return JSONResponse(
        status_code=201,
        content={
            "projectId": project_id,
            "defaultVolumeId": "volume-1",
            "firstChapterId": "chapter-1",
            "importedEntryCount": 0,
        },
    )


if os.getenv("TESTING") == "true":

    @app.post("/api/test/reset")
    def test_reset() -> dict[str, bool]:
        _reset_app_state()
        return {"ok": True}
