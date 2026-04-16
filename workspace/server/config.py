import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def get_moonshot_base_url() -> str:
    # Kimi docs: base_url should be https://api.moonshot.cn/v1
    return os.getenv("MOONSHOT_BASE_URL", "https://api.moonshot.cn/v1").rstrip("/")


def get_llm_provider() -> str:
    # Values: "moonshot" | "mimo"
    return os.getenv("LLM_PROVIDER", "moonshot").strip().lower() or "moonshot"


def get_mimo_base_url() -> str:
    # MiMo OpenAI-compatible base URL, per user-provided docs.
    # Note: Some deployments may use token-plan-cn.xiaomimimo.com; keep configurable.
    return os.getenv("MIMO_BASE_URL", "https://api.xiaomimimo.com/v1").rstrip("/")


def get_ai_system_defaults() -> dict[str, object]:
    """
    Single source of truth for system-level AI defaults.
    Project/User overrides are handled elsewhere; this is the baseline only.
    """

    # Keep env names short and explicit; do not reuse BITSNOVELS_ prefix.
    model = os.getenv("AI_DEFAULT_MODEL", "kimi2.5")
    parse_depth = os.getenv("AI_DEFAULT_PARSE_DEPTH", "standard")

    raw_temp = os.getenv("AI_DEFAULT_TEMPERATURE", "0.7")
    try:
        temperature = float(raw_temp)
    except Exception:
        temperature = 0.7

    raw_max = os.getenv("AI_DEFAULT_MAX_LENGTH", "1200")
    try:
        max_length = int(raw_max)
    except Exception:
        max_length = 1200

    return {
        "model": model,
        "temperature": temperature,
        "maxLength": max_length,
        "parseDepth": parse_depth,
    }


def _load_workspace_env() -> None:
    """
    Load workspace-level .env into process environment for local dev.
    - Never overrides existing environment variables.
    - Keeps prod/CI behavior unchanged when .env is absent.
    """

    workspace_dir = Path(__file__).resolve().parents[1]
    env_path = workspace_dir / ".env"
    if not env_path.exists():
        return

    try:
        content = env_path.read_text(encoding="utf-8")
    except Exception:
        return

    for raw_line in content.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if not key:
            continue
        os.environ.setdefault(key, value)


# Load once on import so all modules see env values (e.g. MOONSHOT_API_KEY).
_load_workspace_env()


class Settings(BaseSettings):
    app_name: str = "bitsNovels API"
    app_env: str = "development"
    app_version: str = "0.1.0"

    model_config = SettingsConfigDict(env_prefix="BITSNOVELS_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
