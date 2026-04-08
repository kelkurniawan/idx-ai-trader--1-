"""
Xendit Webhook Router

Handles incoming webhook callbacks from Xendit for invoice status updates.
Mounted at /api/webhooks/xendit.

Security:
    - Verifies the x-callback-token header against XENDIT_WEBHOOK_TOKEN
    - Idempotent: duplicate callbacks are safely ignored
    - Returns 200 immediately to prevent Xendit retries

Xendit retry policy:
    - If non-2xx response, Xendit retries up to 6 times with exponential backoff
"""

from datetime import datetime
import hmac

from fastapi import APIRouter, Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..config import get_settings
from ..database import AsyncSessionLocal
from ..models.user import User
from ..models.subscription import PaymentHistory
from ..services.plan_service import activate_plan

settings = get_settings()
router = APIRouter()


def _verify_callback_token(request: Request) -> None:
    """
    Verify the x-callback-token header from Xendit.

    This token is configured in the Xendit Dashboard → Webhooks → Verification Token.
    It proves the request actually came from Xendit.
    """
    expected_token = settings.XENDIT_WEBHOOK_TOKEN

    # Skip verification in dev if no token configured
    if settings.is_development and not expected_token:
        print("⚠️  Webhook token verification skipped (dev mode, no token configured)")
        return

    received_token = request.headers.get("x-callback-token", "")

    if not received_token or not hmac.compare_digest(received_token, expected_token):
        print(f"❌ Webhook token mismatch! Received: {received_token[:10]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid callback token.",
        )


@router.post("/invoice", summary="Xendit invoice webhook")
async def handle_invoice_webhook(request: Request):
    """
    Handle Xendit invoice status updates.

    Xendit sends this callback when an invoice status changes:
    - PAID: Payment completed successfully
    - EXPIRED: Invoice expired (user didn't pay within 24h)
    - FAILED: Payment attempt failed

    Payload structure:
    {
        "id": "invoice_id",
        "external_id": "sahamgue_...",
        "status": "PAID",
        "amount": 24999,
        "paid_amount": 24999,
        "payment_method": "QRIS",
        "payment_channel": "QRIS",
        "paid_at": "2025-...",
        "metadata": {
            "user_id": "...",
            "plan": "PRO",
            "billing_cycle": "MONTHLY"
        }
    }
    """
    # 1. Verify callback token
    _verify_callback_token(request)

    # 2. Parse payload
    try:
        payload = await request.json()
    except Exception:
        return {"status": "error", "message": "Invalid JSON payload"}

    invoice_id = payload.get("id", "")
    invoice_status = payload.get("status", "").upper()
    external_id = payload.get("external_id", "")
    metadata = payload.get("metadata", {})

    print(f"\n{'='*50}")
    print(f"📬 XENDIT WEBHOOK RECEIVED")
    print(f"   Invoice ID: {invoice_id}")
    print(f"   Status: {invoice_status}")
    print(f"   External ID: {external_id}")
    print(f"   Amount: Rp {payload.get('amount', 0):,}")
    print(f"{'='*50}\n")

    # 3. Process in a new database session
    async with AsyncSessionLocal() as db:
        # 4. Idempotency check: see if we already processed this invoice
        stmt = select(PaymentHistory).where(
            PaymentHistory.xendit_invoice_id == invoice_id
        )
        result = await db.execute(stmt)
        payment = result.scalar_one_or_none()

        if not payment:
            print(f"⚠️  No payment record found for invoice {invoice_id}. Skipping.")
            return {"status": "received", "message": "No matching payment record"}

        if payment.status == "PAID":
            print(f"ℹ️  Invoice {invoice_id} already processed. Skipping (idempotent).")
            return {"status": "received", "message": "Already processed"}

        # 5. Handle based on status
        if invoice_status == "PAID":
            await _handle_paid(payment, payload, db)
        elif invoice_status == "EXPIRED":
            payment.status = "EXPIRED"
            payment.updated_at = datetime.utcnow()
            await db.commit()
            print(f"⏰ Invoice {invoice_id} expired (user didn't pay)")
        elif invoice_status in ("FAILED", "PAYMENT_FAILED"):
            payment.status = "FAILED"
            payment.updated_at = datetime.utcnow()
            await db.commit()
            print(f"❌ Invoice {invoice_id} payment failed")
        else:
            print(f"ℹ️  Unhandled invoice status: {invoice_status}")

    # Always return 200 to prevent Xendit retries
    return {"status": "received"}


async def _handle_paid(payment: PaymentHistory, payload: dict, db) -> None:
    """
    Handle a successful payment.

    1. Update payment record with payment details
    2. Activate the plan for the user
    """
    now = datetime.utcnow()
    payload_amount = payload.get("paid_amount") or payload.get("amount")
    if payload_amount is not None and int(payload_amount) != payment.amount_idr:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount does not match the pending invoice.",
        )

    # Update payment record
    payment.status = "PAID"
    payment.payment_method = payload.get("payment_method", "")
    payment.payment_channel = payload.get("payment_channel", "")
    payment.paid_at = now
    payment.updated_at = now

    # Activate plan
    user_id = payment.user_id
    plan = payment.plan
    billing_cycle = payment.billing_cycle

    subscription = await activate_plan(
        user_id=user_id,
        plan=plan,
        billing_cycle=billing_cycle,
        xendit_invoice_id=payment.xendit_invoice_id,
        amount_idr=payment.amount_idr,
        db=db,
    )

    # Link subscription to payment
    payment.subscription_id = subscription.id
    await db.commit()

    print(f"✅ PAYMENT SUCCESSFUL!")
    print(f"   User: {user_id[:8]}...")
    print(f"   Plan: {plan} ({billing_cycle})")
    print(f"   Amount: Rp {payment.amount_idr:,}")
    print(f"   Method: {payment.payment_method}")
    print(f"   Subscription ID: {subscription.id[:8]}...")
