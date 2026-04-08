"""
Plan Service

Business logic for subscription plan management:
- Plan pricing and billing cycles
- Feature gates per tier
- Plan activation, expiry, grace period
- Free trial management
- Cron-based expiry downgrade
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from ..models.user import User
from ..models.subscription import Subscription, PaymentHistory
from ..config import get_settings

settings = get_settings()


# ────────────────────────────────────────────────────────────────
# Pricing Configuration
# ────────────────────────────────────────────────────────────────

BILLING_CYCLES = {
    "MONTHLY": {
        "duration_days": 30,
        "label": "1 Bulan",
        "discount_pct": 0,
    },
    "QUARTERLY": {
        "duration_days": 90,
        "label": "3 Bulan",
        "discount_pct": 15,
    },
    "ANNUAL": {
        "duration_days": 365,
        "label": "1 Tahun",
        "discount_pct": 25,
    },
}

PLAN_PRICES_IDR = {
    "PRO": {
        "MONTHLY": 24_999,
        "QUARTERLY": 63_999,
        "ANNUAL": 224_999,
    },
    "EXPERT": {
        "MONTHLY": 49_999,
        "QUARTERLY": 127_999,
        "ANNUAL": 449_999,
    },
}

GRACE_PERIOD_DAYS = 3
TRIAL_DURATION_DAYS = 30  # 1 month free Pro trial


# ────────────────────────────────────────────────────────────────
# Feature Gates
# ────────────────────────────────────────────────────────────────

PLAN_FEATURES = {
    "FREE": {
        "news_ai": False,
        "watchlist_limit": 5,
        "alert_limit": 1,
        "ai_analysis_daily_limit": 3,
        "chart_vision": False,
        "backtester": False,
        "journal_limit": 10,
        "portfolio_limit": 5,
        "export_csv": False,
        "learning_full": False,
        "community_write": False,
        "priority_support": False,
        "verified_badge": False,
        "advanced_analysis": False,
    },
    "PRO": {
        "news_ai": True,
        "watchlist_limit": 30,
        "alert_limit": 10,
        "ai_analysis_daily_limit": 30,
        "chart_vision": True,
        "backtester": False,
        "journal_limit": None,       # None = unlimited
        "portfolio_limit": 30,
        "export_csv": True,
        "learning_full": True,
        "community_write": True,
        "priority_support": False,
        "verified_badge": False,
        "advanced_analysis": True,
    },
    "EXPERT": {
        "news_ai": True,
        "watchlist_limit": None,
        "alert_limit": None,
        "ai_analysis_daily_limit": None,
        "chart_vision": True,
        "backtester": True,
        "journal_limit": None,
        "portfolio_limit": None,
        "export_csv": True,
        "learning_full": True,
        "community_write": True,
        "priority_support": True,
        "verified_badge": True,
        "advanced_analysis": True,
    },
}


def get_plan_features(plan: str) -> dict:
    """Return feature gates for the given plan."""
    return PLAN_FEATURES.get(plan, PLAN_FEATURES["FREE"])


def get_price(plan: str, billing_cycle: str) -> int:
    """Get the price in IDR for a plan + billing cycle combo."""
    plan_prices = PLAN_PRICES_IDR.get(plan)
    if not plan_prices:
        raise ValueError(f"Unknown plan: {plan}")
    price = plan_prices.get(billing_cycle)
    if price is None:
        raise ValueError(f"Unknown billing cycle: {billing_cycle}")
    return price


def get_cycle_duration_days(billing_cycle: str) -> int:
    """Get the number of days for a billing cycle."""
    cycle = BILLING_CYCLES.get(billing_cycle)
    if not cycle:
        raise ValueError(f"Unknown billing cycle: {billing_cycle}")
    return cycle["duration_days"]


# ────────────────────────────────────────────────────────────────
# Plan Activation
# ────────────────────────────────────────────────────────────────

async def activate_plan(
    user_id: str,
    plan: str,
    billing_cycle: str,
    xendit_invoice_id: str,
    amount_idr: int,
    db: AsyncSession,
) -> Subscription:
    """
    Activate a paid subscription for a user.

    Called by the webhook handler when Xendit confirms payment.
    """
    duration_days = get_cycle_duration_days(billing_cycle)
    now = datetime.utcnow()

    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    entitlement_start = now
    if user and user.plan_expires_at and user.plan_expires_at > now:
        entitlement_start = user.plan_expires_at

    expires_at = entitlement_start + timedelta(days=duration_days)
    grace_until = expires_at + timedelta(days=GRACE_PERIOD_DAYS)

    # Create subscription record
    subscription = Subscription(
        id=str(uuid.uuid4()),
        user_id=user_id,
        plan=plan,
        billing_cycle=billing_cycle,
        status="ACTIVE",
        is_trial=False,
        amount_idr=amount_idr,
        started_at=now,
        expires_at=expires_at,
        grace_until=grace_until,
        xendit_invoice_id=xendit_invoice_id,
    )
    db.add(subscription)

    # Update user record
    if user:
        user.plan = plan
        user.plan_expires_at = expires_at
        user.plan_grace_until = grace_until
        user.subscription_cycle = billing_cycle
        user.updated_at = now

    await db.commit()
    await db.refresh(subscription)
    return subscription


# ────────────────────────────────────────────────────────────────
# Free Trial
# ────────────────────────────────────────────────────────────────

async def activate_trial(
    user_id: str,
    db: AsyncSession,
    xendit_customer_id: str = None,
    xendit_payment_method_id: str = None,
) -> Optional[Subscription]:
    """
    Activate a 30-day free Pro trial for a new user.

    Requires Xendit payment method to be pre-collected so we can
    auto-charge when the trial ends.

    Returns None if the user has already used their trial.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or user.has_used_trial:
        return None

    now = datetime.utcnow()
    expires_at = now + timedelta(days=TRIAL_DURATION_DAYS)
    grace_until = expires_at + timedelta(days=GRACE_PERIOD_DAYS)

    # Create trial subscription
    subscription = Subscription(
        id=str(uuid.uuid4()),
        user_id=user_id,
        plan="PRO",
        billing_cycle="MONTHLY",
        status="TRIAL",
        is_trial=True,
        amount_idr=0,
        started_at=now,
        expires_at=expires_at,
        grace_until=grace_until,
    )
    db.add(subscription)

    # Update user — mark trial used + store payment method for auto-charge
    user.plan = "PRO"
    user.plan_expires_at = expires_at
    user.plan_grace_until = grace_until
    user.has_used_trial = True
    user.updated_at = now
    if xendit_customer_id:
        user.xendit_customer_id = xendit_customer_id
    if xendit_payment_method_id:
        user.xendit_payment_method_id = xendit_payment_method_id

    await db.commit()
    await db.refresh(subscription)

    print(f"\n{'='*50}")
    print(f"🎉 FREE TRIAL ACTIVATED for user {user_id[:8]}...")
    print(f"   Plan: PRO | Duration: {TRIAL_DURATION_DAYS} days")
    print(f"   Expires: {expires_at.isoformat()}")
    print(f"   Payment method saved: {'✅' if xendit_payment_method_id else '❌'}")
    print(f"{'='*50}\n")

    return subscription


