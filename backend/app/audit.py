from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import AuditLog


async def record(
    session: AsyncSession,
    *,
    actor: UUID,
    action: str,
    target_type: str,
    target_id: UUID,
) -> None:
    session.add(
        AuditLog(
            actor_user_id=actor,
            action=action,
            target_type=target_type,
            target_id=target_id,
        )
    )
