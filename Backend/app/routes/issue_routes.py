from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from app.database import get_db
from app.models.issue import (
    InfrastructureIssue,
    IssueTypeEnum,
    IssueStatusEnum,
    IssueSeverityEnum,
    IssuePriorityEnum,
)
from app.models.asset import Asset
from app.schemas.issue_schema import (
    InfrastructureIssueCreate,
    InfrastructureIssueUpdate,
    InfrastructureIssueStatusUpdate,
    InfrastructureIssueResponse,
    IssueStatsSummary,
)
from app.services.priority_service import priority_service

router = APIRouter(prefix="/api/issues", tags=["Infrastructure Issues Management"])

@router.get("", response_model=List[InfrastructureIssueResponse])
def get_issues(
    type: Optional[str] = Query(None, description="Filter by issue type (POTHOLE, STREETLIGHT, DUSTBIN, ROAD_DAMAGE, CONSTRUCTION, OTHER)"),
    status: Optional[str] = Query(None, description="Filter by status (REPORTED, VERIFIED, ASSIGNED, IN_PROGRESS, PENDING_VERIFICATION, RESOLVED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    priority: Optional[str] = Query(None, description="Filter by priority (LOW, MEDIUM, HIGH, CRITICAL)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    asset_id: Optional[int] = Query(None, description="Filter by associated asset ID"),
    search: Optional[str] = Query(None, description="Search description or department"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List all infrastructure issues with filtering options"""
    query = db.query(InfrastructureIssue)

    if type:
        query = query.filter(InfrastructureIssue.type == type.upper())
    if status:
        query = query.filter(InfrastructureIssue.status == status.upper())
    if severity:
        query = query.filter(InfrastructureIssue.severity == severity.upper())
    if priority:
        query = query.filter(InfrastructureIssue.priority == priority.upper())
    if department:
        query = query.filter(InfrastructureIssue.department.ilike(f"%{department}%"))
    if asset_id:
        query = query.filter(InfrastructureIssue.asset_id == asset_id)
    if search:
        query = query.filter(
            (InfrastructureIssue.description.ilike(f"%{search}%")) |
            (InfrastructureIssue.department.ilike(f"%{search}%"))
        )

    return query.order_by(desc(InfrastructureIssue.created_at)).offset(offset).limit(limit).all()

@router.get("/stats/summary", response_model=IssueStatsSummary)
def get_issues_stats(db: Session = Depends(get_db)):
    """Summary metrics of infrastructure issues for Vikasit Nagpur intelligence dashboards"""
    total = db.query(InfrastructureIssue).count()

    # By Status
    status_counts = dict(
        db.query(InfrastructureIssue.status, func.count(InfrastructureIssue.id))
        .group_by(InfrastructureIssue.status)
        .all()
    )

    # By Type
    type_counts = dict(
        db.query(InfrastructureIssue.type, func.count(InfrastructureIssue.id))
        .group_by(InfrastructureIssue.type)
        .all()
    )

    # By Severity
    severity_counts = dict(
        db.query(InfrastructureIssue.severity, func.count(InfrastructureIssue.id))
        .group_by(InfrastructureIssue.severity)
        .all()
    )

    # By Priority
    priority_counts = dict(
        db.query(InfrastructureIssue.priority, func.count(InfrastructureIssue.id))
        .group_by(InfrastructureIssue.priority)
        .all()
    )

    # By Department
    dept_counts = dict(
        db.query(InfrastructureIssue.department, func.count(InfrastructureIssue.id))
        .group_by(InfrastructureIssue.department)
        .all()
    )

    resolved_count = status_counts.get(IssueStatusEnum.RESOLVED.value, 0)
    resolution_rate = round((resolved_count / total * 100), 1) if total > 0 else 0.0

    return {
        "total_issues": total,
        "by_status": status_counts,
        "by_type": type_counts,
        "by_severity": severity_counts,
        "by_priority": priority_counts,
        "by_department": dept_counts,
        "resolution_rate_percent": resolution_rate,
    }

@router.get("/{id}", response_model=InfrastructureIssueResponse)
def get_issue_by_id(id: int, db: Session = Depends(get_db)):
    """Retrieve single infrastructure issue with asset and details"""
    issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Infrastructure issue not found")
    return issue

@router.post("", response_model=InfrastructureIssueResponse, status_code=201)
def create_issue(issue_in: InfrastructureIssueCreate, db: Session = Depends(get_db)):
    """
    Create a new civic infrastructure issue (Citizen, AI, Inspection, or IoT).
    Automatically runs department routing and rule-based priority calculation.
    """
    # Normalize type
    issue_type = issue_in.type.upper()
    valid_types = [t.value for t in IssueTypeEnum]
    if issue_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid issue type '{issue_type}'. Must be one of: {', '.join(valid_types)}"
        )

    # Check asset if provided
    asset = None
    if issue_in.asset_id:
        asset = db.query(Asset).filter(Asset.id == issue_in.asset_id).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Referenced Asset not found")

    # 1. Automatic Department Routing:
    # POTHOLE / ROAD_DAMAGE -> Roads/PWD
    # STREETLIGHT -> Electrical
    # DUSTBIN -> Sanitation
    # CONSTRUCTION -> Works
    # OTHER -> General Civic
    department = issue_in.department or priority_service.route_department(issue_type)

    # 2. Automatic Rule-based Priority Scoring:
    # Inputs: severity, issue age (0 on create), report count, asset type, nearby school/hospital/bus stop
    severity = (issue_in.severity or IssueSeverityEnum.MEDIUM.value).upper()
    report_count = max(1, issue_in.report_count or 1)
    asset_type = asset.type if asset else None

    calculated_priority, priority_reason = priority_service.calculate_priority_and_reason(
        severity=severity,
        issue_created_at=None,
        report_count=report_count,
        asset_type=asset_type,
        latitude=issue_in.latitude,
        longitude=issue_in.longitude,
    )

    priority = (issue_in.priority or calculated_priority).upper()
    status = (issue_in.status or IssueStatusEnum.REPORTED.value).upper()

    issue = InfrastructureIssue(
        asset_id=issue_in.asset_id,
        type=issue_type,
        source=issue_in.source or "CITIZEN",
        description=issue_in.description,
        latitude=issue_in.latitude,
        longitude=issue_in.longitude,
        severity=severity,
        priority=priority,
        priority_reason=priority_reason,
        report_count=report_count,
        department=department,
        status=status,
    )

    if status == IssueStatusEnum.RESOLVED.value:
        issue.resolved_at = datetime.now(timezone.utc)

    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue

@router.put("/{id}", response_model=InfrastructureIssueResponse)
def update_issue(id: int, issue_in: InfrastructureIssueUpdate, db: Session = Depends(get_db)):
    """
    Update issue details.
    Automatically re-evaluates priority and department routing based on updated inputs.
    """
    issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Infrastructure issue not found")

    update_data = issue_in.model_dump(exclude_unset=True)

    asset = None
    if "asset_id" in update_data and update_data["asset_id"] is not None:
        asset = db.query(Asset).filter(Asset.id == update_data["asset_id"]).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Referenced Asset not found")
    elif issue.asset_id:
        asset = db.query(Asset).filter(Asset.id == issue.asset_id).first()

    for field, value in update_data.items():
        if field in ("type", "status", "severity", "priority") and value:
            val_upper = value.upper()
            setattr(issue, field, val_upper)
            if field == "status" and val_upper == IssueStatusEnum.RESOLVED.value and not issue.resolved_at:
                issue.resolved_at = datetime.now(timezone.utc)
            elif field == "status" and val_upper != IssueStatusEnum.RESOLVED.value:
                issue.resolved_at = None
        elif value is not None:
            setattr(issue, field, value)

    # Automatically re-run Department Routing if not explicitly specified in payload
    if "department" not in update_data or not update_data["department"]:
        issue.department = priority_service.route_department(issue.type)

    # Automatically re-run Priority Scoring based on updated attributes
    asset_type = asset.type if asset else None
    calculated_priority, priority_reason = priority_service.calculate_priority_and_reason(
        severity=issue.severity,
        issue_created_at=issue.created_at,
        report_count=issue.report_count or 1,
        asset_type=asset_type,
        latitude=issue.latitude,
        longitude=issue.longitude,
    )

    if "priority" not in update_data or not update_data["priority"]:
        issue.priority = calculated_priority
    issue.priority_reason = priority_reason

    db.commit()
    db.refresh(issue)
    return issue

@router.patch("/{id}/status", response_model=InfrastructureIssueResponse)
def update_issue_status(id: int, status_in: InfrastructureIssueStatusUpdate, db: Session = Depends(get_db)):
    """Directly transition issue status (e.g. REPORTED -> VERIFIED -> IN_PROGRESS -> RESOLVED)"""
    issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Infrastructure issue not found")

    new_status = status_in.status.upper()
    valid_statuses = [s.value for s in IssueStatusEnum]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}"
        )

    issue.status = new_status
    if new_status == IssueStatusEnum.RESOLVED.value:
        issue.resolved_at = datetime.now(timezone.utc)
    else:
        issue.resolved_at = None

    if status_in.notes and issue.description:
        issue.description = f"{issue.description}\n[Update]: {status_in.notes}"
    elif status_in.notes:
        issue.description = status_in.notes

    # Re-evaluate priority reason to reflect current age
    asset = db.query(Asset).filter(Asset.id == issue.asset_id).first() if issue.asset_id else None
    asset_type = asset.type if asset else None
    calculated_priority, priority_reason = priority_service.calculate_priority_and_reason(
        severity=issue.severity,
        issue_created_at=issue.created_at,
        report_count=issue.report_count or 1,
        asset_type=asset_type,
        latitude=issue.latitude,
        longitude=issue.longitude,
    )
    issue.priority = calculated_priority
    issue.priority_reason = priority_reason

    db.commit()
    db.refresh(issue)
    return issue

@router.delete("/{id}")
def delete_issue(id: int, db: Session = Depends(get_db)):
    """Delete an infrastructure issue record"""
    issue = db.query(InfrastructureIssue).filter(InfrastructureIssue.id == id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Infrastructure issue not found")

    db.delete(issue)
    db.commit()
    return {"message": f"Infrastructure issue {id} deleted successfully"}
