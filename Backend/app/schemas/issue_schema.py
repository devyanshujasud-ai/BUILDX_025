from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.asset_schema import AssetResponse

class InfrastructureIssueBase(BaseModel):
    asset_id: Optional[int] = None
    type: str  # POTHOLE, STREETLIGHT, DUSTBIN, ROAD_DAMAGE, CONSTRUCTION, OTHER
    source: Optional[str] = "CITIZEN"  # CITIZEN, AI_DETECTION, INSPECTION, IOT_SENSOR
    description: Optional[str] = None
    latitude: float
    longitude: float
    severity: Optional[str] = "MEDIUM"  # LOW, MEDIUM, HIGH, CRITICAL
    priority: Optional[str] = None      # Auto-calculated if not provided
    priority_reason: Optional[str] = None  # Transparent rule-based explanation
    report_count: Optional[int] = 1     # Number of duplicate complaints
    department: Optional[str] = None    # Auto-routed if not provided
    status: Optional[str] = "REPORTED"  # REPORTED, VERIFIED, ASSIGNED, IN_PROGRESS, PENDING_VERIFICATION, RESOLVED

class InfrastructureIssueCreate(InfrastructureIssueBase):
    pass

class InfrastructureIssueUpdate(BaseModel):
    asset_id: Optional[int] = None
    type: Optional[str] = None
    source: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    severity: Optional[str] = None
    priority: Optional[str] = None
    priority_reason: Optional[str] = None
    report_count: Optional[int] = None
    department: Optional[str] = None
    status: Optional[str] = None
    resolved_at: Optional[datetime] = None

class InfrastructureIssueStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class InfrastructureIssueResponse(BaseModel):
    id: int
    asset_id: Optional[int] = None
    type: str
    source: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    severity: str
    priority: str
    priority_reason: Optional[str] = None
    report_count: int = 1
    department: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    pothole_id: Optional[int] = None
    asset: Optional[AssetResponse] = None

    model_config = ConfigDict(from_attributes=True)

class IssueStatsSummary(BaseModel):
    total_issues: int
    by_status: Dict[str, int]
    by_type: Dict[str, int]
    by_severity: Dict[str, int]
    by_priority: Dict[str, int]
    by_department: Dict[str, int]
    resolution_rate_percent: float
