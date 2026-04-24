from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    app_db_url: str = ""
    keycloak_url: str = ""
    keycloak_realm: str = ""
    keycloak_admin_client_id: str = ""
    keycloak_admin_client_secret: str = ""

    model_config = SettingsConfigDict(env_file=str(_ENV_FILE), extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
