"""
Stocks Router

Endpoints for stock data retrieval.
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from ..schemas.stock import (
    StockProfile,
    StockDataPoint,
    StockListResponse,
    TimeFrame,
    RealTimePrice,
)
from ..services.market_data import market_data_service

router = APIRouter()


@router.get("", response_model=StockListResponse)
async def get_all_stocks():
    """
    Get list of all available IDX stocks.
    
    Returns basic profile information for each stock.
    """
    stocks = market_data_service.get_all_stocks()
    return StockListResponse(stocks=stocks, total=len(stocks))


@router.get("/{ticker}", response_model=StockProfile)
async def get_stock_profile(ticker: str):
    """
    Get stock profile by ticker symbol.
    
    - **ticker**: Stock ticker (e.g., BBCA, GOTO)
    """
    profile = market_data_service.get_stock_profile(ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return profile


@router.get("/{ticker}/price", response_model=RealTimePrice)
async def get_stock_price(ticker: str):
    """
    Get current/real-time price for a stock.
    
    In development mode, returns simulated price data.
    """
    price = market_data_service.get_realtime_price(ticker.upper())
    if not price:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return price


@router.get("/{ticker}/history", response_model=List[StockDataPoint])
async def get_stock_history(
    ticker: str,
    timeframe: TimeFrame = Query(TimeFrame.ONE_MONTH, description="Data timeframe"),
    limit: int = Query(100, ge=1, le=365, description="Maximum data points"),
):
    """
    Get historical price data for a stock.
    
    - **ticker**: Stock ticker (e.g., BBCA)
    - **timeframe**: 1D, 1W, 1M, 3M, 6M, 1Y, YTD
    - **limit**: Maximum number of data points (1-365)
    """
    profile = market_data_service.get_stock_profile(ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    # Convert timeframe to days
    timeframe_days = {
        TimeFrame.ONE_DAY: 1,
        TimeFrame.ONE_WEEK: 7,
        TimeFrame.ONE_MONTH: 30,
        TimeFrame.THREE_MONTHS: 90,
        TimeFrame.SIX_MONTHS: 180,
        TimeFrame.ONE_YEAR: 365,
        TimeFrame.YEAR_TO_DATE: 365,  # Simplified
    }
    days = timeframe_days.get(timeframe, 30)
    
    history = market_data_service.generate_mock_history(ticker.upper(), days=min(days, limit))
    return history[-limit:]


@router.get("/{ticker}/intraday", response_model=List[StockDataPoint])
async def get_intraday_data(ticker: str):
    """
    Get intraday (minute-level) price data for today.
    
    - **ticker**: Stock ticker
    """
    profile = market_data_service.get_stock_profile(ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    data = market_data_service.generate_intraday_data(ticker.upper())
    return data
