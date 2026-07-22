from sqlmodel import Session, select, func, or_
from typing import Optional, List
from decimal import Decimal
from datetime import datetime
from app.models.customer import Customer
from app.models.customer_note import CustomerNote
from app.models.vehicle import Vehicle
from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.employee import Employee
from app.models.service import JobService as JobServiceModel, Service
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerListItem,
    CustomerDetail,
    CustomerVehicle,
    CustomerJob,
    CustomerNoteCreate,
    CustomerNoteResponse,
)
from app.core.exceptions import NotFoundError, ConflictError


# Status labels for display
STATUS_LABELS = {
    "intake": "Checked In",
    "diagnosis": "Being Diagnosed",
    "working": "Work In Progress",
    "washing": "Final Wash",
    "ready": "Ready for Pickup",
    "paid": "Complete",
}


class CustomerService:
    """Customer CRM operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: CustomerCreate, chain_id: int) -> Customer:
        """Create a new customer for a chain."""
        # Check if phone exists for this chain
        existing = self.db.exec(
            select(Customer).where(
                Customer.chain_id == chain_id, Customer.phone == data.phone
            )
        ).first()
        if existing:
            raise ConflictError(f"Customer with phone {data.phone} already exists")

        customer = Customer(chain_id=chain_id, **data.model_dump())
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def get_by_id(self, id: int) -> Customer:
        """Get customer by ID."""
        customer = self.db.get(Customer, id)
        if not customer:
            raise NotFoundError(f"Customer {id} not found")
        return customer

    def get_by_phone(self, phone: str, chain_id: int) -> Optional[Customer]:
        """Get customer by phone for a chain."""
        return self.db.exec(
            select(Customer).where(
                Customer.chain_id == chain_id, Customer.phone == phone
            )
        ).first()

    def get_or_create_by_phone(
        self, phone: str, name: str, chain_id: int
    ) -> tuple[Customer, bool]:
        """Get existing or create new customer. Returns (customer, created)."""
        existing = self.get_by_phone(phone, chain_id)
        if existing:
            return existing, False

        customer = Customer(chain_id=chain_id, phone=phone, name=name)
        self.db.add(customer)
        self.db.commit()
        self.db.refresh(customer)
        return customer, True

    def update(self, id: int, data: CustomerUpdate) -> Customer:
        """Update customer."""
        customer = self.get_by_id(id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(customer, key, value)
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def list(
        self,
        chain_id: int,
        search: Optional[str] = None,
        tag: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[CustomerListItem]:
        """
        List customers with search and stats.
        Search matches phone, name, or vehicle plate.
        """
        # Base query for customers in this chain
        query = select(Customer).where(Customer.chain_id == chain_id)

        # Search filter
        if search:
            search_term = f"%{search}%"
            # Get vehicle IDs matching plate search
            vehicle_ids = self.db.exec(
                select(Vehicle.id).where(Vehicle.plate.ilike(search_term))
            ).all()

            # Get job customer phones for those vehicles
            if vehicle_ids:
                job_phones = self.db.exec(
                    select(Job.customer_phone)
                    .where(Job.vehicle_id.in_(vehicle_ids))
                    .where(Job.customer_phone.is_not(None))
                ).all()
            else:
                job_phones = []

            # Search by name, phone, or associated plate
            query = query.where(
                or_(
                    Customer.name.ilike(search_term),
                    Customer.phone.ilike(search_term),
                    Customer.phone.in_(job_phones) if job_phones else False,
                )
            )

        # Tag filter
        if tag:
            query = query.where(Customer.tags.contains([tag]))

        # Order and paginate
        query = query.order_by(Customer.created_at.desc()).offset(offset).limit(limit)
        customers = self.db.exec(query).all()

        # Build list items with stats
        result = []
        for customer in customers:
            stats = self._get_customer_stats(customer)
            result.append(
                CustomerListItem(
                    id=customer.id,
                    phone=customer.phone,
                    name=customer.name,
                    email=customer.email,
                    tags=customer.tags,
                    vehicle_count=stats["vehicle_count"],
                    job_count=stats["job_count"],
                    total_spent=stats["total_spent"],
                    last_visit=stats["last_visit"],
                    created_at=customer.created_at,
                )
            )

        return result

    def get_detail(self, id: int) -> CustomerDetail:
        """Get full customer detail with vehicles, jobs, notes."""
        customer = self.get_by_id(id)
        stats = self._get_customer_stats(customer)

        # Get vehicles
        vehicles = self._get_customer_vehicles(customer)

        # Get recent jobs
        recent_jobs = self._get_customer_jobs(customer, limit=20)

        # Get notes
        notes = self._get_customer_notes(customer.id)

        return CustomerDetail(
            id=customer.id,
            phone=customer.phone,
            name=customer.name,
            email=customer.email,
            address=customer.address,
            tags=customer.tags,
            consent_flags=customer.consent_flags,
            created_at=customer.created_at,
            vehicle_count=stats["vehicle_count"],
            job_count=stats["job_count"],
            total_spent=stats["total_spent"],
            last_visit=stats["last_visit"],
            vehicles=vehicles,
            recent_jobs=recent_jobs,
            notes=notes,
        )

    def _get_customer_stats(self, customer: Customer) -> dict:
        """Get customer statistics."""
        # Find all jobs for this customer (by phone match)
        jobs = self.db.exec(
            select(Job).where(Job.customer_phone == customer.phone)
        ).all()

        job_ids = [j.id for j in jobs]
        vehicle_ids = list(set(j.vehicle_id for j in jobs))

        # Total spent (successful payments)
        total_spent = Decimal("0")
        if job_ids:
            result = self.db.exec(
                select(func.sum(Payment.amount))
                .where(Payment.job_id.in_(job_ids))
                .where(Payment.status == PaymentStatus.SUCCESS)
            ).one()
            total_spent = Decimal(str(result)) if result else Decimal("0")

        # Last visit
        last_visit = None
        if jobs:
            last_job = max(jobs, key=lambda j: j.intake_at)
            last_visit = last_job.intake_at

        return {
            "vehicle_count": len(vehicle_ids),
            "job_count": len(jobs),
            "total_spent": total_spent,
            "last_visit": last_visit,
        }

    def _get_customer_vehicles(self, customer: Customer) -> List[CustomerVehicle]:
        """Get all vehicles associated with customer."""
        # Get vehicle IDs from jobs with this customer's phone
        jobs = self.db.exec(
            select(Job).where(Job.customer_phone == customer.phone)
        ).all()

        vehicle_ids = list(set(j.vehicle_id for j in jobs))
        if not vehicle_ids:
            return []

        vehicles = self.db.exec(
            select(Vehicle).where(Vehicle.id.in_(vehicle_ids))
        ).all()

        result = []
        for vehicle in vehicles:
            # Count jobs for this vehicle
            vehicle_jobs = [j for j in jobs if j.vehicle_id == vehicle.id]
            last_service = None
            if vehicle_jobs:
                last_job = max(vehicle_jobs, key=lambda j: j.intake_at)
                last_service = last_job.intake_at

            result.append(
                CustomerVehicle(
                    id=vehicle.id,
                    plate=vehicle.plate,
                    make=vehicle.make,
                    model=vehicle.model,
                    year=vehicle.year,
                    job_count=len(vehicle_jobs),
                    last_service=last_service,
                )
            )

        return result

    def _get_customer_jobs(
        self, customer: Customer, limit: int = 20
    ) -> List[CustomerJob]:
        """Get customer's recent jobs."""
        jobs = self.db.exec(
            select(Job)
            .where(Job.customer_phone == customer.phone)
            .order_by(Job.intake_at.desc())
            .limit(limit)
        ).all()

        result = []
        for job in jobs:
            vehicle = self.db.get(Vehicle, job.vehicle_id)

            # Get services for this job
            job_services = self.db.exec(
                select(JobServiceModel).where(JobServiceModel.job_id == job.id)
            ).all()
            service_names = []
            for js in job_services:
                service = self.db.get(Service, js.service_id)
                if service:
                    service_names.append(service.name)

            # Get total paid
            total_paid = self.db.exec(
                select(func.sum(Payment.amount))
                .where(Payment.job_id == job.id)
                .where(Payment.status == PaymentStatus.SUCCESS)
            ).one()

            result.append(
                CustomerJob(
                    id=job.id,
                    vehicle_plate=vehicle.plate if vehicle else "Unknown",
                    vehicle_make=vehicle.make if vehicle else "Unknown",
                    vehicle_model=vehicle.model if vehicle else "Unknown",
                    status=job.status.value,
                    status_label=STATUS_LABELS.get(job.status.value, job.status.value),
                    services=service_names,
                    total_paid=Decimal(str(total_paid)) if total_paid else None,
                    intake_at=job.intake_at,
                    completed_at=job.actual_ready_at,
                )
            )

        return result

    def _get_customer_notes(self, customer_id: int) -> List[CustomerNoteResponse]:
        """Get notes for a customer."""
        notes = self.db.exec(
            select(CustomerNote)
            .where(CustomerNote.customer_id == customer_id)
            .order_by(CustomerNote.is_pinned.desc(), CustomerNote.created_at.desc())
        ).all()

        result = []
        for note in notes:
            employee = self.db.get(Employee, note.created_by_id)
            result.append(
                CustomerNoteResponse(
                    id=note.id,
                    content=note.content,
                    is_pinned=note.is_pinned,
                    created_by_id=note.created_by_id,
                    created_by_name=employee.name if employee else "Unknown",
                    created_at=note.created_at,
                )
            )

        return result

    # Note CRUD
    def create_note(
        self, customer_id: int, data: CustomerNoteCreate, created_by_id: int
    ) -> CustomerNoteResponse:
        """Add a note to a customer."""
        # Verify customer exists
        self.get_by_id(customer_id)

        note = CustomerNote(
            customer_id=customer_id,
            created_by_id=created_by_id,
            content=data.content,
            is_pinned=data.is_pinned,
        )
        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)

        employee = self.db.get(Employee, created_by_id)
        return CustomerNoteResponse(
            id=note.id,
            content=note.content,
            is_pinned=note.is_pinned,
            created_by_id=note.created_by_id,
            created_by_name=employee.name if employee else "Unknown",
            created_at=note.created_at,
        )

    def update_note(self, note_id: int, is_pinned: bool) -> CustomerNoteResponse:
        """Update a note (toggle pinned status)."""
        note = self.db.get(CustomerNote, note_id)
        if not note:
            raise NotFoundError(f"Note {note_id} not found")

        note.is_pinned = is_pinned
        self.db.commit()
        self.db.refresh(note)

        employee = self.db.get(Employee, note.created_by_id)
        return CustomerNoteResponse(
            id=note.id,
            content=note.content,
            is_pinned=note.is_pinned,
            created_by_id=note.created_by_id,
            created_by_name=employee.name if employee else "Unknown",
            created_at=note.created_at,
        )

    def delete_note(self, note_id: int) -> None:
        """Delete a note."""
        note = self.db.get(CustomerNote, note_id)
        if not note:
            raise NotFoundError(f"Note {note_id} not found")

        self.db.delete(note)
        self.db.commit()
