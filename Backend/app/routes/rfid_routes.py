from typing import List, Optional
from datetime import datetime
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, text
from app.database import get_db, engine
from app.models.worker import Worker, MaintenanceTask
from app.models.asset import Asset
from app.models.issue import InfrastructureIssue, IssueStatusEnum
from app.models.pothole import Pothole
from app.services.storage_service import storage_service
from app.schemas.rfid_schema import (
    RFIDScanRequest,
    RFIDScanResponse,
    WorkerCreate,
    WorkerResponse,
    MaintenanceTaskResponse,
    MaintenanceVerificationRequest,
)

router = APIRouter(prefix="/api/rfid", tags=["RFID Maintenance Tracking"])

# Ensure SQLite columns exist safely
def _ensure_sqlite_columns():
    try:
        with engine.connect() as conn:
            # Check existing columns in maintenance_tasks
            result = conn.execute(text("PRAGMA table_info(maintenance_tasks)")).fetchall()
            existing_cols = {row[1] for row in result}
            
            new_cols = [
                ("before_image", "VARCHAR(500)"),
                ("after_image", "VARCHAR(500)"),
                ("notes", "TEXT"),
                ("verification_notes", "TEXT"),
                ("verified_at", "DATETIME"),
                ("verified_by", "VARCHAR(100)"),
                ("start_latitude", "FLOAT"),
                ("start_longitude", "FLOAT"),
                ("end_latitude", "FLOAT"),
                ("end_longitude", "FLOAT"),
            ]
            
            for col_name, col_type in new_cols:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE maintenance_tasks ADD COLUMN {col_name} {col_type}"))
            conn.commit()
    except Exception as e:
        # Ignore if non-SQLite or columns already exist
        pass

_ensure_sqlite_columns()

def format_duration(seconds: Optional[float]) -> str:
    if seconds is None:
        return "N/A"
    sec = int(seconds)
    if sec < 60:
        return f"{sec}s"
    minutes = sec // 60
    rem_sec = sec % 60
    if minutes < 60:
        return f"{minutes}m {rem_sec}s"
    hours = minutes // 60
    rem_min = minutes % 60
    return f"{hours}h {rem_min}m"


