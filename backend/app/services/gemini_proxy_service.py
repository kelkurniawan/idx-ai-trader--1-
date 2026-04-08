"""
Gemini Proxy Service

Backend proxy for all Google Generative AI calls previously made directly
from the frontend. Moving these calls server-side keeps the GEMINI_API_KEY
out of the browser bundle entirely.

Supported operations (mirror of original frontend geminiService.ts):
  - analyze_chart_vision     : multimodal chart image analysis
  - get_realtime_stock_data  : live price/change via Google Search grounding
  - fetch_stock_news         : recent news articles via Google Search grounding
  - analyze_stock            : full 5-point technical + fundamental analysis
"""

import json
import logging
from datetime import datetime
from typing import Optional

from ..config import get_settings
from ..services.genai_client import async_generate_content, response_text

logger = logging.getLogger(__name__)
settings = get_settings()


# ---------------------------------------------------------------------------
# Chart Vision Analysis
# ---------------------------------------------------------------------------

async def analyze_chart_vision(base64_image: str, trading_type: str) -> dict:
    """
    Analyse a trading chart image using Gemini's vision capability.

    Args:
        base64_image: Raw base64-encoded PNG (without data: prefix).
        trading_type: "SWING" or "SCALP"

    Returns:
        dict matching ChartVisionAnalysis schema expected by frontend.
    """
    if not settings.GEMINI_API_KEY:
        return _mock_chart_vision(trading_type)

    try:
        prompt = (
            f"Act as a professional technical analyst. Analyse this trading chart for a {trading_type} setup.\n"
            "1. Identify the primary market trend.\n"
            "2. Detect specific candlestick patterns.\n"
            "3. Identify key Support and Resistance levels. "
            "For each level estimate its vertical position (yPos) on the image where 0 is the very top and 1 is the very bottom.\n"
            "4. Suggest precise Entry, Stop Loss, and Take Profit levels.\n"
            "Return JSON with keys: trend (string), candlestickPatterns (array of strings), "
            "supportLevels (array of {price, yPos, label}), resistanceLevels (array of {price, yPos, label}), "
            "entrySuggestion (string), stopLoss (string), takeProfit (string), overallStrategy (string)."
        )
        response = await async_generate_content(
            model="gemini-2.0-flash",
            prompt=prompt,
            response_mime_type="application/json",
            image_base64=base64_image,
        )
        text = response_text(response)
        if not text:
            raise ValueError("Empty response from Gemini Vision")
        return json.loads(text)

    except Exception as exc:
        logger.warning("Gemini chart vision failed, returning mock: %s", exc)
        return _mock_chart_vision(trading_type)


def _mock_chart_vision(trading_type: str) -> dict:
    is_swing = trading_type.upper() == "SWING"
    return {
        "trend": "Bullish with higher highs and higher lows pattern",
        "candlestickPatterns": [
            "Bullish Engulfing at support",
            "Morning Star formation",
            "Higher lows pattern",
        ],
        "supportLevels": [
            {"price": "9200", "yPos": 0.75, "label": "Major Support"},
            {"price": "9000", "yPos": 0.85, "label": "Key Support Zone"},
        ],
        "resistanceLevels": [
            {"price": "9600", "yPos": 0.25, "label": "Resistance"},
            {"price": "9800", "yPos": 0.15, "label": "Target Zone"},
        ],
        "entrySuggestion": (
            "Enter on pullback to 9350-9400 zone"
            if is_swing
            else "Enter on breakout above 9500"
        ),
        "stopLoss": "9150 (below recent swing low)" if is_swing else "9400 (tight stop)",
        "takeProfit": "9750-9800 (next resistance)" if is_swing else "9600 (quick target)",
        "overallStrategy": (
            f"{'Swing' if is_swing else 'Scalp'} trade setup with favourable risk/reward. "
            "Wait for confirmation before entry."
        ),
    }


# ---------------------------------------------------------------------------
# Real-Time Stock Data (Google Search grounding)
# ---------------------------------------------------------------------------

