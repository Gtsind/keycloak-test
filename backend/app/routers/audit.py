from datetime import datetime
from typing import Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_session
from app.models import AuditLog
from app.schemas import AuditLogOut
from app.security import CurrentUser, require_realm_role

router = APIRouter(tags=["audit"])


@router.get("/audit", response_model=list[AuditLogOut])
async def list_audit_logs(
    session: Annotated[AsyncSession, Depends(get_session)],
    user: Annotated[CurrentUser, Depends(require_realm_role("aibydna_admin"))],
    actor_user_id: Annotated[UUID | None, Query()] = None,
    action: Annotated[str | None, Query(max_length=64)] = None,
    target_type: Annotated[str | None, Query(max_length=32)] = None,
    target_id: Annotated[UUID | None, Query()] = None,
    since: Annotated[datetime | None, Query()] = None,
    until: Annotated[datetime | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[AuditLog]:
    stmt = select(AuditLog)
    if actor_user_id is not None:
        stmt = stmt.where(AuditLog.actor_user_id == actor_user_id)
    if action is not None:
        stmt = stmt.where(AuditLog.action == action)
    if target_type is not None:
        stmt = stmt.where(AuditLog.target_type == target_type)
    if target_id is not None:
        stmt = stmt.where(AuditLog.target_id == target_id)
    if since is not None:
        stmt = stmt.where(AuditLog.created_at >= since)
    if until is not None:
        stmt = stmt.where(AuditLog.created_at < until)
    stmt = stmt.order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit).offset(offset)
    result = await session.scalars(stmt)
    return list(result)
