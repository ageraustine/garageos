from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.job import JobCreate, JobStatusUpdate, JobResponse, JobCreateResponse, JobListItem, JobDetail, JobServiceDetail, JobAssignmentUpdate, AssignedEmployee, StageToggleRequest, StageToggleResponse, QuotationTemplateItem
from app.schemas.auth import UserResponse
from app.services.job_service import JobService, InvalidStatusTransition
from app.services.service_service import ServiceService
from app.models.job import Job, JobStatus
from app.models.vehicle import Vehicle
from app.models.service import JobService as JobServiceModel, Service, ServiceStage
from app.core.exceptions import NotFoundError, AppException

router = APIRouter(prefix="/jobs", tags=["jobs"])

STATUS_LABELS = {
    "intake": "Checked In",
    "diagnosis": "Diagnosing",
    "working": "In Progress",
    "washing": "Washing",
    "ready": "Ready",
    "paid": "Complete",
}


@router.get("/", response_model=List[JobListItem])
async def list_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """List jobs for current user's branch."""
    query = select(Job).where(Job.branch_id == current_user.branch_id)

    if status_filter:
        query = query.where(Job.status == status_filter)

    query = query.order_by(Job.created_at.desc()).limit(limit)
    jobs = db.exec(query).all()

    job_service = JobService(db)
    result = []
    for job in jobs:
        # Get vehicle
        vehicle = db.get(Vehicle, job.vehicle_id)

        # Get services
        job_services = db.exec(
            select(JobServiceModel).where(JobServiceModel.job_id == job.id)
        ).all()
        service_names = []
        for js in job_services:
            svc = db.get(Service, js.service_id)
            if svc:
                service_names.append(svc.name)

        # Get assigned employees
        assigned_employees = job_service.get_assigned_employees(job.id)

        result.append(
            JobListItem(
                id=job.id,
                plate=vehicle.plate if vehicle else "Unknown",
                vehicle_make=vehicle.make if vehicle else "Unknown",
                vehicle_model=vehicle.model if vehicle else "Unknown",
                customer_name=job.customer_name,
                customer_phone=job.customer_phone,
                status=job.status.value,
                status_label=STATUS_LABELS.get(job.status.value, job.status.value),
                intake_at=job.intake_at,
                promised_ready_at=job.promised_ready_at,
                magic_link_token=job.magic_link_token,
                services=service_names,
                assigned_employees=assigned_employees,
                created_at=job.created_at,
            )
        )

    return result


