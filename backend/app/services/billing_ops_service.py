"""
Billing operations service.

Provides admin-facing overview data plus reconciliation helpers that compare
local billing records with provider state.
"""

from datetime import datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.subscription import PaymentHistory, Subscription
from ..models.user import User
from ..services.plan_service import activate_plan
from ..services.xendit_service import get_invoice


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
        "recent_payments": [
            {
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
            for payment in recent_payments
        ],
        "generated_at": datetime.utcnow(),
    }
