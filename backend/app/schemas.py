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


class SubscriptionCreate(BaseModel):
    app_code: str = Field(min_length=1)

    @field_validator("app_code")
    @classmethod
    def _normalize(cls, v: str) -> str:
        v = v.strip().lower()
        if not v:
            raise ValueError("app_code must not be blank")
        return v


class SubscriptionUpdate(BaseModel):
    status: SubscriptionStatusLiteral


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    app_code: str
    status: SubscriptionStatus
    created_at: datetime


class MyAppOut(BaseModel):
    organization_id: UUID
    organization_name: str
    app_code: str
