from sqlalchemy import Column, Integer, String, Text, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base

class CivicAuthority(Base):
    __tablename__ = "civic_authorities"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True) # e.g. NMC, Maharashtra PWD, NHAI Nagpur
    code = Column(String(20), nullable=False, unique=True) # e.g. NMC-HQ, NMC-PWD, NHAI-NGP
    full_name = Column(String(200), nullable=False)
    department = Column(String(100), default="Road & Infrastructure Division")
    contact_email = Column(String(100), nullable=False)
    contact_phone = Column(String(50), nullable=True)
    escalation_email = Column(String(100), nullable=True)
    sla_hours = Column(Integer, default=48) # Target resolution time
    jurisdiction_type = Column(String(50), default="MUNICIPAL") # MUNICIPAL, STATE_HIGHWAY, NATIONAL_HIGHWAY
    boundary_geojson = Column(Text, nullable=True) # GeoJSON polygon boundary
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
