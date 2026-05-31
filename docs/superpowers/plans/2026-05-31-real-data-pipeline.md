# Real Data Pipeline (Stocks + News) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mock data with real data — daily Yahoo Finance stock-price ingest feeding real technicals/signals, plus the already-real news pipeline wired with a manual refresh and "new articles" indicator — all triggered externally (GitHub Actions) to survive Render free-tier sleep.

**Architecture:** A new Python ingest service fetches 1 year of daily OHLCV from Yahoo Finance into the existing `stock_prices` table; the market-analysis read path is switched from the mock RNG to the DB (with Yahoo→Gemini→mock fallback per ticker). A secret-guarded `/api/internal/refresh-prices` endpoint and the existing Node `/api/news/agent/trigger` are fired by a free GitHub Actions cron. The frontend News tab gets a manual refresh and a "new articles available" banner.

**Tech Stack:** FastAPI + async SQLAlchemy (asyncpg/aiosqlite), `httpx`, Pydantic; Node/Express + Prisma + BullMQ; React/Vite; GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-05-31-real-data-pipeline-design.md`

**Conventions (verified):**
- Run all Python tests: `python -m pytest backend/tests` (from repo root). Single test: `python -m pytest backend/tests/test_x.py::test_y -v`.
- Tests import via `from backend.app...` (see `backend/tests/test_production_readiness.py`).
- `market_data_service` is a **sync** singleton (`backend/app/services/market_data.py`). Routers are `async` but currently call its sync methods and never touch the DB.
- DB models: `Stock`, `StockPrice` (unique `(ticker, date)`), `AnalysisCache` in `backend/app/models/`. Async session: `AsyncSessionLocal` / `get_db` in `backend/app/database.py`.
- `pytest-asyncio` is NOT installed — async DB tests use `asyncio.run(...)` inside sync test functions with a `StaticPool` in-memory aiosqlite engine (helper provided in Task 3).

---

## Phase 0 — Shared config

### Task 0: Add config flags

**Files:**
- Modify: `backend/app/config.py`
- Test: `backend/tests/test_real_data_config.py` (create)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_real_data_config.py
from backend.app.config import Settings


def _base(**overrides):
    values = {"JWT_SECRET_KEY": "x" * 64, "MFA_ENCRYPTION_KEY": "y" * 64}
    values.update(overrides)
    return Settings(**values)


def test_real_data_flags_have_safe_defaults():
    s = _base()
    assert s.USE_REAL_PRICES is False
    assert s.INTERNAL_API_SECRET == ""


def test_real_data_flags_read_from_env():
    s = _base(USE_REAL_PRICES=True, INTERNAL_API_SECRET="topsecret")
    assert s.USE_REAL_PRICES is True
    assert s.INTERNAL_API_SECRET == "topsecret"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_real_data_config.py -v`
