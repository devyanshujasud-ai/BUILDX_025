from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database import Base

class SeverityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class StatusEnum(str, enum.Enum):
    REPORTED = "REPORTED"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"

class Pothole(Base):
    __tablename__ = "potholes"

    id = Column(Integer, primary_key=True, index=True)
    ticket_code = Column(String(50), unique=True, index=True, nullable=False)
    
    # Location details
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    address = Column(String(300), nullable=True)
    city = Column(String(100), default="Delhi NCR")
    zone = Column(String(100), nullable=True)
    road_name = Column(String(200), nullable=True)
    road_type = Column(String(50), default="URBAN_ROAD") # NATIONAL_HIGHWAY, STATE_HIGHWAY, URBAN_ROAD, RESIDENTIAL
    
    # AI Detection metrics
    confidence = Column(Float, default=0.85)
    severity = Column(String(20), default=SeverityEnum.MEDIUM.value)
    severity_score = Column(Float, default=5.0) # 1.0 - 10.0 scale
    box_area_ratio = Column(Float, default=0.04) # Area ratio of bounding box
    bounding_boxes = Column(Text, nullable=True) # JSON string of [ [x1,y1,x2,y2,conf,severity], ... ]
    detection_count = Column(Integer, default=1)
    
    # Media URLs
    image_url = Column(String(500), nullable=False) # Original or annotated image
    annotated_image_url = Column(String(500), nullable=True)
    resolution_image_url = Column(String(500), nullable=True) # Photo proof when repaired
    video_source_url = Column(String(500), nullable=True)
    
    # Authority & Status
    authority_id = Column(Integer, ForeignKey("civic_authorities.id"), nullable=True)
    status = Column(String(20), default=StatusEnum.REPORTED.value, index=True)
    reported_by = Column(String(100), default="Dashcam AI System")
    notes = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Timestamps
    detected_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    in_progress_at = Column(DateTime(timezone=True), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relations
    authority = relationship("CivicAuthority", backref="potholes")
    status_history = relationship(
        "PotholeStatusHistory",
        back_populates="pothole",
        cascade="all, delete-orphan",
        order_by="PotholeStatusHistory.created_at",
    )


class PotholeStatusHistory(Base):
    __tablename__ = "pothole_status_history"

    id = Column(Integer, primary_key=True, index=True)
    pothole_id = Column(Integer, ForeignKey("potholes.id"), nullable=False, index=True)
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=False, index=True)
    changed_by = Column(String(100), default="System")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    pothole = relationship("Pothole", back_populates="status_history")
