import asyncio
from datetime import datetime

from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.models.stock import Stock, StockPrice
from backend.app.routers import market_analyzer as ma
from backend.app.database import get_db
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


def _client(Session, use_real=True):
    ma.settings.USE_REAL_PRICES = use_real

    async def override_db():
        async with Session() as db:
            yield db

    app = FastAPI()
    app.dependency_overrides[get_db] = override_db
    app.include_router(ma.router, prefix="/api/analyze")
    return TestClient(app)


def _seed(Session, ticker, sector="Financials"):
    async def go():
        engine, S = Session
        await create_all(engine)
        async with S() as db:
            db.add(Stock(ticker=ticker, name=f"{ticker} Tbk", sector=sector))
            db.add_all([
                StockPrice(ticker=ticker, date=datetime(2026, 5, d),
                           open=9, high=10, low=8, close=9.5 + d * 0.01, volume=100)
                for d in range(1, 29)
            ])
            await db.commit()
    asyncio.run(go())


def test_complete_analysis_returns_full_payload_for_curated_sector():
    engine, S = make_sqlite_sessionmaker()
    _seed((engine, S), "BBCA", sector="Financials")
    resp = _client(S).get("/api/analyze/BBCA")
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ticker"] == "BBCA"
    assert body["data_source"] == "live"
    assert body["signal"]["action"]
    assert body["fundamentals"] is not None
    assert body["verdict"] is not None


def test_complete_analysis_works_for_on_demand_sector():
    # On-demand-resolved tickers get sector="IDX"; the fundamental generators
    # must not crash on an unknown sector.
    engine, S = make_sqlite_sessionmaker()
    _seed((engine, S), "TPIA", sector="IDX")
    resp = _client(S).get("/api/analyze/TPIA")
    assert resp.status_code == 200, resp.text
    assert resp.json()["ticker"] == "TPIA"
