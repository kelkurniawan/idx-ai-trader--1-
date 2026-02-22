"""
Stock Data Schemas

Pydantic models for stock data validation and serialization.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class TrendDirection(str, Enum):
    """Trend direction enumeration."""
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"


class TimeFrame(str, Enum):
    """Supported timeframes for data."""
    ONE_DAY = "1D"
    ONE_WEEK = "1W"
    ONE_MONTH = "1M"
    THREE_MONTHS = "3M"
    SIX_MONTHS = "6M"
    ONE_YEAR = "1Y"
    YEAR_TO_DATE = "YTD"


class StockProfile(BaseModel):
    """IDX Stock profile information."""
    ticker: str = Field(..., description="Stock ticker symbol (e.g., BBCA)")
    name: str = Field(..., description="Company name")
    sector: str = Field(..., description="Industry sector")
    subsector: Optional[str] = None
    market_cap: Optional[float] = Field(None, description="Market capitalization in IDR")
    listed_shares: Optional[float] = Field(None, description="Number of listed shares")
    
    class Config:
        from_attributes = True


class StockDataPoint(BaseModel):
    """Simple price/volume data point for charts."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    price: float = Field(..., description="Closing price")
    volume: float = Field(..., description="Trading volume")


class StockPriceOHLCV(BaseModel):
    """Full OHLCV price data."""
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    value: Optional[float] = Field(None, description="Transaction value in IDR")
    frequency: Optional[int] = Field(None, description="Number of transactions")
    
    class Config:
        from_attributes = True


class RealTimePrice(BaseModel):
    """Real-time price information."""
    current: float = Field(..., description="Current price")
    change: float = Field(..., description="Price change from previous close")
    change_percent: float = Field(..., description="Percentage change")
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    previous_close: Optional[float] = None
    volume: float = Field(..., description="Current day volume")
    value: Optional[float] = Field(None, description="Transaction value")
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class MACDIndicator(BaseModel):
    """MACD indicator values."""
    line: float = Field(..., description="MACD line")
    signal: float = Field(..., description="Signal line")
    histogram: float = Field(..., description="MACD histogram")


class BollingerBands(BaseModel):
    """Bollinger Bands values."""
    upper: float = Field(..., description="Upper band")
    middle: float = Field(..., description="Middle band (SMA)")
    lower: float = Field(..., description="Lower band")


class StochasticIndicator(BaseModel):
    """Stochastic oscillator values."""
    k: float = Field(..., description="%K line")
    d: float = Field(..., description="%D line (signal)")


class TechnicalIndicators(BaseModel):
    """Complete technical indicators for a stock."""
    # Momentum Indicators
    rsi: float = Field(..., ge=0, le=100, description="RSI (14-period)")
    macd: MACDIndicator
    stochastic: Optional[StochasticIndicator] = None
    
    # Moving Averages
    ema20: float = Field(..., description="20-day EMA")
    sma50: float = Field(..., description="50-day SMA")
    sma200: float = Field(..., description="200-day SMA")
    
    # Volatility
    bollinger: BollingerBands
    atr: Optional[float] = Field(None, description="Average True Range")
    
    # Support & Resistance
    support: List[float] = Field(default_factory=list, description="Support levels")
    resistance: List[float] = Field(default_factory=list, description="Resistance levels")
    
    # Trend Summary
    trend_short: TrendDirection = Field(..., description="Short-term trend (1-20 days)")
    trend_medium: TrendDirection = Field(..., description="Medium-term trend (20-50 days)")
    trend_long: TrendDirection = Field(..., description="Long-term trend (50-200 days)")


class StockHistoryRequest(BaseModel):
    """Request parameters for stock history."""
    timeframe: TimeFrame = TimeFrame.ONE_MONTH
    limit: int = Field(default=100, ge=1, le=365)


class StockListResponse(BaseModel):
    """Response for stock list endpoint."""
    stocks: List[StockProfile]
    total: int
