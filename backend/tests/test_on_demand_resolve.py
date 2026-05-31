import asyncio
from datetime import datetime

from sqlalchemy import select, func

from backend.app.models.stock import Stock, StockPrice
from backend.app.services import price_ingest_service as svc
from backend.app.services import stock_repository as repo
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


def test_resolve_ticker_persists_prices_and_stock_row(monkeypatch):
    async def fake_fetch(ticker, range_="1y"):
        # Pretend Yahoo has data for "WOOD" but not for "FAKE".
        if ticker == "WOOD":
            return [{"date": datetime(2026, 5, 29), "open": 1, "high": 2, "low": 1, "close": 1.5, "volume": 10}]
        return []

    monkeypatch.setattr(svc, "fetch_yahoo_history", fake_fetch)

    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            ok_known = await svc.resolve_ticker(db, "WOOD")
            ok_unknown = await svc.resolve_ticker(db, "FAKE")
            prices = (await db.execute(
                select(func.count()).select_from(StockPrice).where(StockPrice.ticker == "WOOD")
            )).scalar()
            stock = (await db.execute(select(Stock).where(Stock.ticker == "WOOD"))).scalar_one_or_none()
            profile = await repo.get_profile_from_db(db, "WOOD")
        return ok_known, ok_unknown, prices, stock, profile

    ok_known, ok_unknown, prices, stock, profile = asyncio.run(run())
    assert ok_known is True        # Yahoo had data -> resolved
    assert ok_unknown is False     # Yahoo had nothing -> not a valid ticker
    assert prices == 1             # prices persisted
    assert stock is not None       # a stocks row was created
    assert profile is not None and profile.ticker == "WOOD"


def test_ensure_stock_row_is_idempotent(monkeypatch):
    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            await svc.ensure_stock_row(db, "ABCD", name="ABCD Tbk", sector="Energy")
            await svc.ensure_stock_row(db, "ABCD")  # second call must not duplicate
            count = (await db.execute(
                select(func.count()).select_from(Stock).where(Stock.ticker == "ABCD")
            )).scalar()
            row = (await db.execute(select(Stock).where(Stock.ticker == "ABCD"))).scalar_one()
        return count, row

    count, row = asyncio.run(run())
    assert count == 1
    assert row.name == "ABCD Tbk"  # original values preserved


def test_get_profile_from_db_returns_none_when_missing():
    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            return await repo.get_profile_from_db(db, "NONE")

    assert asyncio.run(run()) is None
