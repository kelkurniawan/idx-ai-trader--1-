"""
Price Ingest Service

Fetches real IDX daily OHLCV from Yahoo Finance and stores it in the
`stock_prices` table. Pure parsing is separated from I/O for testability.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.stock import Stock, StockPrice
from ..services.market_data import SAMPLE_IDX_STOCKS

logger = logging.getLogger(__name__)
settings = get_settings()

YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


def parse_yahoo_chart(payload: dict) -> list[dict]:
    """Convert a Yahoo chart JSON payload into a list of OHLCV row dicts.

    Rows with a null close are skipped (non-trading days / bad data).
    Returns [] for empty or error payloads.
    """
    chart = (payload or {}).get("chart") or {}
    results = chart.get("result") or []
    if not results:
        return []

    result = results[0]
    timestamps = result.get("timestamp") or []
    quote_list = ((result.get("indicators") or {}).get("quote")) or []
    if not timestamps or not quote_list:
        return []

    quote = quote_list[0]
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []

    rows: list[dict] = []
    for i, ts in enumerate(timestamps):
        close = closes[i] if i < len(closes) else None
        if close is None:
            continue
        rows.append(
            {
                "date": datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None),
                "open": float(opens[i]) if i < len(opens) and opens[i] is not None else float(close),
                "high": float(highs[i]) if i < len(highs) and highs[i] is not None else float(close),
                "low": float(lows[i]) if i < len(lows) and lows[i] is not None else float(close),
                "close": float(close),
                "volume": float(volumes[i]) if i < len(volumes) and volumes[i] is not None else 0.0,
            }
        )
    return rows


async def fetch_yahoo_history(ticker: str, range_: str = "1y") -> list[dict]:
    """Fetch daily OHLCV rows for an IDX ticker from Yahoo Finance.

    IDX tickers are suffixed with ".JK" on Yahoo (e.g. BBCA -> BBCA.JK).
    Returns [] on any network/parse failure (caller decides fallback).
    """
    symbol = f"{ticker.upper()}.JK"
    url = YAHOO_CHART_URL.format(symbol=symbol)
    params = {"range": range_, "interval": "1d"}
    headers = {"User-Agent": "Mozilla/5.0 (compatible; SahamGueBot/1.0)"}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            return parse_yahoo_chart(resp.json())
    except Exception as exc:  # noqa: BLE001 - any failure -> empty, caller falls back
        logger.warning("[PriceIngest] Yahoo fetch failed for %s: %s", symbol, exc)
        return []
