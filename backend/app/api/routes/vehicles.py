from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse
from app.services.vehicle_service import VehicleService
from app.core.exceptions import NotFoundError, ConflictError

router = APIRouter(prefix="/vehicles", tags=["vehicles"])


@router.post("/", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
async def create_vehicle(
    data: VehicleCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Create a new vehicle."""
    service = VehicleService(db)
    try:
        return service.create(data)
    except ConflictError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=e.message)


@router.get("/plate/{plate}", response_model=VehicleResponse)
async def get_vehicle_by_plate(
    plate: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Get vehicle by plate number."""
    service = VehicleService(db)
    vehicle = service.get_by_plate(plate)
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    return vehicle


@router.get("/{id}", response_model=VehicleResponse)
async def get_vehicle(
    id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Get vehicle by ID."""
    service = VehicleService(db)
    try:
        return service.get_by_id(id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.patch("/{id}", response_model=VehicleResponse)
async def update_vehicle(
    id: int,
    data: VehicleUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Update vehicle."""
    service = VehicleService(db)
    try:
        return service.update(id, data)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
