"""
AI Proxy Router

All /api/ai/* endpoints that forward AI requests to the Gemini API
via the backend service layer, keeping API keys out of the browser.

Endpoints:
  POST /api/ai/chart-vision        — analyse uploaded chart image
  GET  /api/ai/realtime-price/{ticker}  — live stock price via grounding
  GET  /api/ai/stock-news/{ticker} — recent news via grounding
  POST /api/ai/analyze-stock       — full 5-point stock analysis
"""

import base64
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, Form, Query, status
from pydantic import BaseModel

from ..models.user import User
from ..services.auth_service import get_current_user
from ..services.gemini_proxy_service import (
    analyze_chart_vision,
    get_realtime_stock_data,
    fetch_stock_news,
    analyze_stock,
)
from ..services.request_guard import enforce_rate_limit, request_identifier

logger = logging.getLogger(__name__)
router = APIRouter()


def _enforce_ai_rate_limit(request: Request, user: User, scope: str, limit: int) -> None:
    enforce_rate_limit(
        f"ai:{scope}",
        request_identifier(request, user.id),
        limit,
        15 * 60,
    )


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class AnalyzeStockRequest(BaseModel):
    ticker: str
    history: List[dict] = []
    technicals: dict = {}
    real_time_data: Optional[dict] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chart-vision", summary="Analyse chart image with AI vision")
async def chart_vision_endpoint(
    request: Request,
    file: UploadFile = File(...),
    trading_type: str = Form("SWING"),
    user: User = Depends(get_current_user),
):
    """
    Accept a chart image upload, convert to base64, and run Gemini vision analysis.

    Body (multipart/form-data):
      file         : PNG/JPEG chart image
      trading_type : "SWING" | "SCALP"
    """
    _enforce_ai_rate_limit(request, user, "chart_vision", 12)

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="File must be an image (PNG or JPEG).",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > 10 * 1024 * 1024:  # 10 MB guard
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image must be smaller than 10 MB.",
        )

    b64 = base64.b64encode(raw_bytes).decode("utf-8")
    result = await analyze_chart_vision(b64, trading_type)
    return result


@router.get(
    "/realtime-price/{ticker}",
    summary="Get real-time stock price via AI + Google Search",
)
async def realtime_price_endpoint(
    ticker: str,
    request: Request,
    user: User = Depends(get_current_user),
):
    """
    Fetch the latest IDX stock price, change, and volume using
    Gemini with Google Search grounding.

    Path param:
      ticker : IDX stock ticker, e.g. BBCA
    """
    _enforce_ai_rate_limit(request, user, "realtime_price", 60)

    ticker = ticker.upper().strip()
    if not ticker or len(ticker) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticker symbol.",
        )
    return await get_realtime_stock_data(ticker)


@router.get(
    "/stock-news/{ticker}",
    summary="Fetch recent news for a stock via AI + Google Search",
)
async def stock_news_endpoint(
    ticker: str,
    request: Request,
    company: str = Query(default="", description="Company name for better search results"),
    user: User = Depends(get_current_user),
):
    """
    Fetch the 5 most recent news articles for an IDX stock using
    Gemini with Google Search grounding.

    Path param:
      ticker  : IDX stock ticker, e.g. BBCA
    Query param:
      company : Company display name, e.g. "Bank Central Asia"
    """
    _enforce_ai_rate_limit(request, user, "stock_news", 30)

    ticker = ticker.upper().strip()
    if not ticker or len(ticker) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ticker symbol.",
        )
    return await fetch_stock_news(ticker, company or ticker)


@router.post(
    "/analyze-stock",
    summary="Full AI-powered stock analysis with Google Search grounding",
)
async def analyze_stock_endpoint(
    payload: AnalyzeStockRequest,
    request: Request,
    user: User = Depends(get_current_user),
):
    """
    Run a comprehensive 5-point technical + fundamental analysis on an IDX stock.

    Body:
      ticker        : IDX stock ticker
      history       : list of {price, volume, ...} data points
      technicals    : dict with rsi, macd, ma50, volumeAvg, trendLong, etc.
      real_time_data: optional dict with current price/change/volume
    """
    _enforce_ai_rate_limit(request, user, "analyze_stock", 20)

    ticker = payload.ticker.upper().strip()
    if not ticker:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticker is required.",
        )
    return await analyze_stock(
        ticker=ticker,
        history=payload.history,
        technicals=payload.technicals,
        real_time_data=payload.real_time_data,
    )
