from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from app.schemas.authority_schema import CivicAuthorityResponse

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    severity: str
    class_name: str = "pothole"

class PotholeBase(BaseModel):
    latitude: float
    longitude: float
    address: Optional[str] = None
    city: Optional[str] = "Nagpur"
    zone: Optional[str] = None
    road_name: Optional[str] = None
    road_type: Optional[str] = "URBAN_ROAD"
    confidence: float = 0.85
    severity: str = "MEDIUM"
    severity_score: float = 5.0
    box_area_ratio: float = 0.04
    bounding_boxes: Optional[str] = None
    detection_count: int = 1
    image_url: str
    annotated_image_url: Optional[str] = None
    video_source_url: Optional[str] = None
    notes: Optional[str] = None
    reported_by: Optional[str] = "Dashcam AI System"

class PotholeCreate(PotholeBase):
    authority_id: Optional[int] = None

class PotholeStatusUpdate(BaseModel):
    status: str # REPORTED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED
    resolution_notes: Optional[str] = None
    resolution_image_url: Optional[str] = None
    changed_by: Optional[str] = "System"

class PotholeStatusHistoryResponse(BaseModel):
    id: int
    pothole_id: int
    from_status: Optional[str] = None
    to_status: str
    changed_by: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class PotholeResponse(PotholeBase):
    id: int
    ticket_code: str
    authority_id: Optional[int] = None
    status: str
    resolution_notes: Optional[str] = None
    resolution_image_url: Optional[str] = None
    detected_at: datetime
    acknowledged_at: Optional[datetime] = None
    in_progress_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    authority: Optional[CivicAuthorityResponse] = None
    status_history: List[PotholeStatusHistoryResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True

class DetectionResult(BaseModel):
    pothole_count: int
    highest_severity: str
    average_confidence: float
    bounding_boxes: List[BoundingBox]
    annotated_image_url: str
    original_image_url: str
    suggested_authority: Optional[CivicAuthorityResponse] = None
    location_details: Optional[dict] = None
    pothole_record: Optional[PotholeResponse] = None
