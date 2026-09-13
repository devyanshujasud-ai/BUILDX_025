from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class CivicTicket(Base):
    __tablename__ = "civic_tickets"

    id = Column(Integer, primary_key=True, index=True)
    ticket_code = Column(String(50), unique=True, index=True, nullable=False)
    pothole_id = Column(Integer, ForeignKey("potholes.id"), nullable=False)
    authority_id = Column(Integer, ForeignKey("civic_authorities.id"), nullable=False)
    
    # Notification channel status
    email_sent = Column(Boolean, default=False)
    email_recipient = Column(String(100), nullable=True)
    sms_sent = Column(Boolean, default=False)
    sms_recipient = Column(String(50), nullable=True)
    webhook_dispatched = Column(Boolean, default=False)
    
    # Audit log / History payload
    dispatch_log = Column(Text, nullable=True) # JSON or text trace
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    pothole = relationship("Pothole", backref="tickets")
    authority = relationship("CivicAuthority", backref="tickets")
