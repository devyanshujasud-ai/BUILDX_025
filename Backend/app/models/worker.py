from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Worker(Base):
    __tablename__ = "workers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    rfid_uid = Column(String(50), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False, index=True)
    role = Column(String(100), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tasks = relationship("MaintenanceTask", back_populates="worker", cascade="all, delete-orphan")


class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"

    id = Column(Integer, primary_key=True, index=True)
    issue_id = Column(Integer, ForeignKey("infrastructure_issues.id"), nullable=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False, index=True)
    worker_id = Column(Integer, ForeignKey("workers.id"), nullable=False, index=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration = Column(Float, nullable=True)  # Duration in seconds
    status = Column(String(30), default="IN_PROGRESS", index=True)  # IN_PROGRESS, PENDING_VERIFICATION, RESOLVED, REWORK_REQUESTED, CANCELLED
    
    # End-to-End Verification Evidence
    before_image = Column(String(500), nullable=True)
    after_image = Column(String(500), nullable=True)
    notes = Column(String(1000), nullable=True)  # Worker repair notes
    
    # Authority Verification Action
    verification_notes = Column(String(1000), nullable=True)  # Authority comments / rework notes
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(String(100), nullable=True)  # Official name / inspector
    
    # Geo-location tracking
    start_latitude = Column(Float, nullable=True)
    start_longitude = Column(Float, nullable=True)
    end_latitude = Column(Float, nullable=True)
    end_longitude = Column(Float, nullable=True)

    worker = relationship("Worker", back_populates="tasks")
    asset = relationship("Asset", backref="maintenance_tasks")
    issue = relationship("InfrastructureIssue", backref="maintenance_tasks")
