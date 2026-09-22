from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class IoTTelemetry(Base):
    __tablename__ = "iot_telemetry"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(100), nullable=False, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    device_type = Column(String(50), nullable=False, index=True)  # STREETLIGHT, POTHOLE_NODE, DUSTBIN
    timestamp = Column(DateTime(timezone=True), default=func.now(), index=True)
    data = Column(JSON, nullable=False)  # Raw telemetry payload dictionary
    is_anomaly = Column(Boolean, default=False, index=True)
    anomaly_reason = Column(Text, nullable=True)
    issue_id = Column(Integer, ForeignKey("infrastructure_issues.id"), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    asset = relationship("Asset", backref="iot_readings")
    issue = relationship("InfrastructureIssue", backref="iot_readings")
