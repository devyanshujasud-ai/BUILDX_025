from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.construction import (
    Agency,
    Contractor,
    ConstructionProject,
)
from app.schemas.construction_schema import (
    AgencyCreate,
    AgencyResponse,
    ContractorCreate,
    ContractorResponse,
    ConstructionProjectCreate,
    ConstructionProjectResponse,
    ConflictDetail,
)
from app.services.coordination_service import coordination_service

router = APIRouter(prefix="/api/construction", tags=["Construction & Work Coordination"])

def build_project_response(p: ConstructionProject, db: Session) -> ConstructionProjectResponse:
    conflicts = coordination_service.detect_conflicts_for_project(p, db)
    return ConstructionProjectResponse(
        id=p.id,
        project_id=p.project_id,
        location=p.location,
        agency_id=p.agency_id,
        contractor_id=p.contractor_id,
        work_type=p.work_type,
        start_date=p.start_date,
        end_date=p.end_date,
        status=p.status,
        description=p.description,
        latitude=p.latitude,
        longitude=p.longitude,
        created_at=p.created_at,
        updated_at=p.updated_at,
        agency=AgencyResponse.model_validate(p.agency) if p.agency else None,
        contractor=ContractorResponse.model_validate(p.contractor) if p.contractor else None,
        conflicts=conflicts,
        has_conflict=len(conflicts) > 0,
    )

@router.get("/projects", response_model=List[ConstructionProjectResponse])
def get_projects(
    status: Optional[str] = None,
    work_type: Optional[str] = None,
    agency_id: Optional[int] = None,
    has_conflict: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    """List construction projects with real-time multi-agency coordination conflict detection"""
    query = db.query(ConstructionProject)
    if status:
        query = query.filter(ConstructionProject.status == status.upper())
    if work_type:
        query = query.filter(ConstructionProject.work_type == work_type.upper())
    if agency_id:
        query = query.filter(ConstructionProject.agency_id == agency_id)

    projects = query.order_by(desc(ConstructionProject.id)).limit(limit).all()

    responses = [build_project_response(p, db) for p in projects]
    if has_conflict is not None:
        responses = [r for r in responses if r.has_conflict == has_conflict]

    return responses

@router.post("/projects", response_model=ConstructionProjectResponse)
def create_project(project_in: ConstructionProjectCreate, db: Session = Depends(get_db)):
    """
    Register a new construction/utility trenching project permit.
    Automatically checks for spatial-temporal collisions against existing planned & active projects.
    """
    existing = db.query(ConstructionProject).filter(ConstructionProject.project_id == project_in.project_id).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Project with ID '{project_in.project_id}' already exists."
        )

    # Validate agency
    agency = db.query(Agency).filter(Agency.id == project_in.agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail=f"Agency with ID {project_in.agency_id} not found.")

    if project_in.contractor_id:
        contractor = db.query(Contractor).filter(Contractor.id == project_in.contractor_id).first()
        if not contractor:
            raise HTTPException(status_code=404, detail=f"Contractor with ID {project_in.contractor_id} not found.")

    new_project = ConstructionProject(**project_in.model_dump())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return build_project_response(new_project, db)

@router.get("/conflicts", response_model=List[ConflictDetail])
def get_all_conflicts(db: Session = Depends(get_db)):
    """Retrieve all active multi-agency spatial-temporal coordination conflicts across the city"""
    active_projects = (
        db.query(ConstructionProject)
        .filter(ConstructionProject.status.in_(["PLANNED", "ACTIVE"]))
        .all()
    )

    all_conflicts = []
    seen_pairs = set()

    for p in active_projects:
        conflicts = coordination_service.detect_conflicts_for_project(p, db)
        for c in conflicts:
            pair = tuple(sorted([p.id, c.conflicting_project_id]))
            if pair not in seen_pairs:
                seen_pairs.add(pair)
                all_conflicts.append(c)

    return all_conflicts

@router.get("/agencies", response_model=List[AgencyResponse])
def get_agencies(db: Session = Depends(get_db)):
    """List registered utility & infrastructure agencies"""
    return db.query(Agency).filter(Agency.active == True).order_by(Agency.name).all()

@router.post("/agencies", response_model=AgencyResponse)
def create_agency(agency_in: AgencyCreate, db: Session = Depends(get_db)):
    """Register a new public utility or civic agency"""
    existing = db.query(Agency).filter(Agency.code == agency_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Agency with code '{agency_in.code}' already exists.")
    agency = Agency(**agency_in.model_dump())
    db.add(agency)
    db.commit()
    db.refresh(agency)
    return agency

@router.get("/contractors", response_model=List[ContractorResponse])
def get_contractors(db: Session = Depends(get_db)):
    """List registered contractors"""
    return db.query(Contractor).filter(Contractor.active == True).order_by(Contractor.name).all()

@router.post("/contractors", response_model=ContractorResponse)
def create_contractor(contractor_in: ContractorCreate, db: Session = Depends(get_db)):
    """Register a civil works contractor"""
    contractor = Contractor(**contractor_in.model_dump())
    db.add(contractor)
    db.commit()
    db.refresh(contractor)
    return contractor