@router.post("/scan", response_model=RFIDScanResponse)
def handle_rfid_scan(payload: RFIDScanRequest, db: Session = Depends(get_db)):
    """
    Handle RFID scan from an on-field IoT RFID Reader (e.g. ESP32 + RC522/PN532)
    or Web RFID Simulator.

    End-to-End Verification Lifecycle:
    - 1st scan starts maintenance session (Status: IN_PROGRESS).
      Records worker, RFID, issue, asset, start time, GPS location, and before image.
    - 2nd scan completes maintenance session (Status: PENDING_VERIFICATION).
      Records completion time, after image, notes, and end location.
      Transitions status to PENDING_VERIFICATION for civic authority review.
    """
    rfid_uid = payload.rfid_uid.strip().upper()

    # 1. Lookup Worker
    worker = db.query(Worker).filter(Worker.rfid_uid == rfid_uid, Worker.active == True).first()
    if not worker:
        raise HTTPException(
            status_code=404,
            detail=f"Worker with RFID UID '{payload.rfid_uid}' not registered or inactive."
        )

    # 2. Lookup Asset
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=404,
            detail=f"Asset with ID '{payload.asset_id}' not found."
        )

    now = datetime.utcnow()

    # 3. Check for existing active/in-progress maintenance task for this worker on this asset
    ongoing_task = (
        db.query(MaintenanceTask)
        .filter(
            MaintenanceTask.worker_id == worker.id,
            MaintenanceTask.asset_id == asset.id,
            MaintenanceTask.status == "IN_PROGRESS",
        )
        .first()
    )

    if not ongoing_task:
        # === 1ST SCAN: START MAINTENANCE ===
        # Resolve target issue: use payload issue_id if valid, or find active issue on this asset
        target_issue = None
        if payload.issue_id:
            target_issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == payload.issue_id).first()
        if not target_issue:
            target_issue = (
                db.query(InfrastructureIssue)
                .filter(
                    InfrastructureIssue.asset_id == asset.id,
                    InfrastructureIssue.status.in_([
                        IssueStatusEnum.REPORTED.value,
                        IssueStatusEnum.VERIFIED.value,
                        IssueStatusEnum.ASSIGNED.value,
                    ]),
                )
                .order_by(desc(InfrastructureIssue.id))
                .first()
            )

        # Resolve initial before image
        before_img = payload.before_image
        if not before_img and target_issue:
            if target_issue.pothole:
                before_img = target_issue.pothole.annotated_image_url or target_issue.pothole.image_url
            elif target_issue.pothole_id:
                pot = db.query(Pothole).filter(Pothole.id == target_issue.pothole_id).first()
                if pot:
                    before_img = pot.annotated_image_url or pot.image_url

        start_lat = payload.latitude if payload.latitude is not None else asset.latitude
        start_lng = payload.longitude if payload.longitude is not None else asset.longitude

        new_task = MaintenanceTask(
            worker_id=worker.id,
            asset_id=asset.id,
            issue_id=target_issue.id if target_issue else None,
            assigned_at=now,
            started_at=now,
            status="IN_PROGRESS",
            before_image=before_img,
            start_latitude=start_lat,
            start_longitude=start_lng,
            notes=payload.notes,
        )
        db.add(new_task)

        # Update Asset status to UNDER_MAINTENANCE
        asset.status = "UNDER_MAINTENANCE"

        # Update Issue status to IN_PROGRESS if linked
        if target_issue:
            target_issue.status = IssueStatusEnum.IN_PROGRESS.value

        db.commit()
        db.refresh(new_task)

        return RFIDScanResponse(
            status="SUCCESS",
            action="STARTED",
            message=f"Maintenance session STARTED by {worker.name} ({worker.role}) for {asset.name} at {start_lat:.4f}, {start_lng:.4f}.",
            task_id=new_task.id,
            worker_id=worker.id,
            worker_name=worker.name,
            worker_role=worker.role,
            worker_department=worker.department,
            asset_id=asset.id,
            asset_name=asset.name,
            asset_type=asset.type,
            issue_id=new_task.issue_id,
            started_at=new_task.started_at,
            completed_at=None,
            duration_seconds=None,
            formatted_duration=None,
            task_status=new_task.status,
            before_image=new_task.before_image,
            after_image=None,
            notes=new_task.notes,
        )

    else:
        # === 2ND SCAN: COMPLETE MAINTENANCE -> PENDING_VERIFICATION ===
        duration_seconds = 0.0
        if ongoing_task.started_at:
            duration_seconds = round(max(1.0, (now - ongoing_task.started_at).total_seconds()), 1)

        end_lat = payload.latitude if payload.latitude is not None else (ongoing_task.start_latitude or asset.latitude)
        end_lng = payload.longitude if payload.longitude is not None else (ongoing_task.start_longitude or asset.longitude)

        ongoing_task.completed_at = now
        ongoing_task.duration = duration_seconds
        ongoing_task.status = "PENDING_VERIFICATION"  # IN_PROGRESS -> PENDING_VERIFICATION -> RESOLVED
        
        if payload.after_image:
            ongoing_task.after_image = payload.after_image
        if payload.notes:
            ongoing_task.notes = payload.notes
        
        ongoing_task.end_latitude = end_lat
        ongoing_task.end_longitude = end_lng

        # If an issue was linked, advance it to PENDING_VERIFICATION
        if ongoing_task.issue_id:
            linked_issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == ongoing_task.issue_id).first()
            if linked_issue:
                linked_issue.status = IssueStatusEnum.PENDING_VERIFICATION.value

        db.commit()
        db.refresh(ongoing_task)

        fmt_dur = format_duration(duration_seconds)

        return RFIDScanResponse(
            status="SUCCESS",
            action="COMPLETED",
            message=f"Maintenance COMPLETED by {worker.name} on {asset.name} (Duration: {fmt_dur}). Submitted for Authority Verification.",
            task_id=ongoing_task.id,
            worker_id=worker.id,
            worker_name=worker.name,
            worker_role=worker.role,
            worker_department=worker.department,
            asset_id=asset.id,
            asset_name=asset.name,
            asset_type=asset.type,
            issue_id=ongoing_task.issue_id,
            started_at=ongoing_task.started_at,
            completed_at=ongoing_task.completed_at,
            duration_seconds=duration_seconds,
            formatted_duration=fmt_dur,
            task_status=ongoing_task.status,
            before_image=ongoing_task.before_image,
            after_image=ongoing_task.after_image,
            notes=ongoing_task.notes,
        )


