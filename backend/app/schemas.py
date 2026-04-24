from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field
from app.models import OrgStatus

class OrganizationCreate(BaseModel):
    name: str = Field(min_length=1)
    domain: str = Field(min_length=1)

class OrganizationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: OrgStatus
    created_at: datetime
