import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.pothole import Pothole, PotholeStatusHistory, StatusEnum, SeverityEnum
from app.models.authority import CivicAuthority
from app.schemas.pothole_schema import (
    PotholeResponse,
    PotholeStatusHistoryResponse,
    PotholeStatusUpdate,
)
from app.services.storage_service import storage_service

router = APIRouter(prefix="/api/potholes", tags=["Potholes Management"])

@router.get("", response_model=List[PotholeResponse])
def get_potholes(
    status: Optional[str] = Query(None, description="Filter by status (REPORTED, ACKNOWLEDGED, IN_PROGRESS, RESOLVED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    authority_id: Optional[int] = Query(None, description="Filter by authority ID"),
    zone: Optional[str] = Query(None, description="Filter by zone/suburb"),
    search: Optional[str] = Query(None, description="Search in road name, address, or ticket code"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List all detected and reported potholes with multi-criteria filtering"""
    query = db.query(Pothole)

    if status:
        query = query.filter(Pothole.status == status.upper())
    if severity:
        query = query.filter(Pothole.severity == severity.upper())
    if authority_id:
        query = query.filter(Pothole.authority_id == authority_id)
    if zone:
        query = query.filter(Pothole.zone.ilike(f"%{zone}%"))
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Pothole.ticket_code.ilike(search_pattern)) |
            (Pothole.road_name.ilike(search_pattern)) |
            (Pothole.address.ilike(search_pattern)) |
            (Pothole.city.ilike(search_pattern))
        )

    potholes = query.order_by(desc(Pothole.detected_at)).offset(offset).limit(limit).all()
    return potholes

@router.get("/stats/summary")
def get_pothole_stats(db: Session = Depends(get_db)):
    """Summary metrics and aggregations for dashboard KPIs & charts"""
    total = db.query(Pothole).count()
    reported = db.query(Pothole).filter(Pothole.status == StatusEnum.REPORTED.value).count()
    acknowledged = db.query(Pothole).filter(Pothole.status == StatusEnum.ACKNOWLEDGED.value).count()
    in_progress = db.query(Pothole).filter(Pothole.status == StatusEnum.IN_PROGRESS.value).count()
    resolved = db.query(Pothole).filter(Pothole.status == StatusEnum.RESOLVED.value).count()

    critical = db.query(Pothole).filter(Pothole.severity == SeverityEnum.CRITICAL.value).count()
    high = db.query(Pothole).filter(Pothole.severity == SeverityEnum.HIGH.value).count()
    medium = db.query(Pothole).filter(Pothole.severity == SeverityEnum.MEDIUM.value).count()
    low = db.query(Pothole).filter(Pothole.severity == SeverityEnum.LOW.value).count()

    # Potholes grouped by Civic Authority
    auth_breakdown = []
    authorities = db.query(CivicAuthority).all()
    for auth in authorities:
        auth_total = db.query(Pothole).filter(Pothole.authority_id == auth.id).count()
        auth_resolved = db.query(Pothole).filter(
            (Pothole.authority_id == auth.id) & (Pothole.status == StatusEnum.RESOLVED.value)
        ).count()
        auth_breakdown.append({
            "id": auth.id,
            "name": auth.name,
            "code": auth.code,
            "total": auth_total,
            "resolved": auth_resolved,
            "pending": auth_total - auth_resolved,
            "sla_hours": auth.sla_hours
        })

    resolution_rate = round((resolved / max(1, total)) * 100, 1)

    return {
        "total_potholes": total,
        "status_distribution": {
            "REPORTED": reported,
            "ACKNOWLEDGED": acknowledged,
            "IN_PROGRESS": in_progress,
            "RESOLVED": resolved
        },
        "severity_distribution": {
            "CRITICAL": critical,
            "HIGH": high,
            "MEDIUM": medium,
            "LOW": low
        },
        "resolution_rate_percent": resolution_rate,
        "authorities_breakdown": auth_breakdown
    }

@router.get("/{id}", response_model=PotholeResponse)
def get_pothole_by_id(id: int, db: Session = Depends(get_db)):
    """Get single pothole details by ID"""
    pothole = db.query(Pothole).filter(Pothole.id == id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole record not found")
    return pothole

@router.get("/{id}/status-history", response_model=List[PotholeStatusHistoryResponse])
def get_pothole_status_history(id: int, db: Session = Depends(get_db)):
    """Get the status audit trail for one pothole record"""
    pothole = db.query(Pothole).filter(Pothole.id == id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole record not found")
    return (
        db.query(PotholeStatusHistory)
        .filter(PotholeStatusHistory.pothole_id == id)
        .order_by(PotholeStatusHistory.created_at)
        .all()
    )

@router.patch("/{id}/status", response_model=PotholeResponse)
def update_pothole_status(
    id: int,
    status_update: PotholeStatusUpdate,
    db: Session = Depends(get_db)
):
    """Updates the status and lifecycle timestamps of a pothole (e.g. REPORTED -> RESOLVED)"""
    pothole = db.query(Pothole).filter(Pothole.id == id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole record not found")

    new_status = status_update.status.upper()
    valid_statuses = [s.value for s in StatusEnum]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    previous_status = pothole.status
    pothole.status = new_status
    now = datetime.datetime.now()

    if new_status == StatusEnum.ACKNOWLEDGED.value and not pothole.acknowledged_at:
        pothole.acknowledged_at = now
    elif new_status == StatusEnum.IN_PROGRESS.value and not pothole.in_progress_at:
        pothole.in_progress_at = now
    elif new_status == StatusEnum.RESOLVED.value:
        pothole.resolved_at = now
        if status_update.resolution_notes:
            pothole.resolution_notes = status_update.resolution_notes
        if status_update.resolution_image_url:
            pothole.resolution_image_url = status_update.resolution_image_url

    pothole.updated_at = now
    if previous_status != new_status:
        db.add(PotholeStatusHistory(
            pothole_id=pothole.id,
            from_status=previous_status,
            to_status=new_status,
            changed_by=status_update.changed_by or "System",
            notes=status_update.resolution_notes
        ))
    db.commit()
    db.refresh(pothole)
    return pothole

@router.post("/{id}/resolution-proof", response_model=PotholeResponse)
async def upload_resolution_proof(
    id: int,
    file: UploadFile = File(...),
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Uploads a post-repair photo proof and marks pothole as RESOLVED"""
    pothole = db.query(Pothole).filter(Pothole.id == id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")

    file_bytes = await file.read()
    image_url = storage_service.save_bytes(file_bytes, f"repair_{id}.jpg", "image/jpeg")

    previous_status = pothole.status
    pothole.status = StatusEnum.RESOLVED.value
    pothole.resolved_at = datetime.datetime.now()
    pothole.resolution_image_url = image_url
    if notes:
        pothole.resolution_notes = notes
    if previous_status != StatusEnum.RESOLVED.value:
        db.add(PotholeStatusHistory(
            pothole_id=pothole.id,
            from_status=previous_status,
            to_status=StatusEnum.RESOLVED.value,
            changed_by="Resolution proof upload",
            notes=notes
        ))

    db.commit()
    db.refresh(pothole)
    return pothole

@router.delete("/{id}")
def delete_pothole(id: int, db: Session = Depends(get_db)):
    """Deletes a pothole record and associated tickets"""
    pothole = db.query(Pothole).filter(Pothole.id == id).first()
    if not pothole:
        raise HTTPException(status_code=404, detail="Pothole not found")

    # Delete related tickets
    for t in pothole.tickets:
        db.delete(t)

    db.delete(pothole)
    db.commit()
    return {"message": "Pothole record deleted successfully", "id": id}