# ────────────────────────────────────────────────────────────────
# Subscription Status
# ────────────────────────────────────────────────────────────────

async def get_subscription_status(user_id: str, db: AsyncSession) -> dict:
    """
    Get the current subscription status for a user.

    Checks active/trial/grace subscriptions and computes remaining days.
    """
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    plan = user.plan or "FREE"
    features = get_plan_features(plan)
    now = datetime.utcnow()

    # No active subscription
    if plan == "FREE" and not user.plan_expires_at:
        return {
            "plan": "FREE",
            "status": "FREE",
            "billing_cycle": None,
            "is_trial": False,
            "has_used_trial": user.has_used_trial,
            "trial_ends_at": None,
            "expires_at": None,
            "grace_until": None,
            "days_remaining": None,
            "has_payment_method": bool(user.xendit_payment_method_id),
            "features": features,
        }

    # Find the current subscription record
    sub_stmt = (
        select(Subscription)
        .where(
            Subscription.user_id == user_id,
            Subscription.status.in_(["ACTIVE", "TRIAL", "GRACE"]),
        )
        .order_by(Subscription.created_at.desc())
        .limit(1)
    )
    sub_result = await db.execute(sub_stmt)
    sub = sub_result.scalar_one_or_none()

    status_str = "FREE"
    is_trial = False
    trial_ends_at = None
    days_remaining = None

    if sub:
        status_str = sub.status
        is_trial = sub.is_trial

        if is_trial:
            trial_ends_at = sub.expires_at

        if sub.expires_at:
            delta = sub.expires_at - now
            days_remaining = max(0, delta.days)

        # Check if we should transition status
        if sub.status == "ACTIVE" and sub.expires_at and now > sub.expires_at:
            status_str = "GRACE"
        if sub.status in ("ACTIVE", "GRACE", "TRIAL") and sub.grace_until and now > sub.grace_until:
            status_str = "EXPIRED"

    return {
        "plan": plan,
        "status": status_str,
        "billing_cycle": user.subscription_cycle,
        "is_trial": is_trial,
        "has_used_trial": user.has_used_trial,
        "trial_ends_at": trial_ends_at,
        "expires_at": user.plan_expires_at,
        "grace_until": user.plan_grace_until,
        "days_remaining": days_remaining,
        "has_payment_method": bool(user.xendit_payment_method_id),
        "features": features,
    }


