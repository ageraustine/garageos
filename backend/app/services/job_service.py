from sqlmodel import Session, select
from datetime import datetime, timezone
from typing import List
from app.models.job import Job, JobStatus
from app.models.service import JobService as JobServiceModel, JobStageCompletion
from app.models.job_assignment import JobAssignment
from app.models.employee import Employee
from app.models.estimate import Estimate
from app.models.line_item import LineItem
from app.schemas.job import JobCreate, JobStatusUpdate, AssignedEmployee
from app.core.exceptions import NotFoundError, AppException
from app.services.vehicle_service import VehicleService
from app.services.service_service import ServiceService


class InvalidStatusTransition(AppException):
    """Invalid job status transition."""

    pass


class JobService:
    """Job lifecycle management."""

    # Valid status transitions
    VALID_TRANSITIONS = {
        JobStatus.INTAKE: [JobStatus.DIAGNOSIS],
        JobStatus.DIAGNOSIS: [JobStatus.WORKING, JobStatus.INTAKE],
        JobStatus.WORKING: [JobStatus.WASHING, JobStatus.DIAGNOSIS],
        JobStatus.WASHING: [JobStatus.READY, JobStatus.WORKING],
        JobStatus.READY: [JobStatus.PAID, JobStatus.WASHING],
        JobStatus.PAID: [],  # Terminal state
    }

    def __init__(self, db: Session):
        self.db = db
        self.vehicle_service = VehicleService(db)
        self.service_service = ServiceService(db)

    def create(self, data: JobCreate, assigned_by_id: int = None) -> Job:
        """Create job from plate (auto-populate vehicle if known)."""
        make = data.vehicle_make or "Unknown"
        model = data.vehicle_model or "Unknown"
        vehicle, created = self.vehicle_service.get_or_create_by_plate(data.plate, make, model)

        # Update vehicle make/model if provided and different
        if not created and (data.vehicle_make or data.vehicle_model):
            if data.vehicle_make and vehicle.make != data.vehicle_make:
                vehicle.make = data.vehicle_make
            if data.vehicle_model and vehicle.model != data.vehicle_model:
                vehicle.model = data.vehicle_model
            self.db.flush()

        job = Job(
            vehicle_id=vehicle.id,
            branch_id=data.branch_id,
            advisor_id=data.advisor_id,
            customer_name=data.customer_name,
            customer_phone=data.customer_phone,
        )
        self.db.add(job)
        self.db.flush()  # Get job.id for service attachment

        # Attach selected services and collect template items
        template_items = []
        for service_id in data.service_ids:
            self.service_service.add_service_to_job(job.id, service_id)
            # Get quotation template items for this service
            items = self.service_service.get_quotation_items(service_id)
            template_items.extend(items)

        # Assign employees
        for employee_id in data.assigned_employee_ids:
            assignment = JobAssignment(
                job_id=job.id,
                employee_id=employee_id,
                assigned_by_id=assigned_by_id,
            )
            self.db.add(assignment)

        # Auto-create estimate with template items (if any)
        if template_items:
            estimate = Estimate(job_id=job.id, version=1)
            self.db.add(estimate)
            self.db.flush()  # Get estimate.id

            for item in template_items:
                line_item = LineItem(
                    estimate_id=estimate.id,
                    kind="critical",
                    label=item.name,
                    price=item.price,
                )
                self.db.add(line_item)

        self.db.commit()
        self.db.refresh(job)
        return job

    def get_by_id(self, id: int) -> Job:
        job = self.db.get(Job, id)
        if not job:
            raise NotFoundError(f"Job {id} not found")
        return job

    def get_by_token(self, token: str) -> Job:
        """Get job by magic link token (customer auth)."""
        job = self.db.exec(select(Job).where(Job.magic_link_token == token)).first()
        if not job:
            raise NotFoundError("Invalid or expired link")
        return job

    def update_status(self, id: int, data: JobStatusUpdate) -> Job:
        job = self.get_by_id(id)

        # Validate transition
        if data.status not in self.VALID_TRANSITIONS.get(job.status, []):
            raise InvalidStatusTransition(
                f"Cannot transition from {job.status} to {data.status}"
            )

        job.status = data.status

        if data.assigned_mechanic_id is not None:
            job.assigned_mechanic_id = data.assigned_mechanic_id
        if data.promised_ready_at is not None:
            job.promised_ready_at = data.promised_ready_at
        if data.actual_ready_at is not None:
            job.actual_ready_at = data.actual_ready_at

        # Auto-set actual_ready_at when reaching READY
        if data.status == JobStatus.READY and job.actual_ready_at is None:
            job.actual_ready_at = datetime.now(timezone.utc)

        self.db.commit()
        self.db.refresh(job)
        return job

    def list_by_branch(
        self, branch_id: int, status: JobStatus = None, limit: int = 50
    ) -> list[Job]:
        query = select(Job).where(Job.branch_id == branch_id)
        if status:
            query = query.where(Job.status == status)
        query = query.order_by(Job.created_at.desc()).limit(limit)
        return list(self.db.exec(query).all())

    def get_assigned_employees(self, job_id: int) -> List[AssignedEmployee]:
        """Get employees assigned to a job."""
        assignments = self.db.exec(
            select(JobAssignment).where(JobAssignment.job_id == job_id)
        ).all()

        result = []
        for assignment in assignments:
            employee = self.db.get(Employee, assignment.employee_id)
            if employee:
                result.append(
                    AssignedEmployee(
                        id=employee.id,
                        name=employee.name,
                        role=employee.role.value,
                    )
                )
        return result

    def update_assignments(
        self, job_id: int, employee_ids: List[int], assigned_by_id: int = None
    ) -> List[AssignedEmployee]:
        """Update job assignments - replaces existing assignments."""
        # Remove existing assignments
        existing = self.db.exec(
            select(JobAssignment).where(JobAssignment.job_id == job_id)
        ).all()
        for assignment in existing:
            self.db.delete(assignment)

        # Add new assignments
        for employee_id in employee_ids:
            assignment = JobAssignment(
                job_id=job_id,
                employee_id=employee_id,
                assigned_by_id=assigned_by_id,
            )
            self.db.add(assignment)

        self.db.commit()
        return self.get_assigned_employees(job_id)

    def is_assigned_to_job(self, job_id: int, employee_id: int) -> bool:
        """Check if an employee is assigned to a job."""
        assignment = self.db.exec(
            select(JobAssignment).where(
                JobAssignment.job_id == job_id,
                JobAssignment.employee_id == employee_id,
            )
        ).first()
        return assignment is not None

    def get_completed_stages(self, job_service_id: int) -> List[int]:
        """Get list of completed stage IDs for a job service."""
        completions = self.db.exec(
            select(JobStageCompletion).where(
                JobStageCompletion.job_service_id == job_service_id
            )
        ).all()
        return [c.stage_id for c in completions]

    def toggle_stage_completion(
        self, job_service_id: int, stage_id: int, completed_by_id: int = None
    ) -> tuple[bool, List[int]]:
        """
        Toggle a stage's completion status.
        Enforces order: can only complete the next stage, can only uncomplete the last.
        Returns (is_now_completed, all_completed_stage_ids).
        """
        from app.models.service import ServiceStage

        job_service = self.get_job_service(job_service_id)

        # Get all stages for this service in order
        stages = self.db.exec(
            select(ServiceStage)
            .where(ServiceStage.service_id == job_service.service_id)
            .order_by(ServiceStage.order)
        ).all()
        stage_ids_in_order = [s.id for s in stages]

        # Get currently completed stages
        completed_ids = set(self.get_completed_stages(job_service_id))

        # Check if already completed
        is_completed = stage_id in completed_ids

        if is_completed:
            # Uncompleting: can only uncomplete the last completed stage
            completed_in_order = [sid for sid in stage_ids_in_order if sid in completed_ids]
            if completed_in_order and completed_in_order[-1] != stage_id:
                raise AppException("Can only uncheck the last completed stage")

            # Uncomplete it
            existing = self.db.exec(
                select(JobStageCompletion).where(
                    JobStageCompletion.job_service_id == job_service_id,
                    JobStageCompletion.stage_id == stage_id,
                )
            ).first()
            if existing:
                self.db.delete(existing)
                self.db.commit()
            completed = False
        else:
            # Completing: can only complete the next stage in order
            next_stage_id = None
            for sid in stage_ids_in_order:
                if sid not in completed_ids:
                    next_stage_id = sid
                    break

            if stage_id != next_stage_id:
                raise AppException("Must complete stages in order")

            # Complete it
            completion = JobStageCompletion(
                job_service_id=job_service_id,
                stage_id=stage_id,
                completed_by_id=completed_by_id,
            )
            self.db.add(completion)
            self.db.commit()
            completed = True

        # Return updated list
        all_completed = self.get_completed_stages(job_service_id)
        return completed, all_completed

    def get_job_service(self, job_service_id: int) -> JobServiceModel:
        """Get a job service by ID."""
        job_service = self.db.get(JobServiceModel, job_service_id)
        if not job_service:
            raise NotFoundError(f"Job service {job_service_id} not found")
        return job_service

    def delete(self, job_id: int) -> None:
        """Delete a job and all related records."""
        from app.models.estimate import Estimate
        from app.models.media_asset import MediaAsset
        from app.models.payment import Payment

        job = self.get_by_id(job_id)

        # Delete related records in order (respecting foreign keys)
        # 1. Delete payments
        payments = self.db.exec(
            select(Payment).where(Payment.job_id == job_id)
        ).all()
        for payment in payments:
            self.db.delete(payment)

        # 2. Delete line items via estimates
        estimates = self.db.exec(
            select(Estimate).where(Estimate.job_id == job_id)
        ).all()
        for estimate in estimates:
            line_items = self.db.exec(
                select(LineItem).where(LineItem.estimate_id == estimate.id)
            ).all()
            for item in line_items:
                self.db.delete(item)
            self.db.delete(estimate)

        # 3. Delete media assets
        media_assets = self.db.exec(
            select(MediaAsset).where(MediaAsset.job_id == job_id)
        ).all()
        for asset in media_assets:
            self.db.delete(asset)

        # 4. Delete job stage completions and job services
        job_services = self.db.exec(
            select(JobServiceModel).where(JobServiceModel.job_id == job_id)
        ).all()
        for js in job_services:
            completions = self.db.exec(
                select(JobStageCompletion).where(JobStageCompletion.job_service_id == js.id)
            ).all()
            for c in completions:
                self.db.delete(c)
            self.db.delete(js)
        self.db.flush()

        # 5. Delete job assignments
        assignments = self.db.exec(
            select(JobAssignment).where(JobAssignment.job_id == job_id)
        ).all()
        for a in assignments:
            self.db.delete(a)
        self.db.flush()

        # 6. Delete the job
        self.db.delete(job)
        self.db.commit()
