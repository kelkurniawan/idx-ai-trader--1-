"""
Stock Database Models

SQLAlchemy models for stock data storage.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Index

from ..database import Base


class Stock(Base):
    """IDX Stock profile."""
    __tablename__ = "stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    sector = Column(String(100))
    subsector = Column(String(100))
    market_cap = Column(Float)
    listed_shares = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class StockPrice(Base):
    """Historical stock price data (OHLCV)."""
    __tablename__ = "stock_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), index=True, nullable=False)
    date = Column(DateTime, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float, nullable=False)
    volume = Column(Float)
    value = Column(Float)  # Transaction value
    frequency = Column(Integer)  # Number of transactions
    created_at = Column(DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_ticker_date', 'ticker', 'date', unique=True),
    )


class Watchlist(Base):
    """User watchlist items."""
    __tablename__ = "watchlist"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), index=True, nullable=False)
    target_price = Column(Float)
    stop_loss = Column(Float)
    note = Column(String(500))
    added_at = Column(DateTime, default=datetime.utcnow)
