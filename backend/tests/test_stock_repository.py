import asyncio
from datetime import datetime

from backend.app.models.stock import StockPrice
from backend.app.services import stock_repository as repo
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


def _seed_prices(db):
    db.add_all([
        StockPrice(ticker="BBCA", date=datetime(2026, 5, 27), open=9, high=10, low=8, close=9.5, volume=100),
        StockPrice(ticker="BBCA", date=datetime(2026, 5, 28), open=9.5, high=11, low=9, close=10.0, volume=150),
        StockPrice(ticker="BBCA", date=datetime(2026, 5, 29), open=10, high=12, low=9.5, close=11.0, volume=200),
    ])


def test_get_history_returns_chronological_points():
    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            _seed_prices(db)
            await db.commit()
            return await repo.get_history_from_db(db, "BBCA", days=365)

    points = asyncio.run(run())
    assert [p.date for p in points] == ["2026-05-27", "2026-05-28", "2026-05-29"]
    assert points[-1].price == 11.0
    assert points[-1].volume == 200.0


def test_get_latest_price_computes_change_from_previous_close():
    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            _seed_prices(db)
            await db.commit()
            return await repo.get_latest_price_from_db(db, "BBCA")

    price = asyncio.run(run())
    assert price is not None
    assert price.current == 11.0
    assert price.previous_close == 10.0
    assert round(price.change, 2) == 1.0
    assert round(price.change_percent, 2) == 10.0


def test_get_latest_price_returns_none_when_empty():
    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            return await repo.get_latest_price_from_db(db, "NONE")

    assert asyncio.run(run()) is None
