from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class IoTTelemetryRequest(BaseModel):
    device_id: str = Field(..., description="ESP32 hardware identifier", example="ESP32-STREET-01")
    asset_id: int = Field(..., description="Associated physical municipal asset ID", example=1)
    device_type: str = Field(..., description="Device classification: STREETLIGHT, POTHOLE_NODE, DUSTBIN", example="STREETLIGHT")
    timestamp: Optional[datetime] = Field(None, description="Device capture timestamp, defaults to server time")
    data: Dict[str, Any] = Field(..., description="JSON metrics payload from ESP32", example={"lux": 5, "motion": 1, "current": 0.0})

class IoTTelemetryResponse(BaseModel):
    id: int
    device_id: str
    asset_id: int
    device_type: str
    timestamp: Optional[datetime] = None
    data: Dict[str, Any]
    is_anomaly: bool
    anomaly_reason: Optional[str] = None
    issue_id: Optional[int] = None
    asset_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class IoTStatsResponse(BaseModel):
    total_readings: int
    total_anomalies: int
    active_devices: int
    device_breakdown: Dict[str, int]