async def get_realtime_stock_data(ticker: str) -> dict:
    """
    Fetch the latest real-time price, change, and volume for an IDX stock
    using Gemini with Google Search grounding.

    Returns dict with: price, change, changePercent, volume, lastUpdated,
    and optionally sources.
    """
    if not settings.GEMINI_API_KEY:
        return _mock_realtime(ticker)

    try:
        prompt = (
            f'Find the latest real-time stock price (IDR), today\'s change amount, '
            f'change percentage, and volume for "{ticker}" on the Indonesia Stock Exchange (IDX). '
            f'Return JSON with keys: price (number), change (number), changePercent (number), volume (number).'
        )

        response = await async_generate_content(
            model="gemini-2.0-flash",
            prompt=prompt,
            response_mime_type="application/json",
            use_google_search=True,
        )

        # Extract grounding sources
        sources = []
        try:
            chunks = (
                response.candidates[0]
                .grounding_metadata.grounding_chunks
            )
            sources = [
                {"title": c.web.title, "uri": c.web.uri}
                for c in chunks
                if hasattr(c, "web") and c.web.uri and c.web.title
            ]
        except Exception:
            pass

        data = {"price": 0, "change": 0, "changePercent": 0, "volume": 0}
        try:
            text = response_text(response)
            if text:
                parsed = json.loads(text)
                data.update(parsed)
        except Exception:
            pass

        logger.info(
            "gemini_proxy:realtime ticker=%s model=gemini-2.0-flash sources=%d",
            ticker,
            len(sources),
        )

        return {
            "price": data.get("price", 0),
            "change": data.get("change", 0),
            "changePercent": data.get("changePercent", 0),
            "volume": data.get("volume", 0),
            "lastUpdated": datetime.now().strftime("%H:%M:%S"),
            "sources": sources if sources else None,
        }

    except Exception as exc:
        logger.warning("Gemini realtime failed for %s, returning mock: %s", ticker, exc)
        return _mock_realtime(ticker)


def _mock_realtime(ticker: str) -> dict:
    import hashlib

    h = int(hashlib.md5(ticker.encode()).hexdigest()[:6], 16)
    base_price = 5000 + (h % 50000)
    change = round((h % 200 - 100) * 0.5, 2)
    change_pct = round(change / base_price * 100, 2)
    return {
        "price": base_price,
        "change": change,
        "changePercent": change_pct,
        "volume": (h % 10_000_000) + 1_000_000,
        "lastUpdated": datetime.now().strftime("%H:%M:%S"),
        "sources": None,
    }


# ---------------------------------------------------------------------------
# Stock News (Google Search grounding)
# ---------------------------------------------------------------------------

async def fetch_stock_news(ticker: str, company_name: str) -> list:
    """
    Fetch recent news articles about an IDX stock using Google Search grounding.

    Returns list of dicts with: title, source, url, snippet, publishedAt.
    """
    if not settings.GEMINI_API_KEY:
        return []

    try:
        prompt = (
            f'Find the 5 most recent and relevant news articles about the stock '
            f'"{ticker}" ({company_name}) on IDX. '
            f'Return JSON array where each item has keys: '
            f'title (string), source (string), url (string), snippet (string), publishedAt (string).'
        )

        response = await async_generate_content(
            model="gemini-2.0-flash",
            prompt=prompt,
            response_mime_type="application/json",
            use_google_search=True,
        )

        logger.info(
            "gemini_proxy:news ticker=%s model=gemini-2.0-flash",
            ticker,
        )

        text = response_text(response)
        if text:
            return json.loads(text)
        return []

    except Exception as exc:
        logger.warning("Gemini stock news failed for %s: %s", ticker, exc)
        return []


# ---------------------------------------------------------------------------
# Full Stock Analysis (Google Search grounding + structured schema)
# ---------------------------------------------------------------------------

