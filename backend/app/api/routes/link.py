"""
Public Magic Link endpoints - NO AUTH REQUIRED.
Token IS the credential.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select
from decimal import Decimal
from app.database import get_db
from app.api.deps import get_storage_service
from app.services.storage_service import StorageService
from app.schemas.link import (
    CustomerJobResponse,
    EstimateApproveRequest,
    EstimateApproveResponse,
    LinkVehicle,
    LinkEstimate,
    LinkLineItem,
    LinkMedia,
    LinkService,
    LinkStage,
)
from app.schemas.payment import STKPushRequest, STKPushResponse as STKPushResponseSchema
from app.services.job_service import JobService
from app.services.estimate_service import EstimateService, EstimateAlreadyApproved
from app.services.media_service import MediaService
from app.services.service_service import ServiceService
from app.services.payment_service import PaymentService, PaymentAlreadyExists
from app.services.daraja_service import DarajaError
from app.models.vehicle import Vehicle
from app.models.branch import Branch
from app.models.chain import Chain
from app.models.service import JobService as JobServiceModel, Service
from app.models.line_item import LineItemKind
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/link", tags=["customer-link"])

# Human-readable status labels
STATUS_LABELS = {
    "intake": "Checked In",
    "diagnosis": "Being Diagnosed",
    "working": "Work In Progress",
    "washing": "Final Wash",
    "ready": "Ready for Pickup",
    "paid": "Complete",
}


@router.get("/{token}", response_model=CustomerJobResponse)
async def get_job_by_token(
    token: str,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Get full job state via magic link token.
    This is the customer's view - optimized for 3G.
    """
    job_service = JobService(db)
    estimate_service = EstimateService(db)
    media_service = MediaService(db, storage)

    try:
        job = job_service.get_by_token(token)
    except NotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invalid or expired link")

    # Load vehicle
    vehicle = db.get(Vehicle, job.vehicle_id)
    link_vehicle = LinkVehicle(
        plate=vehicle.plate,
        make=vehicle.make,
        model=vehicle.model,
        year=vehicle.year,
    )

    # Load branch name and chain
    branch = db.get(Branch, job.branch_id)
    branch_name = branch.name if branch else None
    chain = db.get(Chain, branch.chain_id) if branch else None
    chain_name = chain.display_name if chain else None
    currency = chain.currency if chain else "KES"

    # Load estimate with line items
    estimate = estimate_service.get_latest_for_job(job.id)
    link_estimate = None
    can_approve = False

    if estimate:
        line_items = estimate_service.get_line_items(estimate.id)
        critical_total = Decimal("0")
        optional_total = Decimal("0")

        link_items = []
        for item in line_items:
            if item.kind == LineItemKind.CRITICAL:
                critical_total += item.price
            else:
                optional_total += item.price

            # TODO: Get media URL for justification if exists
            media_url = None

            link_items.append(
                LinkLineItem(
                    id=item.id,
                    kind=item.kind.value,
                    label=item.label,
                    price=item.price,
                    is_labor=item.is_labor,
                    media_url=media_url,
                )
            )

        link_estimate = LinkEstimate(
            id=estimate.id,
            version=estimate.version,
            approved=estimate.approved_at is not None,
            approved_at=estimate.approved_at,
            total_approved=estimate.total_approved,
            critical_total=critical_total,
            optional_total=optional_total,
            line_items=link_items,
        )

        can_approve = estimate.approved_at is None

    # Load services with stage progress
    svc_service = ServiceService(db)
    job_services = db.exec(
        select(JobServiceModel).where(JobServiceModel.job_id == job.id)
    ).all()

    link_services = []
    for js in job_services:
        service = db.get(Service, js.service_id)
        if service:
            stages = svc_service.get_stages(service.id)
            completed_ids = set(job_service.get_completed_stages(js.id))

            link_stages = [
                LinkStage(
                    id=s.id,
                    name=s.name,
                    order=s.order,
                    completed=s.id in completed_ids,
                )
                for s in stages
            ]

            link_services.append(
                LinkService(
                    name=service.name,
                    stages=link_stages,
                    completed_count=len(completed_ids),
                    total_count=len(stages),
                )
            )

    # Load media assets with viewable URLs
    media_assets = media_service.list_by_job(job.id)
    link_media = [
        LinkMedia(
            id=m.id,
            type=m.type.value,
            url=media_service.get_viewable_url(m),
            created_at=m.created_at,
        )
        for m in media_assets
    ]

    # Mark media as opened by customer
    for m in media_assets:
        if m.opened_by_customer_at is None:
            media_service.mark_opened_by_customer(m.id)

    return CustomerJobResponse(
        status=job.status.value,
        status_label=STATUS_LABELS.get(job.status.value, job.status.value),
        intake_at=job.intake_at,
        promised_ready_at=job.promised_ready_at,
        vehicle=link_vehicle,
        services=link_services,
        estimate=link_estimate,
        media=link_media,
        branch_name=branch_name,
        chain_name=chain_name,
        currency=currency,
        can_approve=can_approve,
    )


@router.post("/{token}/estimate/approve", response_model=EstimateApproveResponse)
async def approve_estimate(
    token: str,
    data: EstimateApproveRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Approve estimate with optional item selection.
    Logs IP and timestamp per invariant.
    """
    job_service = JobService(db)
    estimate_service = EstimateService(db)

    try:
        job = job_service.get_by_token(token)
    except NotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invalid or expired link")

    estimate = estimate_service.get_latest_for_job(job.id)
    if not estimate:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No estimate found")

    # Get client IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    try:
        from app.schemas.estimate import EstimateApprove

        approved = estimate_service.approve(
            estimate.id,
            EstimateApprove(selected_optional_ids=data.selected_optional_ids),
            client_ip,
        )
        return EstimateApproveResponse(
            approved=True,
            total_approved=approved.total_approved,
            approved_at=approved.approved_at,
        )
    except EstimateAlreadyApproved:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Estimate already approved"
        )


@router.post("/{token}/pay", response_model=STKPushResponseSchema)
async def initiate_payment(
    token: str,
    data: STKPushRequest,
    db: Session = Depends(get_db),
):
    """
    Initiate M-Pesa STK Push payment for the job.
    Customer will receive a prompt on their phone.
    """
    job_service = JobService(db)
    payment_service = PaymentService(db)

    try:
        job = job_service.get_by_token(token)
    except NotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invalid or expired link")

    # Verify job is ready for payment
    if job.status.value not in ["ready", "working", "washing"]:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not ready for payment (status: {job.status.value})"
        )

    try:
        payment, stk_response = await payment_service.initiate_stk_push(
            job_id=job.id,
            phone=data.phone,
            amount=data.amount,
            idempotency_key=data.idempotency_key,
        )

        return STKPushResponseSchema(
            payment_id=payment.id,
            checkout_request_id=stk_response.checkout_request_id,
            customer_message=stk_response.customer_message,
            status=payment.status.value,
        )
    except PaymentAlreadyExists as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=e.message)
    except DarajaError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(e))
