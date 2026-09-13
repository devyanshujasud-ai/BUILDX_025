from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.ticket import CivicTicket
from app.models.pothole import Pothole
from app.schemas.ticket_schema import CivicTicketResponse
from app.services.report_service import report_service
from app.services.notification_service import notification_service

router = APIRouter(prefix="/api/tickets", tags=["Civic Tickets & Reports"])

@router.get("", response_model=List[CivicTicketResponse])
def get_tickets(limit: int = 50, db: Session = Depends(get_db)):
    """List recent civic grievance tickets and dispatch status"""
    tickets = db.query(CivicTicket).order_by(desc(CivicTicket.created_at)).limit(limit).all()
    return tickets

@router.get("/{ticket_code}/download-pdf")
def download_ticket_pdf(ticket_code: str, db: Session = Depends(get_db)):
    """Download official incident PDF report for civic authorities"""
    pothole = db.query(Pothole).filter(Pothole.ticket_code == ticket_code).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole ticket not found")

    pdf_bytes = report_service.generate_pothole_pdf(pothole, pothole.authority)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=Incident_Report_{ticket_code}.pdf"
        }
    )

@router.post("/{id}/resend-alert")
def resend_ticket_alert(id: int, db: Session = Depends(get_db)):
    """Resend automated notification email/SMS to civic authority"""
    ticket = db.query(CivicTicket).filter(CivicTicket.id == id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    pothole = ticket.pothole
    auth = ticket.authority
    if not auth:
        raise HTTPException(status_code=400, detail="No authority associated with this ticket")

    dispatch_res = notification_service.send_civic_alert(
        auth.contact_email,
        auth.name,
        ticket.ticket_code,
        {
            "severity": pothole.severity,
            "severity_score": pothole.severity_score,
            "latitude": pothole.latitude,
            "longitude": pothole.longitude,
            "road_name": pothole.road_name,
            "zone": pothole.zone,
            "address": pothole.address,
            "road_type": pothole.road_type,
            "confidence": pothole.confidence,
            "annotated_image_url": pothole.annotated_image_url,
            "image_url": pothole.image_url
        }
    )

    ticket.email_sent = dispatch_res["email_sent"]
    ticket.sms_sent = dispatch_res["sms_sent"]
    ticket.dispatch_log += f" | Resent: {dispatch_res['log']}"
    db.commit()

    return {"message": "Alert notification resent successfully", "dispatch": dispatch_res}