@router.post("/tasks/{task_id}/verify", response_model=MaintenanceTaskResponse)
def verify_maintenance_task(
    task_id: int,
    payload: MaintenanceVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Civic Authority Action:
    - 'VERIFY': Approves repair proof, marks task and issue as RESOLVED, sets asset to OPERATIONAL.
    - 'REQUEST_REWORK': Rejects repair proof, marks task as REWORK_REQUESTED, returns issue to IN_PROGRESS.
    """
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Maintenance task #{task_id} not found.")

    action = payload.action.strip().upper()
    now = datetime.utcnow()

    if action == "VERIFY":
        task.status = "RESOLVED"
        task.verified_at = now
        task.verified_by = payload.verified_by or "Municipal Authority Inspector"
        task.verification_notes = payload.notes or "Quality verified by authority inspector."

        # Update linked Asset to OPERATIONAL
        if task.asset:
            task.asset.status = "OPERATIONAL"

        # Update linked Issue to RESOLVED
        if task.issue_id:
            issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == task.issue_id).first()
            if issue:
                issue.status = IssueStatusEnum.RESOLVED.value
                issue.resolved_at = now
                # If linked to pothole, update pothole as well
                if issue.pothole:
                    issue.pothole.status = "RESOLVED"
                    issue.pothole.resolved_at = now
                    if task.after_image:
                        issue.pothole.resolution_image_url = task.after_image
                    if payload.notes:
                        issue.pothole.resolution_notes = payload.notes
                elif issue.pothole_id:
                    pothole = db.query(Pothole).filter(Pothole.id == issue.pothole_id).first()
                    if pothole:
                        pothole.status = "RESOLVED"
                        pothole.resolved_at = now
                        if task.after_image:
                            pothole.resolution_image_url = task.after_image

    elif action == "REQUEST_REWORK":
        task.status = "REWORK_REQUESTED"
        task.verified_at = now
        task.verified_by = payload.verified_by or "Municipal Authority Inspector"
        task.verification_notes = payload.notes or "Rework requested: Surface patch uneven or debris remaining."

        # Keep asset UNDER_MAINTENANCE
        if task.asset:
            task.asset.status = "UNDER_MAINTENANCE"

        # Return linked issue to IN_PROGRESS so field technician re-attempts repair
        if task.issue_id:
            issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == task.issue_id).first()
            if issue:
                issue.status = IssueStatusEnum.IN_PROGRESS.value
                if issue.pothole:
                    issue.pothole.status = "IN_PROGRESS"

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid authority action '{payload.action}'. Expected 'VERIFY' or 'REQUEST_REWORK'."
        )

    db.commit()
    db.refresh(task)

    worker_dict = WorkerResponse.model_validate(task.worker) if task.worker else None
    return MaintenanceTaskResponse(
        id=task.id,
        issue_id=task.issue_id,
        asset_id=task.asset_id,
        worker_id=task.worker_id,
        assigned_at=task.assigned_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
        duration=task.duration,
        duration_formatted=format_duration(task.duration),
        status=task.status,
        before_image=task.before_image,
        after_image=task.after_image,
        notes=task.notes,
        verification_notes=task.verification_notes,
        verified_at=task.verified_at,
        verified_by=task.verified_by,
        start_latitude=task.start_latitude,
        start_longitude=task.start_longitude,
        end_latitude=task.end_latitude,
        end_longitude=task.end_longitude,
        worker=worker_dict,
        asset_name=task.asset.name if task.asset else None,
        asset_type=task.asset.type if task.asset else None,
        issue_type=task.issue.type if task.issue else None,
    )


@router.post("/tasks/{task_id}/upload-proof", response_model=MaintenanceTaskResponse)
async def upload_maintenance_proof(
    task_id: int,
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    db: Session = Depends(get_db),
):
    """
    Upload post-repair photo proof for a maintenance task and transition to PENDING_VERIFICATION.
    """
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Maintenance task #{task_id} not found.")

    file_bytes = await file.read()
    filename = f"repair_task_{task_id}_{uuid.uuid4().hex[:8]}.jpg"
    image_url = storage_service.save_bytes(file_bytes, filename, "image/jpeg")

    now = datetime.utcnow()
    task.after_image = image_url
    if notes:
        task.notes = notes
    if latitude is not None:
        task.end_latitude = latitude
    if longitude is not None:
        task.end_longitude = longitude

    if task.status == "IN_PROGRESS":
        task.completed_at = now
        if task.started_at:
            task.duration = round(max(1.0, (now - task.started_at).total_seconds()), 1)
        task.status = "PENDING_VERIFICATION"

        if task.issue_id:
            issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == task.issue_id).first()
            if issue:
                issue.status = IssueStatusEnum.PENDING_VERIFICATION.value

    db.commit()
    db.refresh(task)

    worker_dict = WorkerResponse.model_validate(task.worker) if task.worker else None
    return MaintenanceTaskResponse(
        id=task.id,
        issue_id=task.issue_id,
        asset_id=task.asset_id,
        worker_id=task.worker_id,
        assigned_at=task.assigned_at,
        started_at=task.started_at,
        completed_at=task.completed_at,
        duration=task.duration,
        duration_formatted=format_duration(task.duration),
        status=task.status,
        before_image=task.before_image,
        after_image=task.after_image,
        notes=task.notes,
        verification_notes=task.verification_notes,
        verified_at=task.verified_at,
        verified_by=task.verified_by,
        start_latitude=task.start_latitude,
        start_longitude=task.start_longitude,
        end_latitude=task.end_latitude,
        end_longitude=task.end_longitude,
        worker=worker_dict,
        asset_name=task.asset.name if task.asset else None,
        asset_type=task.asset.type if task.asset else None,
        issue_type=task.issue.type if task.issue else None,
    )


@router.get("/tasks", response_model=List[MaintenanceTaskResponse])
def get_maintenance_tasks(
    status: Optional[str] = None,
    worker_id: Optional[int] = None,
    asset_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List maintenance tasks with joined worker, asset, and verification status info"""
    query = db.query(MaintenanceTask)
    if status:
        query = query.filter(MaintenanceTask.status == status.upper())
    if worker_id:
        query = query.filter(MaintenanceTask.worker_id == worker_id)
    if asset_id:
        query = query.filter(MaintenanceTask.asset_id == asset_id)

    tasks = query.order_by(desc(MaintenanceTask.id)).limit(limit).all()

    result = []
    for t in tasks:
        worker_dict = WorkerResponse.model_validate(t.worker) if t.worker else None
        result.append(
            MaintenanceTaskResponse(
                id=t.id,
                issue_id=t.issue_id,
                asset_id=t.asset_id,
                worker_id=t.worker_id,
                assigned_at=t.assigned_at,
                started_at=t.started_at,
                completed_at=t.completed_at,
                duration=t.duration,
                duration_formatted=format_duration(t.duration),
                status=t.status,
                before_image=t.before_image,
                after_image=t.after_image,
                notes=t.notes,
                verification_notes=t.verification_notes,
                verified_at=t.verified_at,
                verified_by=t.verified_by,
                start_latitude=t.start_latitude,
                start_longitude=t.start_longitude,
                end_latitude=t.end_latitude,
                end_longitude=t.end_longitude,
                worker=worker_dict,
                asset_name=t.asset.name if t.asset else None,
                asset_type=t.asset.type if t.asset else None,
                issue_type=t.issue.type if t.issue else None,
            )
        )
    return result


@router.get("/workers", response_model=List[WorkerResponse])
def get_workers(
    department: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
):
    """List registered field workers and their RFID tags"""
    query = db.query(Worker)
    if active_only:
        query = query.filter(Worker.active == True)
    if department:
        query = query.filter(Worker.department == department)
    return query.order_by(Worker.name).all()


@router.post("/workers", response_model=WorkerResponse)
def register_worker(worker_in: WorkerCreate, db: Session = Depends(get_db)):
    """Register a new field maintenance worker with an RFID badge"""
    existing = db.query(Worker).filter(Worker.rfid_uid == worker_in.rfid_uid.upper()).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Worker with RFID UID '{worker_in.rfid_uid}' already exists."
        )

    worker = Worker(
        name=worker_in.name,
        rfid_uid=worker_in.rfid_uid.upper(),
        department=worker_in.department,
        role=worker_in.role,
        active=True,
    )
    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker


