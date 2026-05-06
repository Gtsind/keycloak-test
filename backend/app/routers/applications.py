from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app import audit
from app.db import get_session
from app.models import Application
from app.schemas import ApplicationCreate, ApplicationOut, ApplicationUpdate
from app.security import (
    CurrentUser,
    CurrentUserDep,
    require_realm_role,
)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def create_application(
    body: ApplicationCreate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))],
) -> Application:
    app_row = Application(
        code=body.code,
        name=body.name,
        description=body.description,
        enabled=body.enabled,
    )
    session.add(app_row)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"application '{body.code}' already exists",
        )
    await audit.record(
        session,
        actor=user.sub,
        action="application.create",
        target_type="application",
        target_id=app_row.id,
    )
    await session.commit()
    await session.refresh(app_row)
    return app_row


@router.get("", response_model=list[ApplicationOut])
async def list_applications(
    session: Annotated[AsyncSession, Depends(get_session)],
    user: CurrentUserDep,
    enabled_only: bool = False,
) -> list[Application]:
    stmt = select(Application).order_by(Application.code)
    if enabled_only:
        stmt = stmt.where(Application.enabled.is_(True))
    result = await session.scalars(stmt)
    return list(result)


@router.get("/{app_id}", response_model=ApplicationOut)
async def get_application(
    app_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))],
) -> Application:
    app_row = await session.get(Application, app_id)
    if app_row is None:
        raise HTTPException(status_code=404, detail="application not found")
    return app_row


@router.patch("/{app_id}", response_model=ApplicationOut)
async def update_application(
    app_id: UUID,
    body: ApplicationUpdate,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))],
) -> Application:
    app_row = await session.get(Application, app_id)
    if app_row is None:
        raise HTTPException(status_code=404, detail="application not found")
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(app_row, k, v)
    await audit.record(
        session,
        actor=user.sub,
        action="application.update",
        target_type="application",
        target_id=app_row.id,
    )
    await session.commit()
    await session.refresh(app_row)
    return app_row


@router.delete("/{app_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    app_id: UUID,
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))],
) -> None:
    app_row = await session.get(Application, app_id)
    if app_row is None:
        raise HTTPException(status_code=404, detail="application not found")
    await session.delete(app_row)
    try:
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="application is in use by subscriptions",
        )
    await audit.record(
        session,
        actor=user.sub,
        action="application.delete",
        target_type="application",
        target_id=app_id,
    )
    await session.commit()
