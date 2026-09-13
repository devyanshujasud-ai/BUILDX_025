from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CivicAuthorityBase(BaseModel):
    name: str
    code: str
    full_name: str
    department: Optional[str] = "Road & Infrastructure Division"
    contact_email: str
    contact_phone: Optional[str] = None
    escalation_email: Optional[str] = None
    sla_hours: int = 48
    jurisdiction_type: str = "MUNICIPAL"
    boundary_geojson: Optional[str] = None
    active: bool = True

class CivicAuthorityCreate(CivicAuthorityBase):
    pass

class CivicAuthorityResponse(CivicAuthorityBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
