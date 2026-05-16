"""Admin operations monitor endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta
from time import perf_counter

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..models.subscription import PaymentHistory, Subscription
from ..models.user import User
from ..services.auth_service import require_admin
from ..services.ops_metrics import ops_metrics


router = APIRouter()
settings = get_settings()


async def _check_database(db: AsyncSession) -> dict:
    started = perf_counter()
    try:
        await db.execute(text("SELECT 1"))
        return {
            "name": "PostgreSQL" if "postgresql" in settings.DATABASE_URL else "SQLite",
            "status": "healthy",
            "latency_ms": round((perf_counter() - started) * 1000, 2),
        }
    except Exception as exc:
        return {
            "name": "Database",
            "status": "down",
            "latency_ms": round((perf_counter() - started) * 1000, 2),
            "detail": str(exc),
        }


def _check_redis() -> dict:
    started = perf_counter()
    if settings.OTP_STORE_BACKEND != "redis" and settings.RATE_LIMIT_BACKEND != "redis":
        return {"name": "Redis", "status": "disabled", "latency_ms": None}
    try:
        import redis

        client = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        client.ping()
        return {
            "name": "Redis",
            "status": "healthy",
            "latency_ms": round((perf_counter() - started) * 1000, 2),
        }
    except Exception as exc:
        return {
            "name": "Redis",
            "status": "down",
            "latency_ms": round((perf_counter() - started) * 1000, 2),
            "detail": str(exc),
        }


def _config_service(name: str, enabled: bool, detail: str = "") -> dict:
    return {
        "name": name,
        "status": "configured" if enabled else "missing",
        "latency_ms": None,
        "detail": detail,
    }


async def _count_scalar(db: AsyncSession, stmt) -> int:
    result = await db.execute(stmt)
    return int(result.scalar() or 0)


@router.get("/ops/overview", summary="Admin operations overview")
async def ops_overview(
    _admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)

    total_users = await _count_scalar(db, select(func.count()).select_from(User))
    active_users = await _count_scalar(
        db,
        select(func.count()).select_from(User).where(User.deleted_at.is_(None)),
    )
    deactivated_users = await _count_scalar(
        db,
        select(func.count()).select_from(User).where(User.deleted_at.is_not(None)),
    )
    new_users_24h = await _count_scalar(
        db,
        select(func.count()).select_from(User).where(User.created_at >= day_ago),
    )
    active_subscriptions = await _count_scalar(
        db,
        select(func.count())
        .select_from(Subscription)
        .where(Subscription.status.in_(("TRIAL", "ACTIVE", "GRACE"))),
    )
    paid_7d = await _count_scalar(
        db,
        select(func.coalesce(func.sum(PaymentHistory.amount_idr), 0)).where(
            PaymentHistory.status == "PAID",
            PaymentHistory.paid_at >= week_ago,
        ),
    )
    pending_payments = await _count_scalar(
        db,
        select(func.count()).select_from(PaymentHistory).where(PaymentHistory.status == "PENDING"),
    )
    failed_payments_24h = await _count_scalar(
        db,
        select(func.count()).select_from(PaymentHistory).where(
            PaymentHistory.status.in_(("FAILED", "EXPIRED")),
            PaymentHistory.updated_at >= day_ago,
        ),
    )

    metrics = ops_metrics.snapshot()
    ai_requests = sum(route["requests"] for route in metrics["routes"] if route["path"] == "/api/ai/*")

    services = [
        await _check_database(db),
        _check_redis(),
        _config_service("Clerk Auth", bool(settings.CLERK_SECRET_KEY), "User authentication"),
        _config_service("Gemini AI", bool(settings.GEMINI_API_KEY), settings.GEMINI_DEFAULT_MODEL),
        _config_service("Xendit Payments", bool(settings.XENDIT_SECRET_KEY and settings.XENDIT_WEBHOOK_TOKEN), settings.XENDIT_ENVIRONMENT),
        _config_service("reCAPTCHA", bool(settings.RECAPTCHA_ENABLED and settings.RECAPTCHA_SECRET_KEY), "Bot protection"),
        _config_service("Ops Alerts", bool(settings.OPS_ALERT_WEBHOOK_URL), "Webhook alerting"),
    ]

    return {
        "generated_at": now.isoformat() + "Z",
        "environment": settings.ENVIRONMENT,
        "summary": {
            "total_users": total_users,
            "active_users": active_users,
            "deactivated_users": deactivated_users,
            "new_users_24h": new_users_24h,
            "active_subscriptions": active_subscriptions,
            "revenue_7d_idr": paid_7d,
            "pending_payments": pending_payments,
            "failed_payments_24h": failed_payments_24h,
            "total_requests": metrics["total_requests"],
            "error_rate": metrics["error_rate"],
            "avg_latency_ms": metrics["avg_ms"],
            "ai_requests": ai_requests,
        },
        "services": services,
        "traffic": metrics["traffic"],
        "routes": metrics["routes"],
        "ai": {
            "configured": bool(settings.GEMINI_API_KEY),
            "default_model": settings.GEMINI_DEFAULT_MODEL,
            "pro_model": settings.GEMINI_PRO_MODEL,
            "requests_observed": ai_requests,
            "token_usage": "provider billing API not connected",
        },
    }
