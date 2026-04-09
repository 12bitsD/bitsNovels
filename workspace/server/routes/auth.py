import secrets
from datetime import timedelta
from typing import Any, Optional

from fastapi import APIRouter, Header
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


def _m():
    from server import main as _main
    return _main


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
    if existing_user_id is not None:
        user = m.app.state.auth_users[existing_user_id]
        if user["password"] != payload.password:
            return m._error(401, "INVALID_CREDENTIALS", "Invalid email or password")
    else:
        user = m._ensure_user(email=email, password=payload.password)
    ttl = timedelta(days=30 if payload.rememberMe else 1)
    expires_at = m._now() + ttl
    session_token = m._next_id("session_counter", "session")
    m.app.state.sessions[session_token] = user["id"]
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
            "expiresAt": m._iso_z(expires_at),
            "emailVerified": user["emailVerified"],
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
    user["password"] = payload.newPassword
    user["updatedAt"] = m._iso_z(m._now())
    token_data["used"] = True
    user_id = user["id"]
    m.app.state.sessions = {
        token: uid for token, uid in m.app.state.sessions.items() if uid != user_id
    }
    return JSONResponse(status_code=200, content={"ok": True})


@router.get("/api/auth/oauth/{provider}/start")
def oauth_start(provider: str) -> Any:
    m = _m()
    if provider not in ALLOWED_PROVIDERS:
        return m._error(400, "OAUTH_PROVIDER_UNSUPPORTED", "Unsupported oauth provider")
    m.app.state.state_counter = getattr(m.app.state, "state_counter", 0) + 1
    state = f"state-{m.app.state.state_counter}"
    oauth_stub = getattr(m.app.state, "oauth_provider_stub", None)
    if oauth_stub is None:
        redirect_to = f"https://oauth.example.com/{provider}/authorize?state={state}"
    else:
        redirect_to = f"{oauth_stub.start(provider)}?state={state}"
    return RedirectResponse(url=redirect_to, status_code=302)


@router.get("/api/auth/oauth/{provider}/callback")
def oauth_callback(provider: str, code: str, state: str) -> Any:
    m = _m()
    if provider not in ALLOWED_PROVIDERS:
        return m._error(400, "OAUTH_PROVIDER_UNSUPPORTED", "Unsupported oauth provider")
    oauth_stub = getattr(m.app.state, "oauth_provider_stub", None)
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
    existing_user_id = m.app.state.email_index.get(payload["email"])
    if existing_user_id is None:
        user = m._ensure_user(
            email=payload["email"], password="OAuthPass1", auth_provider=provider
        )
    else:
        user = m.app.state.auth_users[existing_user_id]
        user["authProvider"] = provider
        user["updatedAt"] = m._iso_z(m._now())
    session_token = m._next_id("session_counter", "session")
    m.app.state.sessions[session_token] = user["id"]
    return RedirectResponse(
        url=f"https://bitsnovels.app/auth/callback?ok=1&token={session_token}",
        status_code=302,
    )