# ────────────────────────────────────────────────────────────────
# Expiry Cron Job (with auto-charge for trial users)
# ────────────────────────────────────────────────────────────────

async def check_and_downgrade_expired(db: AsyncSession) -> int:
    """
    Cron job: find all users whose grace period has ended.

    For trial users with a saved payment method:
      → Auto-charge the first month of Pro via Xendit
      → If charge succeeds, activate paid subscription
      → If charge fails, downgrade to FREE

    For other expired users:
      → Downgrade to FREE

    Returns the number of users processed.
    """
    from ..services.xendit_service import charge_saved_payment_method

    now = datetime.utcnow()
    processed = 0

    # Find users with expired grace periods who are still on paid plans
    stmt = select(User).where(
        and_(
            User.plan.in_(["PRO", "EXPERT"]),
            User.plan_grace_until.isnot(None),
            User.plan_grace_until < now,
        )
    )
    result = await db.execute(stmt)
    expired_users = result.scalars().all()

    for user in expired_users:
        old_plan = user.plan

        # Check if this is a trial user with saved payment method
        sub_stmt = (
            select(Subscription)
            .where(
                Subscription.user_id == user.id,
                Subscription.status.in_(["TRIAL", "GRACE"]),
                Subscription.is_trial == True,
            )
            .order_by(Subscription.created_at.desc())
            .limit(1)
        )
        sub_result = await db.execute(sub_stmt)
        trial_sub = sub_result.scalar_one_or_none()

        charged = False

        # Attempt auto-charge if payment method is saved
        if (
            trial_sub
            and user.xendit_customer_id
            and user.xendit_payment_method_id
        ):
            amount = get_price("PRO", "MONTHLY")
            charge_result = await charge_saved_payment_method(
                customer_id=user.xendit_customer_id,
                payment_method_id=user.xendit_payment_method_id,
                amount=amount,
                description="SahamGue Pro Plan – 1 Bulan (Auto-renewal after trial)",
                user_id=user.id,
            )

            if charge_result.get("status") in ("PENDING", "REQUIRES_ACTION", "AWAITING_CAPTURE"):
                user.plan_grace_until = now + timedelta(days=1)
                user.updated_at = now
                charged = True
                print(f"Auto-charge pending for user {user.id[:8]}..., keeping grace access temporarily")
            elif charge_result.get("status") == "SUCCEEDED":
                # Activate paid subscription
                duration_days = get_cycle_duration_days("MONTHLY")
                new_expires = now + timedelta(days=duration_days)
                new_grace = new_expires + timedelta(days=GRACE_PERIOD_DAYS)

                new_sub = Subscription(
                    id=str(uuid.uuid4()),
                    user_id=user.id,
                    plan="PRO",
                    billing_cycle="MONTHLY",
                    status="ACTIVE",
                    is_trial=False,
                    amount_idr=amount,
                    started_at=now,
                    expires_at=new_expires,
                    grace_until=new_grace,
                    xendit_invoice_id=charge_result.get("payment_request_id"),
                )
                db.add(new_sub)

                user.plan = "PRO"
                user.plan_expires_at = new_expires
                user.plan_grace_until = new_grace
                user.subscription_cycle = "MONTHLY"
                user.updated_at = now

                # Mark old trial as expired
                trial_sub.status = "EXPIRED"
                trial_sub.updated_at = now

                charged = True
                print(f"💰 Auto-charged user {user.id[:8]}... — Rp {amount:,} for PRO MONTHLY")
            else:
                print(f"❌ Auto-charge FAILED for user {user.id[:8]}...: {charge_result.get('error', 'Unknown')}")

        if not charged:
            # Downgrade to FREE
            user.plan = "FREE"
            user.plan_expires_at = None
            user.plan_grace_until = None
            user.subscription_cycle = None
            user.updated_at = now

            # Mark all active subscriptions as expired
            active_sub_stmt = (
                select(Subscription)
                .where(
                    Subscription.user_id == user.id,
                    Subscription.status.in_(["ACTIVE", "TRIAL", "GRACE"]),
                )
            )
            active_sub_result = await db.execute(active_sub_stmt)
            active_subs = active_sub_result.scalars().all()
            for sub in active_subs:
                sub.status = "EXPIRED"
                sub.updated_at = now

            print(f"⬇️ Downgraded user {user.id[:8]}... from {old_plan} to FREE (grace period ended)")

        processed += 1

    if processed > 0:
        await db.commit()
        print(f"\n📊 Plan expiry cron: {processed} user(s) processed\n")

    return processed
