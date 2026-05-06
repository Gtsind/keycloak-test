from functools import lru_cache
from pathlib import Path
from pydantic import HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    app_db_url: str
    keycloak_url: HttpUrl
    keycloak_realm: str
    keycloak_admin_client_id: str
    keycloak_admin_client_secret: str
    keycloak_issuer: str | None = None # Issuer value as it appears in tokens. Falls back to {keycloak_url}/realms/{realm} if unset.
    keycloak_expected_audience: str = "user-service-client"

    model_config = SettingsConfigDict(env_file=str(_ENV_FILE))

    @property
    def issuer(self) -> str:
        keycloak_url_str = str(self.keycloak_url).rstrip('/')
        return self.keycloak_issuer or f"{keycloak_url_str}/realms/{self.keycloak_realm}"

    @property
    def jwks_url(self) -> str:
        keycloak_url_str = str(self.keycloak_url).rstrip('/')
        return f"{keycloak_url_str}/realms/{self.keycloak_realm}/protocol/openid-connect/certs"


@lru_cache
def get_settings() -> Settings:
    return Settings() #type: ignore
