"""Job notification service - SMS alerts for customers on job progress."""

from sqlmodel import Session, select
from datetime import datetime
from typing import Optional
from app.models.notification import (
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
)
from app.models.job import Job
from app.models.chain import Chain
from app.services.sms_service import get_sms_service, SMSError
from app.config import settings
import logging

logger = logging.getLogger(__name__)


# Status to notification type mapping
# We send notifications at these job status transitions:
# - intake/diagnosis -> JOB_STARTED (0%)
# - working/washing -> JOB_PROGRESS (50%)
# - ready -> JOB_READY (100%)
STATUS_NOTIFICATIONS = {
    "diagnosis": NotificationType.JOB_STARTED,  # After intake, diagnosis begins
    "working": NotificationType.JOB_PROGRESS,  # 50% - work in progress
    "ready": NotificationType.JOB_READY,  # 100% - ready for pickup
}


class JobNotificationService:
    """
    Manages SMS notifications to customers about job progress.

    Notifications are sent at key milestones:
    - Job Started (diagnosis begins)
    - 50% Progress (working stage)
    - 100% Ready (ready for pickup)
    """

    def __init__(self, db: Session):
        self.db = db
        self.sms_service = get_sms_service()

    def should_notify(self, job: Job, new_status: str) -> Optional[NotificationType]:
        """
        Determine if we should send a notification for this status change.

        Returns the notification type if we should notify, None otherwise.
        """
        # Only notify if customer phone is available
        if not job.customer_phone:
            return None

        # Check if this status triggers a notification
        notification_type = STATUS_NOTIFICATIONS.get(new_status)
        if not notification_type:
            return None

        # Check if we already sent this notification type for this job
        existing = self.db.exec(
            select(Notification).where(
                Notification.job_id == job.id,
                Notification.notification_type == notification_type,
                Notification.status.in_([NotificationStatus.SENT, NotificationStatus.DELIVERED]),
            )
        ).first()

        if existing:
            logger.info(f"Job {job.id}: Already sent {notification_type.value} notification")
            return None

        return notification_type

    def get_message(
        self,
        notification_type: NotificationType,
        job: Job,
        chain: Chain,
    ) -> str:
        """Generate the SMS message for a notification type."""
        # Build magic link URL
        magic_link = f"{settings.FRONTEND_URL}/job/{job.magic_link_token}"

        # Customer name for personalization
        customer = job.customer_name or "Customer"
        plate = job.plate

        # Get chain display name
        garage_name = chain.display_name or chain.name

        if notification_type == NotificationType.JOB_STARTED:
            return (
                f"Hi {customer}, your vehicle ({plate}) is now being diagnosed at {garage_name}. "
                f"Track progress: {magic_link}"
            )

        elif notification_type == NotificationType.JOB_PROGRESS:
            return (
                f"Hi {customer}, work on your vehicle ({plate}) is 50% complete at {garage_name}. "
                f"Track progress: {magic_link}"
            )

        elif notification_type == NotificationType.JOB_READY:
            return (
                f"Hi {customer}, great news! Your vehicle ({plate}) is ready for pickup at {garage_name}. "
                f"View & pay: {magic_link}"
            )

        elif notification_type == NotificationType.ESTIMATE_READY:
            return (
                f"Hi {customer}, the quotation for your vehicle ({plate}) is ready at {garage_name}. "
                f"Review & approve: {magic_link}"
            )

        elif notification_type == NotificationType.PAYMENT_RECEIVED:
            return (
                f"Hi {customer}, payment received for your vehicle ({plate}) at {garage_name}. "
                f"Thank you for choosing us!"
            )

        return f"Update on your vehicle ({plate}) at {garage_name}: {magic_link}"

    def send_notification(
        self,
        job: Job,
        notification_type: NotificationType,
        chain: Chain,
    ) -> Optional[Notification]:
        """
        Send a notification to the customer and log it.

        Returns the Notification record if sent, None if skipped.
        """
        if not job.customer_phone:
            logger.warning(f"Job {job.id}: No customer phone, skipping notification")
            return None

        # Generate message
        message = self.get_message(notification_type, job, chain)

        # Create notification record
        notification = Notification(
            job_id=job.id,
            chain_id=job.chain_id,
            phone=job.customer_phone,
            customer_name=job.customer_name,
            notification_type=notification_type,
            channel=NotificationChannel.SMS,
            message=message,
            status=NotificationStatus.PENDING,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        # Send SMS
        try:
            result = self.sms_service.send(
                phone=job.customer_phone,
                message=message,
            )

            notification.sent_at = datetime.utcnow()

            if result.get("status") == "sent":
                notification.status = NotificationStatus.SENT
                notification.external_id = result.get("message_id")
                notification.cost = result.get("cost")
                logger.info(
                    f"Job {job.id}: Sent {notification_type.value} SMS to {job.customer_phone}"
                )
            elif result.get("status") == "disabled":
                notification.status = NotificationStatus.SENT
                notification.error_message = "SMS service disabled"
                logger.info(f"Job {job.id}: SMS disabled, notification logged only")
            else:
                notification.status = NotificationStatus.FAILED
                notification.error_message = result.get("error", "Unknown error")
                logger.error(
                    f"Job {job.id}: Failed to send {notification_type.value} SMS: {result}"
                )

        except SMSError as e:
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            logger.exception(f"Job {job.id}: SMS error: {e}")

        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        return notification

    def notify_on_status_change(
        self,
        job: Job,
        new_status: str,
        chain: Chain,
    ) -> Optional[Notification]:
        """
        Check if we should notify and send notification for a status change.

        This is the main entry point called from job status updates.
        """
        notification_type = self.should_notify(job, new_status)
        if not notification_type:
            return None

        return self.send_notification(job, notification_type, chain)

    def notify_estimate_ready(self, job: Job, chain: Chain) -> Optional[Notification]:
        """Send notification when an estimate is created/updated."""
        if not job.customer_phone:
            return None

        # Check if already sent
        existing = self.db.exec(
            select(Notification).where(
                Notification.job_id == job.id,
                Notification.notification_type == NotificationType.ESTIMATE_READY,
                Notification.status.in_([NotificationStatus.SENT, NotificationStatus.DELIVERED]),
            )
        ).first()

        if existing:
            logger.info(f"Job {job.id}: Already sent estimate notification")
            return None

        return self.send_notification(job, NotificationType.ESTIMATE_READY, chain)

    def notify_payment_received(self, job: Job, chain: Chain) -> Optional[Notification]:
        """Send notification when payment is confirmed."""
        if not job.customer_phone:
            return None

        return self.send_notification(job, NotificationType.PAYMENT_RECEIVED, chain)

    def get_job_notifications(self, job_id: int) -> list[Notification]:
        """Get all notifications for a job."""
        return list(
            self.db.exec(
                select(Notification)
                .where(Notification.job_id == job_id)
                .order_by(Notification.created_at.desc())
            ).all()
        )
