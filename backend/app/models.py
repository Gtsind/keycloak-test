import enum
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import Enum, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db import Base

class OrgStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    deleted = "deleted"

class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[UUID] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(unique=True)
    status: Mapped[OrgStatus] = mapped_column(
        Enum(OrgStatus, name="org_status"), default=OrgStatus.active
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

class Membership(Base):
    __tablename__ = "memberships"
    __table_args__ = (UniqueConstraint("organization_id", "keycloak_user_id"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE")
    )
    keycloak_user_id: Mapped[UUID]
    role: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    cancelled = "cancelled"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    code: Mapped[str] = mapped_column(unique=True, index=True)
    name: Mapped[str]
    description: Mapped[str | None] = mapped_column(default=None)
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (UniqueConstraint("organization_id", "application_id"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    application_id: Mapped[UUID] = mapped_column(
        ForeignKey("applications.id", ondelete="RESTRICT"), index=True
    )
    application: Mapped["Application"] = relationship(lazy="joined")
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status"),
        default=SubscriptionStatus.active,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_target", "target_type", "target_id"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    actor_user_id: Mapped[UUID] = mapped_column(index=True)
    action: Mapped[str]
    target_type: Mapped[str]
    target_id: Mapped[UUID]
    created_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), index=True
    )
