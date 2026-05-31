import asyncio
from datetime import datetime

from sqlalchemy import select, func

from backend.app.models.stock import Stock, StockPrice
from backend.app.services import price_ingest_service as svc
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


def _rows():
    return [
        {"date": datetime(2026, 5, 28), "open": 10, "high": 11, "low": 9, "close": 10.5, "volume": 100},
        {"date": datetime(2026, 5, 29), "open": 10.5, "high": 12, "low": 10, "close": 11.0, "volume": 200},
    ]


def test_seed_stocks_is_idempotent():
    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            await svc.seed_stocks(db)
            await svc.seed_stocks(db)
            count = (await db.execute(select(func.count()).select_from(Stock))).scalar()
        return count

    count = asyncio.run(run())
    assert count == len(svc.SAMPLE_IDX_STOCKS)


def test_upsert_prices_inserts_then_updates_without_duplicates():
    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            await svc.upsert_prices(db, "BBCA", _rows())
            updated = _rows()
            updated[1]["close"] = 99.0
            await svc.upsert_prices(db, "BBCA", updated)

            total = (await db.execute(
                select(func.count()).select_from(StockPrice).where(StockPrice.ticker == "BBCA")
            )).scalar()
            latest = (await db.execute(
                select(StockPrice.close).where(
                    StockPrice.ticker == "BBCA", StockPrice.date == datetime(2026, 5, 29)
                )
            )).scalar()
        return total, latest

    total, latest = asyncio.run(run())
    assert total == 2
    assert latest == 99.0
