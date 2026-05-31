# Real Data Pipeline — Stocks + News

**Date:** 2026-05-31
**Status:** Approved design — ready for implementation plan
**Goal:** Replace dummy/mock data with real data end-to-end (scrape → store → analyze → display) at **zero cost** for a **limited number of users**.

---

## 1. Context & Current State

The app currently serves mock data:

- **Stocks (Python):** `market_data.py` holds a hardcoded IDX list and a deterministic RNG. `market_analyzer.py` computes *all* technicals/signals from this mock history. There is **no real price fetcher** anywhere — so real data needs new code, not a config flip.
- **News (Node):** Already real — `scraper.ts` pulls Indonesian RSS feeds, `groq.ts` summarizes (free), `provider.ts` enriches, and articles store a **link to the original source**. The frontend News tab **already calls** the real `/api/news/feed`, `/api/news/ticker/:code`, `/api/news/personalized` endpoints. The only gap: the agent must run to populate `news_items`.

**Existing tables we reuse (Python-owned, already in the Alembic baseline):**
- `stocks` — ticker universe (ticker, name, sector, market_cap…)
- `stock_prices` — OHLCV per ticker per date, **unique index on `(ticker, date)`**
- `analysis_cache` — cached analysis with `expires_at`

**Key free-tier constraint:** Render free web services sleep after ~15 min idle, so internal `node-cron`/asyncio timers do **not** fire reliably. Scheduling must come from an **external** trigger.

---

## 2. Architecture

```
GitHub Actions (free scheduled workflows)
 ├─ daily ~09:30 UTC ─ POST /api/internal/refresh-prices ─→ Python → Yahoo → stock_prices
 └─ daily ~01:30 UTC ─ POST /api/news/agent/trigger ───────→ Node  → RSS+Groq → news_items
                                                                         │
Frontend ── GET /api/analyze/:ticker  (real OHLCV → technicals/signals) ─┤
        └─ GET /api/news/feed         (already wired, links to source) ──┘
```

Two independent subsystems, both triggered externally, both reading/writing existing tables.

---

## 3. Subsystem 1 — Stock Prices (Python)

### 3.1 Source cascade
1. **Yahoo Finance** chart API via `httpx` (already a dependency):
   `https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}.JK?range=1y&interval=1d`
2. **Gemini** grounding (existing `gemini_proxy_service`) — fallback when Yahoo fails for a ticker.
3. **Deterministic mock** — last resort so the UI never breaks.

### 3.2 Storage
- `stocks` seeded (idempotent upsert) from the existing `SAMPLE_IDX_STOCKS` list.
- `stock_prices` filled with **1 year** of daily OHLCV per ticker. Upserts keyed on the unique `(ticker, date)` index → safe to re-run.

### 3.3 Daily ingest job — `app/services/price_ingest_service.py` (new)
- Loop tickers from `stocks`.
- For each: fetch 1y daily candles from Yahoo, parse OHLCV, upsert into `stock_prices`.
- **Per-ticker `try/except`** so one failure doesn't abort the run.
- Small delay (~250–500 ms) between tickers to respect Yahoo.
- Returns a summary `{ updated, failed, tickers }` for logging.

### 3.4 Read path
- `market_data.py` and `market_analyzer.py` read history/last price from `stock_prices` instead of `generate_mock_history`.
- If a ticker has no rows yet → on-demand Yahoo fetch (and persist) → Gemini → mock.
- **Technicals, trend, volume, and signals are now computed from real OHLCV.**
- Assembled analysis cached in `analysis_cache` with **end-of-day expiry** to avoid recompute.
- `data_source` field reports `"live"` vs `"mock"` honestly per ticker.

### 3.5 Trigger endpoint — `app/routers/internal.py` (new)
- `POST /api/internal/refresh-prices`, gated by an `INTERNAL_API_SECRET` request header.
- Runs the ingest job; returns the summary. Designed to be called by GitHub Actions.

---

## 4. Subsystem 2 — News (Node)

Already real and frontend-wired. Changes are about **freshness control**, not rebuilding.

