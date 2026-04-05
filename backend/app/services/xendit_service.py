"""
Xendit Service

Client for interacting with the Xendit Invoice API.
Handles invoice creation for subscription payments.

API Reference: https://docs.xendit.co/
Authentication: Basic Auth (secret key as username, empty password)
"""

import uuid
import base64
from datetime import datetime

import httpx
from fastapi import HTTPException, status

from ..config import get_settings
from ..services.plan_service import get_price, BILLING_CYCLES

settings = get_settings()

# Xendit API base URLs
XENDIT_API_BASE = "https://api.xendit.co"
XENDIT_TEST_BASE = "https://api.xendit.co"  # Same URL, different keys

# Invoice expiry: 24 hours for user to pay
INVOICE_DURATION_SECONDS = 86400


def _get_auth_header() -> dict:
    """
    Build Basic Auth header for Xendit API.

    Xendit uses the secret key as the username with an empty password.
    """
    secret_key = settings.XENDIT_SECRET_KEY
    if not secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment service is not configured. Please contact support.",
        )
    # Basic auth: base64(secret_key + ":")
    credentials = base64.b64encode(f"{secret_key}:".encode()).decode()
    return {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
    }


async def create_invoice(
    user_id: str,
    user_email: str,
    user_name: str,
    plan: str,
    billing_cycle: str,
) -> dict:
    """
    Create a Xendit invoice for a subscription payment.

    Returns dict with:
        - invoice_id: Xendit invoice ID
        - invoice_url: Hosted checkout URL (redirect user here)
        - external_id: Our internal reference
        - amount: Amount in IDR
        - expiry_date: When the invoice expires
    """
    amount = get_price(plan, billing_cycle)
    cycle_info = BILLING_CYCLES[billing_cycle]
    external_id = f"sahamgue_{user_id}_{plan}_{billing_cycle}_{int(datetime.utcnow().timestamp())}"

    # Plan display name
    plan_display = "Pro" if plan == "PRO" else "Expert"
    cycle_display = cycle_info["label"]

    payload = {
        "external_id": external_id,
        "amount": amount,
        "currency": "IDR",
        "description": f"SahamGue {plan_display} Plan – {cycle_display}",
        "invoice_duration": INVOICE_DURATION_SECONDS,
        "customer": {
            "given_names": user_name,
            "email": user_email,
        },
        "customer_notification_preference": {
            "invoice_created": ["email"],
            "invoice_reminder": ["email"],
            "invoice_paid": ["email"],
        },
        "success_redirect_url": settings.XENDIT_SUCCESS_URL,
        "failure_redirect_url": settings.XENDIT_FAILURE_URL,
        # Metadata for webhook processing
        "metadata": {
            "user_id": user_id,
            "plan": plan,
            "billing_cycle": billing_cycle,
        },
    }

    headers = _get_auth_header()

    # In development without a Xendit key, return mock data
    if settings.is_development and not settings.XENDIT_SECRET_KEY:
        mock_id = f"mock_inv_{uuid.uuid4().hex[:12]}"
        print(f"\n{'='*50}")
        print(f"💳 XENDIT INVOICE (DEV MODE - Mock)")
        print(f"   Invoice ID: {mock_id}")
        print(f"   Plan: {plan_display} ({cycle_display})")
        print(f"   Amount: Rp {amount:,}")
        print(f"   External ID: {external_id}")
        print(f"{'='*50}\n")
        return {
            "invoice_id": mock_id,
            "invoice_url": f"https://checkout-staging.xendit.co/web/{mock_id}",
            "external_id": external_id,
            "amount": amount,
            "expiry_date": datetime.utcnow().isoformat(),
        }

    # Real Xendit API call
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{XENDIT_API_BASE}/v2/invoices",
                headers=headers,
                json=payload,
            )

            if response.status_code == 200 or response.status_code == 201:
                data = response.json()
                return {
                    "invoice_id": data["id"],
                    "invoice_url": data["invoice_url"],
                    "external_id": data["external_id"],
                    "amount": data["amount"],
                    "expiry_date": data.get("expiry_date", ""),
                }
            else:
                error_data = response.json() if response.content else {}
                print(f"❌ Xendit API error: {response.status_code} — {error_data}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Payment service error: {error_data.get('message', 'Unknown error')}",
                )
    except httpx.RequestError as e:
        print(f"❌ Xendit connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach payment service. Please try again later.",
        )


async def get_invoice(invoice_id: str) -> dict:
    """
    Retrieve an invoice from Xendit by ID.

    Useful for checking invoice status without waiting for webhook.
    """
    if settings.is_development and not settings.XENDIT_SECRET_KEY:
        return {"id": invoice_id, "status": "PENDING"}

    headers = _get_auth_header()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{XENDIT_API_BASE}/v2/invoices/{invoice_id}",
                headers=headers,
            )
            if response.status_code == 200:
                return response.json()
            else:
                return {"id": invoice_id, "status": "UNKNOWN"}
    except httpx.RequestError:
        return {"id": invoice_id, "status": "ERROR"}
