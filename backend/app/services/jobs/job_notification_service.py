"""Job notification service - Email alerts for customers on job progress."""

from sqlmodel import Session, select
from datetime import datetime
from typing import Optional
from app.models.payments.notification import (
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationType,
)
from app.models.jobs.job import Job
from app.models.crm.vehicle import Vehicle
from app.models.core.chain import Chain
from app.services.notifications.email_service import EmailService
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
    Manages email notifications to customers about job progress.

    Notifications are sent at key milestones:
    - Job Started (diagnosis begins)
    - 50% Progress (working stage)
    - 100% Ready (ready for pickup)
    """

    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()

    def should_notify(self, job: Job, new_status: str) -> Optional[NotificationType]:
        """
        Determine if we should send a notification for this status change.

        Returns the notification type if we should notify, None otherwise.
        """
        # Only notify if customer email is available
        if not job.customer_email:
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

    def _get_plate(self, job: Job) -> str:
        """Get the vehicle plate for a job."""
        vehicle = self.db.get(Vehicle, job.vehicle_id)
        return vehicle.plate if vehicle else "Unknown"

    def send_notification(
        self,
        job: Job,
        notification_type: NotificationType,
        chain: Chain,
    ) -> Optional[Notification]:
        """
        Send an email notification to the customer and log it.

        Returns the Notification record if sent, None if skipped.
        """
        if not job.customer_email:
            logger.warning(f"Job {job.id}: No customer email, skipping notification")
            return None

        # Get job details
        customer_name = job.customer_name or "Customer"
        plate = self._get_plate(job)
        garage_name = chain.display_name or chain.name
        magic_link = f"{settings.FRONTEND_URL}/job/{job.magic_link_token}"

        # Create notification record
        notification = Notification(
            job_id=job.id,
            chain_id=job.chain_id,
            phone=job.customer_phone,  # Keep for reference
            email=job.customer_email,
            customer_name=job.customer_name,
            notification_type=notification_type,
            channel=NotificationChannel.EMAIL,
            message=f"Email sent to {job.customer_email}",
            status=NotificationStatus.PENDING,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)

        # Send email based on notification type
        try:
            success = False
            if notification_type == NotificationType.JOB_STARTED:
                success = self.email_service.send_job_started_email(
                    to_email=job.customer_email,
                    customer_name=customer_name,
                    plate=plate,
                    garage_name=garage_name,
                    magic_link=magic_link,
                )
            elif notification_type == NotificationType.JOB_PROGRESS:
                success = self.email_service.send_job_progress_email(
                    to_email=job.customer_email,
                    customer_name=customer_name,
                    plate=plate,
                    garage_name=garage_name,
                    magic_link=magic_link,
                )
            elif notification_type == NotificationType.JOB_READY:
                success = self.email_service.send_job_ready_email(
                    to_email=job.customer_email,
                    customer_name=customer_name,
                    plate=plate,
                    garage_name=garage_name,
                    magic_link=magic_link,
                )
            elif notification_type == NotificationType.ESTIMATE_READY:
                success = self.email_service.send_estimate_ready_email(
                    to_email=job.customer_email,
                    customer_name=customer_name,
                    plate=plate,
                    garage_name=garage_name,
                    magic_link=magic_link,
                )
            elif notification_type == NotificationType.PAYMENT_RECEIVED:
                success = self.email_service.send_payment_received_email(
                    to_email=job.customer_email,
                    customer_name=customer_name,
                    plate=plate,
                    garage_name=garage_name,
                )

            notification.sent_at = datetime.utcnow()

            if success:
                notification.status = NotificationStatus.SENT
                logger.info(
                    f"Job {job.id}: Sent {notification_type.value} email to {job.customer_email}"
                )
            else:
                notification.status = NotificationStatus.FAILED
                notification.error_message = "Email service not configured or failed"
                logger.error(
                    f"Job {job.id}: Failed to send {notification_type.value} email"
                )

        except Exception as e:
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            logger.exception(f"Job {job.id}: Email error: {e}")

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
        if not job.customer_email:
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
        if not job.customer_email:
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
