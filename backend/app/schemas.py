import re
from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.models import OrgStatus, SubscriptionStatus

MembershipRole = Literal["customer_admin", "customer_user"]
SubscriptionStatusLiteral = Literal["active", "suspended", "cancelled"]


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1)
    domain: str = Field(min_length=1)


class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: OrgStatus
    created_at: datetime


class MemberCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    role: MembershipRole = "customer_user"


class MemberOut(BaseModel):
    id: UUID
    email: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    enabled: bool
    role: MembershipRole | None = None


class MemberCreateOut(MemberOut):
    temporary_password: str


class MemberUpdate(BaseModel):
    role: MembershipRole


_APP_CODE_RE = re.compile(r"^[a-z0-9_-]+$")


def _normalize_code(v: str) -> str:
    v = v.strip().lower()
    if not _APP_CODE_RE.match(v):
        raise ValueError("code must match [a-z0-9_-]+")
    return v


class ApplicationCreate(BaseModel):
    code: str = Field(min_length=1)
    name: str = Field(min_length=1)
    description: str | None = None
    enabled: bool = True

    @field_validator("code")
    @classmethod
    def _v_code(cls, v: str) -> str:
        return _normalize_code(v)


class ApplicationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    enabled: bool | None = None


class ApplicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    description: str | None = None
    enabled: bool
    created_at: datetime


class SubscriptionCreate(BaseModel):
    app_code: str = Field(min_length=1)

    @field_validator("app_code")
    @classmethod
    def _normalize(cls, v: str) -> str:
        return _normalize_code(v)


class SubscriptionUpdate(BaseModel):
    status: SubscriptionStatusLiteral


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    application_id: UUID
    application: ApplicationOut
    status: SubscriptionStatus
    created_at: datetime


class MyAppOut(BaseModel):
    organization_id: UUID
    organization_name: str
    app_code: str


class MyMembershipOut(BaseModel):
    organization_id: UUID
    organization_name: str
    role: MembershipRole


class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_user_id: UUID
    action: str
    target_type: str
    target_id: UUID
    created_at: datetime
