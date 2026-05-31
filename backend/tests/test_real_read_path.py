import asyncio
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.models.stock import StockPrice
from backend.app.routers import stocks as stocks_router
from backend.app.database import get_db
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


def _client_with_db(Session, use_real=True):
    stocks_router.settings.USE_REAL_PRICES = use_real

    async def override_db():
        async with Session() as db:
            yield db

    app = FastAPI()
    app.dependency_overrides[get_db] = override_db
    app.include_router(stocks_router.router, prefix="/api/stocks")
    return TestClient(app)


def test_history_endpoint_returns_db_rows_when_real_prices_on():
    engine, Session = make_sqlite_sessionmaker()

    async def seed():
        await create_all(engine)
        async with Session() as db:
            db.add_all([
                StockPrice(ticker="BBCA", date=datetime(2026, 5, 28), open=9, high=10, low=8, close=9.5, volume=100),
                StockPrice(ticker="BBCA", date=datetime(2026, 5, 29), open=9.5, high=11, low=9, close=10.0, volume=150),
            ])
            await db.commit()

    asyncio.run(seed())
    client = _client_with_db(Session, use_real=True)
    resp = client.get("/api/stocks/BBCA/history?timeframe=1Y&limit=365")
    assert resp.status_code == 200
    body = resp.json()
    assert body[-1]["price"] == 10.0
    assert body[-1]["date"] == "2026-05-29"


def test_history_endpoint_falls_back_to_mock_when_no_db_rows(monkeypatch):
    # BBCA is a curated ticker with no DB rows; on-demand resolve is stubbed to
    # "not found" so it must fall back to the deterministic mock generator
    # (and must NOT hit the real Yahoo network in a unit test).
    async def no_resolve(db, ticker):
        return False

    monkeypatch.setattr(stocks_router.ingest, "resolve_ticker", no_resolve)

    engine, Session = make_sqlite_sessionmaker()
    asyncio.run(create_all(engine))
    client = _client_with_db(Session, use_real=True)
    resp = client.get("/api/stocks/BBCA/history?timeframe=1M&limit=30")
    assert resp.status_code == 200
    assert len(resp.json()) > 0


def test_history_endpoint_resolves_unknown_ticker_on_demand(monkeypatch):
    # A non-curated ticker with no DB rows should be resolved via on-demand
    # ingest, then served from the DB.
    async def fake_resolve(db, ticker):
        db.add(StockPrice(ticker=ticker.upper(), date=datetime(2026, 5, 29),
                          open=1, high=2, low=1, close=1.75, volume=42))
        await db.commit()
        return True

    monkeypatch.setattr(stocks_router.ingest, "resolve_ticker", fake_resolve)

    engine, Session = make_sqlite_sessionmaker()
    asyncio.run(create_all(engine))
    client = _client_with_db(Session, use_real=True)
    resp = client.get("/api/stocks/ZZZZ/history?timeframe=1Y&limit=365")
    assert resp.status_code == 200
    body = resp.json()
    assert body[-1]["price"] == 1.75
    assert body[-1]["date"] == "2026-05-29"
