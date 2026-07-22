from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment_service import PaymentService, PaymentAlreadyExists

router = APIRouter(prefix="/jobs/{job_id}/payments", tags=["payments"])


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    job_id: int,
    data: PaymentCreate,
    db: Session = Depends(get_db),
):
    """
    Record payment intent (triggers Daraja STK push in future).
    Idempotent on idempotency_key.
    """
    service = PaymentService(db)
    try:
        payment = service.create(job_id, data)
        return PaymentResponse(
            id=payment.id,
            job_id=payment.job_id,
            type=payment.type.value,
            payer_phone=payment.payer_phone,
            amount=payment.amount,
            daraja_checkout_id=payment.daraja_checkout_id,
            status=payment.status.value,
            created_at=payment.created_at,
        )
    except PaymentAlreadyExists as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=e.message)


@router.get("/", response_model=List[PaymentResponse])
async def list_payments(
    job_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_current_user),
):
    """List all payments for a job."""
    service = PaymentService(db)
    payments = service.get_by_job(job_id)
    return [
        PaymentResponse(
            id=payment.id,
            job_id=payment.job_id,
            type=payment.type.value,
            payer_phone=payment.payer_phone,
            amount=payment.amount,
            daraja_checkout_id=payment.daraja_checkout_id,
            status=payment.status.value,
            created_at=payment.created_at,
        )
        for payment in payments
    ]
