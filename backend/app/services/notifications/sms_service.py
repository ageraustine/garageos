"""Africa's Talking SMS Service for customer notifications."""

import africastalking
from typing import Optional
from app.config import settings
from app.core.exceptions import AppException
import logging

logger = logging.getLogger(__name__)


class SMSError(AppException):
    """SMS sending failed."""
    pass


class SMSService:
    """
    Africa's Talking SMS integration.

    Used for sending job status notifications to customers.
    """

    def __init__(self):
        self.enabled = bool(settings.AT_USERNAME and settings.AT_API_KEY)

        if self.enabled:
            # Initialize Africa's Talking
            africastalking.initialize(
                username=settings.AT_USERNAME,
                api_key=settings.AT_API_KEY,
            )
            self.sms = africastalking.SMS
        else:
            self.sms = None
            logger.warning("SMS service disabled: AT_USERNAME or AT_API_KEY not configured")

    def send(
        self,
        phone: str,
        message: str,
        sender_id: Optional[str] = None,
    ) -> dict:
        """
        Send an SMS message.

        Args:
            phone: Recipient phone number (E.164 format, e.g., +254712345678)
            message: Message content (max 160 chars for single SMS)
            sender_id: Optional sender ID override

        Returns:
            dict with status and message_id
        """
        if not self.enabled:
            logger.info(f"SMS disabled - would send to {phone}: {message[:50]}...")
            return {"status": "disabled", "message_id": None}

        # Ensure phone is in correct format
        if not phone.startswith("+"):
            phone = f"+{phone}"

        try:
            # Use configured sender ID if not overridden
            from_id = sender_id or settings.AT_SENDER_ID or None

            response = self.sms.send(
                message=message,
                recipients=[phone],
                sender_id=from_id,
            )

            # Parse response
            # Response format: {'SMSMessageData': {'Message': '...', 'Recipients': [...]}}
            recipients = response.get("SMSMessageData", {}).get("Recipients", [])

            if recipients:
                recipient = recipients[0]
                status = recipient.get("status", "Unknown")
                message_id = recipient.get("messageId")
                cost = recipient.get("cost", "0")

                if status == "Success":
                    logger.info(f"SMS sent to {phone}, messageId: {message_id}, cost: {cost}")
                    return {
                        "status": "sent",
                        "message_id": message_id,
                        "cost": cost,
                    }
                else:
                    logger.error(f"SMS failed to {phone}: {status}")
                    return {
                        "status": "failed",
                        "message_id": message_id,
                        "error": status,
                    }
            else:
                logger.error(f"SMS no recipients in response: {response}")
                return {"status": "failed", "error": "No recipients in response"}

        except Exception as e:
            logger.exception(f"SMS error sending to {phone}: {e}")
            raise SMSError(f"Failed to send SMS: {str(e)}")

    def send_bulk(
        self,
        phones: list[str],
        message: str,
        sender_id: Optional[str] = None,
    ) -> list[dict]:
        """
        Send the same SMS to multiple recipients.

        Args:
            phones: List of recipient phone numbers
            message: Message content
            sender_id: Optional sender ID override

        Returns:
            List of results per recipient
        """
        if not self.enabled:
            logger.info(f"SMS disabled - would send to {len(phones)} recipients")
            return [{"phone": p, "status": "disabled"} for p in phones]

        # Normalize phone numbers
        normalized = [p if p.startswith("+") else f"+{p}" for p in phones]

        try:
            from_id = sender_id or settings.AT_SENDER_ID or None

            response = self.sms.send(
                message=message,
                recipients=normalized,
                sender_id=from_id,
            )

            recipients = response.get("SMSMessageData", {}).get("Recipients", [])

            results = []
            for recipient in recipients:
                results.append({
                    "phone": recipient.get("number"),
                    "status": "sent" if recipient.get("status") == "Success" else "failed",
                    "message_id": recipient.get("messageId"),
                    "cost": recipient.get("cost"),
                    "error": None if recipient.get("status") == "Success" else recipient.get("status"),
                })

            return results

        except Exception as e:
            logger.exception(f"Bulk SMS error: {e}")
            raise SMSError(f"Failed to send bulk SMS: {str(e)}")


# Singleton instance
_sms_service: Optional[SMSService] = None


def get_sms_service() -> SMSService:
    """Get or create the SMS service singleton."""
    global _sms_service
    if _sms_service is None:
        _sms_service = SMSService()
    return _sms_service
