from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.pothole_schema import PotholeResponse
from app.schemas.authority_schema import CivicAuthorityResponse

class CivicTicketBase(BaseModel):
    pothole_id: int
    authority_id: int
    email_sent: bool = False
    email_recipient: Optional[str] = None
    sms_sent: bool = False
    sms_recipient: Optional[str] = None
    webhook_dispatched: bool = False
    dispatch_log: Optional[str] = None

class CivicTicketResponse(CivicTicketBase):
    id: int
    ticket_code: str
    created_at: datetime
    pothole: Optional[PotholeResponse] = None
    authority: Optional[CivicAuthorityResponse] = None

    class Config:
        from_attributes = True
