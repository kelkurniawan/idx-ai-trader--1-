"""
Portfolio & Trade Journal Router

All endpoints under /api/portfolio.
Auth: JWT via get_current_user dependency.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sa_func

from ..database import get_db
from ..models.user import User
from ..models.portfolio import PortfolioHolding, TradeJournalEntry, BrokerCash
from ..schemas.portfolio import (
    HoldingCreate, HoldingUpdate, HoldingResponse,
    TradeCreate, TradeUpdate, TradeResponse,
    CashUpsert, CashResponse,
    PortfolioSummary, TradeStats,
)
from ..services.auth_service import get_current_user

router = APIRouter()


# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────

def _compute_holding_fields(avg_buy_price: int, current_price: int, lot: int):
    """Compute derived holding fields from IDX lot math (1 lot = 100 shares)."""
    cost_basis = avg_buy_price * lot * 100
    market_value = current_price * lot * 100
    unrealized_pnl = market_value - cost_basis
    unrealized_pct = (unrealized_pnl / cost_basis * 100) if cost_basis != 0 else 0.0
    return cost_basis, market_value, unrealized_pnl, round(unrealized_pct, 4)


def _compute_trade_pnl(trade_type: str, entry_price: int, exit_price: int, lot: int):
    """Compute realized P&L for a closed trade."""
    if trade_type == "BUY":
        pnl = (exit_price - entry_price) * lot * 100
    else:  # SELL
        pnl = (entry_price - exit_price) * lot * 100
    cost = entry_price * lot * 100
    pct = (pnl / cost * 100) if cost != 0 else 0.0
    return pnl, round(pct, 4)


# ════════════════════════════════════════════════════════════════
# PORTFOLIO SUMMARY
# ════════════════════════════════════════════════════════════════

@router.get("/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full portfolio summary: holdings + cash + computed aggregates."""
    # Holdings
    stmt = (
        select(PortfolioHolding)
        .where(PortfolioHolding.user_id == user.id)
        .order_by(PortfolioHolding.market_value.desc())
    )
    result = await db.execute(stmt)
    holdings = list(result.scalars().all())

    # Cash
    cash_stmt = select(BrokerCash).where(BrokerCash.user_id == user.id)
    cash_result = await db.execute(cash_stmt)
    cash_row = cash_result.scalar_one_or_none()
    cash_balance = cash_row.cash_balance if cash_row else 0

    # Aggregates
    holdings_value = sum(h.market_value for h in holdings)
    total_cost = sum(h.cost_basis for h in holdings)
    unrealized_pnl = holdings_value - total_cost
    unrealized_pct = (unrealized_pnl / total_cost * 100) if total_cost != 0 else 0.0
    total_portfolio = holdings_value + cash_balance

    return PortfolioSummary(
        holdings=[HoldingResponse.model_validate(h) for h in holdings],
        cash_balance=cash_balance,
        holdings_value=holdings_value,
        total_cost=total_cost,
        unrealized_pnl=unrealized_pnl,
        unrealized_pct=round(unrealized_pct, 4),
        total_portfolio=total_portfolio,
    )


# ════════════════════════════════════════════════════════════════
# HOLDINGS CRUD
# ════════════════════════════════════════════════════════════════

