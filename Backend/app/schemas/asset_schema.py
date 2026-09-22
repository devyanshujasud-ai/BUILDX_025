from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class AssetBase(BaseModel):
    type: str
    name: str
    latitude: float
    longitude: float
    department: str
    status: str = "OPERATIONAL"

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    department: Optional[str] = None
    status: Optional[str] = None

class AssetResponse(AssetBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
