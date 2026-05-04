from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app import audit
from app.db import get_session
from app.models import Organization, Subscription, SubscriptionStatus
from app.schemas import SubscriptionCreate, SubscriptionOut, SubscriptionUpdate
from app.security import (
    CurrentUser,
    require_org_read_access,
    require_realm_role,
)

router = APIRouter(prefix="/organizations/{org_id}/apps", tags=["subscriptions"])


@router.post("", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    org_id: UUID,
    body: SubscriptionCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))],
) -> Subscription:
    org = await session.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=404, detail="organization not found")
    sub = Subscription(organization_id=org_id, app_code=body.app_code)
    session.add(sub)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"organization already has a subscription for '{body.app_code}'",
        )
    await audit.record(
        session,
        actor=user.sub,
        action="subscription.create",
        target_type="subscription",
        target_id=sub.id,
    )
    await session.commit()
    await session.refresh(sub)
    return sub


@router.get("", response_model=list[SubscriptionOut])
async def list_subscriptions(
    org_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_org_read_access)],
) -> list[Subscription]:
    result = await session.scalars(
        select(Subscription)
        .where(Subscription.organization_id == org_id)
        .order_by(Subscription.created_at)
    )
    return list(result)


@router.patch("/{app_code}", response_model=SubscriptionOut)
async def update_subscription(
    org_id: UUID,
    app_code: str,
    body: SubscriptionUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))],
) -> Subscription:
    sub = await session.scalar(
        select(Subscription).where(
            Subscription.organization_id == org_id,
            Subscription.app_code == app_code,
        )
    )
    if sub is None:
        raise HTTPException(status_code=404, detail="subscription not found")
    sub.status = SubscriptionStatus(body.status)
    await audit.record(
        session,
        actor=user.sub,
        action="subscription.update",
        target_type="subscription",
        target_id=sub.id,
    )
    await session.commit()
    await session.refresh(sub)
    return sub
