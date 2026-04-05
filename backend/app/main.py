"""
IDX AI Trader Backend - FastAPI Application

Main entry point for the backend API server.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import engine, Base, AsyncSessionLocal
from . import models  # noqa: F401
from .routers import stocks, market_analyzer, predictions, auth, profile, ai, portfolio, strip
from .routers import subscription as subscription_router
from .routers import webhook as webhook_router

settings = get_settings()


async def _plan_expiry_cron():
    """Background task that checks for expired plans every hour."""
    import asyncio
    from .services.plan_service import check_and_downgrade_expired

    while True:
        try:
            await asyncio.sleep(3600)  # Run every hour
            async with AsyncSessionLocal() as db:
                await check_and_downgrade_expired(db)
        except asyncio.CancelledError:
            print("⏰ Plan expiry cron job stopped")
            break
        except Exception as e:
            print(f"❌ Plan expiry cron error: {e}")
            await asyncio.sleep(60)  # Wait a minute before retrying on error


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"🚀 Starting IDX AI Trader Backend ({settings.ENVIRONMENT} mode)")
    print(f"📊 Mock data: {'enabled' if settings.use_mock_data else 'disabled'}")
    print(f"🤖 AI calls: {'enabled' if settings.enable_ai_calls else 'disabled (dev mode)'}")
    
    # Initialize DB async with retries
    import asyncio
    from sqlalchemy.exc import OperationalError
    max_retries = 5
    retry_delay = 2
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
