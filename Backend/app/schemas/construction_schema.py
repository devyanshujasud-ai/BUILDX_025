from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class AgencyBase(BaseModel):
    name: str = Field(..., example="NMC Water Works Department")
    code: str = Field(..., example="NMC-WATER")
    department: str = Field(..., example="Water Supply & Pipeline Maintenance")
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class AgencyCreate(AgencyBase):
    pass

class AgencyResponse(AgencyBase):
    id: int
    active: bool

    class Config:
        from_attributes = True

class ContractorBase(BaseModel):
    name: str = Field(..., example="Vidarbha Infrastructure & Pipeline Corp")
    license_no: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None

class ContractorCreate(ContractorBase):
    pass

class ContractorResponse(ContractorBase):
    id: int
    active: bool

    class Config:
        from_attributes = True

class ConflictDetail(BaseModel):
    conflicting_project_id: int
    conflicting_project_code: str
    conflicting_agency_name: str
    conflicting_work_type: str
    location: str
    distance_meters: float
    overlap_start: str
    overlap_end: str
    conflict_message: str

class ConstructionProjectBase(BaseModel):
    project_id: str = Field(..., example="PRJ-NGP-2026-001")
    location: str = Field(..., example="West High Court Road, Dharampeth")
    agency_id: int = Field(..., example=1)
    contractor_id: Optional[int] = Field(None, example=1)
    work_type: str = Field(..., example="WATER_PIPELINE")
    start_date: date
    end_date: date
    status: str = Field("PLANNED", example="PLANNED")
    description: Optional[str] = None
    latitude: float = Field(..., example=21.1432)
    longitude: float = Field(..., example=79.0621)

class ConstructionProjectCreate(ConstructionProjectBase):
    pass

class ConstructionProjectUpdate(BaseModel):
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None

class ConstructionProjectResponse(ConstructionProjectBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    agency: Optional[AgencyResponse] = None
    contractor: Optional[ContractorResponse] = None
    conflicts: List[ConflictDetail] = []
    has_conflict: bool = False

    class Config:
        from_attributes = True
