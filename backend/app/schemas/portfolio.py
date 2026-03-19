"""
Portfolio Pydantic Schemas (v2)

Request and response models for /api/portfolio/* endpoints.
"""

from datetime import date, datetime
from typing import Optional, List, Literal

from pydantic import BaseModel, ConfigDict, field_validator


# ────────────────────────────────────────────────────────────────
# Holdings
# ────────────────────────────────────────────────────────────────

class HoldingCreate(BaseModel):
    ticker: str
    avg_buy_price: int
    current_price: int
    lot: int
    notes: Optional[str] = None

    @field_validator("ticker")
    @classmethod
    def uppercase_ticker(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) > 10 or len(v) == 0:
            raise ValueError("Ticker must be 1-10 characters")
        return v

    @field_validator("avg_buy_price", "current_price")
    @classmethod
    def price_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("lot")
    @classmethod
    def lot_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Lot must be greater than 0")
        return v


class HoldingUpdate(BaseModel):
    avg_buy_price: Optional[int] = None
    current_price: Optional[int] = None
    lot: Optional[int] = None
    notes: Optional[str] = None

    @field_validator("avg_buy_price", "current_price")
    @classmethod
    def price_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("lot")
    @classmethod
    def lot_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Lot must be greater than 0")
        return v


class HoldingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    avg_buy_price: int
    current_price: int
    lot: int
    cost_basis: int
    market_value: int
    unrealized_pnl: int
    unrealized_pct: float
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ────────────────────────────────────────────────────────────────
# Trades
# ────────────────────────────────────────────────────────────────

class TradeCreate(BaseModel):
    ticker: str
    trade_type: Literal["BUY", "SELL"]
    entry_price: int
    exit_price: Optional[int] = None
    lot: int
    strategy: Optional[Literal["Swing", "Scalp", "Breakout", "Value", "Dividen"]] = None
    notes: Optional[str] = None
    trade_date: date

    @field_validator("ticker")
    @classmethod
    def uppercase_ticker(cls, v: str) -> str:
        v = v.strip().upper()
        if len(v) > 10 or len(v) == 0:
            raise ValueError("Ticker must be 1-10 characters")
        return v

    @field_validator("entry_price")
    @classmethod
    def entry_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Entry price must be greater than 0")
        return v

    @field_validator("exit_price")
    @classmethod
    def exit_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Exit price must be greater than 0")
        return v

    @field_validator("lot")
    @classmethod
    def lot_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Lot must be greater than 0")
        return v


class TradeUpdate(BaseModel):
    exit_price: Optional[int] = None
    notes: Optional[str] = None
    strategy: Optional[str] = None

    @field_validator("exit_price")
    @classmethod
    def exit_positive(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("Exit price must be greater than 0")
        return v


class TradeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ticker: str
    trade_type: str
    entry_price: int
    exit_price: Optional[int] = None
    lot: int
    strategy: Optional[str] = None
    notes: Optional[str] = None
    trade_date: date
    realized_pnl: Optional[int] = None
    realized_pct: Optional[float] = None
    status: str
    created_at: datetime


# ────────────────────────────────────────────────────────────────
# Broker Cash
# ────────────────────────────────────────────────────────────────

class CashUpsert(BaseModel):
    cash_balance: int

    @field_validator("cash_balance")
    @classmethod
    def non_negative(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Cash balance cannot be negative")
        return v


class CashResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cash_balance: int
    last_updated: Optional[datetime] = None


# ────────────────────────────────────────────────────────────────
# Computed Aggregates (not stored)
# ────────────────────────────────────────────────────────────────

class PortfolioSummary(BaseModel):
    holdings: List[HoldingResponse]
    cash_balance: int
    holdings_value: int
    total_cost: int
    unrealized_pnl: int
    unrealized_pct: float
    total_portfolio: int


class TradeStats(BaseModel):
    total_trades: int
    closed_trades: int
    open_trades: int
    total_pnl: int
    win_count: int
    loss_count: int
    win_rate: float
