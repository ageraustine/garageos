from sqlmodel import Session, select
from typing import Optional
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate
from app.core.exceptions import NotFoundError, ConflictError


class VehicleService:
    """Vehicle management operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: VehicleCreate) -> Vehicle:
        existing = self.db.exec(
            select(Vehicle).where(Vehicle.plate == data.plate.upper())
        ).first()
        if existing:
            raise ConflictError(f"Vehicle with plate {data.plate} already exists")

        vehicle = Vehicle(**data.model_dump())
        vehicle.plate = vehicle.plate.upper()  # Normalize
        self.db.add(vehicle)
        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle

    def get_by_id(self, id: int) -> Vehicle:
        vehicle = self.db.get(Vehicle, id)
        if not vehicle:
            raise NotFoundError(f"Vehicle {id} not found")
        return vehicle

    def get_by_plate(self, plate: str) -> Optional[Vehicle]:
        return self.db.exec(
            select(Vehicle).where(Vehicle.plate == plate.upper())
        ).first()

    def get_or_create_by_plate(
        self, plate: str, make: str = "Unknown", model: str = "Unknown"
    ) -> tuple[Vehicle, bool]:
        """Get existing or create new vehicle. Returns (vehicle, created)."""
        existing = self.get_by_plate(plate)
        if existing:
            return existing, False

        vehicle = Vehicle(plate=plate.upper(), make=make, model=model)
        self.db.add(vehicle)
        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle, True

    def update(self, id: int, data: VehicleUpdate) -> Vehicle:
        vehicle = self.get_by_id(id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(vehicle, key, value)
        self.db.commit()
        self.db.refresh(vehicle)
        return vehicle
