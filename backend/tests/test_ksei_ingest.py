"""Unit tests for the KSEI ownership parser and upsert (no network)."""

import asyncio
from datetime import datetime

from backend.app.models.stock import Stock
from backend.app.services.ksei_ingest_service import parse_balance_position, upsert_ownership
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


# Real header + a couple of real-format rows from BalanceposEfek (pipe-delimited).
HEADER = ("Date|Code|Type|Sec. Num|Price|Local IS|Local CP|Local PF|Local IB|"
          "Local ID|Local MF|Local SC|Local FD|Local OT|Total|Foreign IS|Foreign CP|"
          "Foreign PF|Foreign IB|Foreign ID|Foreign MF|Foreign SC|Foreign FD|Foreign OT|Total")
# AADI: shares 7786891760, local total 6956628420, foreign total 830263340
AADI = ("29-MAY-2026|AADI|EQUITY|7786891760|8400|125629378|5015616569|11382725|41|"
        "1702000916|89278593|10714083|1783340|222775|6956628420|1150700|56199789|"
        "64632309|258240261|2516283|362345449|18049143|3479500|63649906|830263340")
# A non-equity row that must be ignored.
BOND = "29-MAY-2026|FR0090|BOND|1000000|100|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0"

SAMPLE = "\n".join([HEADER, AADI, BOND])


def test_parser_computes_foreign_pct_and_skips_non_equity():
    rows = parse_balance_position(SAMPLE)
    assert len(rows) == 1  # bond skipped, header skipped
    r = rows[0]
    assert r["ticker"] == "AADI"
    assert r["shares"] == 7786891760
    assert r["foreign_total"] == 830263340
    # 830263340 / (6956628420 + 830263340) = ~10.66%
    assert 10.5 <= r["foreign_pct"] <= 10.8
    assert round(r["foreign_pct"] + r["local_pct"], 1) == 100.0


def test_parser_empty():
    assert parse_balance_position("") == []
    assert parse_balance_position("garbage no pipes") == []


def test_upsert_only_updates_known_tickers():
    engine, S = make_sqlite_sessionmaker()

    async def go():
        await create_all(engine)
        rows = parse_balance_position(SAMPLE)
        async with S() as db:
            db.add(Stock(ticker="AADI", name="Adaro Andalan", sector="Energy"))
            await db.commit()

            matched = await upsert_ownership(db, rows, datetime(2026, 5, 29))
            assert matched == 1

            from sqlalchemy import select
            s = (await db.execute(select(Stock).where(Stock.ticker == "AADI"))).scalar_one()
            assert 10.5 <= s.foreign_ownership_pct <= 10.8
            assert s.ownership_as_of == datetime(2026, 5, 29)

    asyncio.run(go())