@router.post("/", response_model=JobCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    data: JobCreate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Create job from plate.
    Auto-populates vehicle if known, creates new if not.
    """
    service = JobService(db)
    job = service.create(data, assigned_by_id=current_user.id)
    return JobCreateResponse(job_id=job.id, magic_link_token=job.magic_link_token)


@router.get("/{id}", response_model=JobDetail)
async def get_job(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get job by ID with full details."""
    job_service = JobService(db)
    svc_service = ServiceService(db)

    try:
        job = job_service.get_by_id(id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    # Get vehicle
    vehicle = db.get(Vehicle, job.vehicle_id)

    # Get services with stages
    job_services_list = db.exec(
        select(JobServiceModel).where(JobServiceModel.job_id == job.id)
    ).all()

    services_detail = []
    for js in job_services_list:
        svc = db.get(Service, js.service_id)
        if svc:
            stages = svc_service.get_stages(svc.id)
            current_stage = None
            if js.current_stage_id:
                for s in stages:
                    if s.id == js.current_stage_id:
                        current_stage = s.name
                        break

            # Get completed stages
            completed_stage_ids = job_service.get_completed_stages(js.id)

            # Get quotation template items for this service
            quotation_items = svc_service.get_quotation_items(svc.id)

            services_detail.append(
                JobServiceDetail(
                    id=js.id,
                    service_id=svc.id,
                    service_name=svc.name,
                    stages=[{"id": s.id, "name": s.name, "order": s.order} for s in stages],
                    current_stage_id=js.current_stage_id,
                    current_stage_name=current_stage,
                    completed_stage_ids=completed_stage_ids,
                    quotation_items=[
                        QuotationTemplateItem(
                            id=q.id,
                            name=q.name,
                            price=q.price,
                            is_labor=q.is_labor,
                        )
                        for q in quotation_items
                    ],
                    started_at=js.started_at,
                    completed_at=js.completed_at,
                )
            )

    # Get valid next statuses
    valid_transitions = job_service.VALID_TRANSITIONS.get(job.status, [])
    next_statuses = [s.value for s in valid_transitions]

    # Check estimate status
    from app.services.estimate_service import EstimateService
    estimate_service = EstimateService(db)
    estimate = estimate_service.get_latest_for_job(job.id)
    has_estimate = estimate is not None
    estimate_approved = estimate.approved_at is not None if estimate else False

    # Get assigned employees
    assigned_employees = job_service.get_assigned_employees(job.id)

    return JobDetail(
        id=job.id,
        plate=vehicle.plate if vehicle else "Unknown",
        vehicle_make=vehicle.make if vehicle else "Unknown",
        vehicle_model=vehicle.model if vehicle else "Unknown",
        vehicle_year=vehicle.year if vehicle else None,
        customer_name=job.customer_name,
        customer_phone=job.customer_phone,
        status=job.status.value,
        status_label=STATUS_LABELS.get(job.status.value, job.status.value),
        next_statuses=next_statuses,
        intake_at=job.intake_at,
        promised_ready_at=job.promised_ready_at,
        actual_ready_at=job.actual_ready_at,
        magic_link_token=job.magic_link_token,
        services=services_detail,
        assigned_employees=assigned_employees,
        has_estimate=has_estimate,
        estimate_approved=estimate_approved,
        created_at=job.created_at,
    )


@router.patch("/{id}/status", response_model=JobResponse)
async def update_job_status(
    id: int,
    data: JobStatusUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Update job status with validation."""
    service = JobService(db)
    try:
        job = service.update_status(id, data)
        return JobResponse(
            id=job.id,
            vehicle_id=job.vehicle_id,
            branch_id=job.branch_id,
            advisor_id=job.advisor_id,
            assigned_mechanic_id=job.assigned_mechanic_id,
            customer_name=job.customer_name,
            customer_phone=job.customer_phone,
            status=job.status.value,
            intake_at=job.intake_at,
            promised_ready_at=job.promised_ready_at,
            actual_ready_at=job.actual_ready_at,
            magic_link_token=job.magic_link_token,
            created_at=job.created_at,
        )
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
    except InvalidStatusTransition as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.patch("/{id}/assignments", response_model=List[AssignedEmployee])
async def update_job_assignments(
    id: int,
    data: JobAssignmentUpdate,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Update which employees are assigned to a job."""
    if current_user.role not in ["hq", "manager", "advisor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ, managers, or advisors can assign employees",
        )

    service = JobService(db)
    try:
        service.get_by_id(id)  # Verify job exists
        return service.update_assignments(id, data.assigned_employee_ids, current_user.id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/services/{job_service_id}/stages/toggle", response_model=StageToggleResponse)
async def toggle_stage_completion(
    job_service_id: int,
    data: StageToggleRequest,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Toggle a stage's completion status (checkbox behavior)."""
    service = JobService(db)

    try:
        job_service = service.get_job_service(job_service_id)

        # Check if user is assigned to this job (or has manager/hq/advisor role)
        if current_user.role not in ["hq", "manager", "advisor"]:
            if not service.is_assigned_to_job(job_service.job_id, current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be assigned to this job to update stages",
                )

        completed, all_completed = service.toggle_stage_completion(
            job_service_id, data.stage_id, current_user.id
        )

        return StageToggleResponse(
            stage_id=data.stage_id,
            completed=completed,
            completed_stage_ids=all_completed,
        )
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
    except AppException as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(
    id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Delete a job and all related records. Only HQ and managers can delete."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can delete jobs",
        )

    service = JobService(db)
    try:
        service.delete(id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
