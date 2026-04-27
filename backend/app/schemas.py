from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.models import OrgStatus

MembershipRole = Literal["customer_admin", "customer_user"]


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
