from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.authority import CivicAuthority
from app.schemas.authority_schema import CivicAuthorityResponse, CivicAuthorityCreate
from app.services.authority_service import authority_service

router = APIRouter(prefix="/api/authorities", tags=["Civic Authorities"])

@router.get("", response_model=List[CivicAuthorityResponse])
def get_authorities(db: Session = Depends(get_db)):
    """List all registered civic authorities (NMC, PWD, NHAI, NIT, etc.)"""
    authorities = db.query(CivicAuthority).filter(CivicAuthority.active == True).all()
    return authorities

@router.get("/{id}", response_model=CivicAuthorityResponse)
def get_authority_by_id(id: int, db: Session = Depends(get_db)):
    """Get single authority details by ID"""
    authority = db.query(CivicAuthority).filter(CivicAuthority.id == id).first()
    if not authority:
        raise HTTPException(status_code=404, detail="Civic authority not found")
    return authority

@router.post("", response_model=CivicAuthorityResponse)
def create_authority(auth_in: CivicAuthorityCreate, db: Session = Depends(get_db)):
    """Create a new civic authority boundary"""
    existing = db.query(CivicAuthority).filter(CivicAuthority.code == auth_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Authority with this code already exists")

    auth = CivicAuthority(**auth_in.model_dump())
    db.add(auth)
    db.commit()
    db.refresh(auth)
    return auth

@router.post("/lookup")
def lookup_authority_by_coordinates(lat: float, lng: float, road_type: Optional[str] = "URBAN_ROAD", db: Session = Depends(get_db)):
    """Lookup the responsible civic authority for given latitude and longitude"""
    loc_details = authority_service.reverse_geocode(lat, lng)
    auth = authority_service.resolve_authority_for_location(db, lat, lng, road_type or loc_details.get("road_type"))
    return {
        "location": {
            "latitude": lat,
            "longitude": lng,
            **loc_details
        },
        "authority": CivicAuthorityResponse.model_validate(auth) if auth else None
    }
