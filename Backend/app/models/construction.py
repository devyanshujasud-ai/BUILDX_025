import enum
from sqlalchemy import Column, Integer, String, Float, Text, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class WorkTypeEnum(str, enum.Enum):
    WATER_PIPELINE = "WATER_PIPELINE"
    ELECTRIC_CABLE = "ELECTRIC_CABLE"
    ROAD_RESURFACING = "ROAD_RESURFACING"
    DRAINAGE = "DRAINAGE"
    TELECOM = "TELECOM"
    OTHER = "OTHER"

class ProjectStatusEnum(str, enum.Enum):
    PLANNED = "PLANNED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"

class Agency(Base):
    __tablename__ = "agencies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True)
    code = Column(String(50), nullable=False, unique=True, index=True)
    department = Column(String(100), nullable=False)
    contact_email = Column(String(100), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    active = Column(Boolean, default=True)

    projects = relationship("ConstructionProject", back_populates="agency")

class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    license_no = Column(String(100), nullable=True, unique=True)
    contact_person = Column(String(100), nullable=True)
    phone = Column(String(50), nullable=True)
    active = Column(Boolean, default=True)

    projects = relationship("ConstructionProject", back_populates="contractor")

class ConstructionProject(Base):
    __tablename__ = "construction_projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(50), unique=True, nullable=False, index=True)  # e.g. PRJ-NGP-2026-001
    location = Column(String(250), nullable=False, index=True)  # road/location name
    agency_id = Column(Integer, ForeignKey("agencies.id"), nullable=False, index=True)
    contractor_id = Column(Integer, ForeignKey("contractors.id"), nullable=True, index=True)
    work_type = Column(String(50), nullable=False, index=True)  # WATER_PIPELINE, ELECTRIC_CABLE, etc.
    start_date = Column(Date, nullable=False, index=True)
    end_date = Column(Date, nullable=False, index=True)
    status = Column(String(30), default="PLANNED", index=True)  # PLANNED, ACTIVE, COMPLETED, SUSPENDED
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    agency = relationship("Agency", back_populates="projects")
    contractor = relationship("Contractor", back_populates="projects")
