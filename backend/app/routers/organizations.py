from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated
from app import keycloak_admin
from app.db import get_session
from app.models import Organization
from app.schemas import OrganizationCreate, OrganizationOut

router = APIRouter(prefix="/organizations", tags=["organizations"])

@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_organization(
    body: OrganizationCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Organization:
    kc_org_id = await keycloak_admin.create_organization(body.name, body.domain)
    org = Organization(id=UUID(kc_org_id), name=body.name)
    session.add(org)
    await session.commit()
    await session.refresh(org)
    return org


@router.get("", response_model=list[OrganizationOut])
async def list_organizations(
    session: Annotated[AsyncSession, Depends(get_session)]
) -> list[Organization]:
    result = await session.scalars(select(Organization).order_by(Organization.created_at))
    return list(result)


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_organization(
    org_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)]
) -> Organization:
    org = await session.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="organization not found")
    return org
