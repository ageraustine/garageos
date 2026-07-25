"""
Safaricom Daraja API integration for M-Pesa STK Push.

Single Responsibility: M-Pesa API communication only.
"""

import httpx
import base64
from datetime import datetime
from typing import Optional
from dataclasses import dataclass
from app.config import settings
from app.core.exceptions import AppException


class DarajaError(AppException):
    """M-Pesa API error."""
    pass


@dataclass
class STKPushResponse:
    """Response from STK Push request."""
    checkout_request_id: str
    merchant_request_id: str
    response_code: str
    response_description: str
    customer_message: str


@dataclass
class STKCallbackData:
    """Parsed callback data from M-Pesa."""
    checkout_request_id: str
    result_code: int
    result_desc: str
    amount: Optional[float] = None
    mpesa_receipt_number: Optional[str] = None
    phone_number: Optional[str] = None
    transaction_date: Optional[str] = None


class DarajaService:
    """
    M-Pesa Daraja API client.

    Handles:
    - OAuth token generation
    - STK Push (Lipa Na M-Pesa Online)
    - Callback parsing
    """

    SANDBOX_URL = "https://sandbox.safaricom.co.ke"
    PRODUCTION_URL = "https://api.safaricom.co.ke"

    def __init__(self):
        self.consumer_key = settings.MPESA_CONSUMER_KEY
        self.consumer_secret = settings.MPESA_CONSUMER_SECRET
        self.passkey = settings.MPESA_PASSKEY
        self.shortcode = settings.MPESA_SHORTCODE
        self.callback_url = settings.MPESA_CALLBACK_URL
        self.base_url = (
            self.PRODUCTION_URL
            if settings.MPESA_ENVIRONMENT == "production"
            else self.SANDBOX_URL
        )
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    def _is_configured(self) -> bool:
        """Check if M-Pesa is properly configured."""
        return bool(
            self.consumer_key
            and self.consumer_secret
            and self.passkey
            and self.shortcode
        )

    async def _get_access_token(self) -> str:
        """Get OAuth access token from Daraja."""
        if not self._is_configured():
            raise DarajaError("M-Pesa is not configured")

        # Return cached token if still valid
        if self._access_token and self._token_expires_at:
            if datetime.utcnow() < self._token_expires_at:
                return self._access_token

        credentials = base64.b64encode(
            f"{self.consumer_key}:{self.consumer_secret}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
                headers={"Authorization": f"Basic {credentials}"},
            )

            if response.status_code != 200:
                raise DarajaError(f"OAuth failed: {response.text}")

            data = response.json()
            self._access_token = data["access_token"]
            # Token expires in 3600 seconds, cache for 3500 to be safe
            from datetime import timedelta
            self._token_expires_at = datetime.utcnow() + timedelta(seconds=3500)
            return self._access_token

    def _generate_password(self, timestamp: str) -> str:
        """Generate Lipa Na M-Pesa password."""
        data = f"{self.shortcode}{self.passkey}{timestamp}"
        return base64.b64encode(data.encode()).decode()

    async def stk_push(
        self,
        phone_number: str,
        amount: int,
        account_reference: str,
        transaction_desc: str = "Payment",
    ) -> STKPushResponse:
        """
        Initiate STK Push (Lipa Na M-Pesa Online).

        Args:
            phone_number: Customer phone in format 254XXXXXXXXX
            amount: Amount in KES (integer)
            account_reference: Reference shown to customer (e.g., "Job #123")
            transaction_desc: Description of transaction

        Returns:
            STKPushResponse with checkout_request_id to track the transaction
        """
        if not self._is_configured():
            raise DarajaError("M-Pesa is not configured")

        access_token = await self._get_access_token()
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        password = self._generate_password(timestamp)

        # Ensure phone is in correct format
        phone = phone_number.replace("+", "")
        if phone.startswith("0"):
            phone = "254" + phone[1:]
        elif not phone.startswith("254"):
            phone = "254" + phone

        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": self.shortcode,
            "PhoneNumber": phone,
            "CallBackURL": self.callback_url,
            "AccountReference": account_reference[:12],  # Max 12 chars
            "TransactionDesc": transaction_desc[:13],  # Max 13 chars
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/mpesa/stkpush/v1/processrequest",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            if response.status_code != 200:
                raise DarajaError(f"STK Push failed: {response.text}")

            data = response.json()

            if data.get("ResponseCode") != "0":
                raise DarajaError(
                    f"STK Push rejected: {data.get('ResponseDescription', 'Unknown error')}"
                )

            return STKPushResponse(
                checkout_request_id=data["CheckoutRequestID"],
                merchant_request_id=data["MerchantRequestID"],
                response_code=data["ResponseCode"],
                response_description=data["ResponseDescription"],
                customer_message=data["CustomerMessage"],
            )

    @staticmethod
    def parse_callback(data: dict) -> STKCallbackData:
        """
        Parse M-Pesa callback data.

        The callback structure:
        {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "...",
                    "CheckoutRequestID": "...",
                    "ResultCode": 0,
                    "ResultDesc": "...",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": 1},
                            {"Name": "MpesaReceiptNumber", "Value": "..."},
                            {"Name": "PhoneNumber", "Value": 254...},
                            {"Name": "TransactionDate", "Value": 20230...}
                        ]
                    }
                }
            }
        }
        """
        try:
            callback = data["Body"]["stkCallback"]
            result = STKCallbackData(
                checkout_request_id=callback["CheckoutRequestID"],
                result_code=callback["ResultCode"],
                result_desc=callback["ResultDesc"],
            )

            # Parse metadata if payment was successful
            if callback["ResultCode"] == 0 and "CallbackMetadata" in callback:
                items = callback["CallbackMetadata"]["Item"]
                for item in items:
                    name = item["Name"]
                    value = item.get("Value")
                    if name == "Amount":
                        result.amount = float(value)
                    elif name == "MpesaReceiptNumber":
                        result.mpesa_receipt_number = str(value)
                    elif name == "PhoneNumber":
                        result.phone_number = str(value)
                    elif name == "TransactionDate":
                        result.transaction_date = str(value)

            return result
        except (KeyError, TypeError) as e:
            raise DarajaError(f"Invalid callback data: {e}")
