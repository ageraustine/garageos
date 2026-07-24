"""
Email service for sending transactional emails.

Uses SMTP (configured for platform@garageos.africa).
"""

import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email service for sending transactional emails.

    Single Responsibility: sending emails only.
    Supports Zoho Mail (smtp.zoho.com) with TLS (587) or SSL (465).
    """

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.user = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_TLS
        self.use_ssl = getattr(settings, "SMTP_SSL", False)

    def _is_configured(self) -> bool:
        """Check if email is properly configured."""
        return bool(self.host and self.user and self.password)

    def _send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Send an email via SMTP.

        Returns True if sent successfully, False otherwise.
        Supports both SSL (port 465) and TLS (port 587).
        """
        if not self._is_configured():
            logger.warning("Email not configured, skipping send")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email

            # Add plain text version (fallback)
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))

            # Add HTML version
            msg.attach(MIMEText(html_content, "html"))

            # Connect and send - use SSL or TLS based on config
            if self.use_ssl:
                # SSL mode (port 465)
                with smtplib.SMTP_SSL(self.host, self.port) as server:
                    server.login(self.user, self.password)
                    server.sendmail(self.from_email, to_email, msg.as_string())
            else:
                # TLS mode (port 587)
                with smtplib.SMTP(self.host, self.port) as server:
                    if self.use_tls:
                        server.starttls()
                    server.login(self.user, self.password)
                    server.sendmail(self.from_email, to_email, msg.as_string())

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False

    def send_verification_email(
        self,
        to_email: str,
        user_name: str,
        verification_token: str,
    ) -> bool:
        """
        Send email verification link to a new user.
        """
        verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"

        subject = "Verify your GarageOS account"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #d4a853 0%, #c4922e 100%); padding: 32px; text-align: center;">
                            <div style="width: 48px; height: 48px; background-color: #1a2744; border-radius: 12px; display: inline-block; line-height: 48px;">
                                <span style="color: #d4a853; font-weight: bold; font-size: 24px;">G</span>
                            </div>
                            <h1 style="color: #1a2744; margin: 16px 0 0 0; font-size: 24px; font-weight: bold;">GarageOS</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="color: #1a2744; margin: 0 0 16px 0; font-size: 20px;">Welcome, {user_name}!</h2>
                            <p style="color: #4a5568; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                Thank you for registering with GarageOS. Please verify your email address to complete your account setup.
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 16px 0;">
                                        <a href="{verification_url}"
                                           style="display: inline-block; background: linear-gradient(135deg, #d4a853 0%, #c4922e 100%); color: #1a2744; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold; font-size: 16px;">
                                            Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #718096; margin: 24px 0 0 0; font-size: 14px; line-height: 1.6;">
                                This link will expire in 24 hours. If you didn't create an account with GarageOS, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="color: #4299e1; margin: 8px 0 0 0; font-size: 12px; word-break: break-all;">
                                {verification_url}
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Copyright -->
                <p style="color: #a0aec0; margin: 24px 0 0 0; font-size: 12px; text-align: center;">
                    &copy; {__import__('datetime').datetime.now().year} GarageOS. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        text_content = f"""
Welcome to GarageOS, {user_name}!

Thank you for registering. Please verify your email address by clicking the link below:

{verification_url}

This link will expire in 24 hours.

If you didn't create an account with GarageOS, you can safely ignore this email.

- The GarageOS Team
"""

        return self._send_email(to_email, subject, html_content, text_content)

    def send_welcome_email(self, to_email: str, user_name: str) -> bool:
        """
        Send welcome email after successful verification.
        """
        dashboard_url = f"{settings.FRONTEND_URL}/dashboard"

        subject = "Welcome to GarageOS - Account Verified!"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #d4a853 0%, #c4922e 100%); padding: 32px; text-align: center;">
                            <div style="width: 48px; height: 48px; background-color: #1a2744; border-radius: 12px; display: inline-block; line-height: 48px;">
                                <span style="color: #d4a853; font-weight: bold; font-size: 24px;">G</span>
                            </div>
                            <h1 style="color: #1a2744; margin: 16px 0 0 0; font-size: 24px; font-weight: bold;">GarageOS</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="color: #1a2744; margin: 0 0 16px 0; font-size: 20px;">You're all set, {user_name}!</h2>
                            <p style="color: #4a5568; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                Your email has been verified and your GarageOS account is now active. You can start managing your garage right away.
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 16px 0;">
                                        <a href="{dashboard_url}"
                                           style="display: inline-block; background: linear-gradient(135deg, #d4a853 0%, #c4922e 100%); color: #1a2744; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold; font-size: 16px;">
                                            Go to Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #718096; margin: 0; font-size: 14px;">
                                Questions? Reply to this email or contact us at info@garageos.africa
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        text_content = f"""
You're all set, {user_name}!

Your email has been verified and your GarageOS account is now active.

Go to your dashboard: {dashboard_url}

Questions? Contact us at info@garageos.africa

- The GarageOS Team
"""

        return self._send_email(to_email, subject, html_content, text_content)

    def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        reset_token: str,
    ) -> bool:
        """
        Send password reset link to user.
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        subject = "Reset your GarageOS PIN"

        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #d4a853 0%, #c4922e 100%); padding: 32px; text-align: center;">
                            <div style="width: 48px; height: 48px; background-color: #1a2744; border-radius: 12px; display: inline-block; line-height: 48px;">
                                <span style="color: #d4a853; font-weight: bold; font-size: 24px;">G</span>
                            </div>
                            <h1 style="color: #1a2744; margin: 16px 0 0 0; font-size: 24px; font-weight: bold;">GarageOS</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 32px;">
                            <h2 style="color: #1a2744; margin: 0 0 16px 0; font-size: 20px;">Reset Your PIN</h2>
                            <p style="color: #4a5568; margin: 0 0 24px 0; font-size: 16px; line-height: 1.6;">
                                Hi {user_name}, we received a request to reset your GarageOS PIN. Click the button below to set a new PIN.
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 16px 0;">
                                        <a href="{reset_url}"
                                           style="display: inline-block; background: linear-gradient(135deg, #d4a853 0%, #c4922e 100%); color: #1a2744; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: bold; font-size: 16px;">
                                            Reset PIN
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #718096; margin: 24px 0 0 0; font-size: 14px; line-height: 1.6;">
                                This link will expire in 1 hour. If you didn't request a PIN reset, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
                            <p style="color: #a0aec0; margin: 0; font-size: 12px;">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="color: #4299e1; margin: 8px 0 0 0; font-size: 12px; word-break: break-all;">
                                {reset_url}
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Copyright -->
                <p style="color: #a0aec0; margin: 24px 0 0 0; font-size: 12px; text-align: center;">
                    &copy; {__import__('datetime').datetime.now().year} GarageOS. All rights reserved.
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
"""

        text_content = f"""
Reset Your PIN

Hi {user_name}, we received a request to reset your GarageOS PIN.

Click the link below to set a new PIN:
{reset_url}

This link will expire in 1 hour.

If you didn't request a PIN reset, you can safely ignore this email.

- The GarageOS Team
"""

        return self._send_email(to_email, subject, html_content, text_content)