@router.get("/stats")
def get_rfid_stats(db: Session = Depends(get_db)):
    """Get high level metrics for RFID worker tracking & verification dashboard"""
    total_workers = db.query(Worker).filter(Worker.active == True).count()
    active_sessions = db.query(MaintenanceTask).filter(MaintenanceTask.status == "IN_PROGRESS").count()
    pending_verification = db.query(MaintenanceTask).filter(MaintenanceTask.status == "PENDING_VERIFICATION").count()
    completed_tasks = db.query(MaintenanceTask).filter(
        MaintenanceTask.status.in_(["COMPLETED", "RESOLVED", "PENDING_VERIFICATION"])
    ).count()
    resolved_tasks = db.query(MaintenanceTask).filter(MaintenanceTask.status == "RESOLVED").count()
    rework_tasks = db.query(MaintenanceTask).filter(MaintenanceTask.status == "REWORK_REQUESTED").count()
    
    # Calculate avg duration for completed/resolved
    durations = db.query(MaintenanceTask.duration).filter(
        MaintenanceTask.duration != None
    ).all()
    avg_duration = 0.0
    if durations:
        avg_duration = round(sum(d[0] for d in durations if d[0]) / len(durations), 1)

    return {
        "total_workers": total_workers,
        "active_sessions": active_sessions,
        "pending_verification": pending_verification,
        "completed_tasks": completed_tasks,
        "resolved_tasks": resolved_tasks,
        "rework_tasks": rework_tasks,
        "avg_duration_seconds": avg_duration,
        "avg_duration_formatted": format_duration(avg_duration),
    }
