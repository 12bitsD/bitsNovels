from typing import Any, Literal, Optional

from pydantic import BaseModel


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