Expected: FAIL — `AttributeError`/validation error (fields don't exist yet).

- [ ] **Step 3: Add the settings fields**

In `backend/app/config.py`, inside `class Settings(BaseSettings)`, add after the `USE_REAL_FUNDAMENTALS` block (around line 48):

```python
    # Real Data Pipeline
    USE_REAL_PRICES: bool = False          # When True, read prices from DB/Yahoo instead of mock
    INTERNAL_API_SECRET: str = ""          # Shared secret guarding internal trigger endpoints
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_real_data_config.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/config.py backend/tests/test_real_data_config.py
git commit -m "feat: add USE_REAL_PRICES and INTERNAL_API_SECRET config flags"
```

---

## Phase 1 — Stock price ingest (backend)

### Task 1: Parse Yahoo Finance chart payload (pure function)

**Files:**
- Create: `backend/app/services/price_ingest_service.py`
- Test: `backend/tests/test_price_ingest_parse.py` (create)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_price_ingest_parse.py
from datetime import datetime

from backend.app.services.price_ingest_service import parse_yahoo_chart


def _payload():
    # Two days; second day has a null close that must be skipped.
    return {
        "chart": {
            "error": None,
            "result": [
                {
                    "timestamp": [1_700_000_000, 1_700_086_400, 1_700_172_800],
                    "indicators": {
                        "quote": [
                            {
                                "open":   [100.0, 102.0, 104.0],
                                "high":   [105.0, 106.0, 108.0],
                                "low":    [ 99.0, 101.0, 103.0],
                                "close":  [104.0, None,  107.0],
                                "volume": [1000,  2000,  3000],
                            }
                        ]
                    },
                }
            ],
        }
    }


def test_parse_yahoo_chart_returns_rows_skipping_nulls():
    rows = parse_yahoo_chart(_payload())
    assert len(rows) == 2  # middle row dropped (null close)
    first = rows[0]
    assert isinstance(first["date"], datetime)
    assert first["open"] == 100.0
    assert first["high"] == 105.0
    assert first["low"] == 99.0
    assert first["close"] == 104.0
    assert first["volume"] == 1000.0


def test_parse_yahoo_chart_handles_empty_result():
    assert parse_yahoo_chart({"chart": {"error": None, "result": []}}) == []
    assert parse_yahoo_chart({"chart": {"error": "Not Found", "result": None}}) == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_price_ingest_parse.py -v`
Expected: FAIL — module `price_ingest_service` does not exist.

- [ ] **Step 3: Create the parser**

```python
# backend/app/services/price_ingest_service.py
"""
Price Ingest Service

Fetches real IDX daily OHLCV from Yahoo Finance and stores it in the
`stock_prices` table. Pure parsing is separated from I/O for testability.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.stock import Stock, StockPrice
from ..services.market_data import SAMPLE_IDX_STOCKS

logger = logging.getLogger(__name__)
settings = get_settings()

YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"


def parse_yahoo_chart(payload: dict) -> list[dict]:
    """Convert a Yahoo chart JSON payload into a list of OHLCV row dicts.

    Rows with a null close are skipped (non-trading days / bad data).
    Returns [] for empty or error payloads.
    """
    chart = (payload or {}).get("chart") or {}
    results = chart.get("result") or []
    if not results:
        return []

    result = results[0]
    timestamps = result.get("timestamp") or []
    quote_list = ((result.get("indicators") or {}).get("quote")) or []
    if not timestamps or not quote_list:
        return []

    quote = quote_list[0]
    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []

    rows: list[dict] = []
    for i, ts in enumerate(timestamps):
        close = closes[i] if i < len(closes) else None
        if close is None:
            continue
        rows.append(
            {
                "date": datetime.fromtimestamp(ts, tz=timezone.utc).replace(tzinfo=None),
                "open": float(opens[i]) if i < len(opens) and opens[i] is not None else float(close),
                "high": float(highs[i]) if i < len(highs) and highs[i] is not None else float(close),
                "low": float(lows[i]) if i < len(lows) and lows[i] is not None else float(close),
                "close": float(close),
                "volume": float(volumes[i]) if i < len(volumes) and volumes[i] is not None else 0.0,
            }
        )
    return rows
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_price_ingest_parse.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/price_ingest_service.py backend/tests/test_price_ingest_parse.py
git commit -m "feat: add Yahoo Finance chart parser for price ingest"
```

---

### Task 2: Fetch a ticker's history over HTTP

**Files:**
- Modify: `backend/app/services/price_ingest_service.py`
- Test: `backend/tests/test_price_ingest_fetch.py` (create)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_price_ingest_fetch.py
import asyncio

import httpx

from backend.app.services import price_ingest_service as svc


def test_fetch_yahoo_history_builds_jk_symbol_and_parses(monkeypatch):
    captured = {}

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "chart": {
                    "error": None,
                    "result": [
                        {
                            "timestamp": [1_700_000_000],
                            "indicators": {"quote": [{
                                "open": [10.0], "high": [11.0], "low": [9.0],
                                "close": [10.5], "volume": [123],
                            }]},
                        }
                    ],
                }
            }

        def raise_for_status(self):
            return None

    class FakeClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, url, params=None, headers=None):
            captured["url"] = url
            captured["params"] = params
            return FakeResponse()

    monkeypatch.setattr(svc.httpx, "AsyncClient", FakeClient)

    rows = asyncio.run(svc.fetch_yahoo_history("BBCA"))
    assert captured["url"].endswith("/BBCA.JK")
    assert captured["params"]["range"] == "1y"
    assert captured["params"]["interval"] == "1d"
    assert len(rows) == 1
    assert rows[0]["close"] == 10.5


def test_fetch_yahoo_history_returns_empty_on_http_error(monkeypatch):
    class BoomClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *a):
            return False

        async def get(self, *a, **k):
            raise httpx.ConnectError("boom")

    monkeypatch.setattr(svc.httpx, "AsyncClient", BoomClient)
    rows = asyncio.run(svc.fetch_yahoo_history("XXXX"))
    assert rows == []
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_price_ingest_fetch.py -v`
Expected: FAIL — `fetch_yahoo_history` not defined.

- [ ] **Step 3: Add the fetch function**

Append to `backend/app/services/price_ingest_service.py`:

```python
async def fetch_yahoo_history(ticker: str, range_: str = "1y") -> list[dict]:
    """Fetch daily OHLCV rows for an IDX ticker from Yahoo Finance.

    IDX tickers are suffixed with ".JK" on Yahoo (e.g. BBCA -> BBCA.JK).
    Returns [] on any network/parse failure (caller decides fallback).
    """
    symbol = f"{ticker.upper()}.JK"
    url = YAHOO_CHART_URL.format(symbol=symbol)
    params = {"range": range_, "interval": "1d"}
    headers = {"User-Agent": "Mozilla/5.0 (compatible; SahamGueBot/1.0)"}
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            return parse_yahoo_chart(resp.json())
    except Exception as exc:  # noqa: BLE001 - any failure -> empty, caller falls back
        logger.warning("[PriceIngest] Yahoo fetch failed for %s: %s", symbol, exc)
        return []
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_price_ingest_fetch.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/price_ingest_service.py backend/tests/test_price_ingest_fetch.py
git commit -m "feat: fetch IDX ticker history from Yahoo Finance (.JK)"
```

---

### Task 3: Seed `stocks` and upsert `stock_prices` (DB)

**Files:**
- Modify: `backend/app/services/price_ingest_service.py`
- Create: `backend/tests/conftest.py` (in-memory async DB helper)
- Test: `backend/tests/test_price_ingest_db.py` (create)

- [ ] **Step 1: Write the async DB test helper**

```python
# backend/tests/conftest.py
"""Shared test fixtures: an isolated in-memory async SQLite engine."""

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.app.database import Base
# Import models so their tables register on Base.metadata
from backend.app import models  # noqa: F401


def make_sqlite_sessionmaker():
    """Return (engine, sessionmaker) backed by a shared in-memory SQLite DB."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    return engine, sessionmaker


async def create_all(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

- [ ] **Step 2: Write the failing test**

```python
# backend/tests/test_price_ingest_db.py
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
            await svc.seed_stocks(db)  # second run must not duplicate
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
            # Re-run with an updated close on the second date
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
    assert total == 2          # no duplicate rows for the same (ticker, date)
    assert latest == 99.0      # existing row updated in place
```

- [ ] **Step 3: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_price_ingest_db.py -v`
Expected: FAIL — `seed_stocks`/`upsert_prices` not defined.

- [ ] **Step 4: Add seed + upsert functions**

Append to `backend/app/services/price_ingest_service.py`:

```python
async def seed_stocks(db: AsyncSession) -> int:
    """Insert any missing tickers from SAMPLE_IDX_STOCKS into `stocks`. Idempotent."""
    existing = set(
        (await db.execute(select(Stock.ticker))).scalars().all()
    )
    added = 0
    for s in SAMPLE_IDX_STOCKS:
        if s["ticker"] in existing:
            continue
        db.add(Stock(ticker=s["ticker"], name=s["name"], sector=s["sector"]))
        added += 1
    await db.commit()
    return added


async def upsert_prices(db: AsyncSession, ticker: str, rows: list[dict]) -> int:
    """Insert new (ticker, date) rows and update existing ones in place. Idempotent."""
    ticker = ticker.upper()
    existing_dates = {
        d for (d,) in (
            await db.execute(
                select(StockPrice.date).where(StockPrice.ticker == ticker)
            )
        ).all()
    }
    written = 0
    for r in rows:
        if r["date"] in existing_dates:
            existing = (await db.execute(
                select(StockPrice).where(
                    StockPrice.ticker == ticker, StockPrice.date == r["date"]
                )
            )).scalar_one()
            existing.open = r["open"]
            existing.high = r["high"]
            existing.low = r["low"]
            existing.close = r["close"]
            existing.volume = r["volume"]
        else:
            db.add(StockPrice(
                ticker=ticker, date=r["date"], open=r["open"], high=r["high"],
                low=r["low"], close=r["close"], volume=r["volume"],
            ))
        written += 1
    await db.commit()
    return written
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_price_ingest_db.py -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/price_ingest_service.py backend/tests/conftest.py backend/tests/test_price_ingest_db.py
git commit -m "feat: seed stocks and idempotently upsert stock_prices"
```

---

### Task 4: Orchestrate the full ingest run

**Files:**
- Modify: `backend/app/services/price_ingest_service.py`
- Test: `backend/tests/test_price_ingest_run.py` (create)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_price_ingest_run.py
import asyncio
from datetime import datetime

from sqlalchemy import select, func

from backend.app.models.stock import StockPrice
from backend.app.services import price_ingest_service as svc
from backend.tests.conftest import make_sqlite_sessionmaker, create_all


def test_ingest_all_writes_prices_and_isolates_failures(monkeypatch):
    # Only two fake tickers; one fetch succeeds, one returns [].
    monkeypatch.setattr(svc, "SAMPLE_IDX_STOCKS", [
        {"ticker": "AAAA", "name": "A", "sector": "Financials", "base_price": 1000},
        {"ticker": "BBBB", "name": "B", "sector": "Energy", "base_price": 2000},
    ])

    async def fake_fetch(ticker, range_="1y"):
        if ticker == "AAAA":
            return [{"date": datetime(2026, 5, 29), "open": 1, "high": 2, "low": 1, "close": 1.5, "volume": 10}]
        return []  # BBBB "fails"

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_price_ingest_run.py -v`
Expected: FAIL — `ingest_all` not defined.

- [ ] **Step 3: Add the orchestrator**

Append to `backend/app/services/price_ingest_service.py`:

```python
async def ingest_one(db: AsyncSession, ticker: str) -> int:
    """Fetch + upsert a single ticker. Returns rows written (0 if Yahoo failed)."""
    rows = await fetch_yahoo_history(ticker)
    if not rows:
        return 0
    return await upsert_prices(db, ticker, rows)


async def ingest_all(db: AsyncSession, throttle_seconds: float = 0.3) -> dict:
    """Seed stocks, then fetch + upsert every ticker. Per-ticker failures are isolated."""
    await seed_stocks(db)
    updated = 0
    failed_tickers: list[str] = []
    for s in SAMPLE_IDX_STOCKS:
        ticker = s["ticker"]
        try:
            written = await ingest_one(db, ticker)
            if written > 0:
                updated += 1
            else:
                failed_tickers.append(ticker)
        except Exception as exc:  # noqa: BLE001
            logger.warning("[PriceIngest] ticker %s failed: %s", ticker, exc)
            failed_tickers.append(ticker)
        await asyncio.sleep(throttle_seconds)

    summary = {
        "updated": updated,
        "failed": len(failed_tickers),
        "failed_tickers": failed_tickers,
        "total": len(SAMPLE_IDX_STOCKS),
    }
    logger.info("[PriceIngest] run complete: %s", summary)
    return summary
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_price_ingest_run.py -v`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/price_ingest_service.py backend/tests/test_price_ingest_run.py
git commit -m "feat: orchestrate full Yahoo price ingest with per-ticker isolation"
```

---

### Task 5: DB-backed read helpers

**Files:**
- Create: `backend/app/services/stock_repository.py`
- Test: `backend/tests/test_stock_repository.py` (create)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_stock_repository.py
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_stock_repository.py -v`
Expected: FAIL — module `stock_repository` not defined.

- [ ] **Step 3: Create the repository**

```python
# backend/app/services/stock_repository.py
"""Read helpers for real stock data stored in `stock_prices`."""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.stock import StockPrice
from ..schemas.stock import StockDataPoint, RealTimePrice


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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_stock_repository.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/stock_repository.py backend/tests/test_stock_repository.py
git commit -m "feat: add DB-backed stock history and latest-price read helpers"
```

---

## Phase 2 — Triggers (internal endpoint, Node auth, GitHub Actions)

### Task 6: Internal refresh-prices endpoint (secret-guarded)

**Files:**
- Create: `backend/app/routers/internal.py`
- Modify: `backend/app/main.py` (register router)
- Test: `backend/tests/test_internal_router.py` (create)

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_internal_router.py
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.app.routers import internal


def _app(monkeypatch, secret="s3cret"):
    monkeypatch.setattr(internal.settings, "INTERNAL_API_SECRET", secret)

    async def fake_ingest(db):
        return {"updated": 3, "failed": 0, "failed_tickers": [], "total": 3}

    monkeypatch.setattr(internal, "ingest_all", fake_ingest)

    async def fake_db():
        yield None

    app = FastAPI()
    app.dependency_overrides[internal.get_db] = fake_db
    app.include_router(internal.router, prefix="/api/internal")
    return app


def test_refresh_prices_rejects_missing_secret(monkeypatch):
    client = TestClient(_app(monkeypatch))
    resp = client.post("/api/internal/refresh-prices")
    assert resp.status_code == 401


def test_refresh_prices_rejects_wrong_secret(monkeypatch):
    client = TestClient(_app(monkeypatch))
    resp = client.post("/api/internal/refresh-prices", headers={"X-Internal-Secret": "nope"})
    assert resp.status_code == 401


def test_refresh_prices_runs_with_correct_secret(monkeypatch):
    client = TestClient(_app(monkeypatch))
    resp = client.post("/api/internal/refresh-prices", headers={"X-Internal-Secret": "s3cret"})
    assert resp.status_code == 200
    assert resp.json()["updated"] == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_internal_router.py -v`
Expected: FAIL — module `internal` not defined.

- [ ] **Step 3: Create the router**

```python
# backend/app/routers/internal.py
"""Internal trigger endpoints, guarded by INTERNAL_API_SECRET.

Called by the GitHub Actions scheduler (not by browsers).
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..services.price_ingest_service import ingest_all

router = APIRouter()
settings = get_settings()


def _require_internal_secret(x_internal_secret: str | None = Header(default=None)) -> None:
    expected = settings.INTERNAL_API_SECRET
    if not expected or x_internal_secret != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal secret.",
        )


@router.post("/refresh-prices")
async def refresh_prices(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_require_internal_secret),
):
    """Run the daily Yahoo Finance price ingest for all tickers."""
    return await ingest_all(db)
```

- [ ] **Step 4: Register the router in `backend/app/main.py`**

Add to the imports near line 25 (with the other router imports):

```python
from .routers import internal as internal_router
```

Add with the other `app.include_router(...)` calls (after the `admin_ops` line, ~line 313):

```python
app.include_router(internal_router.router, prefix="/api/internal", tags=["Internal"])
```

- [ ] **Step 5: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_internal_router.py -v`
Expected: PASS (3 passed).

- [ ] **Step 6: Run the full suite to confirm nothing regressed**

Run: `python -m pytest backend/tests -q`
Expected: PASS (all green).

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/internal.py backend/app/main.py backend/tests/test_internal_router.py
git commit -m "feat: add secret-guarded /api/internal/refresh-prices endpoint"
```

---

### Task 7: Switch the analysis read path to real data

**Files:**
- Modify: `backend/app/routers/stocks.py`
- Modify: `backend/app/routers/market_analyzer.py`
- Test: `backend/tests/test_real_read_path.py` (create)

This task makes the read endpoints prefer the DB when `USE_REAL_PRICES` is on, falling back to the existing mock generators when a ticker has no stored rows.

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_real_read_path.py
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


def test_history_endpoint_falls_back_to_mock_when_no_db_rows():
    engine, Session = make_sqlite_sessionmaker()
    asyncio.run(create_all(engine))
    client = _client_with_db(Session, use_real=True)
    resp = client.get("/api/stocks/BBCA/history?timeframe=1M&limit=30")
    assert resp.status_code == 200
    assert len(resp.json()) > 0  # mock fallback still serves data
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_real_read_path.py -v`
Expected: FAIL — endpoint still ignores the DB (returns mock dates, not `2026-05-29`).

- [ ] **Step 3: Update `backend/app/routers/stocks.py`**

Replace the entire file with:

```python
"""
Stocks Router

Endpoints for stock data retrieval. When USE_REAL_PRICES is enabled and the
ticker has stored prices, data comes from the `stock_prices` table; otherwise
it falls back to the deterministic mock generators.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..schemas.stock import (
    StockProfile,
    StockDataPoint,
    StockListResponse,
    TimeFrame,
    RealTimePrice,
)
from ..services.market_data import market_data_service
from ..services import stock_repository as repo

router = APIRouter()
settings = get_settings()

_TIMEFRAME_DAYS = {
    TimeFrame.ONE_DAY: 1,
    TimeFrame.ONE_WEEK: 7,
    TimeFrame.ONE_MONTH: 30,
    TimeFrame.THREE_MONTHS: 90,
    TimeFrame.SIX_MONTHS: 180,
    TimeFrame.ONE_YEAR: 365,
    TimeFrame.YEAR_TO_DATE: 365,
}


@router.get("", response_model=StockListResponse)
async def get_all_stocks():
    stocks = market_data_service.get_all_stocks()
    return StockListResponse(stocks=stocks, total=len(stocks))


@router.get("/{ticker}", response_model=StockProfile)
async def get_stock_profile(ticker: str):
    profile = market_data_service.get_stock_profile(ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return profile


@router.get("/{ticker}/price", response_model=RealTimePrice)
async def get_stock_price(ticker: str, db: AsyncSession = Depends(get_db)):
    ticker = ticker.upper()
    if settings.USE_REAL_PRICES:
        live = await repo.get_latest_price_from_db(db, ticker)
        if live:
            return live
    price = market_data_service.get_realtime_price(ticker)
    if not price:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return price


@router.get("/{ticker}/history", response_model=List[StockDataPoint])
async def get_stock_history(
    ticker: str,
    timeframe: TimeFrame = Query(TimeFrame.ONE_MONTH, description="Data timeframe"),
    limit: int = Query(100, ge=1, le=365, description="Maximum data points"),
    db: AsyncSession = Depends(get_db),
):
    ticker = ticker.upper()
    days = _TIMEFRAME_DAYS.get(timeframe, 30)

    if settings.USE_REAL_PRICES:
        history = await repo.get_history_from_db(db, ticker, days=days)
        if history:
            return history[-limit:]

    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    history = market_data_service.generate_mock_history(ticker, days=min(days, limit))
    return history[-limit:]


@router.get("/{ticker}/intraday", response_model=List[StockDataPoint])
async def get_intraday_data(ticker: str):
    profile = market_data_service.get_stock_profile(ticker.upper())
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    return market_data_service.generate_intraday_data(ticker.upper())
```

- [ ] **Step 4: Run the new test to verify it passes**

Run: `python -m pytest backend/tests/test_real_read_path.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Update `market_analyzer.py` to use real history**

In `backend/app/routers/market_analyzer.py`, change the `get_complete_analysis` signature and the history/price lines.

Replace the function signature (line 40-41):

```python
@router.get("/{ticker}", response_model=MarketAnalysis)
async def get_complete_analysis(ticker: str, db: AsyncSession = Depends(get_db)):
```

Add these imports at the top (after the existing `from ..config import get_settings`):

```python
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from ..database import get_db
from ..services import stock_repository as repo
```

Replace the price/history block (lines 62-66, the `realtime`/`history`/`prices`/`volumes` assignments) with:

```python
    # Real data when available, else deterministic mock.
    realtime = None
    db_history = []
    if settings.USE_REAL_PRICES:
        realtime = await repo.get_latest_price_from_db(db, ticker)
        db_history = await repo.get_history_from_db(db, ticker, days=200)

    used_real_prices = bool(db_history)
    if used_real_prices:
        history = db_history
    else:
        history = market_data_service.generate_mock_history(ticker, days=200)

    realtime = realtime or market_data_service.get_realtime_price(ticker)
    prices = [d.price for d in history]
    volumes = [d.volume for d in history]
```

- [ ] **Step 5b: Make `data_source` honest in the response**

In the `return MarketAnalysis(...)` block, change the `data_source` line (currently `data_source="mock" if settings.use_mock_data else "live"`) to:

```python
        data_source="live" if used_real_prices else "mock",
```

- [ ] **Step 6: Run the full suite**

Run: `python -m pytest backend/tests -q`
Expected: PASS (all green).

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/stocks.py backend/app/routers/market_analyzer.py backend/tests/test_real_read_path.py
git commit -m "feat: read real prices from DB in stocks/analyze endpoints with mock fallback"
```

---

### Task 8: Allow internal secret on the Node agent trigger

**Files:**
- Modify: `backend/src/api/admin/admin.router.ts`

**Context (verified):** `admin.router.ts` applies admin auth to *every* route via router-level middleware at the top:
```ts
router.use(adminLimiter, requireJwt, requireRole('admin'));
```
The `/agent/trigger` handler currently lives *after* that line, so it is always JWT-protected. To let GitHub Actions call it with a shared secret, we **extract the handler into a named function** and **register it twice**: once *before* the admin middleware (internal-secret path), once *after* (admin path).

- [ ] **Step 1: Extract the handler and add the internal-secret route**

In `backend/src/api/admin/admin.router.ts`, replace the existing `router.post('/agent/trigger', async (req, res, next) => { ... });` block (the handler body that creates the `agentRun` and adds the BullMQ job) with the following — define the handler once, register the internal bypass *before* the `router.use(...)` admin middleware, and the admin route after it:

```ts
// Shared handler — queues an agent run.
async function triggerAgentRun(req: Request, res: Response, next: NextFunction) {
  try {
    const run = await prisma.agentRun.create({
      data: { agentType: 'manual_trigger', status: 'running' },
    });

    const job = await agentQueue.add(
      'run-agent',
      { agentRunId: run.id },
      {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      }
    );

    res.status(202).json({ message: 'Agent queued', agentRunId: run.id, jobId: job.id });
  } catch (e) {
    next(e);
  }
}

// Internal scheduler path: registered BEFORE the admin middleware below so a
// valid X-Internal-Secret skips the JWT requirement. Otherwise fall through.
router.post('/agent/trigger', (req: Request, res: Response, next: NextFunction) => {
  const secret = process.env.INTERNAL_API_SECRET;
  if (secret && req.header('x-internal-secret') === secret) {
    return triggerAgentRun(req, res, next);
  }
  return next(); // not internal → continue to admin-protected route below
});
```

Then ensure the existing router-level admin middleware line remains **after** the block above:

```ts
router.use(adminLimiter, requireJwt, requireRole('admin'));
```

And **after** that middleware, register the admin path (this is where the original Swagger JSDoc comment stays):

```ts
router.post('/agent/trigger', triggerAgentRun);
```

> Net effect: the file order becomes (1) imports, (2) internal-secret `/agent/trigger`, (3) `router.use(admin middleware)`, (4) admin `/agent/trigger` + the other admin routes (`/agent/status`, etc.) unchanged.

- [ ] **Step 2: Build the Node backend to verify it compiles**

Run: `npm --prefix backend run build`
Expected: `tsc` completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/admin/admin.router.ts
git commit -m "feat: allow INTERNAL_API_SECRET to trigger the news agent run"
```

---

### Task 9: GitHub Actions daily trigger workflow

**Files:**
- Create: `.github/workflows/daily-data.yml`

- [ ] **Step 1: Create the workflow**

```yaml
# .github/workflows/daily-data.yml
name: Daily Data Refresh

on:
  schedule:
    # Stocks: 09:30 UTC (~16:30 WIB, after IDX close), Mon-Fri
    - cron: "30 9 * * 1-5"
    # News: 01:30 UTC (~08:30 WIB, before market open), Mon-Fri
    - cron: "30 1 * * 1-5"
  workflow_dispatch: {}   # allow manual run from the Actions tab

jobs:
  refresh-stocks:
    if: github.event.schedule == '30 9 * * 1-5' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Wake Python service
        run: curl -fsS --max-time 90 "${{ secrets.PYTHON_API_URL }}/health" || true
      - name: Trigger price refresh
        run: |
          curl -fsS --max-time 300 -X POST \
            -H "X-Internal-Secret: ${{ secrets.INTERNAL_API_SECRET }}" \
            "${{ secrets.PYTHON_API_URL }}/api/internal/refresh-prices"

  refresh-news:
    if: github.event.schedule == '30 1 * * 1-5' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - name: Wake Node service
        run: curl -fsS --max-time 90 "${{ secrets.NODE_API_URL }}/health" || true
      - name: Trigger news agent
        run: |
          curl -fsS --max-time 120 -X POST \
            -H "X-Internal-Secret: ${{ secrets.INTERNAL_API_SECRET }}" \
            "${{ secrets.NODE_API_URL }}/api/news/agent/trigger"
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/daily-data.yml
git commit -m "ci: add GitHub Actions daily stock + news refresh trigger"
```

- [ ] **Step 3: Manual setup (document for the operator — not code)**

Record these steps in the PR/commit description; they are done in dashboards, not the repo:
1. **Render → sahamgue-api → Environment:** add `INTERNAL_API_SECRET=<random>` and `USE_REAL_PRICES=true`.
2. **Render → sahamgue-news → Environment:** add the same `INTERNAL_API_SECRET=<random>`.
3. **GitHub → repo → Settings → Secrets and variables → Actions:** add `INTERNAL_API_SECRET` (same value), `PYTHON_API_URL=https://sahamgue-api.onrender.com`, `NODE_API_URL=https://sahamgue-news.onrender.com`.
4. Generate the secret with: `python -c "import secrets; print(secrets.token_hex(32))"`.

---

## Phase 3 — News frontend UX

### Task 10: Wire News tab to real data + manual refresh + "new articles" indicator

**Files:**
- Modify: `components/NewsPage.tsx`

**Context (verified):** Despite having real fetch helpers (`fetchPersonalizedNews`, `fetchNewsByCategory`), the `NewsPage` component currently renders the hardcoded `DUMMY_NEWS` array via `getNews()` → `filterByChip(DUMMY_NEWS)`. So this task (1) wires the component to call the real endpoints and store results in state, then (2) adds the manual Refresh and the "new articles available" indicator. Real names in the component: state `tab`/`setTab`, `filterChip`, `loading` (currently non-stateful), const `WATCHLIST`, helpers `filterByChip(news)` and `getNews()`, render var `news = getNews()`.

- [ ] **Step 1: Verify the feed response shape**

Run: `sed -n '1,80p' backend/src/api/news/news.service.ts`
Expected: confirms what `getNewsFeed(...)` returns. The frontend `fetchNewsByCategory` currently reads `data.data || []` — if the service returns a different key (e.g. `{ items, total }`), note it; you will align the accessor in Step 3.

- [ ] **Step 2: Add state, make `loading` stateful, import `useRef`**

At the top of the file, ensure the React import includes `useRef` and `useEffect`:
```tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
```
Inside `NewsPage`, replace `const [loading] = useState(false);` with:
```tsx
  const [loading, setLoading] = useState(false);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasNewArticles, setHasNewArticles] = useState(false);
  const newestSeenRef = useRef<string | null>(null);
```

- [ ] **Step 3: Add the real load + refresh + check functions**

Inside `NewsPage`, after the `WATCHLIST` const, add:

```tsx
  // Fetch the right endpoint for the active tab.
  const fetchForTab = useCallback(async (): Promise<NewsItem[]> => {
    if (tab === 'personalized') {
      return fetchPersonalizedNews(WATCHLIST, []);
    }
    // hot / latest / critical / popular all map to the feed tab param.
    return fetchNewsByCategory(tab, 1);
  }, [tab]);

  // Initial + tab-change load.
  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchForTab();
      setNewsItems(items);
      newestSeenRef.current = items[0]?.publishedAt ?? newestSeenRef.current;
      setHasNewArticles(false);
    } finally {
      setLoading(false);
    }
  }, [fetchForTab]);

  useEffect(() => { loadNews(); }, [loadNews]);

  // Manual refresh — re-reads the feed from the DB (fast, free, no scrape).
  const refreshFeed = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const items = await fetchForTab();
      setNewsItems(items);
      newestSeenRef.current = items[0]?.publishedAt ?? newestSeenRef.current;
      setHasNewArticles(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchForTab]);

  // Light poll: detect items newer than what we've shown.
  const checkForNewArticles = useCallback(async () => {
    const latest = await fetchForTab();
    const newest = latest[0]?.publishedAt ?? null;
    if (newestSeenRef.current && newest && newest > newestSeenRef.current) {
      setHasNewArticles(true);
    }
  }, [fetchForTab]);

  useEffect(() => {
    const onFocus = () => { checkForNewArticles(); };
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(checkForNewArticles, 5 * 60 * 1000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
  }, [checkForNewArticles]);
```

> If Step 1 showed the feed returns a key other than `data`, update `fetchNewsByCategory` (line ~283) accordingly so it returns the array.

- [ ] **Step 4: Point `getNews()` at real state instead of `DUMMY_NEWS`**

In `getNews`, change the first line from:
```tsx
    const base = filterByChip(DUMMY_NEWS);
```
to:
```tsx
    const base = filterByChip(newsItems);
```
And add `newsItems` to its dependency array: `}, [tab, filterByChip, newsItems]);`

- [ ] **Step 5: Render the banner + Refresh button**

In the title row (inside the sticky header, near the `🔍` button around line 554), replace the search button block with this row so the Refresh control and banner sit beside it:

```tsx
          <div className="flex items-center gap-2">
            {hasNewArticles && (
              <button onClick={refreshFeed}
                className="rounded-full px-3 py-1 text-[11px] font-bold"
                style={{ background: SG.accent, color: SG.bgBase, fontFamily: SG.sans }}>
                ● Berita baru — refresh
              </button>
            )}
            <button onClick={refreshFeed} disabled={isRefreshing}
              className="rounded-xl px-3 h-9 flex items-center text-[12px] font-semibold"
              style={{ background: SG.bgMuted, color: SG.textPrimary, fontFamily: SG.sans }}>
              {isRefreshing ? '…' : '↻ Refresh'}
            </button>
          </div>
```

- [ ] **Step 6: Build the frontend to verify it compiles**

Run: `npm run build`
Expected: Vite build succeeds with no TypeScript errors. (If `DUMMY_NEWS` becomes unused and your lint config errors on that, leave it referenced or remove it.)

- [ ] **Step 7: Commit**

```bash
git add components/NewsPage.tsx
git commit -m "feat: wire News tab to real endpoints + manual refresh and new-articles indicator"
```

---

## Deferred (conscious YAGNI — documented so it's not a silent gap)

The spec mentioned these; they are intentionally **not** built now and noted here for honesty:

- **Gemini price fallback (spec §3.1 step 2):** the ingest and read paths use Yahoo → **mock** (not Yahoo → Gemini → mock). LLM-fetched prices are unreliable and token-costly; the deterministic mock already keeps the UI working for any ticker Yahoo misses. Add a Gemini step later only if specific tickers consistently fail on Yahoo.
- **On-demand Yahoo fetch on cache miss (spec §3.4):** when a ticker has no stored rows, the read path serves mock rather than fetching Yahoo synchronously during the request (which would make that request slow). The daily cron populates the DB; this is an edge case only for brand-new tickers between deploy and first cron.
- **`analysis_cache` write-through (spec §3.4):** analysis is recomputed per request from stored OHLCV. With AI fundamentals off by default, this is cheap math, so caching is unnecessary now. Revisit if `USE_REAL_FUNDAMENTALS` is enabled (Gemini calls per request would then justify caching).

---

## Final verification

- [ ] **Step 1: Run the full Python suite**

Run: `python -m pytest backend/tests -q`
Expected: all tests pass.

- [ ] **Step 2: Build both backends + frontend**

Run: `npm run check`
Expected: frontend build + Node build + Python tests all succeed.

- [ ] **Step 3: Manual smoke (after deploy + env vars set)**

```bash
# Trigger a real price ingest
curl -X POST -H "X-Internal-Secret: <secret>" https://sahamgue-api.onrender.com/api/internal/refresh-prices
# Verify a ticker now returns real data
curl https://sahamgue-api.onrender.com/api/analyze/BBCA   # data_source should read "live"
# Trigger news + check the feed
curl -X POST -H "X-Internal-Secret: <secret>" https://sahamgue-news.onrender.com/api/news/agent/trigger
curl https://sahamgue-news.onrender.com/api/news/feed
```

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -A && git commit -m "chore: real data pipeline final cleanup" || echo "nothing to commit"
git push origin main
```

---

## Notes for the implementer
- **TDD:** every backend task writes the test first, watches it fail, then implements.
- **DB tests** use the in-memory SQLite helper in `backend/tests/conftest.py` via `asyncio.run(...)` — no `pytest-asyncio` needed.
- **Rollback:** set `USE_REAL_PRICES=false` to instantly revert to mock data without a code change.
- **Yahoo politeness:** the 0.3s throttle in `ingest_all` keeps ~80 tickers under ~30s and avoids rate-limiting; the daily cadence keeps it well within free limits.
- **Names to verify against the real `NewsPage.tsx`** (Task 10, Step 1): the feed-fetch function, the list state setter, and the active-category variable. Match them exactly.
