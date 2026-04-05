"""
Subscription Router

All /api/subscription/* endpoints.
Handles plan listing, subscription creation (Xendit invoice), status, and history.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..models.subscription import PaymentHistory
from ..services.auth_service import get_current_user
from ..services.plan_service import (
    get_subscription_status,
    get_plan_features,
    get_price,
    PLAN_PRICES_IDR,
    BILLING_CYCLES,
    PLAN_FEATURES,
)
from ..services.xendit_service import create_invoice
from ..schemas.subscription import (
    SubscribeRequest,
    InvoiceResponse,
    PlansListResponse,
    PlanDetail,
    PlanPriceDetail,
    SubscriptionStatusResponse,
    PaymentHistoryItem,
    PaymentHistoryResponse,
)

router = APIRouter()


# ────────────────────────────────────────────────────────────────
# List Plans (Public)
# ────────────────────────────────────────────────────────────────

@router.get("/plans", response_model=PlansListResponse, summary="List all plans with pricing")
async def list_plans() -> PlansListResponse:
    """
    Public endpoint: returns all available plans with pricing and features.
    Used by the frontend Pricing Page.
    """
    plans = []

    # FREE plan (no pricing)
    plans.append(PlanDetail(
        name="FREE",
        display_name="Free",
        prices=[],
        features=PLAN_FEATURES["FREE"],
    ))

    # PRO and EXPERT plans
    for plan_name in ["PRO", "EXPERT"]:
        prices = []
        plan_prices = PLAN_PRICES_IDR[plan_name]

        for cycle_key, cycle_info in BILLING_CYCLES.items():
            price = plan_prices[cycle_key]
            duration_days = cycle_info["duration_days"]
            # Calculate effective monthly price
            months = duration_days / 30
            price_per_month = int(price / months) if months > 0 else price

            prices.append(PlanPriceDetail(
                billing_cycle=cycle_key,
                label=cycle_info["label"],
                price_idr=price,
                price_per_month=price_per_month,
                discount_pct=cycle_info["discount_pct"],
                duration_days=duration_days,
            ))

        plans.append(PlanDetail(
            name=plan_name,
            display_name="Pro" if plan_name == "PRO" else "Expert",
            prices=prices,
            features=PLAN_FEATURES[plan_name],
        ))

    return PlansListResponse(plans=plans)


# ────────────────────────────────────────────────────────────────
# Subscribe (Create Invoice)
# ────────────────────────────────────────────────────────────────

@router.post("/subscribe", response_model=InvoiceResponse, summary="Create subscription invoice")
async def subscribe(
    request: SubscribeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    """
    Create a Xendit invoice for the requested plan upgrade.

    Returns the invoice URL — frontend should redirect the user there
    to complete payment. Once paid, the Xendit webhook will activate the plan.
    """
    plan = request.plan
    billing_cycle = request.billing_cycle

    # Validate: don't allow subscribing to the same plan
    if user.plan == plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already on the {plan} plan.",
        )

    # Validate: don't allow downgrading via subscribe (only upgrade or different plan)
    plan_rank = {"FREE": 0, "PRO": 1, "EXPERT": 2}
    if plan_rank.get(plan, 0) < plan_rank.get(user.plan, 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To downgrade, let your current plan expire or contact support.",
        )

    # Create Xendit invoice
    amount = get_price(plan, billing_cycle)
    invoice_data = await create_invoice(
        user_id=user.id,
        user_email=user.email,
        user_name=user.name,
        plan=plan,
        billing_cycle=billing_cycle,
    )

    # Store payment record as PENDING
    payment = PaymentHistory(
        id=str(uuid.uuid4()),
        user_id=user.id,
        xendit_invoice_id=invoice_data["invoice_id"],
        xendit_invoice_url=invoice_data["invoice_url"],
        plan=plan,
        billing_cycle=billing_cycle,
        amount_idr=amount,
        status="PENDING",
    )
    db.add(payment)
    await db.commit()

    return InvoiceResponse(
        invoice_id=invoice_data["invoice_id"],
        invoice_url=invoice_data["invoice_url"],
        plan=plan,
        billing_cycle=billing_cycle,
        amount_idr=amount,
        expires_at=invoice_data.get("expiry_date", ""),
    )


# ────────────────────────────────────────────────────────────────
# Subscription Status
# ────────────────────────────────────────────────────────────────

@router.get("/status", response_model=SubscriptionStatusResponse, summary="Get subscription status")
async def get_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SubscriptionStatusResponse:
    """Get the current subscription status, plan features, and expiry info."""
    status_data = await get_subscription_status(user.id, db)
    return SubscriptionStatusResponse(**status_data)


# ────────────────────────────────────────────────────────────────
# Payment History
# ────────────────────────────────────────────────────────────────

@router.get("/history", response_model=PaymentHistoryResponse, summary="Get payment history")
async def get_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentHistoryResponse:
    """Get all payment records for the current user, newest first."""
    stmt = (
        select(PaymentHistory)
        .where(PaymentHistory.user_id == user.id)
        .order_by(PaymentHistory.created_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    records = result.scalars().all()

    payments = [
        PaymentHistoryItem(
            id=r.id,
            plan=r.plan,
            billing_cycle=r.billing_cycle,
            amount_idr=r.amount_idr,
            status=r.status,
            payment_method=r.payment_method,
            paid_at=r.paid_at,
            created_at=r.created_at,
        )
        for r in records
    ]

    return PaymentHistoryResponse(payments=payments)
