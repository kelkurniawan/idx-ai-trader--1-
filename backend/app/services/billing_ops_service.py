"""Billing operations service."""

from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.subscription import PaymentHistory, Subscription
from ..models.user import User
from ..services.plan_service import activate_plan
from ..services.xendit_service import get_invoice


def _serialize_payment(payment: PaymentHistory) -> dict:
    return {
        "id": payment.id,
        "user_id": payment.user_id,
        "invoice_id": payment.xendit_invoice_id,
        "plan": payment.plan,
        "billing_cycle": payment.billing_cycle,
        "amount_idr": payment.amount_idr,
        "status": payment.status,
        "payment_method": payment.payment_method,
        "created_at": payment.created_at,
        "paid_at": payment.paid_at,
    }


async def reconcile_billing_records(db: AsyncSession, limit: int = 50) -> dict:
    """
    Reconcile recent billing records with provider status.

    This is intentionally conservative: it only upgrades known pending invoices
    and fixes drift for payments that are already marked paid locally.
    """
    processed = 0
    paid_activated = 0
    expired_marked = 0
    failed_marked = 0
    anomalies: list[str] = []

    stmt = (
        select(PaymentHistory)
        .where(PaymentHistory.status.in_(["PENDING", "PAID"]))
        .order_by(PaymentHistory.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    payments = result.scalars().all()

    for payment in payments:
        provider_invoice = await get_invoice(payment.xendit_invoice_id)
        provider_status = str(provider_invoice.get("status", "")).upper()
        processed += 1

        if payment.status == "PENDING" and provider_status == "PAID":
            subscription = await activate_plan(
                user_id=payment.user_id,
                plan=payment.plan,
                billing_cycle=payment.billing_cycle,
                xendit_invoice_id=payment.xendit_invoice_id,
                amount_idr=payment.amount_idr,
                db=db,
            )
            payment.status = "PAID"
            payment.subscription_id = subscription.id
            payment.payment_method = provider_invoice.get("payment_method", payment.payment_method)
            payment.payment_channel = provider_invoice.get("payment_channel", payment.payment_channel)
            payment.paid_at = payment.paid_at or datetime.utcnow()
            paid_activated += 1
        elif payment.status == "PENDING" and provider_status == "EXPIRED":
            payment.status = "EXPIRED"
            expired_marked += 1
        elif payment.status == "PENDING" and provider_status in ("FAILED", "PAYMENT_FAILED"):
            payment.status = "FAILED"
            failed_marked += 1
        elif payment.status == "PAID" and not payment.subscription_id:
            anomalies.append(f"Paid invoice without subscription: {payment.xendit_invoice_id}")

        payment.updated_at = datetime.utcnow()

    await db.commit()
    return {
        "processed": processed,
        "paid_activated": paid_activated,
        "expired_marked": expired_marked,
        "failed_marked": failed_marked,
        "anomalies": anomalies,
        "ran_at": datetime.utcnow(),
    }


async def get_billing_overview(db: AsyncSession) -> dict:
    """Aggregate billing KPIs and recent anomalies for admin visibility."""
    month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    active_plans_stmt = select(func.count()).select_from(User).where(User.plan.in_(["PRO", "EXPERT"]))
    trial_stmt = select(func.count()).select_from(Subscription).where(Subscription.status == "TRIAL")
    auto_renew_stmt = select(func.count()).select_from(User).where(User.xendit_payment_method_id.isnot(None))
    pending_stmt = select(func.count()).select_from(PaymentHistory).where(PaymentHistory.status == "PENDING")
    revenue_stmt = (
        select(func.coalesce(func.sum(PaymentHistory.amount_idr), 0))
        .where(PaymentHistory.status == "PAID", PaymentHistory.paid_at >= month_start)
    )

    active_plans = (await db.execute(active_plans_stmt)).scalar_one()
    trial_users = (await db.execute(trial_stmt)).scalar_one()
    auto_renew_enabled = (await db.execute(auto_renew_stmt)).scalar_one()
    pending_invoices = (await db.execute(pending_stmt)).scalar_one()
    revenue_this_month = (await db.execute(revenue_stmt)).scalar_one()

    paid_without_subscription_stmt = select(func.count()).select_from(PaymentHistory).where(
        PaymentHistory.status == "PAID",
        PaymentHistory.subscription_id.is_(None),
    )
    expiring_soon_stmt = select(func.count()).select_from(User).where(
        User.plan.in_(["PRO", "EXPERT"]),
        User.plan_expires_at.isnot(None),
        User.plan_expires_at <= datetime.utcnow() + timedelta(days=7),
    )
    cancelled_auto_renew_stmt = select(func.count()).select_from(User).where(
        User.plan.in_(["PRO", "EXPERT"]),
        or_(User.xendit_payment_method_id.is_(None), User.xendit_payment_method_id == ""),
    )

    paid_without_subscription = (await db.execute(paid_without_subscription_stmt)).scalar_one()
    expiring_soon = (await db.execute(expiring_soon_stmt)).scalar_one()
    cancelled_auto_renew = (await db.execute(cancelled_auto_renew_stmt)).scalar_one()

    recent_payments_stmt = (
        select(PaymentHistory)
        .order_by(PaymentHistory.created_at.desc())
        .limit(10)
    )
    recent_payments = (await db.execute(recent_payments_stmt)).scalars().all()

    return {
        "metrics": {
            "active_paid_users": active_plans,
            "trial_users": trial_users,
            "auto_renew_enabled": auto_renew_enabled,
            "pending_invoices": pending_invoices,
            "revenue_this_month": int(revenue_this_month or 0),
            "paid_without_subscription": paid_without_subscription,
            "expiring_soon": expiring_soon,
            "cancelled_auto_renew": cancelled_auto_renew,
        },
        "recent_payments": [_serialize_payment(payment) for payment in recent_payments],
        "generated_at": datetime.utcnow(),
    }


async def get_payment_support_detail(db: AsyncSession, payment_id: str) -> dict:
    payment_stmt = select(PaymentHistory).where(PaymentHistory.id == payment_id)
    payment = (await db.execute(payment_stmt)).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")

    user_stmt = select(User).where(User.id == payment.user_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for this payment.")

    subscription = None
    if payment.subscription_id:
        sub_stmt = select(Subscription).where(Subscription.id == payment.subscription_id)
        subscription = (await db.execute(sub_stmt)).scalar_one_or_none()

    recommended_actions: list[str] = []
    if payment.status == "PENDING":
        recommended_actions.append("Run reconciliation before contacting the customer.")
        recommended_actions.append("If the provider still shows unpaid, ask the customer to retry checkout with a fresh invoice.")
    if payment.status == "PAID":
        recommended_actions.append("If the customer requests cancellation, disable auto-renew first to prevent another charge.")
        recommended_actions.append("If you issue a refund in Xendit Dashboard, record REFUND_REQUESTED or REFUNDED here immediately after.")
    if payment.status in ("REFUND_REQUESTED", "REFUNDED"):
        recommended_actions.append("Confirm the refund outcome in Xendit Dashboard and customer support inbox.")
    if subscription and subscription.status in ("ACTIVE", "GRACE"):
        recommended_actions.append("Only revoke access if this payment is the customer's current entitlement.")

    return {
        "payment_id": payment.id,
        "invoice_id": payment.xendit_invoice_id,
        "payment_status": payment.status,
        "amount_idr": payment.amount_idr,
        "plan": payment.plan,
        "billing_cycle": payment.billing_cycle,
        "created_at": payment.created_at,
        "paid_at": payment.paid_at,
        "payment_method": payment.payment_method,
        "payment_channel": payment.payment_channel,
        "user_id": user.id,
        "user_email": user.email,
        "user_name": user.name,
        "current_plan": user.plan,
        "current_plan_expires_at": user.plan_expires_at,
        "auto_renew_enabled": bool(user.xendit_payment_method_id),
        "subscription_id": subscription.id if subscription else None,
        "subscription_status": subscription.status if subscription else None,
        "subscription_expires_at": subscription.expires_at if subscription else None,
        "recommended_actions": recommended_actions,
        "provider_refund_note": "Process the actual refund in Xendit Dashboard first. This admin action records internal support state and can optionally revoke future access.",
    }


async def apply_refund_support_action(
    db: AsyncSession,
    payment_id: str,
    mark_status: str,
    revoke_access: bool,
    disable_auto_renew: bool,
) -> dict:
    payment_stmt = select(PaymentHistory).where(PaymentHistory.id == payment_id)
    payment = (await db.execute(payment_stmt)).scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found.")

    if payment.status not in ("PAID", "REFUND_REQUESTED", "REFUNDED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only paid or refund-tracked payments can be updated with refund support actions.",
        )

    user_stmt = select(User).where(User.id == payment.user_id)
    user = (await db.execute(user_stmt)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found for this payment.")

    subscription = None
    if payment.subscription_id:
        sub_stmt = select(Subscription).where(Subscription.id == payment.subscription_id)
        subscription = (await db.execute(sub_stmt)).scalar_one_or_none()

    access_revoked = False
    auto_renew_disabled = False
    now = datetime.utcnow()

    payment.status = mark_status
    payment.updated_at = now

    if disable_auto_renew and user.xendit_payment_method_id:
        user.xendit_payment_method_id = None
        user.updated_at = now
        auto_renew_disabled = True

    if revoke_access and subscription:
        current_entitlement = (
            user.plan == subscription.plan
            and user.plan_expires_at is not None
            and subscription.expires_at is not None
            and abs((user.plan_expires_at - subscription.expires_at).total_seconds()) < 5
        )
        subscription.status = "CANCELLED"
        subscription.updated_at = now
        if current_entitlement:
            user.plan = "FREE"
            user.plan_expires_at = None
            user.plan_grace_until = None
            user.subscription_cycle = None
            user.updated_at = now
            access_revoked = True

    await db.commit()

    message = (
        "Refund support state recorded. "
        "Remember to complete the actual refund in Xendit Dashboard if you have not done so yet."
    )
    if revoke_access and not access_revoked:
        message += " Access was not revoked because this payment does not appear to be the user's current entitlement."

    return {
        "payment_id": payment.id,
        "payment_status": payment.status,
        "access_revoked": access_revoked,
        "auto_renew_disabled": auto_renew_disabled,
        "message": message,
    }
