"""
IDX AI Trader Backend - FastAPI Application

Main entry point for the backend API server.
"""

from contextlib import asynccontextmanager
import logging
import uuid
from time import perf_counter
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from .config import get_settings
from .database import engine, Base, AsyncSessionLocal
from .rate_limiter import limiter, _rate_limit_exceeded_handler, RateLimitExceeded
from . import models  # noqa: F401
from .routers import stocks, market_analyzer, predictions, auth, profile, ai, portfolio, strip, admin_ops
from .routers import internal as internal_router
from .routers import subscription as subscription_router
from .routers import webhook as webhook_router
from .services.ops_metrics import ops_metrics
from .services.alert_service import send_ops_alert
from .services.request_guard import enforce_rate_limit, request_identifier

settings = get_settings()
logger = logging.getLogger(__name__)


async def _plan_expiry_cron():
    """Background task that checks for expired plans every hour."""
    import asyncio
    from .services.billing_ops_service import reconcile_billing_records
    from .services.plan_service import check_and_downgrade_expired

    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            async with AsyncSessionLocal() as db:
                await check_and_downgrade_expired(db)
                await reconcile_billing_records(db, limit=25)
        except asyncio.CancelledError:
            print("⏰ Plan expiry cron job stopped")
            break
        except Exception as e:
            print(f"❌ Plan expiry cron error: {e}")
            await send_ops_alert(
                "Critical background job failure",
                "Plan expiry or billing reconciliation failed.",
                {"error": str(e)},
            )
            await asyncio.sleep(60)  # Wait a minute before retrying on error


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"🚀 Starting IDX AI Trader Backend ({settings.ENVIRONMENT} mode)")
    print(f"📊 Mock data: {'enabled' if settings.use_mock_data else 'disabled'}")
    print(f"🤖 AI calls: {'enabled' if settings.enable_ai_calls else 'disabled (dev mode)'}")
    
    # Initialize DB async with retries. In production, schema changes are
    # handled only by Alembic migrations before the app starts.
    import asyncio
    from sqlalchemy.exc import OperationalError
    max_retries = 5
    retry_delay = 2
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                if not settings.is_production:
                    await conn.run_sync(Base.metadata.create_all)
            print("✅ Successfully connected to the database.")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"⚠️ Database connection failed ({e}). Retrying in {retry_delay} seconds (Attempt {attempt+1}/{max_retries})...")
                await asyncio.sleep(retry_delay)
            else:
                print(f"❌ Failed to connect to database after {max_retries} attempts.")
                raise e
        
    # Start plan expiry cron job (runs every hour)
    expiry_task = asyncio.create_task(_plan_expiry_cron())
    print("⏰ Plan expiry cron job started (hourly)")

    yield

    # Shutdown
    expiry_task.cancel()
    print("👋 Shutting down IDX AI Trader Backend")


