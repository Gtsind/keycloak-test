import enum
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy import Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
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
    organization_id: Mapped[UUID] = mapped_column(ForeignKey("organizations.id"))
    keycloak_user_id: Mapped[UUID]
    role: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())


class SubscriptionStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    cancelled = "cancelled"


class Subscription(Base):
    __tablename__ = "subscriptions"
    __table_args__ = (UniqueConstraint("organization_id", "app_code"),)

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    app_code: Mapped[str] = mapped_column(index=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status"),
        default=SubscriptionStatus.active,
    )
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
