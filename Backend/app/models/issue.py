import enum
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class IssueTypeEnum(str, enum.Enum):
    POTHOLE = "POTHOLE"
    STREETLIGHT = "STREETLIGHT"
    DUSTBIN = "DUSTBIN"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    CONSTRUCTION = "CONSTRUCTION"
    OTHER = "OTHER"

class IssueStatusEnum(str, enum.Enum):
    REPORTED = "REPORTED"
    VERIFIED = "VERIFIED"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    RESOLVED = "RESOLVED"

class IssueSeverityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class IssuePriorityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class InfrastructureIssue(Base):
    __tablename__ = "infrastructure_issues"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True, index=True)
    type = Column(String(50), nullable=False, index=True) # POTHOLE, STREETLIGHT, DUSTBIN, ROAD_DAMAGE, CONSTRUCTION, OTHER
    source = Column(String(100), default="CITIZEN", index=True) # CITIZEN, AI_DETECTION, INSPECTION, IOT_SENSOR
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    severity = Column(String(20), default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    priority = Column(String(20), default="MEDIUM", index=True) # LOW, MEDIUM, HIGH, CRITICAL
    priority_reason = Column(Text, nullable=True) # Transparent rule-based explanation
    report_count = Column(Integer, default=1) # Number of duplicate complaints / citizen reports
    department = Column(String(100), nullable=False, index=True) # Roads/PWD, Electrical, Sanitation, Works, General Civic
    status = Column(String(30), default=IssueStatusEnum.REPORTED.value, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Optional foreign key to pothole if detected via dashcam/AI
    pothole_id = Column(Integer, ForeignKey("potholes.id"), nullable=True)

    asset = relationship("Asset", back_populates="issues")
    pothole = relationship("Pothole", backref="infrastructure_issue")
