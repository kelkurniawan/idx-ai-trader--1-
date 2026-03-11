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

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, status
from pydantic import BaseModel

from ..services.gemini_proxy_service import (
    analyze_chart_vision,
    get_realtime_stock_data,
    fetch_stock_news,
    analyze_stock,
)

logger = logging.getLogger(__name__)
router = APIRouter()


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
    file: UploadFile = File(...),
    trading_type: str = Form("SWING"),
):
    """
    Accept a chart image upload, convert to base64, and run Gemini vision analysis.

    Body (multipart/form-data):
      file         : PNG/JPEG chart image
      trading_type : "SWING" | "SCALP"
    """
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
async def realtime_price_endpoint(ticker: str):
    """
    Fetch the latest IDX stock price, change, and volume using
    Gemini with Google Search grounding.

    Path param:
      ticker : IDX stock ticker, e.g. BBCA
    """
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
    company: str = Query(default="", description="Company name for better search results"),
):
    """
    Fetch the 5 most recent news articles for an IDX stock using
    Gemini with Google Search grounding.

    Path param:
      ticker  : IDX stock ticker, e.g. BBCA
    Query param:
      company : Company display name, e.g. "Bank Central Asia"
    """
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
async def analyze_stock_endpoint(request: AnalyzeStockRequest):
    """
    Run a comprehensive 5-point technical + fundamental analysis on an IDX stock.

    Body:
      ticker        : IDX stock ticker
      history       : list of {price, volume, ...} data points
      technicals    : dict with rsi, macd, ma50, volumeAvg, trendLong, etc.
      real_time_data: optional dict with current price/change/volume
    """
    ticker = request.ticker.upper().strip()
    if not ticker:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ticker is required.",
        )
    return await analyze_stock(
        ticker=ticker,
        history=request.history,
        technicals=request.technicals,
        real_time_data=request.real_time_data,
    )
