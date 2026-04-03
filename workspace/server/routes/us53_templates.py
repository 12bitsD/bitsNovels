from typing import Any, Optional

from fastapi import APIRouter, Body, Header
from fastapi.responses import JSONResponse

router = APIRouter(prefix="/api/me", tags=["us-5.3"])

ALLOWED_FORMATS = {"docx", "txt", "pdf", "markdown"}
ALLOWED_TXT_ENCODINGS = {"utf8", "gbk"}
ALLOWED_TXT_SEPARATORS = {"blank", "line", "none"}
MAX_TEMPLATES_PER_USER = 20
MAX_TEMPLATE_NAME_LENGTH = 30


def _template_response(t: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": t["id"],
        "userId": t["userId"],
        "name": t["name"],
        "format": t["format"],
        "options": t.get("options", {}),
        "createdAt": t["createdAt"],
        "updatedAt": t["updatedAt"],
    }


def _validate_options(options: dict[str, Any], format: str) -> Optional[dict[str, Any]]:
    errors: list[dict[str, str]] = []

    if format in ("docx", "pdf"):
        if "font" in options and not isinstance(options["font"], str):
            errors.append({"field": "options.font", "message": "must be string"})
        if "fontSize" in options and not isinstance(options["fontSize"], str):
            errors.append({"field": "options.fontSize", "message": "must be string"})
        if "lineSpacing" in options:
            ls = options["lineSpacing"]
            if not isinstance(ls, (int, float)) or ls <= 0:
                errors.append(
                    {
                        "field": "options.lineSpacing",
                        "message": "must be positive number",
                    }
                )

    if format == "txt":
        if (
            "txtEncoding" in options
            and options["txtEncoding"] not in ALLOWED_TXT_ENCODINGS
        ):
            errors.append(
                {"field": "options.txtEncoding", "message": "must be utf8 or gbk"}
            )
        if (
            "txtSeparator" in options
            and options["txtSeparator"] not in ALLOWED_TXT_SEPARATORS
        ):
            errors.append(
                {
                    "field": "options.txtSeparator",
                    "message": "must be blank, line, or none",
                }
            )

    bool_fields = [
        "includeVolumeTitle",
        "includeChapterNumber",
        "includeNotes",
        "includeAnnotations",
    ]
    for field in bool_fields:
        if field in options and not isinstance(options[field], bool):
            errors.append({"field": f"options.{field}", "message": "must be boolean"})

    if errors:
        return {"errors": errors}
    return None


@router.post("/export-templates")
def create_export_template(
    payload: dict[str, Any],
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _error, _iso_z, _now

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    name = (
        payload.get("name", "").strip() if isinstance(payload.get("name"), str) else ""
    )
    if not name:
        return _error(400, "TEMPLATE_NAME_REQUIRED", "Template name is required")
    if len(name) > MAX_TEMPLATE_NAME_LENGTH:
        return _error(
            400,
            "TEMPLATE_NAME_TOO_LONG",
            f"Template name must be {MAX_TEMPLATE_NAME_LENGTH} characters or less",
        )

    format_val = payload.get("format", "")
    if format_val not in ALLOWED_FORMATS:
        return _error(
            400,
            "TEMPLATE_FORMAT_INVALID",
            f"Format must be one of: {', '.join(ALLOWED_FORMATS)}",
        )

    options = payload.get("options", {})
    options_errors = _validate_options(options, format_val)
    if options_errors:
        return _error(
            400, "TEMPLATE_OPTIONS_INVALID", "Invalid template options", options_errors
        )

    user_templates = app.state.export_templates.get(user_id, [])
    if len(user_templates) >= MAX_TEMPLATES_PER_USER:
        return _error(
            409,
            "TEMPLATE_LIMIT_REACHED",
            f"Maximum of {MAX_TEMPLATES_PER_USER} templates per user",
        )

    now_iso = _iso_z(_now())
    template_id = _next_id("template_counter", "template")
    template = {
        "id": template_id,
        "userId": user_id,
        "name": name,
        "format": format_val,
        "options": options,
        "createdAt": now_iso,
        "updatedAt": now_iso,
    }
    app.state.export_templates.setdefault(user_id, []).append(template)

    return JSONResponse(status_code=201, content=_template_response(template))


@router.get("/export-templates")
def list_export_templates(
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    templates = app.state.export_templates.get(user_id, [])
    return JSONResponse(
        status_code=200,
        content={"templates": [_template_response(t) for t in templates]},
    )


@router.patch("/export-templates/{template_id}")
def update_export_template(
    template_id: str,
    payload: dict[str, Any],
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _error, _iso_z, _now

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    template = _find_user_template(app.state.export_templates, user_id, template_id)
    if template is None:
        return _error(404, "TEMPLATE_NOT_FOUND", "Template not found")

    if "name" in payload:
        name = payload["name"]
        if not isinstance(name, str):
            return _error(
                400, "TEMPLATE_NAME_INVALID", "Template name must be a string"
            )
        name = name.strip()
        if not name:
            return _error(400, "TEMPLATE_NAME_REQUIRED", "Template name is required")
        if len(name) > MAX_TEMPLATE_NAME_LENGTH:
            return _error(
                400,
                "TEMPLATE_NAME_TOO_LONG",
                f"Template name must be {MAX_TEMPLATE_NAME_LENGTH} characters or less",
            )
        template["name"] = name

    if "options" in payload:
        options = payload["options"]
        if not isinstance(options, dict):
            return _error(400, "TEMPLATE_OPTIONS_INVALID", "Options must be an object")
        format_val = template["format"]
        options_errors = _validate_options(options, format_val)
        if options_errors:
            return _error(
                400,
                "TEMPLATE_OPTIONS_INVALID",
                "Invalid template options",
                options_errors,
            )
        template["options"] = options

    template["updatedAt"] = _iso_z(_now())
    return JSONResponse(status_code=200, content=_template_response(template))


@router.delete("/export-templates/{template_id}")
def delete_export_template(
    template_id: str,
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> JSONResponse:
    from server.main import _require_user_id, app, _error

    maybe_user_id = _require_user_id(authorization)
    if isinstance(maybe_user_id, JSONResponse):
        return maybe_user_id
    user_id = maybe_user_id

    template = _find_user_template(app.state.export_templates, user_id, template_id)
    if template is None:
        return _error(404, "TEMPLATE_NOT_FOUND", "Template not found")

    app.state.export_templates[user_id] = [
        t for t in app.state.export_templates[user_id] if t["id"] != template_id
    ]

    return JSONResponse(status_code=204, content=None)


def _find_user_template(
    export_templates: dict[str, list[dict[str, Any]]],
    user_id: str,
    template_id: str,
) -> Optional[dict[str, Any]]:
    user_templates = export_templates.get(user_id, [])
    for t in user_templates:
        if t["id"] == template_id:
            return t
    return None


def _next_id(counter_key: str, prefix: str) -> str:
    from server.main import app

    current = getattr(app.state, counter_key, 0) + 1
    setattr(app.state, counter_key, current)
    return f"{prefix}-{current}"
