import secrets
from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app import audit, keycloak_admin
from app.db import get_session
from app.models import Membership, Organization
from app.schemas import (
    MemberCreate,
    MemberCreateOut,
    MemberOut,
    MemberUpdate,
)
from app.security import (
    CurrentUser,
    TargetMembershipDep,
    require_customer_admin_for_org,
    require_org_read_access,
)

router = APIRouter(prefix="/organizations/{org_id}/users", tags=["members"])


async def _ensure_org_exists(session: AsyncSession, org_id: UUID) -> None:
    if await session.get(Organization, org_id) is None:
        raise HTTPException(status_code=404, detail="organization not found")


@router.post("", response_model=MemberCreateOut, status_code=status.HTTP_201_CREATED)
async def create_member(
    org_id: UUID,
    body: MemberCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_customer_admin_for_org)],
) -> MemberCreateOut:
    await _ensure_org_exists(session, org_id)

    temp_password = secrets.token_urlsafe(16)
    user_id = await keycloak_admin.create_user(
        email=body.email,
        first_name=body.first_name,
        last_name=body.last_name,
        temp_password=temp_password,
    )
    try:
        await keycloak_admin.add_user_to_organization(user_id, str(org_id))
        await keycloak_admin.assign_realm_role(user_id, body.role)
        session.add(
            Membership(
                organization_id=org_id,
                keycloak_user_id=UUID(user_id),
                role=body.role,
            )
        )
        await audit.record(
            session,
            actor=user.sub,
            action="member.create",
            target_type="membership",
            target_id=UUID(user_id),
        )
        await session.commit()
    except Exception:
        await keycloak_admin.delete_user(user_id)
        raise

    return MemberCreateOut(
        id=UUID(user_id),
        email=body.email,
        first_name=body.first_name,
        last_name=body.last_name,
        enabled=True,
        role=body.role,
        temporary_password=temp_password,
    )


@router.get("", response_model=list[MemberOut])
async def list_members(
    org_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_org_read_access)],
) -> list[MemberOut]:
    await _ensure_org_exists(session, org_id)

    kc_members = await keycloak_admin.list_organization_members(str(org_id))

    rows = await session.execute(
        select(Membership.keycloak_user_id, Membership.role).where(
            Membership.organization_id == org_id
        )
    )
    role_by_user = {uid: role for uid, role in rows.all()}

    out: list[MemberOut] = []
    for m in kc_members:
        try:
            uid = UUID(m["id"])
        except (KeyError, ValueError):
            continue
        out.append(
            MemberOut(
                id=uid,
                email=m.get("email"),
                first_name=m.get("firstName"),
                last_name=m.get("lastName"),
                enabled=bool(m.get("enabled", True)),
                role=role_by_user.get(uid),
            )
        )
    return out


async def _ensure_not_last_admin(
    session: AsyncSession, org_id: UUID, excluding_user_id: UUID
) -> None:
    remaining = await session.scalar(
        select(func.count())
        .select_from(Membership)
        .where(
            Membership.organization_id == org_id,
            Membership.role == "customer_admin",
            Membership.keycloak_user_id != excluding_user_id,
        )
    )
    if not remaining:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="cannot remove the last customer_admin of the organization",
        )


async def _ensure_user_only_in_org(
    session: AsyncSession, user_id: UUID, org_id: UUID
) -> None:
    other = await session.scalar(
        select(func.count())
        .select_from(Membership)
        .where(
            Membership.keycloak_user_id == user_id,
            Membership.organization_id != org_id,
        )
    )
    if other:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="user belongs to other organizations; remove from this org instead",
        )


@router.patch("/{user_id}", response_model=MemberOut)
async def update_member(
    org_id: UUID,
    user_id: UUID,
    body: MemberUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
    membership: TargetMembershipDep,
    user: Annotated[CurrentUser, Depends(require_customer_admin_for_org)],
) -> MemberOut:
    if membership.role == body.role:
        return MemberOut(id=user_id, enabled=True, role=body.role)
    if membership.role == "customer_admin" and body.role != "customer_admin":
        await _ensure_not_last_admin(session, org_id, user_id)
    previous_role = membership.role
    membership.role = body.role
    await audit.record(
        session,
        actor=user.sub,
        action="member.update_role",
        target_type="membership",
        target_id=user_id,
    )
    await keycloak_admin.assign_realm_role(str(user_id), body.role)
    try:
        await keycloak_admin.remove_realm_role(str(user_id), previous_role)
        await session.commit()
    except Exception:
        await keycloak_admin.remove_realm_role(str(user_id), body.role)
        await keycloak_admin.assign_realm_role(str(user_id), previous_role)
        raise
    return MemberOut(id=user_id, enabled=True, role=body.role)


@router.post("/{user_id}/deactivate", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_member(
    org_id: UUID,
    user_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    membership: TargetMembershipDep,
    user: Annotated[CurrentUser, Depends(require_customer_admin_for_org)],
) -> None:
    await _ensure_user_only_in_org(session, user_id, org_id)
    await audit.record(
        session,
        actor=user.sub,
        action="member.deactivate",
        target_type="membership",
        target_id=user_id,
    )
    await session.commit()
    await keycloak_admin.disable_user(str(user_id))


@router.post("/{user_id}/activate", status_code=status.HTTP_204_NO_CONTENT)
async def activate_member(
    org_id: UUID,
    user_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    membership: TargetMembershipDep,
    user: Annotated[CurrentUser, Depends(require_customer_admin_for_org)],
) -> None:
    await _ensure_user_only_in_org(session, user_id, org_id)
    await audit.record(
        session,
        actor=user.sub,
        action="member.activate",
        target_type="membership",
        target_id=user_id,
    )
    await session.commit()
    await keycloak_admin.enable_user(str(user_id))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    org_id: UUID,
    user_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_customer_admin_for_org)],
) -> None:
    stmt = (
        delete(Membership)
        .where(
            Membership.organization_id == org_id,
            Membership.keycloak_user_id == user_id,
        )
        .returning(Membership.role)
    )
    deleted_role = (await session.execute(stmt)).scalar()
    if deleted_role is None:
        raise HTTPException(status_code=404, detail="membership not found")
    if deleted_role == "customer_admin":
        await _ensure_not_last_admin(session, org_id, user_id)

    await audit.record(
        session,
        actor=user.sub,
        action="member.delete",
        target_type="membership",
        target_id=user_id,
    )
    await session.commit()
    await keycloak_admin.remove_user_from_organization(str(user_id), str(org_id))