async def analyze_stock(
    ticker: str,
    history: list,
    technicals: dict,
    real_time_data: Optional[dict] = None,
) -> dict:
    """
    Perform a full 5-point technical + fundamental analysis using Gemini
    with Google Search grounding (mirrors analyzeStockWithGemini in frontend).

    Args:
        ticker: IDX stock ticker, e.g. "BBCA"
        history: list of {price, volume, ...} data points
        technicals: dict with rsi, macd, ma50, volumeAvg, trendLong, etc.
        real_time_data: optional current price/change/volume dict

    Returns:
        dict matching AIAnalysisResult shape expected by frontend.
    """
    if not settings.GEMINI_API_KEY:
        return _mock_stock_analysis(ticker, real_time_data)

    try:
        rsi = technicals.get("rsi", 0)
        macd = technicals.get("macd", 0)
        ma50 = technicals.get("ma50", 0)
        trend_long = technicals.get("trendLong", "NEUTRAL")
        volume_avg = technicals.get("volumeAvg", 1)
        current_price = (real_time_data or {}).get("price", 0)
        if not current_price and history:
            current_price = history[-1].get("price", 0)

        rsi_status = "Overbought" if rsi > 70 else "Oversold" if rsi < 30 else "Neutral"
        macd_status = "Bullish (histogram positive)" if macd > 0 else "Bearish (histogram negative)"
        price_vs_ma = "above" if current_price > ma50 else "below"
        current_volume = (real_time_data or {}).get("volume", 0) or (history[-1].get("volume", 0) if history else 0)
        volume_status = "Above average (confirming)" if current_volume > volume_avg else "Below average (weak confirmation)"

        prompt = f"""
You are an elite quantitative financial analyst specialising in the Indonesia Stock Exchange (IDX).

CRITICAL DIRECTIVES:
1. Your final recommendation (signal) MUST logically align with the technical indicators.
2. Internally analyse the relationship between price, moving averages, and momentum before generating output.

INPUT DATA:
Ticker: {ticker}
Current Price: Rp {current_price:,.0f}
RSI (14): {rsi:.1f} ({rsi_status})
MACD: {macd_status}
50-Day MA: Rp {ma50:,.0f} (price is {price_vs_ma} the MA)
Volume: {volume_status}
Long-term Trend: {trend_long}

TASKS:
1. Perform a Google Search to find the latest Fundamental Data (PE, PBV, ROE, DER, Market Cap, Dividend Yield) for {ticker} on IDX.
2. Generate a 5-point analysis (RSI, MACD, Moving Average, Volume, Sector Outlook).
3. Write a cohesive 1-sentence summary headline logically supported by all 5 points.
4. Provide Investment Verdict: Rating (Buy/Hold/Sell), Suitability (0-100) for Growth/Value/Dividend investors.
5. List Pros and Cons.

Return JSON with keys:
signal (one of: STRONG_BUY, BUY, NEUTRAL, SELL, STRONG_SELL),
confidence (integer 0-100),
summary (string),
reasoning (array of 5 strings),
supportLevel (number),
resistanceLevel (number),
fundamentals (object with peRatio, pbvRatio, roe, der, marketCap, dividendYield),
verdict (object with rating, suitability {{growth, value, dividend}}, pros, cons).
"""

        response = await async_generate_content(
            model="gemini-2.0-flash",
            prompt=prompt,
            response_mime_type="application/json",
            use_google_search=True,
        )

        logger.info(
            "gemini_proxy:analyze ticker=%s model=gemini-2.0-flash-exp",
            ticker,
        )

        text = response_text(response) or "{}"
        parsed = json.loads(text)
        return {
            "ticker": ticker,
            "currentPrice": current_price,
            "lastUpdated": datetime.now().strftime("%H:%M:%S"),
            "timestamp": int(datetime.now().timestamp() * 1000),
            **parsed,
        }

    except Exception as exc:
        logger.warning("Gemini stock analysis failed for %s: %s", ticker, exc)
        return _mock_stock_analysis(ticker, real_time_data)


def _mock_stock_analysis(ticker: str, real_time_data: Optional[dict]) -> dict:
    price = (real_time_data or {}).get("price", 5000)
    return {
        "ticker": ticker,
        "currentPrice": price,
        "lastUpdated": datetime.now().strftime("%H:%M:%S"),
        "timestamp": int(datetime.now().timestamp() * 1000),
        "signal": "NEUTRAL",
        "confidence": 50,
        "summary": f"{ticker} is in consolidation. AI analysis unavailable in development mode.",
        "reasoning": [
            "RSI analysis unavailable — GEMINI_API_KEY not configured.",
            "MACD analysis unavailable — using development fallback.",
            "Moving average analysis unavailable.",
            "Volume analysis unavailable.",
            "Sector analysis unavailable.",
        ],
        "supportLevel": round(price * 0.95, 0),
        "resistanceLevel": round(price * 1.05, 0),
        "fundamentals": {
            "peRatio": 0,
            "pbvRatio": 0,
            "roe": 0,
            "der": 0,
            "marketCap": "N/A",
            "dividendYield": 0,
        },
        "verdict": {
            "rating": "Hold",
            "suitability": {"growth": 50, "value": 50, "dividend": 50},
            "pros": ["Development mode — no real analysis available."],
            "cons": ["Set GEMINI_API_KEY to enable AI analysis."],
        },
    }
