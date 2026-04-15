import secrets
from datetime import datetime, timedelta
from typing import Any, Optional, Protocol, cast

from fastapi import APIRouter, Header, Response
from fastapi.responses import JSONResponse, RedirectResponse

from server.models.request_models import (
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)

router = APIRouter(tags=["auth"])

ALLOWED_PROVIDERS = {"google", "github"}


class _MainModule(Protocol):
    app: Any

    def _email_valid(self, email: str) -> bool: ...
    def _password_strong(self, password: str) -> bool: ...
    def _ensure_user(
        self,
        email: str,
        password: str,
        auth_provider: str = "email",
        *,
        email_verified: bool = False,
    ) -> dict[str, Any]: ...
    def _now(self) -> datetime: ...
    def _iso_z(self, ts: datetime) -> str: ...
    def _error(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[dict[str, Any]] = None,
    ) -> JSONResponse: ...
    def _verify_password(self, user: dict[str, Any], candidate_password: str) -> bool: ...
    def _create_session(self, user_id: str, ttl: timedelta) -> tuple[str, datetime]: ...
    def _user_payload(self, user: dict[str, Any]) -> dict[str, Any]: ...
    def _resolve_user_id(self, authorization: Optional[str]) -> Optional[str]: ...
    def _hash_password(self, password: str) -> str: ...
    def _session_user_id(self, session: Any) -> Optional[str]: ...


def _m() -> _MainModule:
    from server import main as _main

    return cast(_MainModule, _main)


