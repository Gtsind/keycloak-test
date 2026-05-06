from functools import lru_cache
from typing import Annotated
from uuid import UUID
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import Settings, get_settings
from app.db import get_session
from app.models import Membership, Subscription, SubscriptionStatus

bearer_scheme = HTTPBearer()


class CurrentUser(BaseModel):
    sub: UUID
    email: str | None = None
    realm_roles: set[str] = set()
    org_ids: set[UUID] = set()


@lru_cache
def _jwks_client() -> PyJWKClient:
    return PyJWKClient(get_settings().jwks_url)


def _extract_org_ids(claim: object) -> set[UUID]:
    if not isinstance(claim, dict):
        return set()
    out: set[UUID] = set()
    for entry in claim.values():
        if isinstance(entry, dict) and "id" in entry:
            try:
                out.add(UUID(str(entry["id"])))
            except ValueError:
                continue
    return out


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> CurrentUser:
    token = creds.credentials
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token).key
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            issuer=settings.issuer,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"invalid token: {exc}") from exc

    realm_roles = set((payload.get("realm_access") or {}).get("roles") or [])
    return CurrentUser(
        sub=UUID(payload["sub"]),
        email=payload.get("email"),
        realm_roles=realm_roles,
        org_ids=_extract_org_ids(payload.get("organization")),
    )


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


def require_realm_role(role: str):
    async def _dep(user: CurrentUserDep) -> CurrentUser:
        if role not in user.realm_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"requires realm role '{role}'")
        return user
    return _dep


async def _membership_role(session: AsyncSession, org_id: UUID, user_id: UUID) -> str | None:
    return await session.scalar(
        select(Membership.role).where(
            Membership.organization_id == org_id,
            Membership.keycloak_user_id == user_id,
        )
    )


async def require_customer_admin_for_org(
    org_id: UUID,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CurrentUser:
    if "aibydna_admin" in user.realm_roles:
        return user
    if org_id not in user.org_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member of this organization")
    role = await _membership_role(session, org_id, user.sub)
    if role != "customer_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="requires customer_admin in this organization")
    return user


async def get_target_membership(
    org_id: UUID,
    user_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Membership:
    membership = await session.scalar(
        select(Membership).where(
            Membership.organization_id == org_id,
            Membership.keycloak_user_id == user_id,
        )
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="membership not found")
    return membership


TargetMembershipDep = Annotated[Membership, Depends(get_target_membership)]


def require_app_access(app_code: str):
    async def _dep(
        user: CurrentUserDep,
        session: Annotated[AsyncSession, Depends(get_session)],
    ) -> list[tuple[UUID, str]]:
        rows = (await session.execute(
            select(Membership.organization_id, Membership.role)
            .join(Subscription, Subscription.organization_id == Membership.organization_id)
            .where(
                Membership.keycloak_user_id == user.sub,
                Subscription.app_code == app_code,
                Subscription.status == SubscriptionStatus.active,
            )
        )).all()
        if not rows:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"no active subscription grants access to '{app_code}'",
            )
        return [(org_id, role) for org_id, role in rows]
    return _dep


async def require_org_read_access(
    org_id: UUID,
    user: CurrentUserDep,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> CurrentUser:
    if "aibydna_admin" in user.realm_roles:
        return user
    if org_id not in user.org_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not a member of this organization")
    role = await _membership_role(session, org_id, user.sub)
    if role != "customer_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="requires customer_admin in this organization")
    return user
