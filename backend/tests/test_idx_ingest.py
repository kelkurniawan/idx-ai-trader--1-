"""Unit tests for the IDX EOD ingest parser and upsert (no network)."""

import asyncio
from datetime import datetime

from backend.app.models.stock import Stock, StockPrice
from backend.app.services.idx_ingest_service import parse_stock_summary, upsert_idx_rows
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


# A faithful slice of the real IDX GetStockSummary response shape.
SAMPLE_PAYLOAD = {
    "draw": 0,
    "recordsTotal": 3,
    "data": [
        {
            "StockCode": "BBCA", "StockName": "Bank Central Asia Tbk.",
            "Date": "2026-05-29T00:00:00",
            "OpenPrice": 9500, "High": 9600, "Low": 9450, "Close": 9550,
            "Volume": 12345600, "Value": 117800000000, "Frequency": 23456,
            "ForeignBuy": 50000000, "ForeignSell": 30000000,
        },
        {
            "StockCode": "TLKM", "StockName": "Telkom Indonesia (Persero) Tbk.",
            "Date": "2026-05-29T00:00:00",
            "OpenPrice": 3000, "High": 3050, "Low": 2980, "Close": 3020,
            "Volume": 9876500, "Value": 29800000000, "Frequency": 11122,
            "ForeignBuy": 0, "ForeignSell": 0,
        },
        {
            # Suspended / no-trade row: Close 0 must be skipped.
            "StockCode": "DEAD", "StockName": "No Trade Tbk.",
            "Date": "2026-05-29T00:00:00",
            "OpenPrice": 0, "High": 0, "Low": 0, "Close": 0,
            "Volume": 0, "Value": 0, "Frequency": 0,
        },
    ],
}


def test_parse_skips_zero_close_and_maps_fields():
    rows = parse_stock_summary(SAMPLE_PAYLOAD)
    assert len(rows) == 2  # DEAD dropped
    bbca = next(r for r in rows if r["ticker"] == "BBCA")
    assert bbca["close"] == 9550
    assert bbca["open"] == 9500
    assert bbca["value"] == 117800000000
    assert bbca["frequency"] == 23456
    assert bbca["foreign_buy"] == 50000000
    assert bbca["date"] == datetime(2026, 5, 29)


def test_parse_empty_payload():
    assert parse_stock_summary({}) == []
    assert parse_stock_summary({"data": []}) == []


def test_upsert_inserts_then_updates():
    engine, S = make_sqlite_sessionmaker()

    async def go():
        await create_all(engine)
        rows = parse_stock_summary(SAMPLE_PAYLOAD)
        async with S() as db:
            # First write inserts 2 rows + 2 stocks.
            written = await upsert_idx_rows(db, rows)
            assert written == 2
            stocks = (await db.execute(__import__("sqlalchemy").select(Stock))).scalars().all()
            assert {s.ticker for s in stocks} == {"BBCA", "TLKM"}

            # Second write with a changed close updates in place (no duplicate).
            rows[0]["close"] = 9999
            await upsert_idx_rows(db, rows)
            prices = (await db.execute(
                __import__("sqlalchemy").select(StockPrice).where(StockPrice.ticker == "BBCA")
            )).scalars().all()
            assert len(prices) == 1
            assert prices[0].close == 9999
            assert prices[0].frequency == 23456

    asyncio.run(go())