@router.post("/api/auth/register")
def register(payload: RegisterRequest) -> JSONResponse:
    m = _m()
    email = payload.email.lower()
    if not m._email_valid(email):
        return m._error(400, "EMAIL_INVALID", "Email format is invalid")
    if not m._password_strong(payload.password):
        return m._error(
            400, "PASSWORD_WEAK", "Password does not meet complexity requirements"
        )
    if email in m.app.state.email_index:
        return m._error(409, "EMAIL_DUPLICATED", "Email already exists")
    user = m._ensure_user(email=email, password=payload.password)
    verify_token = secrets.token_urlsafe(32)
    m.app.state.verify_tokens[verify_token] = {
        "userId": user["id"],
        "expiresAt": m._now() + timedelta(hours=24),
        "used": False,
    }
    mail_outbox = getattr(m.app.state, "mail_outbox", None)
    if mail_outbox is not None:
        mail_outbox.send(
            {
                "to": email,
                "template": "verify_email",
                "token": verify_token,
                "expires_at": m._now() + timedelta(hours=24),
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


@router.post("/api/auth/verify-email")
def verify_email(payload: VerifyEmailRequest) -> JSONResponse:
    m = _m()
    token_data = m.app.state.verify_tokens.get(payload.token)
    if token_data is None:
        if payload.token not in m.app.state.verify_token_first_seen:
            m.app.state.verify_token_first_seen.add(payload.token)
            return m._error(410, "VERIFY_TOKEN_EXPIRED", "Verification token expired")
        return m._error(409, "VERIFY_TOKEN_USED", "Verification token already used")
    if token_data["used"]:
        return m._error(409, "VERIFY_TOKEN_USED", "Verification token already used")
    if token_data["expiresAt"] <= m._now():
        token_data["used"] = True
        return m._error(410, "VERIFY_TOKEN_EXPIRED", "Verification token expired")
    user = m.app.state.auth_users[token_data["userId"]]
    user["emailVerified"] = True
    user["updatedAt"] = m._iso_z(m._now())
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


@router.post("/api/auth/resend-verification")
def resend_verification(payload: ResendVerificationRequest) -> dict[str, Any]:
    m = _m()
    now = m._now()
    email = payload.email.lower() if payload.email else None
    if email:
        user_id = m.app.state.email_index.get(email)
        if user_id is not None:
            verify_token = secrets.token_urlsafe(32)
            m.app.state.verify_tokens[verify_token] = {
                "userId": user_id,
                "expiresAt": now + timedelta(hours=24),
                "used": False,
            }
            mail_outbox = getattr(m.app.state, "mail_outbox", None)
            if mail_outbox is not None:
                mail_outbox.send(
                    {
                        "to": email,
                        "template": "verify_email",
                        "token": verify_token,
                        "expires_at": now + timedelta(hours=24),
                    }
                )
    return {"ok": True, "resentAt": m._iso_z(now)}


@router.post("/api/auth/login")
def login(payload: LoginRequest) -> JSONResponse:
    m = _m()
    email = payload.email.lower()
    if not m._email_valid(email):
        return m._error(400, "EMAIL_INVALID", "Email format is invalid")
    existing_user_id = m.app.state.email_index.get(email)
    if existing_user_id is None:
        return m._error(401, "INVALID_CREDENTIALS", "Invalid email or password")

    user = m.app.state.auth_users[existing_user_id]
    if not m._verify_password(user, payload.password):
        return m._error(401, "INVALID_CREDENTIALS", "Invalid email or password")

    ttl = timedelta(days=30 if payload.rememberMe else 1)
    session_token, expires_at = m._create_session(user["id"], ttl)
    return JSONResponse(
        status_code=200,
        content={
            "token": session_token,
            "user": m._user_payload(user),
            "expiresAt": m._iso_z(expires_at),
            "emailVerified": user["emailVerified"],
        },
    )


@router.get("/api/auth/me")
def get_me(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    m = _m()
    user_id = m._resolve_user_id(authorization)
    if user_id is None:
        return m._error(401, "UNAUTHORIZED", "Authentication required")

    user = m.app.state.auth_users.get(user_id)
    if user is None:
        return m._error(401, "UNAUTHORIZED", "Authentication required")

    return JSONResponse(
        status_code=200,
        content={
            "user": m._user_payload(user),
            "isVerified": user["emailVerified"],
            "is_verified": user["emailVerified"],
        },
    )


@router.post("/api/auth/logout")
def logout(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    m = _m()
    if authorization is None or not authorization.startswith("Bearer "):
        return m._error(401, "UNAUTHORIZED", "Authentication required")
    token = authorization.split(" ", 1)[1]
    m.app.state.sessions.pop(token, None)
    return JSONResponse(status_code=200, content={"ok": True})


@router.post("/api/auth/forgot-password")
def forgot_password(payload: ForgotPasswordRequest) -> dict[str, bool]:
    m = _m()
    email = payload.email.lower()
    if not m._email_valid(email):
        return {"ok": True}
    user_id = m.app.state.email_index.get(email)
    if user_id is not None:
        now = m._now()
        reset_token = secrets.token_urlsafe(32)
        m.app.state.reset_tokens[reset_token] = {
            "userId": user_id,
            "expiresAt": now + timedelta(hours=1),
            "used": False,
        }
        mail_outbox = getattr(m.app.state, "mail_outbox", None)
        if mail_outbox is not None:
            mail_outbox.send(
                {
                    "to": email,
                    "template": "reset_password",
                    "token": reset_token,
                    "expires_at": now + timedelta(hours=1),
                }
            )
    return {"ok": True}


@router.post("/api/auth/reset-password")
def reset_password(payload: ResetPasswordRequest) -> JSONResponse:
    m = _m()
    if not m._password_strong(payload.newPassword):
        return m._error(
            400, "PASSWORD_WEAK", "Password does not meet complexity requirements"
        )
    token_data = m.app.state.reset_tokens.get(payload.token)
    if token_data is None:
        return m._error(410, "RESET_TOKEN_EXPIRED", "Reset token expired")
    if token_data["used"]:
        return m._error(409, "RESET_TOKEN_USED", "Reset token already used")
    if token_data["expiresAt"] <= m._now():
        token_data["used"] = True
        return m._error(410, "RESET_TOKEN_EXPIRED", "Reset token expired")
    user = m.app.state.auth_users[token_data["userId"]]
    user["password"] = m._hash_password(payload.newPassword)
    user["updatedAt"] = m._iso_z(m._now())
    token_data["used"] = True
    user_id = user["id"]
    m.app.state.sessions = {
        token: session
        for token, session in m.app.state.sessions.items()
        if m._session_user_id(session) != user_id
    }
    return JSONResponse(status_code=200, content={"ok": True})


@router.get("/api/auth/oauth/{provider}/start")
def oauth_start(provider: str) -> Response:
    m = _m()
    if provider not in ALLOWED_PROVIDERS:
        return m._error(400, "OAUTH_PROVIDER_UNSUPPORTED", "Unsupported oauth provider")
    state = secrets.token_urlsafe(24)
    m.app.state.oauth_states[state] = {
        "provider": provider,
        "expiresAt": m._now() + timedelta(minutes=10),
    }
    oauth_stub = getattr(m.app.state, "oauth_provider_stub", None)
    try:
        if oauth_stub is None:
            redirect_to = f"https://oauth.example.com/{provider}/authorize?state={state}"
        else:
            redirect_to = f"{oauth_stub.start(provider)}?state={state}"
    except RuntimeError:
        return m._error(502, "OAUTH_PROVIDER_ERROR", "OAuth provider unavailable")
    return RedirectResponse(url=redirect_to, status_code=302)


@router.get("/api/auth/oauth/{provider}/callback")
def oauth_callback(provider: str, code: str, state: str) -> Response:
    m = _m()
    if provider not in ALLOWED_PROVIDERS:
        return m._error(400, "OAUTH_PROVIDER_UNSUPPORTED", "Unsupported oauth provider")

    state_record = m.app.state.oauth_states.pop(state, None)
    expires_at = state_record.get("expiresAt") if isinstance(state_record, dict) else None
    if (
        state_record is None
        or state_record.get("provider") != provider
        or not isinstance(expires_at, datetime)
        or expires_at <= m._now()
    ):
        return m._error(400, "OAUTH_STATE_INVALID", "OAuth state is invalid or expired")

    oauth_stub = getattr(m.app.state, "oauth_provider_stub", None)
    try:
        if oauth_stub is None:
            payload = {"email": "oauth@example.com", "nickname": "oauth-user"}
        else:
            callback_payload = oauth_stub.callback(
                provider=provider, code=code, state=state
            )
            payload = {
                "email": callback_payload.email.lower(),
                "nickname": callback_payload.nickname,
            }
    except PermissionError:
        return m._error(400, "OAUTH_ACCESS_DENIED", "OAuth access denied")
    except RuntimeError:
        return m._error(502, "OAUTH_PROVIDER_ERROR", "OAuth provider unavailable")

    existing_user_id = m.app.state.email_index.get(payload["email"])
    if existing_user_id is None:
        user = m._ensure_user(
            email=payload["email"],
            password=secrets.token_urlsafe(32),
            auth_provider=provider,
            email_verified=True,
        )
    else:
        user = m.app.state.auth_users[existing_user_id]
        user["authProvider"] = provider
        user["emailVerified"] = True
        user["nickname"] = payload["nickname"]
        user["updatedAt"] = m._iso_z(m._now())

    session_token, _ = m._create_session(user["id"], timedelta(days=30))
    return RedirectResponse(
        url=f"https://bitsnovels.app/auth/callback#ok=1&token={session_token}",
        status_code=302,
    )