app = FastAPI(
    title="IDX AI Trader API",
    description="""
    AI-powered stock analysis API for Indonesia Stock Exchange (IDX).
    
    ## Features
    - 📈 Technical Analysis (RSI, MACD, Bollinger Bands, etc.)
    - 📊 Volume & Trend Analysis
    - 🏦 Broker Summary & Foreign Flow
    - 🤖 AI-powered Buy/Sell Signals
    - 📷 Chart Vision Analysis
    
    ## Environment Modes
    - **Development**: Mock data, AI calls disabled
    - **Staging**: Mock data, AI calls disabled
    - **Production**: Real IDX data, AI calls enabled
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Attach SlowAPI exceptions and state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


def _error_payload(code: str, message: str, request: Request) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
            "request_id": _request_id(request),
        }
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    code = {
        400: "bad_request",
        401: "unauthenticated",
        403: "forbidden",
        404: "not_found",
        409: "conflict",
        422: "validation_error",
        429: "rate_limited",
    }.get(exc.status_code, "request_failed")
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(code, str(exc.detail), request),
        headers=exc.headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.info("Validation error request_id=%s errors=%s", _request_id(request), exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_payload("validation_error", "Please check the highlighted fields and try again.", request),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled API exception request_id=%s path=%s", _request_id(request), request.url.path)
    await send_ops_alert(
        "Critical API failure",
        "An unhandled backend exception returned a 500 response.",
        {
            "request_id": _request_id(request),
            "path": request.url.path,
            "method": request.method,
            "error": str(exc),
        },
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_payload("internal_error", "Something went wrong. Please try again shortly.", request),
    )

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Optional: very restrictive CSP; you might want to adjust this heavily for production
        # response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

app.add_middleware(SecurityHeadersMiddleware)


class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


app.add_middleware(RequestIdMiddleware)


class OriginGuardMiddleware(BaseHTTPMiddleware):
    """Reject browser API calls from origins outside the configured app domains."""

    EXEMPT_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json", "/api/webhooks/xendit")

    async def dispatch(self, request: Request, call_next):
        if not settings.STRICT_ORIGIN_CHECK or not request.url.path.startswith("/api"):
            return await call_next(request)
        if any(request.url.path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            return await call_next(request)

        allowed = set(settings.cors_origins_list)
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")
        referer_origin = ""
        if referer:
            parsed = urlparse(referer)
            referer_origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""

        presented_origin = origin or referer_origin
        if presented_origin and presented_origin not in allowed:
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content=_error_payload("forbidden_origin", "This API can only be used from the official app domain.", request),
            )

        return await call_next(request)


app.add_middleware(OriginGuardMiddleware)


class GlobalRateLimitMiddleware(BaseHTTPMiddleware):
    """Apply a coarse per-client API rate limit before route-level limits."""

    EXEMPT_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json")

    async def dispatch(self, request: Request, call_next):
        if request.url.path.startswith("/api") and not any(request.url.path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES):
            try:
                enforce_rate_limit(
                    "api:global",
                    request_identifier(request),
                    settings.GLOBAL_API_RATE_LIMIT_PER_MINUTE,
                    60,
                )
            except HTTPException as exc:
                return JSONResponse(
                    status_code=exc.status_code,
                    content=_error_payload("rate_limited", str(exc.detail), request),
                    headers=exc.headers,
                )
        return await call_next(request)


app.add_middleware(GlobalRateLimitMiddleware)


class OpsMetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started = perf_counter()
        status_code = 500
        try:
            response: Response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            duration_ms = (perf_counter() - started) * 1000
            ops_metrics.record(request.url.path, status_code, duration_ms)


app.add_middleware(OpsMetricsMiddleware)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.trusted_hosts_list,
)

# Strict CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(profile.router, prefix="/api/profile", tags=["Profile"])
app.include_router(stocks.router, prefix="/api/stocks", tags=["Stocks"])
app.include_router(market_analyzer.router, prefix="/api/analyze", tags=["Market Analyzer"])
app.include_router(predictions.router, prefix="/api/predict", tags=["Predictions"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Proxy"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])
app.include_router(strip.router, prefix="/api/strip", tags=["Strip"])
app.include_router(subscription_router.router, prefix="/api/subscription", tags=["Subscription"])
app.include_router(webhook_router.router, prefix="/api/webhooks/xendit", tags=["Webhooks"])
app.include_router(admin_ops.router, prefix="/api/admin", tags=["Admin Ops"])
app.include_router(internal_router.router, prefix="/api/internal", tags=["Internal"])

# Serve uploaded avatar files
import os
from fastapi.staticfiles import StaticFiles
upload_dir = settings.UPLOAD_DIR
os.makedirs(upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")


@app.get("/", tags=["Health"])
async def root():
    """Root endpoint with API info."""
    return {
        "name": "IDX AI Trader API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "mock_data": settings.use_mock_data,
        "ai_enabled": settings.enable_ai_calls,
    }