@router.get("/holdings", response_model=list[HoldingResponse])
async def list_holdings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List all holdings ordered by market value descending."""
    stmt = (
        select(PortfolioHolding)
        .where(PortfolioHolding.user_id == user.id)
        .order_by(PortfolioHolding.market_value.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("/holdings", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
async def add_holding(
    body: HoldingCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add a holding. If (user_id, ticker) exists, merge using weighted average:
      new_lot  = existing.lot + body.lot
      new_avg  = (existing.avg × existing.lot + body.avg × body.lot) / new_lot
      current_price = body.current_price (latest wins)
    """
    ticker = body.ticker.upper()

    # Check existing
    stmt = select(PortfolioHolding).where(
        PortfolioHolding.user_id == user.id,
        PortfolioHolding.ticker == ticker,
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        # Weighted average merge
        total_lot = existing.lot + body.lot
        merged_avg = round(
            (existing.avg_buy_price * existing.lot + body.avg_buy_price * body.lot) / total_lot
        )
        merged_current = body.current_price

        existing.lot = total_lot
        existing.avg_buy_price = merged_avg
        existing.current_price = merged_current

        cost_basis, market_value, unrealized_pnl, unrealized_pct = _compute_holding_fields(
            merged_avg, merged_current, total_lot
        )
        existing.cost_basis = cost_basis
        existing.market_value = market_value
        existing.unrealized_pnl = unrealized_pnl
        existing.unrealized_pct = unrealized_pct

        if body.notes is not None:
            existing.notes = body.notes

        await db.commit()
        await db.refresh(existing)
        return existing

    # New row
    cost_basis, market_value, unrealized_pnl, unrealized_pct = _compute_holding_fields(
        body.avg_buy_price, body.current_price, body.lot
    )
    holding = PortfolioHolding(
        user_id=user.id,
        ticker=ticker,
        avg_buy_price=body.avg_buy_price,
        current_price=body.current_price,
        lot=body.lot,
        cost_basis=cost_basis,
        market_value=market_value,
        unrealized_pnl=unrealized_pnl,
        unrealized_pct=unrealized_pct,
        notes=body.notes,
    )
    db.add(holding)
    await db.commit()
    await db.refresh(holding)
    return holding


@router.put("/holdings/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    holding_id: int,
    body: HoldingUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Partial update of a holding. Recomputes derived fields."""
    stmt = select(PortfolioHolding).where(
        PortfolioHolding.id == holding_id,
        PortfolioHolding.user_id == user.id,
    )
    result = await db.execute(stmt)
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

    if body.avg_buy_price is not None:
        holding.avg_buy_price = body.avg_buy_price
    if body.current_price is not None:
        holding.current_price = body.current_price
    if body.lot is not None:
        holding.lot = body.lot
    if body.notes is not None:
        holding.notes = body.notes

    cost_basis, market_value, unrealized_pnl, unrealized_pct = _compute_holding_fields(
        holding.avg_buy_price, holding.current_price, holding.lot
    )
    holding.cost_basis = cost_basis
    holding.market_value = market_value
    holding.unrealized_pnl = unrealized_pnl
    holding.unrealized_pct = unrealized_pct

    await db.commit()
    await db.refresh(holding)
    return holding


@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_holding(
    holding_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a holding."""
    stmt = select(PortfolioHolding).where(
        PortfolioHolding.id == holding_id,
        PortfolioHolding.user_id == user.id,
    )
    result = await db.execute(stmt)
    holding = result.scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Holding not found")

    await db.delete(holding)
    await db.commit()


# ════════════════════════════════════════════════════════════════
# BROKER CASH
# ════════════════════════════════════════════════════════════════

@router.get("/cash", response_model=CashResponse)
async def get_cash(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get broker cash balance."""
    stmt = select(BrokerCash).where(BrokerCash.user_id == user.id)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if not row:
        return CashResponse(cash_balance=0, last_updated=None)
    return row


@router.put("/cash", response_model=CashResponse)
async def upsert_cash(
    body: CashUpsert,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upsert broker cash balance (one row per user)."""
    stmt = select(BrokerCash).where(BrokerCash.user_id == user.id)
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()

    if row:
        row.cash_balance = body.cash_balance
        # onupdate will handle last_updated
    else:
        row = BrokerCash(user_id=user.id, cash_balance=body.cash_balance)
        db.add(row)

    await db.commit()
    await db.refresh(row)
    return row


# ════════════════════════════════════════════════════════════════
# TRADE JOURNAL CRUD
# ════════════════════════════════════════════════════════════════

@router.get("/trades", response_model=list[TradeResponse])
async def list_trades(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    trade_status: Optional[str] = Query(None, alias="status"),
    ticker: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List trade journal entries with optional filters."""
    stmt = select(TradeJournalEntry).where(TradeJournalEntry.user_id == user.id)

    if trade_status:
        stmt = stmt.where(TradeJournalEntry.status == trade_status.upper())
    if ticker:
        stmt = stmt.where(TradeJournalEntry.ticker == ticker.upper())

    stmt = stmt.order_by(
        TradeJournalEntry.trade_date.desc(),
        TradeJournalEntry.created_at.desc(),
    ).offset(offset).limit(limit)

    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/trades/stats", response_model=TradeStats)
async def get_trade_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate trade statistics."""
    stmt = select(TradeJournalEntry).where(TradeJournalEntry.user_id == user.id)
    result = await db.execute(stmt)
    trades = list(result.scalars().all())

    total_trades = len(trades)
    closed = [t for t in trades if t.status == "CLOSED"]
    open_trades = total_trades - len(closed)

    total_pnl = sum(t.realized_pnl or 0 for t in closed)
    win_count = sum(1 for t in closed if (t.realized_pnl or 0) > 0)
    loss_count = sum(1 for t in closed if (t.realized_pnl or 0) < 0)
    win_rate = (win_count / len(closed) * 100) if closed else 0.0

    return TradeStats(
        total_trades=total_trades,
        closed_trades=len(closed),
        open_trades=open_trades,
        total_pnl=total_pnl,
        win_count=win_count,
        loss_count=loss_count,
        win_rate=round(win_rate, 2),
    )


@router.post("/trades", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
async def add_trade(
    body: TradeCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log a new trade entry."""
    realized_pnl = None
    realized_pct = None
    trade_status = "OPEN"

    if body.exit_price is not None:
        realized_pnl, realized_pct = _compute_trade_pnl(
            body.trade_type, body.entry_price, body.exit_price, body.lot
        )
        trade_status = "CLOSED"

    trade = TradeJournalEntry(
        user_id=user.id,
        ticker=body.ticker.upper(),
        trade_type=body.trade_type,
        entry_price=body.entry_price,
        exit_price=body.exit_price,
        lot=body.lot,
        strategy=body.strategy,
        notes=body.notes,
        trade_date=body.trade_date,
        realized_pnl=realized_pnl,
        realized_pct=realized_pct,
        status=trade_status,
    )
    db.add(trade)
    await db.commit()
    await db.refresh(trade)
    return trade


@router.put("/trades/{trade_id}", response_model=TradeResponse)
async def update_trade(
    trade_id: int,
    body: TradeUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a trade entry. Closing an open trade recomputes PnL."""
    stmt = select(TradeJournalEntry).where(
        TradeJournalEntry.id == trade_id,
        TradeJournalEntry.user_id == user.id,
    )
    result = await db.execute(stmt)
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")

    if body.notes is not None:
        trade.notes = body.notes
    if body.strategy is not None:
        trade.strategy = body.strategy
    if body.exit_price is not None:
        trade.exit_price = body.exit_price

    # If exit_price now present and trade was open, close it
    if trade.exit_price is not None and trade.status == "OPEN":
        pnl, pct = _compute_trade_pnl(
            trade.trade_type, trade.entry_price, trade.exit_price, trade.lot
        )
        trade.realized_pnl = pnl
        trade.realized_pct = pct
        trade.status = "CLOSED"

    await db.commit()
    await db.refresh(trade)
    return trade


@router.delete("/trades/{trade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trade(
    trade_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a trade entry."""
    stmt = select(TradeJournalEntry).where(
        TradeJournalEntry.id == trade_id,
        TradeJournalEntry.user_id == user.id,
    )
    result = await db.execute(stmt)
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trade not found")

    await db.delete(trade)
    await db.commit()
