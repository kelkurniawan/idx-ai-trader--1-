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

# Captured at import time so that test monkeypatches on asyncio.sleep do not
# cause infinite recursion when the patched sleep tries to call asyncio.sleep.
_real_sleep = asyncio.sleep


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


async def seed_stocks(db: AsyncSession) -> int:
    """Insert any missing tickers from SAMPLE_IDX_STOCKS into `stocks`. Idempotent."""
    existing = set(
        (await db.execute(select(Stock.ticker))).scalars().all()
    )
    added = 0
    for s in SAMPLE_IDX_STOCKS:
        if s["ticker"] in existing:
            continue
        db.add(Stock(ticker=s["ticker"], name=s["name"], sector=s["sector"]))
        added += 1
    await db.commit()
    return added


async def upsert_prices(db: AsyncSession, ticker: str, rows: list[dict]) -> int:
    """Insert new (ticker, date) rows and update existing ones in place. Idempotent."""
    ticker = ticker.upper()
    existing_dates = {
        d for (d,) in (
            await db.execute(
                select(StockPrice.date).where(StockPrice.ticker == ticker)
            )
        ).all()
    }
    written = 0
    for r in rows:
        if r["date"] in existing_dates:
            existing = (await db.execute(
                select(StockPrice).where(
                    StockPrice.ticker == ticker, StockPrice.date == r["date"]
                )
            )).scalar_one()
            existing.open = r["open"]
            existing.high = r["high"]
            existing.low = r["low"]
            existing.close = r["close"]
            existing.volume = r["volume"]
        else:
            db.add(StockPrice(
                ticker=ticker, date=r["date"], open=r["open"], high=r["high"],
                low=r["low"], close=r["close"], volume=r["volume"],
            ))
        written += 1
    await db.commit()
    return written


async def ingest_one(db: AsyncSession, ticker: str) -> int:
    """Fetch + upsert a single ticker. Returns rows written (0 if Yahoo failed)."""
    rows = await fetch_yahoo_history(ticker)
    if not rows:
        return 0
    return await upsert_prices(db, ticker, rows)


async def ingest_all(db: AsyncSession, throttle_seconds: float = 0.3) -> dict:
    """Seed stocks, then fetch + upsert every ticker. Per-ticker failures are isolated."""
    await seed_stocks(db)
    updated = 0
    failed_tickers: list[str] = []
    for s in SAMPLE_IDX_STOCKS:
        ticker = s["ticker"]
        try:
            written = await ingest_one(db, ticker)
            if written > 0:
                updated += 1
            else:
                failed_tickers.append(ticker)
        except Exception as exc:  # noqa: BLE001
            # Roll back so a failed ticker's pending transaction does not poison
            # the shared session and cascade-fail every remaining ticker.
            await db.rollback()
            logger.warning("[PriceIngest] ticker %s failed: %s", ticker, exc)
            failed_tickers.append(ticker)
        await _real_sleep(throttle_seconds)

    summary = {
        "updated": updated,
        "failed": len(failed_tickers),
        "failed_tickers": failed_tickers,
        "total": len(SAMPLE_IDX_STOCKS),
    }
    logger.info("[PriceIngest] run complete: %s", summary)
    return summary
