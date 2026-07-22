from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.estimate import (
    EstimateCreate,
    EstimateApprove,
    EstimateResponse,
    LineItemResponse,
)
from app.services.estimate_service import (
    EstimateService,
    EstimateAlreadyApproved,
    MissingJustification,
)
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/jobs/{job_id}/estimates", tags=["estimates"])


@router.post("/", response_model=EstimateResponse, status_code=status.HTTP_201_CREATED)
async def create_estimate(
    job_id: int,
    data: EstimateCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Create new estimate version for a job."""
    service = EstimateService(db)
    try:
        estimate = service.create(job_id, data)
        line_items = service.get_line_items(estimate.id)
        return EstimateResponse(
            id=estimate.id,
            job_id=estimate.job_id,
            version=estimate.version,
            approved_at=estimate.approved_at,
            approved_ip=estimate.approved_ip,
            total_approved=estimate.total_approved,
            created_at=estimate.created_at,
            line_items=[
                LineItemResponse(
                    id=item.id,
                    kind=item.kind.value,
                    label=item.label,
                    price=item.price,
                    justification_media_id=item.justification_media_id,
                )
                for item in line_items
            ],
        )
    except MissingJustification as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.get("/latest", response_model=EstimateResponse)
async def get_latest_estimate(
    job_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """Get the latest estimate for a job."""
    service = EstimateService(db)
    estimate = service.get_latest_for_job(job_id)
    if not estimate:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No estimates found")
    line_items = service.get_line_items(estimate.id)
    return EstimateResponse(
        id=estimate.id,
        job_id=estimate.job_id,
        version=estimate.version,
        approved_at=estimate.approved_at,
        approved_ip=estimate.approved_ip,
        total_approved=estimate.total_approved,
        created_at=estimate.created_at,
        line_items=[
            LineItemResponse(
                id=item.id,
                kind=item.kind.value,
                label=item.label,
                price=item.price,
                justification_media_id=item.justification_media_id,
            )
            for item in line_items
        ],
    )


@router.post("/{estimate_id}/approve", response_model=EstimateResponse)
async def approve_estimate(
    job_id: int,
    estimate_id: int,
    data: EstimateApprove,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Customer approval - no auth required (token-based via job link).
    Per invariant #5: any price increase post-approval requires new approval.
    """
    service = EstimateService(db)
    client_ip = request.client.host if request.client else "unknown"
    try:
        estimate = service.approve(estimate_id, data, client_ip)
        line_items = service.get_line_items(estimate.id)
        return EstimateResponse(
            id=estimate.id,
            job_id=estimate.job_id,
            version=estimate.version,
            approved_at=estimate.approved_at,
            approved_ip=estimate.approved_ip,
            total_approved=estimate.total_approved,
            created_at=estimate.created_at,
            line_items=[
                LineItemResponse(
                    id=item.id,
                    kind=item.kind.value,
                    label=item.label,
                    price=item.price,
                    justification_media_id=item.justification_media_id,
                )
                for item in line_items
            ],
        )
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
    except EstimateAlreadyApproved as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=e.message)
