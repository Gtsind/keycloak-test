from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app import audit, keycloak_admin
from app.db import get_session
from app.models import Organization
from app.schemas import OrganizationCreate, OrganizationOut
from app.security import (
    CurrentUser,
    get_current_user,
    require_org_read_access,
    require_realm_role,
)

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.post(
    "",
    response_model=OrganizationOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    body: OrganizationCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))]
) -> Organization:
    kc_org_id = await keycloak_admin.create_organization(body.name, body.domain)
    org = Organization(id=UUID(kc_org_id), name=body.name)
    session.add(org)
    await audit.record(
        session,
        actor=user.sub,
        action="organization.create",
        target_type="organization",
        target_id=org.id,
    )
    await session.commit()
    await session.refresh(org)
    return org


@router.get("", response_model=list[OrganizationOut])
async def list_organizations(
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> list[Organization]:
    stmt = select(Organization).order_by(Organization.created_at)
    if "aibydna_admin" not in user.realm_roles:
        if not user.org_ids:
            return []
        stmt = stmt.where(Organization.id.in_(user.org_ids))
    result = await session.scalars(stmt)
    return list(result)


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(
    org_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_org_read_access)],
) -> Organization:
    org = await session.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="organization not found")
    return org

@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))]
) -> None:
    statement = (
        delete(Organization)
        .where(Organization.id == org_id)
    ).returning(Organization.id)

    deleted = (await session.execute(statement)).scalar()
    if deleted is None:
        raise HTTPException(status_code=404, detail="organization not found")

    await audit.record(
        session,
        actor=user.sub,
        action="organization.delete",
        target_type="organization",
        target_id=org_id,
    )
    await session.commit()
    await keycloak_admin.delete_organization(str(org_id))
    
