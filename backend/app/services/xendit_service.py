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


# ────────────────────────────────────────────────────────────────
# Customer & Payment Method Tokenization (for auto-charge)
# ────────────────────────────────────────────────────────────────

async def create_customer(user_id: str, user_email: str, user_name: str) -> dict:
    """
    Create a Xendit Customer object. Required before tokenizing payment methods.

    Returns dict with customer_id.
    """
    if settings.is_development and not settings.XENDIT_SECRET_KEY:
        mock_id = f"cust_mock_{uuid.uuid4().hex[:12]}"
        print(f"\n{'='*50}")
        print(f"👤 XENDIT CUSTOMER (DEV MODE - Mock)")
        print(f"   Customer ID: {mock_id}")
        print(f"   Email: {user_email}")
        print(f"{'='*50}\n")
        return {"customer_id": mock_id}

    headers = _get_auth_header()
    payload = {
        "reference_id": f"sahamgue_user_{user_id}",
        "type": "INDIVIDUAL",
        "individual_detail": {"given_names": user_name},
        "email": user_email,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{XENDIT_API_BASE}/customers",
                headers=headers,
                json=payload,
            )
            if response.status_code in (200, 201):
                data = response.json()
                return {"customer_id": data["id"]}
            else:
                error_data = response.json() if response.content else {}
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to create payment customer: {error_data.get('message', 'Unknown')}",
                )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach payment service.",
        )


async def tokenize_payment_method(
    customer_id: str,
    payment_type: str = "CARD",
) -> dict:
    """
    Create a tokenization session for the customer to save their payment method.

    In production, this returns a URL/token that the frontend uses to collect
    card/e-wallet details securely via Xendit.js or redirect.

    Returns dict with:
        - payment_method_id: Token for future charges
        - redirect_url: URL to redirect user for payment method collection
    """
    if settings.is_development and not settings.XENDIT_SECRET_KEY:
        mock_pm_id = f"pm_mock_{uuid.uuid4().hex[:12]}"
        print(f"\n{'='*50}")
        print(f"💳 XENDIT PAYMENT METHOD (DEV MODE - Mock)")
        print(f"   Payment Method ID: {mock_pm_id}")
        print(f"   Customer: {customer_id}")
        print(f"   Type: {payment_type}")
        print(f"{'='*50}\n")
        return {
            "payment_method_id": mock_pm_id,
            "redirect_url": f"https://checkout-staging.xendit.co/mock/{mock_pm_id}",
            "status": "ACTIVE",
        }

    headers = _get_auth_header()
    payload = {
        "type": payment_type,
        "customer_id": customer_id,
        "reusability": "MULTIPLE",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{XENDIT_API_BASE}/v2/payment_methods",
                headers=headers,
                json=payload,
            )
            if response.status_code in (200, 201):
                data = response.json()
                return {
                    "payment_method_id": data["id"],
                    "redirect_url": data.get("actions", [{}])[0].get("url", ""),
                    "status": data.get("status", "REQUIRES_ACTION"),
                }
            else:
                error_data = response.json() if response.content else {}
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Failed to tokenize payment method: {error_data.get('message', 'Unknown')}",
                )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach payment service.",
        )


async def get_payment_method(payment_method_id: str) -> dict:
    """
    Retrieve a payment method from Xendit and return its latest status.

    Used to confirm the customer completed any required action before
    granting trial access or scheduling recurring charges.
    """
    if settings.is_development and not settings.XENDIT_SECRET_KEY:
        return {
            "payment_method_id": payment_method_id,
            "status": "ACTIVE",
            "reusability": "MULTIPLE",
        }

    headers = _get_auth_header()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{XENDIT_API_BASE}/payment_methods/{payment_method_id}",
                headers=headers,
            )
            if response.status_code in (200, 201):
                data = response.json()
                return {
                    "payment_method_id": data["id"],
                    "status": data.get("status", "UNKNOWN"),
                    "reusability": data.get("reusability"),
                }

            error_data = response.json() if response.content else {}
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch payment method: {error_data.get('message', 'Unknown')}",
            )
    except httpx.RequestError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to reach payment service.",
        )


async def charge_saved_payment_method(
    customer_id: str,
    payment_method_id: str,
    amount: int,
    description: str,
    user_id: str,
) -> dict:
    """
    Charge a previously saved payment method (auto-charge after trial).

    Returns dict with payment_request_id and status.
    """
    if settings.is_development and not settings.XENDIT_SECRET_KEY:
        mock_pr_id = f"pr_mock_{uuid.uuid4().hex[:12]}"
        print(f"\n{'='*50}")
        print(f"⚡ XENDIT AUTO-CHARGE (DEV MODE - Mock)")
        print(f"   Payment Request ID: {mock_pr_id}")
        print(f"   Amount: Rp {amount:,}")
        print(f"   Description: {description}")
        print(f"{'='*50}\n")
        return {
            "payment_request_id": mock_pr_id,
            "status": "SUCCEEDED",
            "amount": amount,
        }

    headers = _get_auth_header()
    reference_id = f"sahamgue_autocharge_{user_id}_{int(datetime.utcnow().timestamp())}"
    payload = {
        "amount": amount,
        "currency": "IDR",
        "payment_method_id": payment_method_id,
        "customer_id": customer_id,
        "description": description,
        "reference_id": reference_id,
        "metadata": {"user_id": user_id, "type": "trial_auto_charge"},
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{XENDIT_API_BASE}/v2/payment_requests",
                headers=headers,
                json=payload,
            )
            if response.status_code in (200, 201):
                data = response.json()
                return {
                    "payment_request_id": data["id"],
                    "status": data.get("status", "PENDING"),
                    "amount": data.get("amount", amount),
                }
            else:
                error_data = response.json() if response.content else {}
                print(f"❌ Xendit auto-charge error: {response.status_code} — {error_data}")
                return {
                    "payment_request_id": None,
                    "status": "FAILED",
                    "amount": amount,
                    "error": error_data.get("message", "Unknown error"),
                }
    except httpx.RequestError as e:
        print(f"❌ Xendit auto-charge connection error: {e}")
        return {
            "payment_request_id": None,
            "status": "FAILED",
            "amount": amount,
            "error": str(e),
        }
