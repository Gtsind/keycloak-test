from functools import lru_cache
from keycloak import KeycloakAdmin, KeycloakOpenIDConnection
from app.config import get_settings

@lru_cache
def _admin() -> KeycloakAdmin:
    s = get_settings()
    connection = KeycloakOpenIDConnection(
        server_url=str(s.keycloak_url),
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

async def delete_organization(org_id: str) -> dict:
    return await _admin().a_delete_organization(org_id)


# Users

async def create_user(
    email: str, first_name: str, last_name: str, temp_password: str
) -> str:
    user_id = await _admin().a_create_user(
        {
            "email": email,
            "username": email,
            "firstName": first_name,
            "lastName": last_name,
            "enabled": True,
            "emailVerified": False,
            "credentials": [
                {"type": "password", "value": temp_password, "temporary": True}
            ],
        },
        exist_ok=False,
    )
    if not user_id:
        raise RuntimeError("Keycloak did not return a user id")
    return user_id


async def delete_user(user_id: str) -> None:
    await _admin().a_delete_user(user_id)


async def disable_user(user_id: str) -> None:
    await _admin().a_update_user(user_id, {"enabled": False})


async def enable_user(user_id: str) -> None:
    await _admin().a_update_user(user_id, {"enabled": True})


# Roles

@lru_cache
def _role_rep_cache() -> dict[str, dict]:
    return {}


async def _get_realm_role(role_name: str) -> dict:
    cache = _role_rep_cache()
    if role_name not in cache:
        cache[role_name] = await _admin().a_get_realm_role(role_name)
    return cache[role_name]


async def assign_realm_role(user_id: str, role_name: str) -> None:
    role = await _get_realm_role(role_name)
    await _admin().a_assign_realm_roles(user_id=user_id, roles=[role])


# Organization memberships

async def add_user_to_organization(user_id: str, organization_id: str) -> None:
    await _admin().a_organization_user_add(
        user_id=user_id, organization_id=organization_id
    )


async def remove_user_from_organization(user_id: str, organization_id: str) -> None:
    await _admin().a_organization_user_remove(
        user_id=user_id, organization_id=organization_id
    )


async def list_organization_members(organization_id: str) -> list[dict]:
    return await _admin().a_get_organization_members(organization_id=organization_id)
