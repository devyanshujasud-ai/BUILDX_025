from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.asset import Asset
from app.schemas.asset_schema import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter(prefix="/api/assets", tags=["Assets Management"])

@router.get("", response_model=List[AssetResponse])
def get_assets(
    type: Optional[str] = Query(None, description="Filter by asset type (e.g. STREETLIGHT, DUSTBIN, ROAD_SEGMENT)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by asset status"),
    search: Optional[str] = Query(None, description="Search by asset name or department"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """List all infrastructure assets with optional filtering"""
    query = db.query(Asset)
    if type:
        query = query.filter(Asset.type == type.upper())
    if department:
        query = query.filter(Asset.department.ilike(f"%{department}%"))
    if status:
        query = query.filter(Asset.status == status.upper())
    if search:
        query = query.filter(
            (Asset.name.ilike(f"%{search}%")) | (Asset.department.ilike(f"%{search}%"))
        )

    return query.order_by(desc(Asset.created_at)).offset(offset).limit(limit).all()

@router.get("/{id}", response_model=AssetResponse)
def get_asset_by_id(id: int, db: Session = Depends(get_db)):
    """Retrieve single asset by ID"""
    asset = db.query(Asset).filter(Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.post("", response_model=AssetResponse, status_code=201)
def create_asset(asset_in: AssetCreate, db: Session = Depends(get_db)):
    """Register a new physical infrastructure asset"""
    asset = Asset(
        type=asset_in.type.upper(),
        name=asset_in.name,
        latitude=asset_in.latitude,
        longitude=asset_in.longitude,
        department=asset_in.department,
        status=asset_in.status.upper() if asset_in.status else "OPERATIONAL"
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset

@router.put("/{id}", response_model=AssetResponse)
def update_asset(id: int, asset_in: AssetUpdate, db: Session = Depends(get_db)):
    """Update asset attributes (location, status, department, etc.)"""
    asset = db.query(Asset).filter(Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = asset_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ("type", "status") and value:
            setattr(asset, field, value.upper())
        elif value is not None:
            setattr(asset, field, value)

    db.commit()
    db.refresh(asset)
    return asset

@router.delete("/{id}")
def delete_asset(id: int, db: Session = Depends(get_db)):
    """Delete an asset and cascade issues"""
    asset = db.query(Asset).filter(Asset.id == id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    db.delete(asset)
    db.commit()
    return {"message": f"Asset {id} successfully deleted"}
