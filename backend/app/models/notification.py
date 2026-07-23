"""Notification models for tracking SMS/WhatsApp messages sent to customers."""

from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class NotificationChannel(str, Enum):
    """Channel used to send notification."""

    SMS = "sms"
    WHATSAPP = "whatsapp"
    EMAIL = "email"


class NotificationStatus(str, Enum):
    """Status of the notification."""

    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"


class NotificationType(str, Enum):
    """Type of notification for job updates."""

    JOB_STARTED = "job_started"  # Job intake/start
    JOB_PROGRESS = "job_progress"  # 50% progress
    JOB_READY = "job_ready"  # 100% complete
    ESTIMATE_READY = "estimate_ready"  # Estimate needs approval
    PAYMENT_RECEIVED = "payment_received"  # Payment confirmed


class Notification(SQLModel, table=True):
    """
    Log of all notifications sent to customers.

    Tracks SMS/WhatsApp messages for auditing and preventing duplicates.
    """

    __tablename__ = "notifications"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="jobs.id", index=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)

    # Recipient info
    phone: str = Field(max_length=20, description="Recipient phone number")
    customer_name: Optional[str] = Field(default=None, max_length=100)

    # Notification details
    notification_type: NotificationType = Field(index=True)
    channel: NotificationChannel = Field(default=NotificationChannel.SMS)
    message: str = Field(description="Full message content sent")

    # Delivery tracking
    status: NotificationStatus = Field(default=NotificationStatus.PENDING, index=True)
    external_id: Optional[str] = Field(
        default=None, max_length=100, description="SMS provider message ID"
    )
    cost: Optional[str] = Field(default=None, max_length=20, description="Cost from provider")
    error_message: Optional[str] = Field(default=None, max_length=500)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = Field(default=None)
    delivered_at: Optional[datetime] = Field(default=None)
