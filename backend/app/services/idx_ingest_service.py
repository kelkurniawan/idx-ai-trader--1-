"""
IDX End-of-Day Ingest Service

Fetches official end-of-day trading data straight from the IDX (Bursa Efek
Indonesia) site and stores it in the `stock_prices` table. This is the PRIMARY
EOD source; the Yahoo Finance path (price_ingest_service) remains the fallback.

Why this exists:
  - IDX's Stock Summary endpoint returns OHLC + Volume + Value + Frequency for
    EVERY listed ticker in a single request for a given trading date — richer
    and far more efficient than Yahoo's one-request-per-ticker chart API.

Two practical hurdles, both handled here:
  1. The IDX site is Cloudflare-fronted, so a plain httpx/requests call returns
     403. We use `curl_cffi` with Chrome impersonation (matching TLS fingerprint)
     to get through, exactly like the community IDX scrapers.
  2. curl_cffi is synchronous, so network calls run in a thread via
     asyncio.to_thread to avoid blocking the event loop.

Pure parsing (`parse_stock_summary`) is separated from I/O for unit testing.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.stock import Stock, StockPrice

logger = logging.getLogger(__name__)
settings = get_settings()

# Stock Summary endpoint: one call returns every ticker for the given date.
# date format is YYYYMMDD.
IDX_STOCK_SUMMARY_URL = "https://www.idx.co.id/primary/TradingSummary/GetStockSummary"
IDX_REFERER = "https://www.idx.co.id/en/market-data/trading-summary/stock-summary"

_real_sleep = asyncio.sleep


# ─────────────────────────────────────────────────────────────────────────────
# Pure parsing (no network) — unit testable
# ─────────────────────────────────────────────────────────────────────────────
def _f(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_date(value) -> Optional[datetime]:
    """IDX returns e.g. '2026-05-29T00:00:00'. Return tz-naive datetime."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "")).replace(tzinfo=None)
    except ValueError:
        # Sometimes a bare date or YYYYMMDD shows up.
        for fmt in ("%Y-%m-%d", "%Y%m%d"):
            try:
                return datetime.strptime(str(value)[:10], fmt)
            except ValueError:
                continue
    return None


def parse_stock_summary(payload: dict) -> list[dict]:
    """Convert an IDX GetStockSummary JSON payload into OHLCV+ row dicts.

    Expected shape: {"data": [{"StockCode","Date","OpenPrice","High","Low",
    "Close","Volume","Value","Frequency", "ForeignBuy","ForeignSell", ...}, ...]}

    Rows with a zero/None close (no trade that day) are skipped.
    Returns [] for empty/error payloads. Field names are matched defensively.
    """
    data = (payload or {}).get("data") or []
    rows: list[dict] = []

    for item in data:
        if not isinstance(item, dict):
            continue
        ticker = (item.get("StockCode") or item.get("Code") or "").strip().upper()
        if not ticker:
            continue

        close = _f(item.get("Close", item.get("ClosePrice")))
        if close <= 0:
            # No trade / suspended that day — skip so we don't store a 0 close.
            continue

        dt = _parse_date(item.get("Date"))
        if dt is None:
            continue

        open_ = _f(item.get("OpenPrice", item.get("Open")), close)
        high = _f(item.get("High", item.get("HighPrice")), close)
        low = _f(item.get("Low", item.get("LowPrice")), close)

        rows.append({
            "ticker": ticker,
            "name": (item.get("StockName") or item.get("Name") or "").strip() or None,
            "date": dt,
            "open": open_ or close,
            "high": high or close,
            "low": low or close,
            "close": close,
            "volume": _f(item.get("Volume")),
            "value": _f(item.get("Value")),
            "frequency": int(_f(item.get("Frequency"))),
            # Captured for future use (no column yet): foreign flow.
            "foreign_buy": _f(item.get("ForeignBuy")),
            "foreign_sell": _f(item.get("ForeignSell")),
        })

    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Network (curl_cffi, Cloudflare-aware) — runs in a thread
# ─────────────────────────────────────────────────────────────────────────────
def _fetch_stock_summary_sync(date_str: str) -> dict:
    """Blocking fetch of the Stock Summary for a YYYYMMDD date via curl_cffi."""
    try:
        from curl_cffi import requests as cffi_requests
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "curl_cffi is not installed. Add 'curl_cffi' to requirements.txt."
        ) from exc

    params = {"length": "9999", "start": "0", "date": date_str}
    headers = {"Referer": IDX_REFERER, "Accept": "application/json, text/plain, */*"}

    # A session that first warms cookies on the homepage tends to be more
    # reliable against Cloudflare than a cold API hit.
    session = cffi_requests.Session(impersonate="chrome")
    try:
        try:
            session.get("https://www.idx.co.id/en", timeout=30)
        except Exception:  # noqa: BLE001 - homepage warmup is best-effort
            pass
        resp = session.get(
            IDX_STOCK_SUMMARY_URL, params=params, headers=headers, timeout=45
        )
        resp.raise_for_status()
        return resp.json()
    finally:
        session.close()


