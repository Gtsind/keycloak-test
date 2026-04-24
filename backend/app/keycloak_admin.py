from keycloak import KeycloakAdmin, KeycloakOpenIDConnection
from app.config import get_settings

def _admin() -> KeycloakAdmin:
    s = get_settings()
    connection = KeycloakOpenIDConnection(
        server_url=s.keycloak_url,
        realm_name=s.keycloak_realm,
        user_realm_name=s.keycloak_realm,
        client_id=s.keycloak_admin_client_id,
        client_secret_key=s.keycloak_admin_client_secret,
        verify=True,
    )
    return KeycloakAdmin(connection=connection)


async def list_organizations() -> list[dict]:
    return await _admin().a_get_organizations()


async def create_organization(name: str, domain: str) -> str:
    payload = {
        "name": name,
        "alias": name,
        "domains": [{"name": domain, "verified": False}],
    }
    org_id = await _admin().a_create_organization(payload)
    if not org_id:
        raise RuntimeError("Keycloak did not return an organization id")
    return org_id


async def get_organization(org_id: str) -> dict:
    return await _admin().a_get_organization(org_id)
