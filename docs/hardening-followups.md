# Hardening Follow-ups — Real Data Pipeline

> These are **optional** robustness items surfaced by the final code review of the
> real-data-pipeline feature (merged 2026-05-31). The feature works and is safe to run
> without them. This is a backlog, not a blocker.
>
> Note: `production_hardening_plan.md` is a separate, **already-completed** one-time
> migration plan (P1–P6: Gemini proxy, secrets, Alembic, Caddy, Docker). Don't confuse
> the two — this file tracks new follow-ups for the data pipeline only.

---

## #2 — Use a DB-level upsert for `stock_prices` (Important)

**Where:** `backend/app/services/price_ingest_service.py` → `upsert_prices()`

**Current behavior:** read-then-write. It reads existing `(ticker, date)` rows into a set,
then inserts new rows / updates existing ones in Python. Idempotent for a single run.

**Risk it addresses:** if **two ingest runs overlap** on the same ticker (e.g. the daily
cron fires while you also click "Run workflow" manually, and both hit the same woken
Render instance), the read-then-write can race and raise `IntegrityError` on the
`(ticker, date)` unique index. The existing `await db.rollback()` in `ingest_all` already
contains the damage to that one ticker for that one run — so this is a robustness upgrade,
not a correctness fix. Low priority while the schedule is **once daily**.

**When to do it:** before increasing scrape frequency, or if you start running manual
triggers alongside the cron regularly.

**How to do it** (PostgreSQL `INSERT ... ON CONFLICT DO UPDATE`, with a SQLite path so the
in-memory tests keep working):

```python
# backend/app/services/price_ingest_service.py
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert


async def upsert_prices(db: AsyncSession, ticker: str, rows: list[dict]) -> int:
    """Insert/update (ticker, date) rows atomically via ON CONFLICT. Idempotent
    AND safe under overlapping runs."""
    ticker = ticker.upper()
    if not rows:
        return 0

    dialect = db.bind.dialect.name  # 'postgresql' or 'sqlite'
    insert_fn = pg_insert if dialect == "postgresql" else sqlite_insert

    payload = [
        {
            "ticker": ticker, "date": r["date"], "open": r["open"], "high": r["high"],
            "low": r["low"], "close": r["close"], "volume": r["volume"],
        }
        for r in rows
    ]
    stmt = insert_fn(StockPrice).values(payload)
    stmt = stmt.on_conflict_do_update(
        index_elements=["ticker", "date"],
        set_={
            "open": stmt.excluded.open,
            "high": stmt.excluded.high,
            "low": stmt.excluded.low,
            "close": stmt.excluded.close,
            "volume": stmt.excluded.volume,
        },
    )
    await db.execute(stmt)
    await db.commit()
    return len(payload)
```

**Tests:** the existing `test_price_ingest_db.py::test_upsert_prices_inserts_then_updates_without_duplicates`
already covers insert-then-update idempotency and should still pass unchanged. Optionally add
a test that inserts the same `(ticker, date)` twice in one `values([...])` batch to confirm
no `IntegrityError`.

**Gotcha:** the `(ticker, date)` unique index must be named/declared so `index_elements`
resolves — it already exists as `Index('idx_ticker_date', 'ticker', 'date', unique=True)`
in `backend/app/models/stock.py`, so `index_elements=["ticker", "date"]` works.

---

## #4 — Rate-limit the internal Node trigger (Minor)

**Where:** `backend/src/api/admin/admin.router.ts` — the internal-secret `/agent/trigger`
route is registered **before** `adminLimiter`, so the GitHub Actions path is both
auth-bypassed (by design) and unthrottled.

**Risk:** acceptable today — it's secret-gated and called once daily. But a stray loop
holding the secret could enqueue unbounded agent runs (Groq/BullMQ cost).

**How to do it:** apply a light limiter to just the internal route, e.g. a dedicated
`express-rate-limit` instance (a few requests/minute) on that specific `router.post`,
or reuse `publicLimiter`. Keep it separate from `adminLimiter` so the admin path is
unaffected.

---

## Done / not pursued

- **#1 — Empty Hot/Critical/Popular news tabs:** ✅ **Fixed** (commit `3512db3`). Groq now
  classifies `impactLevel`; feed tabs are field-based views; client double-filter removed.
- **#3 — Gemini price fallback / `analysis_cache` write-through / on-demand Yahoo on cache
  miss:** intentionally deferred (YAGNI) — see the "Deferred" section of
  `docs/superpowers/specs/2026-05-31-real-data-pipeline-design.md`. Mock fallback covers the
  gap; revisit only if specific tickers consistently fail on Yahoo or if AI fundamentals
  (per-request Gemini calls) get enabled.