### 4.1 Background scrape (automated, light)
- GitHub Actions triggers the **existing** `POST /api/news/agent/trigger` **once daily** (~01:30 UTC, before market open). Cheap, keeps baseline content fresh.

### 4.2 Manual refresh (user)
- The News tab gets a **Refresh** control that re-fetches `/api/news/feed` from the DB instantly (free, fast — no scrape on the user's click).
- Triggering an actual fresh **scrape** on demand stays restricted (admin / rate-limited) to control Groq usage.

### 4.3 "New articles available" indicator
- On tab focus (and a light interval), the News tab compares the newest `news_items` timestamp against what the user currently sees.
- If newer items exist, show a dismissible banner ("New articles available — tap to refresh"); tapping loads them.

### 4.4 Trigger auth
- `POST /api/news/agent/trigger` accepts the shared `INTERNAL_API_SECRET` header (in addition to existing admin JWT) so GitHub Actions can fire it.

---

## 5. Trigger — GitHub Actions

`.github/workflows/daily-data.yml`:
- **Stocks:** `cron: '30 9 * * 1-5'` (after IDX close) → curl Python `/api/internal/refresh-prices`.
- **News:** `cron: '30 1 * * 1-5'` (before market open) → curl Node `/api/news/agent/trigger`.
- Both jobs send the `X-Internal-Secret` header.
- Repo secrets: `INTERNAL_API_SECRET`, `PYTHON_API_URL` (`https://sahamgue-api.onrender.com`), `NODE_API_URL` (`https://sahamgue-news.onrender.com`).
- Each job first hits `/health` to wake the sleeping Render service, then the trigger.

---

## 6. Config / New Env

| Var | Service(s) | Purpose |
|---|---|---|
| `INTERNAL_API_SECRET` | Python, Node, GitHub | Shared secret guarding the trigger endpoints |
| `USE_REAL_PRICES` | Python | `true` flips read path mock → DB/Yahoo; instant rollback to `false` |

---

## 7. Files Changed

**Python**
- `app/services/price_ingest_service.py` *(new)* — Yahoo fetch + upsert
- `app/routers/internal.py` *(new)* — secret-protected `/api/internal/refresh-prices`
- `app/services/market_data.py` — DB-backed reads + on-demand fallback + `stocks` seeding
- `app/routers/market_analyzer.py` — read real data, cache via `analysis_cache`
- `app/routers/stocks.py` — list/profile/price/history from DB
- `app/config.py` — `INTERNAL_API_SECRET`, `USE_REAL_PRICES`
- `app/main.py` — register internal router

**Node**
- `src/api/admin/admin.router.ts` — accept `INTERNAL_API_SECRET` header on `/agent/trigger`

**Frontend**
- `components/NewsPage.tsx` — manual Refresh control + "new articles available" indicator

**Repo / Ops**
- `.github/workflows/daily-data.yml` *(new)*

---

## 8. Testing

**Unit (Python)**
- Yahoo response parser with a mocked `httpx` payload (valid, empty, malformed).
- Upsert idempotency: same `(ticker, date)` re-run does not duplicate.
- Read-path fallback cascade: DB → Yahoo → Gemini → mock.
- Internal endpoint rejects requests without the correct secret (401/403).

**Manual / integration**
- Fire `/api/internal/refresh-prices` → `stock_prices` fills → open a ticker → real numbers, `data_source: "live"`.
- Fire `/api/news/agent/trigger` → `news_items` populates → News tab shows real articles linking to source.
- Disconnect Yahoo (bad ticker) → falls back gracefully without crashing.

---

## 9. Free-Tier Guardrails

- **Daily** (not intraday) cadence keeps API calls and Render hours minimal.
- Per-ticker isolation + throttle avoids Yahoo rate-limiting.
- `analysis_cache` avoids recomputing analysis on every view.
- Manual news refresh re-reads the DB (free) rather than scraping on click.
- Everything stays within Neon (0.5 GB), Upstash (10k cmds/day), and Render free limits for a limited user base.

---

## 10. Out of Scope (YAGNI)

- Real-time/intraday tick streaming (daily EOD is enough).
- Real broker-summary / foreign-flow data (keep AI/mock for now).
- Paid market-data providers.
- Backfilling more than 1 year of history.
