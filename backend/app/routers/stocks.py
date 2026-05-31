"""
Stocks Router

Endpoints for stock data retrieval. When USE_REAL_PRICES is enabled and the
ticker has stored prices, data comes from the `stock_prices` table; otherwise
it falls back to the deterministic mock generators.
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


@router.get("", response_model=StockListResponse)
async def get_all_stocks():
    stocks = market_data_service.get_all_stocks()
    return StockListResponse(stocks=stocks, total=len(stocks))


@router.get("/{ticker}", response_model=StockProfile)
async def get_stock_profile(ticker: str):
    profile = market_data_service.get_stock_profile(ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return profile


@router.get("/{ticker}/price", response_model=RealTimePrice)
async def get_stock_price(ticker: str, db: AsyncSession = Depends(get_db)):
    ticker = ticker.upper()
    if settings.USE_REAL_PRICES:
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
