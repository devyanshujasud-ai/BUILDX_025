from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RFIDScanRequest(BaseModel):
    rfid_uid: str = Field(..., description="RFID Tag Unique Identifier (UID) from reader or simulator", example="RFID-NGP-7701")
    asset_id: int = Field(..., description="Asset identifier where worker tapped tag", example=1)
    issue_id: Optional[int] = Field(None, description="Optional explicit issue identifier. If omitted, resolved automatically from open issues on this asset.")
    latitude: Optional[float] = Field(None, description="GPS latitude of worker during scan", example=21.1458)
    longitude: Optional[float] = Field(None, description="GPS longitude of worker during scan", example=79.0882)
    before_image: Optional[str] = Field(None, description="Optional before-repair evidence image URL")
    after_image: Optional[str] = Field(None, description="Post-repair completion photo proof URL")
    notes: Optional[str] = Field(None, description="Worker repair activity notes", example="Cold asphalt compacted and rolled")

class WorkerBase(BaseModel):
    name: str = Field(..., example="Ramesh Patil")
    rfid_uid: str = Field(..., example="RFID-NGP-7701")
    department: str = Field(..., example="Roads/PWD")
    role: str = Field(..., example="Senior Asphalt Technician")

class WorkerCreate(WorkerBase):
    pass

class WorkerResponse(WorkerBase):
    id: int
    active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MaintenanceTaskResponse(BaseModel):
    id: int
    issue_id: Optional[int] = None
    asset_id: int
    worker_id: int
    assigned_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration: Optional[float] = None
    duration_formatted: Optional[str] = None
    status: str
    
    # Verification & Evidence fields
    before_image: Optional[str] = None
    after_image: Optional[str] = None
    notes: Optional[str] = None
    verification_notes: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    
    # Location coordinates
    start_latitude: Optional[float] = None
    start_longitude: Optional[float] = None
    end_latitude: Optional[float] = None
    end_longitude: Optional[float] = None
    
    worker: Optional[WorkerResponse] = None
    asset_name: Optional[str] = None
    asset_type: Optional[str] = None
    issue_type: Optional[str] = None

    class Config:
        from_attributes = True

class MaintenanceVerificationRequest(BaseModel):
    action: str = Field(..., description="Action to perform: 'VERIFY' or 'REQUEST_REWORK'", example="VERIFY")
    notes: Optional[str] = Field(None, description="Authority inspection comments or rework instructions", example="Verified cold mix compaction and smooth road gradient.")
    verified_by: Optional[str] = Field("Ward 12 Municipal Inspector", description="Official name or inspector designation", example="Ward 12 Municipal Inspector")

class RFIDScanResponse(BaseModel):
    status: str
    action: str  # "STARTED" | "COMPLETED"
    message: str
    task_id: int
    worker_id: int
    worker_name: str
    worker_role: str
    worker_department: str
    asset_id: int
    asset_name: str
    asset_type: str
    issue_id: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    formatted_duration: Optional[str] = None
    task_status: Optional[str] = None
    before_image: Optional[str] = None
    after_image: Optional[str] = None
    notes: Optional[str] = None
