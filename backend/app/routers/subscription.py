"""
Subscription Router

All /api/subscription/* endpoints.
Handles plan listing, subscription creation (Xendit invoice), status, and history.
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models.user import User
from ..models.subscription import PaymentHistory
from ..services.auth_service import get_current_user, require_admin
from ..services.billing_ops_service import get_billing_overview, reconcile_billing_records
from ..services.plan_service import (
    activate_trial,
    get_subscription_status,
    get_plan_features,
    get_price,
    PLAN_PRICES_IDR,
    BILLING_CYCLES,
    PLAN_FEATURES,
)
from ..services.xendit_service import create_invoice, create_customer, get_payment_method, tokenize_payment_method
from ..services.request_guard import enforce_rate_limit, request_identifier
from ..schemas.subscription import (
    AutoRenewStatusResponse,
    BillingOverviewResponse,
    BillingReconciliationResponse,
    ConfirmTrialRequest,
    SubscribeRequest,
    StartTrialRequest,
    InvoiceResponse,
    PlansListResponse,
    PlanDetail,
    PlanPriceDetail,
    SubscriptionStatusResponse,
    PaymentHistoryItem,
    PaymentHistoryResponse,
    StartTrialResponse,
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
# Start Free Trial (with payment collection)
# ────────────────────────────────────────────────────────────────

@router.post("/start-trial", response_model=StartTrialResponse, summary="Start free trial with payment method collection")
async def start_trial(
    request: StartTrialRequest,
    http_request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StartTrialResponse:
    """
    Start a 30-day free Pro trial.

    1. Checks if user has already used their one-time trial
    2. Creates a Xendit customer profile
    3. Tokenizes their payment method (card/e-wallet) for auto-charge
    4. Activates the free Pro trial

    When the trial expires, the saved payment method will be auto-charged.
    """
    enforce_rate_limit("subscription:start_trial", request_identifier(http_request, user.id), 5, 15 * 60)

    # Check if trial was already used
    if user.has_used_trial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already used your free trial. Each account is limited to one free Pro trial.",
        )

    # Already on a paid plan
    if user.plan in ("PRO", "EXPERT") and not user.plan_grace_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already on the {user.plan} plan.",
        )

    # Step 1: Create Xendit customer (or reuse existing)
    customer_id = user.xendit_customer_id
    if not customer_id:
        customer_data = await create_customer(
            user_id=user.id,
            user_email=user.email,
            user_name=user.name,
        )
        customer_id = customer_data["customer_id"]

    # Step 2: Tokenize payment method
    pm_data = await tokenize_payment_method(
        customer_id=customer_id,
        payment_type=request.payment_type,
    )
    payment_method_id = pm_data["payment_method_id"]

    payment_method_status = pm_data.get("status", "REQUIRES_ACTION")
    if payment_method_status == "ACTIVE":
        subscription = await activate_trial(
            user_id=user.id,
            db=db,
            xendit_customer_id=customer_id,
            xendit_payment_method_id=payment_method_id,
        )

        if not subscription:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to activate trial. You may have already used your free trial.",
            )

        return StartTrialResponse(
            message="Free Pro trial activated! Your payment method has been saved for auto-renewal.",
            plan="PRO",
            is_trial=True,
            trial_ends_at=subscription.expires_at.isoformat(),
            days_remaining=30,
            payment_method_saved=True,
            payment_method_id=payment_method_id,
            payment_method_status=payment_method_status,
            redirect_url=pm_data.get("redirect_url"),
            requires_action=False,
        )

    return StartTrialResponse(
        message="Complete payment method authorization to activate your free Pro trial.",
        payment_method_id=payment_method_id,
        payment_method_status=payment_method_status,
        payment_method_saved=False,
        redirect_url=pm_data.get("redirect_url"),
        requires_action=True,
    )


@router.post("/start-trial/confirm", response_model=StartTrialResponse, summary="Confirm free trial activation")
async def confirm_start_trial(
    request: ConfirmTrialRequest,
    http_request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StartTrialResponse:
    """Confirm the saved payment method is active, then activate the free trial."""
    enforce_rate_limit("subscription:confirm_trial", request_identifier(http_request, user.id), 10, 15 * 60)

    if user.has_used_trial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already used your free trial.",
        )

    if user.plan in ("PRO", "EXPERT") and not user.plan_grace_until:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You are already on the {user.plan} plan.",
        )

    customer_id = user.xendit_customer_id
    if not customer_id:
        customer_data = await create_customer(
            user_id=user.id,
            user_email=user.email,
            user_name=user.name,
        )
        customer_id = customer_data["customer_id"]

    payment_method = await get_payment_method(request.payment_method_id)
    payment_method_status = payment_method.get("status", "UNKNOWN")
    if payment_method_status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Payment method is not ready yet (status: {payment_method_status}). Complete the authorization flow and try again.",
        )

    subscription = await activate_trial(
        user_id=user.id,
        db=db,
        xendit_customer_id=customer_id,
        xendit_payment_method_id=request.payment_method_id,
    )
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to activate trial. You may have already used your free trial.",
        )

    return StartTrialResponse(
        message="Free Pro trial activated! Your payment method has been saved for auto-renewal.",
        plan="PRO",
        is_trial=True,
        trial_ends_at=subscription.expires_at.isoformat(),
        days_remaining=30,
        payment_method_saved=True,
        payment_method_id=request.payment_method_id,
        payment_method_status=payment_method_status,
        requires_action=False,
    )


# ────────────────────────────────────────────────────────────────
# Subscribe (Create Invoice)
# ────────────────────────────────────────────────────────────────

@router.post("/subscribe", response_model=InvoiceResponse, summary="Create subscription invoice")
async def subscribe(
    request: SubscribeRequest,
    http_request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InvoiceResponse:
    """
    Create a Xendit invoice for the requested plan upgrade.

    Returns the invoice URL — frontend should redirect the user there
    to complete payment. Once paid, the Xendit webhook will activate the plan.
    """
    enforce_rate_limit("subscription:subscribe", request_identifier(http_request, user.id), 8, 15 * 60)

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


@router.get("/auto-renew", response_model=AutoRenewStatusResponse, summary="Get auto-renew status")
async def get_auto_renew_status(user: User = Depends(get_current_user)) -> AutoRenewStatusResponse:
    enabled = bool(user.xendit_payment_method_id)
    message = (
        "Auto-renew is enabled for your saved payment method."
        if enabled
        else "Auto-renew is disabled. Your plan will remain active until it expires."
    )
    return AutoRenewStatusResponse(
        enabled=enabled,
        current_plan=user.plan or "FREE",
        expires_at=user.plan_expires_at,
        message=message,
    )


@router.post("/auto-renew/disable", response_model=AutoRenewStatusResponse, summary="Disable auto-renew")
async def disable_auto_renew(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AutoRenewStatusResponse:
    user.xendit_payment_method_id = None
    user.updated_at = datetime.utcnow()
    await db.commit()
    return AutoRenewStatusResponse(
        enabled=False,
        current_plan=user.plan or "FREE",
        expires_at=user.plan_expires_at,
        message="Auto-renew has been disabled. Your current access remains active until the end of the billing period.",
    )


@router.post("/cancel", response_model=AutoRenewStatusResponse, summary="Cancel at period end")
async def cancel_at_period_end(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AutoRenewStatusResponse:
    user.xendit_payment_method_id = None
    user.updated_at = datetime.utcnow()
    await db.commit()
    return AutoRenewStatusResponse(
        enabled=False,
        current_plan=user.plan or "FREE",
        expires_at=user.plan_expires_at,
        message="Cancellation recorded. There will be no automatic renewal, and your plan will remain active until expiry.",
    )


@router.get("/admin/overview", response_model=BillingOverviewResponse, summary="Admin billing overview")
async def admin_billing_overview(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> BillingOverviewResponse:
    _ = admin_user
    overview = await get_billing_overview(db)
    return BillingOverviewResponse(**overview)


@router.post("/admin/reconcile", response_model=BillingReconciliationResponse, summary="Run billing reconciliation")
async def admin_reconcile_billing(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
) -> BillingReconciliationResponse:
    _ = admin_user
    result = await reconcile_billing_records(db)
    return BillingReconciliationResponse(**result)
