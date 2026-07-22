"""Quotation endpoints - PDF generation."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlmodel import Session
from datetime import datetime
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserResponse
from app.services.service_service import ServiceService
from app.services.quotation_pdf_service import QuotationPDFService
from app.models.chain import Chain

router = APIRouter(prefix="/quotation", tags=["quotation"])


@router.get("/services/pdf")
async def download_services_quotation(
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Download a PDF quotation of all services with pricing.
    Includes garage branding (logo, colors).
    """
    svc_service = ServiceService(db)

    # Get chain for branding
    chain = db.get(Chain, current_user.chain_id)
    if not chain:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chain not found")

    # Get all services with quotation items
    services = svc_service.list_by_chain(current_user.chain_id)

    services_data = []
    for svc in services:
        items = svc_service.get_quotation_items(svc.id)
        services_data.append({
            "name": svc.name,
            "quotation_items": [
                {
                    "name": item.name,
                    "price": item.price,
                    "is_labor": item.is_labor,
                }
                for item in items
            ],
        })

    # Generate PDF
    pdf_service = QuotationPDFService()
    pdf_bytes = pdf_service.generate(
        chain_name=chain.name,
        chain_display_name=chain.display_name,
        branding=chain.branding,
        currency=chain.currency,
        job_id=0,  # Generic quotation, no job
        vehicle_plate="N/A",
        vehicle_make="",
        vehicle_model="All Services",
        customer_name=None,
        customer_phone=None,
        services=services_data,
        created_at=datetime.utcnow(),
    )

    filename = f"quotation_{chain.name}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/job/{job_id}/pdf")
async def download_job_quotation(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Download a PDF quotation for a specific job.
    Uses the actual estimate line items if available.
    """
    from app.services.job_service import JobService
    from app.services.estimate_service import EstimateService
    from app.models.vehicle import Vehicle

    job_service = JobService(db)
    estimate_service = EstimateService(db)

    try:
        job = job_service.get_by_id(job_id)
    except Exception as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e))

    # Get chain for branding
    chain = db.get(Chain, current_user.chain_id)
    if not chain:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Chain not found")

    # Get vehicle
    vehicle = db.get(Vehicle, job.vehicle_id)

    # Get estimate if exists
    estimate = estimate_service.get_latest_for_job(job_id)

    # Build quotation data from estimate line items
    services_data = []
    if estimate:
        # Get line items
        line_items = estimate_service.get_line_items(estimate.id)

        # Group by critical/optional
        critical_items = []
        optional_items = []

        for item in line_items:
            item_data = {
                "name": item.label,
                "price": float(item.price),
                "is_labor": False,  # We don't track this on line items currently
            }
            if item.kind.value == "critical":
                critical_items.append(item_data)
            else:
                optional_items.append(item_data)

        if critical_items:
            services_data.append({
                "name": "Required Work",
                "quotation_items": critical_items,
            })
        if optional_items:
            services_data.append({
                "name": "Recommended (Optional)",
                "quotation_items": optional_items,
            })
    else:
        # No estimate - use service templates as fallback
        from sqlmodel import select
        from app.models.service import JobService as JobServiceModel, Service

        svc_service = ServiceService(db)
        job_services = db.exec(
            select(JobServiceModel).where(JobServiceModel.job_id == job_id)
        ).all()

        for js in job_services:
            svc = db.get(Service, js.service_id)
            if svc:
                items = svc_service.get_quotation_items(svc.id)
                if items:
                    services_data.append({
                        "name": svc.name,
                        "quotation_items": [
                            {
                                "name": item.name,
                                "price": item.price,
                                "is_labor": item.is_labor,
                            }
                            for item in items
                        ],
                    })

    # Generate PDF
    pdf_service = QuotationPDFService()
    pdf_bytes = pdf_service.generate(
        chain_name=chain.name,
        chain_display_name=chain.display_name,
        branding=chain.branding,
        currency=chain.currency,
        job_id=job_id,
        vehicle_plate=vehicle.plate if vehicle else "Unknown",
        vehicle_make=vehicle.make if vehicle else "",
        vehicle_model=vehicle.model if vehicle else "",
        customer_name=job.customer_name,
        customer_phone=job.customer_phone,
        services=services_data,
        created_at=estimate.created_at if estimate else job.created_at,
    )

    filename = f"quotation_{job_id}_{datetime.utcnow().strftime('%Y%m%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
