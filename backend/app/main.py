"""
IDX AI Trader Backend - FastAPI Application

Main entry point for the backend API server.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db
from .routers import stocks, market_analyzer, predictions, auth

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print(f"🚀 Starting IDX AI Trader Backend ({settings.ENVIRONMENT} mode)")
    print(f"📊 Mock data: {'enabled' if settings.use_mock_data else 'disabled'}")
    print(f"🤖 AI calls: {'enabled' if settings.enable_ai_calls else 'disabled (dev mode)'}")
    init_db()
    yield
    # Shutdown
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
app.include_router(stocks.router, prefix="/api/stocks", tags=["Stocks"])
app.include_router(market_analyzer.router, prefix="/api/analyze", tags=["Market Analyzer"])
app.include_router(predictions.router, prefix="/api/predict", tags=["Predictions"])

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
