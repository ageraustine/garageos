"""
M-Pesa Daraja callback endpoint.
This is called by Safaricom after STK Push completes.
"""

from fastapi import APIRouter, Depends, Request, BackgroundTasks
from sqlmodel import Session
import logging

from app.database import get_db
from app.schemas.payment import DarajaCallback
from app.services.payment_service import PaymentService
from app.services.daraja_service import DarajaService, DarajaError
from app.models.payment import PaymentStatus

router = APIRouter(prefix="/mpesa", tags=["mpesa-callback"])
logger = logging.getLogger(__name__)


@router.post("/callback")
async def mpesa_callback(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    M-Pesa STK Push callback.

    Safaricom sends this after customer completes/cancels payment.
    Must return 200 quickly to acknowledge receipt.
    """
    try:
        data = await request.json()
        logger.info(f"M-Pesa callback received: {data}")

        # Parse the callback
        callback_data = DarajaService.parse_callback(data)

        # Process in background to return quickly
        background_tasks.add_task(
            process_callback,
            db,
            callback_data.checkout_request_id,
            callback_data.result_code,
            callback_data.mpesa_receipt_number,
        )

        # Always return success to M-Pesa
        return {"ResultCode": 0, "ResultDesc": "Accepted"}

    except DarajaError as e:
        logger.error(f"Failed to parse M-Pesa callback: {e}")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    except Exception as e:
        logger.error(f"Error processing M-Pesa callback: {e}")
        return {"ResultCode": 0, "ResultDesc": "Accepted"}


def process_callback(
    db: Session,
    checkout_request_id: str,
    result_code: int,
    mpesa_receipt: str | None,
):
    """Process the callback in background."""
    try:
        payment_service = PaymentService(db)
        payment = payment_service.get_by_checkout_id(checkout_request_id)

        if not payment:
            logger.warning(f"Payment not found for checkout_id: {checkout_request_id}")
            return

        # Determine status from result code
        if result_code == 0:
            new_status = PaymentStatus.SUCCESS
        elif result_code == 1032:
            # User cancelled
            new_status = PaymentStatus.CANCELLED
        else:
            new_status = PaymentStatus.FAILED

        # Update payment status
        payment_service.update_from_daraja(checkout_request_id, new_status)
        logger.info(
            f"Payment {payment.id} updated to {new_status.value} "
            f"(receipt: {mpesa_receipt})"
        )

    except Exception as e:
        logger.error(f"Error processing callback for {checkout_request_id}: {e}")


@router.post("/timeout")
async def mpesa_timeout(request: Request):
    """
    M-Pesa timeout callback.
    Called when transaction times out (no user response).
    """
    try:
        data = await request.json()
        logger.info(f"M-Pesa timeout callback: {data}")
    except Exception as e:
        logger.error(f"Error parsing timeout callback: {e}")

    return {"ResultCode": 0, "ResultDesc": "Accepted"}
