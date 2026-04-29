from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_session
from app.models import Membership, Organization, Subscription, SubscriptionStatus
from app.schemas import MyAppOut
from app.security import CurrentUser, get_current_user

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/apps", response_model=list[MyAppOut])
async def list_my_apps(
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> list[MyAppOut]:
    rows = (await session.execute(
        select(Organization.id, Organization.name, Subscription.app_code)
        .join(Membership, Membership.organization_id == Organization.id)
        .join(Subscription, Subscription.organization_id == Organization.id)
        .where(
            Membership.keycloak_user_id == user.sub,
            Subscription.status == SubscriptionStatus.active,
        )
        .order_by(Organization.name, Subscription.app_code)
    )).all()
    return [
        MyAppOut(organization_id=org_id, organization_name=name, app_code=app_code)
        for org_id, name, app_code in rows
    ]
