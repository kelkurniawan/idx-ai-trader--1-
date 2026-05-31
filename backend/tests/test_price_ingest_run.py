import asyncio
from datetime import datetime

from sqlalchemy import select, func

from backend.app.models.stock import StockPrice
from backend.app.services import price_ingest_service as svc
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


def test_ingest_all_writes_prices_and_isolates_failures(monkeypatch):
    monkeypatch.setattr(svc, "SAMPLE_IDX_STOCKS", [
        {"ticker": "AAAA", "name": "A", "sector": "Financials", "base_price": 1000},
        {"ticker": "BBBB", "name": "B", "sector": "Energy", "base_price": 2000},
    ])

    async def fake_fetch(ticker, range_="1y"):
        if ticker == "AAAA":
            return [{"date": datetime(2026, 5, 29), "open": 1, "high": 2, "low": 1, "close": 1.5, "volume": 10}]
        return []

    monkeypatch.setattr(svc, "fetch_yahoo_history", fake_fetch)
    monkeypatch.setattr(svc.asyncio, "sleep", lambda *_a, **_k: asyncio.sleep(0))

    async def run():
        engine, Session = make_sqlite_sessionmaker()
        await create_all(engine)
        async with Session() as db:
            summary = await svc.ingest_all(db)
            rows = (await db.execute(select(func.count()).select_from(StockPrice))).scalar()
        return summary, rows

    summary, rows = asyncio.run(run())
    assert summary["updated"] == 1
    assert summary["failed"] == 1
    assert "BBBB" in summary["failed_tickers"]
    assert rows == 1
