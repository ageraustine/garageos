from sqlmodel import Session, select
from typing import Optional
from app.models.payment import Payment, PaymentType, PaymentStatus
from app.models.job import Job, JobStatus
from app.schemas.payment import PaymentCreate
from app.core.exceptions import NotFoundError, AppException
from app.services.daraja_service import DarajaService, STKPushResponse, DarajaError


class PaymentAlreadyExists(AppException):
    """Idempotency key already used."""
    pass


class PaymentService:
    """Payment recording with Daraja integration."""

    def __init__(self, db: Session, daraja: Optional[DarajaService] = None):
        self.db = db
        self.daraja = daraja or DarajaService()

    def create(self, job_id: int, data: PaymentCreate) -> Payment:
        """Record payment intent (before Daraja callback)."""
        # Idempotency check
        existing = self.db.exec(
            select(Payment).where(Payment.idempotency_key == data.idempotency_key)
        ).first()
        if existing:
            if existing.job_id == job_id:
                return existing  # Idempotent return
            raise PaymentAlreadyExists("Idempotency key used for different job")

        payment = Payment(
            job_id=job_id,
            type=PaymentType(data.type),
            payer_phone=data.payer_phone,
            amount=data.amount,
            idempotency_key=data.idempotency_key,
            status=PaymentStatus.PENDING,
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def update_from_daraja(
        self,
        checkout_id: str,
        status: PaymentStatus,
    ) -> Payment:
        """Update payment from Daraja webhook callback."""
        payment = self.db.exec(
            select(Payment).where(Payment.daraja_checkout_id == checkout_id)
        ).first()
        if not payment:
            raise NotFoundError(f"Payment with checkout_id {checkout_id} not found")

        payment.status = status

        # If success, update job status to PAID
        if status == PaymentStatus.SUCCESS:
            job = self.db.get(Job, payment.job_id)
            if job and job.status == JobStatus.READY:
                job.status = JobStatus.PAID

        self.db.commit()
        self.db.refresh(payment)
        return payment

    def get_by_job(self, job_id: int) -> list[Payment]:
        return list(
            self.db.exec(select(Payment).where(Payment.job_id == job_id)).all()
        )

    async def initiate_stk_push(
        self,
        job_id: int,
        phone: str,
        amount: int,
        idempotency_key: str,
        payment_type: PaymentType = PaymentType.FULL,
    ) -> tuple[Payment, STKPushResponse]:
        """
        Create payment record and initiate M-Pesa STK Push.

        Returns (payment, stk_response) tuple.
        """
        # Create or get existing payment record
        existing = self.db.exec(
            select(Payment).where(Payment.idempotency_key == idempotency_key)
        ).first()

        if existing:
            if existing.job_id != job_id:
                raise PaymentAlreadyExists("Idempotency key used for different job")
            if existing.status == PaymentStatus.SUCCESS:
                raise PaymentAlreadyExists("Payment already completed")
            payment = existing
        else:
            payment = Payment(
                job_id=job_id,
                type=payment_type,
                payer_phone=phone,
                amount=amount,
                idempotency_key=idempotency_key,
                status=PaymentStatus.PENDING,
            )
            self.db.add(payment)
            self.db.flush()

        # Initiate STK Push
        try:
            stk_response = await self.daraja.stk_push(
                phone_number=phone,
                amount=amount,
                account_reference=f"Job#{job_id}",
                transaction_desc="GarageOS Payment",
            )

            # Update payment with checkout ID
            payment.daraja_checkout_id = stk_response.checkout_request_id
            self.db.commit()
            self.db.refresh(payment)

            return payment, stk_response
        except DarajaError as e:
            payment.status = PaymentStatus.FAILED
            self.db.commit()
            raise e

    def get_by_checkout_id(self, checkout_id: str) -> Optional[Payment]:
        """Get payment by Daraja checkout ID."""
        return self.db.exec(
            select(Payment).where(Payment.daraja_checkout_id == checkout_id)
        ).first()
