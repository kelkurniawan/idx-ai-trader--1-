"""
Stocks Router

Endpoints for stock data retrieval. When USE_REAL_PRICES is enabled:
  1. data is read from the `stock_prices` / `stocks` tables (fast),
  2. if a searched ticker isn't stored yet, it is resolved on-demand from
     Yahoo Finance and persisted (so ANY valid IDX ticker works on first search),
  3. otherwise it falls back to the curated mock generators.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..schemas.stock import (
    StockProfile,
    StockDataPoint,
    StockListResponse,
    TimeFrame,
    RealTimePrice,
)
from ..services.market_data import market_data_service
from ..services import stock_repository as repo
from ..services import price_ingest_service as ingest

router = APIRouter()
settings = get_settings()

_TIMEFRAME_DAYS = {
    TimeFrame.ONE_DAY: 1,
    TimeFrame.ONE_WEEK: 7,
    TimeFrame.ONE_MONTH: 30,
    TimeFrame.THREE_MONTHS: 90,
    TimeFrame.SIX_MONTHS: 180,
    TimeFrame.ONE_YEAR: 365,
    TimeFrame.YEAR_TO_DATE: 365,
}


async def _resolve_profile(db: AsyncSession, ticker: str) -> StockProfile | None:
    """Curated list → stored `stocks` row → on-demand Yahoo resolve → None."""
    profile = market_data_service.get_stock_profile(ticker)
    if profile:
        return profile
    profile = await repo.get_profile_from_db(db, ticker)
    if profile:
        return profile
    if settings.USE_REAL_PRICES and await ingest.resolve_ticker(db, ticker):
        return await repo.get_profile_from_db(db, ticker)
    return None


@router.get("", response_model=StockListResponse)
async def get_all_stocks(db: AsyncSession = Depends(get_db)):
    """All known stocks: the curated universe plus any on-demand-resolved tickers."""
    by_ticker = {s.ticker: s for s in market_data_service.get_all_stocks()}
    if settings.USE_REAL_PRICES:
        for p in await repo.get_all_profiles_from_db(db):
            by_ticker.setdefault(p.ticker, p)
    stocks = sorted(by_ticker.values(), key=lambda s: s.ticker)
    return StockListResponse(stocks=stocks, total=len(stocks))


@router.get("/{ticker}", response_model=StockProfile)
async def get_stock_profile(ticker: str, db: AsyncSession = Depends(get_db)):
    profile = await _resolve_profile(db, ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return profile


@router.get("/{ticker}/price", response_model=RealTimePrice)
async def get_stock_price(ticker: str, db: AsyncSession = Depends(get_db)):
    ticker = ticker.upper()
    if settings.USE_REAL_PRICES:
        live = await repo.get_latest_price_from_db(db, ticker)
        if not live and await ingest.resolve_ticker(db, ticker):
            live = await repo.get_latest_price_from_db(db, ticker)
        if live:
            return live
    price = market_data_service.get_realtime_price(ticker)
    if not price:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return price


@router.get("/{ticker}/history", response_model=List[StockDataPoint])
async def get_stock_history(
    ticker: str,
    timeframe: TimeFrame = Query(TimeFrame.ONE_MONTH, description="Data timeframe"),
    limit: int = Query(100, ge=1, le=365, description="Maximum data points"),
    db: AsyncSession = Depends(get_db),
):
    ticker = ticker.upper()
    days = _TIMEFRAME_DAYS.get(timeframe, 30)

    if settings.USE_REAL_PRICES:
        history = await repo.get_history_from_db(db, ticker, days=days)
        if not history and await ingest.resolve_ticker(db, ticker):
            history = await repo.get_history_from_db(db, ticker, days=days)
        if history:
            return history[-limit:]

    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    history = market_data_service.generate_mock_history(ticker, days=min(days, limit))
    return history[-limit:]


@router.get("/{ticker}/intraday", response_model=List[StockDataPoint])
async def get_intraday_data(ticker: str):
    profile = market_data_service.get_stock_profile(ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return market_data_service.generate_intraday_data(ticker.upper())
