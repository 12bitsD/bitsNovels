from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "bitsNovels API"
    app_env: str = "development"
    app_version: str = "0.1.0"

    model_config = SettingsConfigDict(env_prefix="BITSNOVELS_", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
