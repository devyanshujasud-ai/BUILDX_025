from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False, index=True)  # e.g. STREETLIGHT, DUSTBIN, ROAD_SEGMENT, TRAFFIC_SIGNAL
    name = Column(String(200), nullable=False)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    status = Column(String(50), default="OPERATIONAL", index=True)  # OPERATIONAL, UNDER_MAINTENANCE, DAMAGED, INACTIVE
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    issues = relationship("InfrastructureIssue", back_populates="asset", cascade="all, delete-orphan")
