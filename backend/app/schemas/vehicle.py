from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class VehicleCreate(BaseModel):
    plate: str = Field(min_length=1, max_length=20)
    make: str = Field(min_length=1, max_length=50)
    model: str = Field(min_length=1, max_length=50)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    owner_id: Optional[int] = None


class VehicleUpdate(BaseModel):
    make: Optional[str] = Field(None, min_length=1, max_length=50)
    model: Optional[str] = Field(None, min_length=1, max_length=50)
    year: Optional[int] = Field(None, ge=1900, le=2100)
    owner_id: Optional[int] = None


class VehicleResponse(BaseModel):
    id: int
    plate: str
    make: str
    model: str
    year: Optional[int]
    owner_id: Optional[int]
    created_at: datetime