async def fetch_idx_stock_summary(date_str: str) -> list[dict]:
    """Async wrapper: fetch + parse the EOD Stock Summary for a YYYYMMDD date.

    Returns [] on any network/parse/Cloudflare failure (caller falls back).
    """
    try:
        payload = await asyncio.to_thread(_fetch_stock_summary_sync, date_str)
        rows = parse_stock_summary(payload)
        logger.info("[IDXIngest] %s -> %d tradable rows", date_str, len(rows))
        return rows
    except Exception as exc:  # noqa: BLE001
        logger.warning("[IDXIngest] fetch failed for %s: %s", date_str, exc)
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Persistence
# ─────────────────────────────────────────────────────────────────────────────
async def upsert_idx_rows(db: AsyncSession, rows: list[dict]) -> int:
    """Upsert EOD rows (OHLC + Value + Frequency) keyed on (ticker, date).

    Also ensures a `stocks` row exists for each ticker (so newly-listed tickers
    appear in the universe). Idempotent.
    """
    if not rows:
        return 0

    # Preload existing stock tickers once.
    known_stocks = set(
        (await db.execute(select(Stock.ticker))).scalars().all()
    )

    written = 0
    for r in rows:
        ticker = r["ticker"]

        if ticker not in known_stocks:
            db.add(Stock(ticker=ticker, name=r.get("name") or ticker, sector="IDX"))
            known_stocks.add(ticker)

        existing = (await db.execute(
            select(StockPrice).where(
                StockPrice.ticker == ticker, StockPrice.date == r["date"]
            )
        )).scalar_one_or_none()

        if existing:
            existing.open = r["open"]
            existing.high = r["high"]
            existing.low = r["low"]
            existing.close = r["close"]
            existing.volume = r["volume"]
            existing.value = r["value"]
            existing.frequency = r["frequency"]
        else:
            db.add(StockPrice(
                ticker=ticker, date=r["date"],
                open=r["open"], high=r["high"], low=r["low"], close=r["close"],
                volume=r["volume"], value=r["value"], frequency=r["frequency"],
            ))
        written += 1

    await db.commit()
    return written


# ─────────────────────────────────────────────────────────────────────────────
# Orchestration
# ─────────────────────────────────────────────────────────────────────────────
def _default_date_str() -> str:
    return datetime.now().strftime("%Y%m%d")


async def ingest_idx_eod(db: AsyncSession, date_str: Optional[str] = None) -> dict:
    """Fetch one trading day's full Stock Summary and upsert it.

    `date_str` is YYYYMMDD; defaults to today. On an IDX failure the summary is
    empty and the caller/scheduler should rely on the Yahoo fallback path.
    """
    date_str = date_str or _default_date_str()
    rows = await fetch_idx_stock_summary(date_str)
    written = await upsert_idx_rows(db, rows) if rows else 0
    summary = {
        "date": date_str,
        "source": "idx" if rows else "none",
        "tickers": len({r["ticker"] for r in rows}),
        "rows_written": written,
    }
    logger.info("[IDXIngest] EOD complete: %s", summary)
    return summary


# Single-flight guard (mirrors the Yahoo ingest pattern).
_idx_running = False


def is_idx_ingest_running() -> bool:
    return _idx_running


def run_idx_ingest_in_background(date_str: Optional[str] = None) -> dict:
    """Start an IDX EOD ingest in the background and return 202-style status."""
    global _idx_running
    if _idx_running:
        return {"started": False, "message": "An IDX ingest run is already in progress"}
    _idx_running = True

    async def _run() -> None:
        global _idx_running
        from ..database import AsyncSessionLocal
        try:
            async with AsyncSessionLocal() as db:
                summary = await ingest_idx_eod(db, date_str)
                logger.info("[IDXIngest] background run complete: %s", summary)
        except Exception as exc:  # noqa: BLE001
            logger.error("[IDXIngest] background run failed: %s", exc)
        finally:
            _idx_running = False

    asyncio.create_task(_run())
    return {"started": True, "message": "IDX EOD ingest started in background"}
