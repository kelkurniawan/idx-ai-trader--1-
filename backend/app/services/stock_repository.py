"""Read helpers for real stock data stored in `stock_prices`."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.stock import Stock, StockPrice
from ..schemas.stock import StockDataPoint, RealTimePrice, StockProfile


async def get_profile_from_db(db: AsyncSession, ticker: str) -> Optional[StockProfile]:
    """Return a StockProfile from the `stocks` table, or None if not stored."""
    ticker = ticker.upper()
    row = (
        await db.execute(select(Stock).where(Stock.ticker == ticker))
    ).scalar_one_or_none()
    if not row:
        return None
    return StockProfile(ticker=row.ticker, name=row.name, sector=row.sector or "IDX")


async def get_all_profiles_from_db(db: AsyncSession) -> list[StockProfile]:
    """Return every stored stock as a StockProfile (curated + on-demand)."""
    rows = (await db.execute(select(Stock).order_by(Stock.ticker))).scalars().all()
    return [
        StockProfile(ticker=r.ticker, name=r.name, sector=r.sector or "IDX")
        for r in rows
    ]


async def get_history_from_db(db: AsyncSession, ticker: str, days: int = 365) -> list[StockDataPoint]:
    """Return up to `days` most-recent daily points, oldest-first."""
    ticker = ticker.upper()
    result = await db.execute(
        select(StockPrice)
        .where(StockPrice.ticker == ticker)
        .order_by(StockPrice.date.desc())
        .limit(days)
    )
    rows = list(result.scalars().all())
    rows.reverse()  # chronological
    return [
        StockDataPoint(
            date=r.date.strftime("%Y-%m-%d"),
            price=float(r.close),
            volume=float(r.volume or 0),
        )
        for r in rows
    ]


async def get_latest_price_from_db(db: AsyncSession, ticker: str) -> Optional[RealTimePrice]:
    """Return the latest close as a RealTimePrice, change computed vs the prior close."""
    ticker = ticker.upper()
    result = await db.execute(
        select(StockPrice)
        .where(StockPrice.ticker == ticker)
        .order_by(StockPrice.date.desc())
        .limit(2)
    )
    rows = list(result.scalars().all())
    if not rows:
        return None
    latest = rows[0]
    prev_close = float(rows[1].close) if len(rows) > 1 else float(latest.open or latest.close)
    change = float(latest.close) - prev_close
    change_percent = (change / prev_close * 100) if prev_close else 0.0
    return RealTimePrice(
        current=float(latest.close),
        change=round(change, 2),
        change_percent=round(change_percent, 2),
        open=float(latest.open) if latest.open is not None else None,
        high=float(latest.high) if latest.high is not None else None,
        low=float(latest.low) if latest.low is not None else None,
        previous_close=prev_close,
        volume=float(latest.volume or 0),
        last_updated=latest.date,
    )
