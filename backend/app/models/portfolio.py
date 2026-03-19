"""
Portfolio & Trade Journal Models

SQLAlchemy models for manual portfolio tracking:
  - PortfolioHolding: one row per ticker per user (current open positions)
  - TradeJournal: individual trade log entries for performance tracking
  - BrokerCash: user's uninvested cash balance in broker account
"""

from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, BigInteger, Numeric, Text, Date, DateTime,
    ForeignKey, UniqueConstraint, CheckConstraint, func,
)
from sqlalchemy.orm import relationship

from ..database import Base


class PortfolioHolding(Base):
    """One row per ticker per user. Represents current open positions."""
    __tablename__ = "portfolio_holdings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticker = Column(String(10), nullable=False)
    avg_buy_price = Column(Integer, nullable=False)
    current_price = Column(Integer, nullable=False)
    lot = Column(Integer, nullable=False)
    cost_basis = Column(Integer, nullable=False)
    market_value = Column(Integer, nullable=False)
    unrealized_pnl = Column(Integer, nullable=False)
    unrealized_pct = Column(Numeric(8, 4), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("user_id", "ticker", name="uq_user_ticker"),
        CheckConstraint("lot > 0", name="ck_holding_lot_positive"),
    )


class TradeJournalEntry(Base):
    """Log of individual trade entries for performance tracking."""
    __tablename__ = "trade_journal"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    ticker = Column(String(10), nullable=False)
    trade_type = Column(String(4), nullable=False)
    entry_price = Column(Integer, nullable=False)
    exit_price = Column(Integer, nullable=True)
    lot = Column(Integer, nullable=False)
    strategy = Column(String(20), nullable=True)
    notes = Column(Text, nullable=True)
    trade_date = Column(Date, nullable=False)
    realized_pnl = Column(Integer, nullable=True)
    realized_pct = Column(Numeric(8, 4), nullable=True)
    status = Column(String(6), nullable=False, server_default="OPEN")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("lot > 0", name="ck_trade_lot_positive"),
        CheckConstraint("trade_type IN ('BUY', 'SELL')", name="ck_trade_type"),
        CheckConstraint("status IN ('OPEN', 'CLOSED')", name="ck_trade_status"),
    )


class BrokerCash(Base):
    """User's uninvested cash balance sitting in broker account."""
    __tablename__ = "broker_cash"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    cash_balance = Column(BigInteger, nullable=False, server_default="0")
    last_updated = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
