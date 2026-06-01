# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IDX AI Trader / SahamGue** is an AI-powered stock analysis SPA for the Indonesia Stock Exchange (IDX). It is a dual-backend monorepo: a Python FastAPI core API and a Node.js Express news microservice share a single PostgreSQL database, fronted by a React 19/Vite SPA and a Caddy reverse proxy.

Current version: **1.9.1** (see [CHANGELOG.md](CHANGELOG.md) for full history).

---

## Commands

### Frontend (root directory)
```bash
npm run dev        # Vite dev server on :3000
npm run build      # Production build to dist/
npm run preview    # Preview production build
npm run check      # Build frontend + Node backend + run Python tests
```

### Python Backend (`backend/`)
```bash
# Activate venv first (Windows)
.venv\Scripts\activate

# Start dev server (from backend/)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
python -m pytest backend/tests

# Run a single test file
python -m pytest backend/tests/test_production_readiness.py

# DB migrations
alembic upgrade head
alembic revision --autogenerate -m "description"
```

### Node.js News Backend (`backend/`)
```bash
npm run dev        # tsx watch on :3001
npm run build      # tsc compile to dist/
npm run db:migrate # prisma migrate dev
npm run db:generate # prisma generate
npm run db:studio  # Prisma Studio GUI
npm run db:seed    # Seed database
```

### Docker (full stack)
```bash
docker-compose up --build -d           # Dev stack on :8080
docker compose -f docker-compose.production.yml up --build -d  # Prod
```

### Post-deploy verification
```bash
python scripts/go_live_smoke_test.py --base-url https://your-domain.com
python scripts/production_preflight.py
```

---

## Architecture

### Three-Tier Stack

```
Browser (React SPA :3000)
        │ /api/*
        ▼
Caddy Gateway (:8080)
  ├── /api/news, /api/agent  →  Node.js Express (:3001)
  └── /api/*                 →  Python FastAPI   (:8000)
```

**Vite dev proxy** (`vite.config.ts`) is an alternative to Caddy for local dev — set `VITE_API_URL=""` to use it.

### Frontend (`App.tsx`, `index.tsx`, `components/`, `services/`)

- **Routing** is state-based in `App.tsx` (`useState<ActiveTab>`), not React Router.
- **Bootstrap** in `index.tsx` wraps the app: `ClerkProvider → ThemeProvider → AppErrorBoundary → App`.
- **Lazy loading**: Heavy components (`ChartAnalyzer`, `Backtester`, `TradeJournal`, `LearningCenter`, `Community`, `Watchlist`, `AdminDashboard`, `ProfilePage`) are `React.lazy()` loaded on demand.
- **Data access** all goes through `services/dataProvider.ts` — the single entry point that switches between MOCK and LIVE modes via `VITE_APP_MODE=mock`.
- **Auth headers** are centralized in `services/apiClient.ts`. All API calls use `apiFetch()` which injects the Clerk JWT bearer token.
- **Design tokens**: CSS variables defined in `index.css` (`--bg-base`, `--bg-surface`, `--text-primary`, etc.). Use `SG.*` token constants in `App.tsx` for JSX inline styles. Never hardcode hex colors.
- **Theme**: Dark-first SahamGue design system. JetBrains Mono for financial data, Inter for UI text.

### Data Provider Fallback Cascade (`services/dataProvider.ts`)

Live mode follows: **Python Backend → Gemini AI → Mock Data**. All three paths return the same `StockAnalysisBundle` shape. Admin dashboard overrides are applied last via `applyOverrides()`.

### Python Backend (`backend/app/`)

| Layer | Location |
|---|---|
| Entry/Middleware | `app/main.py` |
| Config | `app/config.py` (via `get_settings()`, `@lru_cache`) |
| Database | `app/database.py` (async SQLAlchemy, SQLite dev / PostgreSQL prod) |
| Routers | `app/routers/` (`auth`, `profile`, `stocks`, `market_analyzer`, `predictions`, `ai`, `portfolio`, `strip`, `subscription`, `webhook`, `admin_ops`) |
| Services | `app/services/` — business logic, AI proxy, billing, MFA, notifications |
| Models | `app/models/` — SQLAlchemy ORM models |
| Schemas | `app/schemas/` — Pydantic request/response models |
| Migrations | `alembic/` |

All Gemini AI calls are proxied through `app/services/gemini_proxy_service.py` — the API key never leaves the server.

**Dev vs Production behavior** is driven by `ENVIRONMENT` in `config.py`:
- Dev/Staging: SQLite, mock data enabled, AI enabled only if `GEMINI_API_KEY` is set, in-memory OTP/rate-limit stores.
- Production: PostgreSQL required, Redis required, Alembic handles schema (startup `create_all` is skipped), live Clerk keys enforced, all placeholder secrets cause immediate startup failure.

### Node.js News Backend (`backend/src/`)

Express server on :3001. Routes: `/api/news` (public + admin). The news agent runs **in-process in the background** (`src/queue/queue.ts` → `runAgentInBackground`, single-flight `concurrency:1`) — BullMQ was removed because it hangs and drains the Upstash free quota on a sleeping free-tier instance. Dedup still uses Redis (`src/cache/redis.ts`, full `REDIS_URL`). AI pipeline: **Groq** summarizes + classifies `impactLevel` (always runs, free); optional DeepSeek/Anthropic enrichment adds tickers/impact when keys are set. Triggered by GitHub Actions (`.github/workflows/daily-data.yml`) hitting the secret-guarded `POST /api/news/agent/trigger`. Swagger UI at `/api-docs`.

### Real Data Pipeline & Triggers (v1.9.x)

Live data is **dark by default** — flipped on via env vars, not code.

- **Stock prices (EOD):** two sources, IDX-primary with Yahoo fallback, both writing the same `stock_prices` table.
  - **Primary — IDX:** `app/services/idx_ingest_service.py` calls the official IDX Stock Summary endpoint via `curl_cffi` (Chrome TLS impersonation, off-thread to dodge Cloudflare). **One call returns the full listed universe (~959 tickers)** with OHLC + Volume + **Value + Frequency** (+ foreign flow, not yet stored). Trigger: `POST /api/internal/refresh-idx-eod` (optional `{date: YYYYMMDD}`).
  - **Fallback — Yahoo:** `app/services/price_ingest_service.py` fetches 1y daily OHLCV per ticker from Yahoo Finance (`{TICKER}.JK`). Trigger: `POST /api/internal/refresh-prices`. Also powers the on-demand any-ticker resolver.
  - Foreign flow (`ForeignBuy`/`ForeignSell`) is stored on `stock_prices` (`foreign_buy`/`foreign_sell`/`foreign_net`) by the IDX path; Yahoo leaves them NULL.
  - When `USE_REAL_PRICES=true`, `stocks.py` / `market_analyzer.py` read real data from the DB (via `stock_repository.py`) and fall back to the mock generator per ticker. `data_source` reports `"live"`/`"mock"`.
- **Share ownership (KSEI, monthly):** `app/services/ksei_ingest_service.py` downloads the monthly KSEI Balance Position file (`web.ksei.co.id/Download/BalanceposEfek{YYYYMMDD}.zip`, pipe-delimited TXT in a ZIP), computes foreign/local ownership %, and stores the latest snapshot on `stocks` (`foreign_ownership_pct`/`local_ownership_pct`/`ownership_as_of`). Trigger: `POST /api/internal/refresh-ksei-ownership` (optional `{date: YYYYMMDD}` month-end; defaults to latest available).
- **Any-ticker coverage (on-demand):** reads go **DB → on-demand Yahoo resolve → curated mock / 404**. `resolve_ticker()` fetches an unknown ticker on first search, persists its prices + a `stocks` row (so it's fast thereafter), and `get_all_stocks` unions curated + resolved tickers. Only genuinely invalid tickers 404.
- **Ingest is backgrounded:** `POST /api/internal/refresh-prices` calls `run_ingest_in_background()` (single-flight) and returns `202` immediately — the full-universe scrape runs on the event loop so the trigger can't time out.
- **`/api/analyze`** computes signals/fundamentals/verdict server-side; `fundamental_service.py` must import every `schemas.analysis` class it uses (a missing import silently 500s the whole endpoint, masked by the frontend's Gemini/mock fallback — see `test_analyze_endpoint.py`).
- **News:** the Node agent (`src/agent/pipeline.ts`) scrapes RSS → Groq summarizes + classifies `impactLevel` → optional DeepSeek/Anthropic enrichment → stores in `news_items` (in the Prisma-owned `news` Postgres schema). Tabs are field-based views over `impactLevel`/`views`/recency.
- **Knowledge vault (Obsidian):** `backend/scripts/build_vault.py` generates `/vault` — one linked `.md` per ticker (frontmatter + `[[wikilinks]]` to sector/board/index notes) for Obsidian graph view, sourced from the curated seed (DB source of truth). Index membership comes from `backend/scripts/vault_membership.py`, which prefers `vault_membership_generated.json` (written by `refresh_membership.py` — liquidity-derived top-N by traded value from the IDX Stock Summary; a data-grounded proxy, since IDX publishes official constituents only as PDFs) over a hardcoded seed. Regenerate: `python backend/scripts/build_vault.py`; refresh membership: `python backend/scripts/refresh_membership.py [YYYYMMDD] --build-vault`.
- **Triggers:** fired by **GitHub Actions** (`.github/workflows/daily-data.yml`), not internal timers (Render free instances sleep). Jobs (Mon–Fri): Yahoo fallback `POST /api/internal/refresh-prices` at 09:30 UTC, **IDX EOD primary** `POST /api/internal/refresh-idx-eod` at 09:45 UTC (~16:45 WIB, after close — Yahoo runs first so IDX overwrites with richer data, and Yahoo data stands if IDX is down), and `POST /api/news/agent/trigger` (Node) at 01:30 UTC. **Monthly** (3rd, 10:00 UTC): KSEI ownership `POST /api/internal/refresh-ksei-ownership`. All guarded by the shared `INTERNAL_API_SECRET` header.
- **Production topology:** live deploy is **Vercel** (frontend + `/api/*` rewrites in `vercel.json`) + **Render** (`sahamgue-api` Python, `sahamgue-news` Node) + **Neon** (Postgres) + **Upstash** (Redis) + **Resend** (email). Caddy (below) is for local/Docker only. See `DEPLOYMENT.md`, `knowledgeWell.md`, and `docs/hardening-followups.md`.

### Strict Table Ownership (see `ARCHITECTURE.md`)

**Python/SQLAlchemy owns**: `users`, `remember_me_tokens`, `notification_preferences`, `user_sessions`.

**Prisma/Node.js owns**: `news_sources`, `news_items`, `agent_runs`, `user_personalizations`.

**Never cross-query**: Python must not query Prisma tables via SQLAlchemy and vice versa. Cross-service data must go through internal HTTP calls at `/api/internal/...`. Alembic autogenerate excludes Prisma tables via `env.py` configuration.

---

## Environment Setup

### Frontend (`.env.local`)
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:8080    # Caddy option (recommended)
# VITE_API_URL=                       # Empty = Vite proxy fallback
VITE_APP_MODE=mock                    # Set to "mock" for zero-network dev
```

### Python Backend (`backend/.env`)
Required even in development — copy from `backend/.env.example`:
- `JWT_SECRET_KEY` — generate: `python -c "import secrets; print(secrets.token_hex(32))"`
- `MFA_ENCRYPTION_KEY` — 64-char hex: `python -c "import secrets; print(secrets.token_hex(32))"`

Leaving `SMTP_HOST`, `GEMINI_API_KEY`, `GOOGLE_OAUTH_CLIENT_ID`, `WHATSAPP_ACCESS_TOKEN` empty causes those features to fall back to safe dev mocks (OTPs printed to console, AI calls disabled, etc.).

### Production Checklist
Run `python scripts/production_preflight.py` before any production deploy. The app calls `settings.validate_production_ready()` at startup and raises immediately on any unsafe configuration.

---

## API Documentation & Monitoring

### Interactive API Docs (dev only)
| Endpoint | URL | Notes |
|---|---|---|
| FastAPI Swagger UI | `http://localhost:8000/docs` | Try endpoints in-browser |
| FastAPI ReDoc | `http://localhost:8000/redoc` | Clean reference layout |
| FastAPI OpenAPI JSON | `http://localhost:8000/openapi.json` | Import into Postman/Insomnia |
| Node.js Swagger UI | `http://localhost:3001/api-docs` | News + agent endpoints |
| Node.js Health | `http://localhost:3001/health` | Service health check |

### Admin Ops Monitor
Built-in dashboard: **Admin tab → Ops Monitor** (requires `is_admin=true` on User).
Underlying API: `GET /api/admin/ops/overview`

### Python Models (SQLAlchemy)
`users`, `remember_me_tokens`, `password_reset_tokens`, `notification_preferences`, `user_sessions`, `portfolio_holdings`, `trade_journal_entries`, `broker_cash`, `stocks`, `stock_prices`, `watchlist`, `subscriptions`, `payment_history`, `analysis_cache`

### Node.js Models (Prisma)
`news_sources`, `news_items`, `agent_runs`, `user_personalizations`

---

## Key Files Reference

| File | Purpose |
|---|---|
| `App.tsx` | Main layout, state-based routing, SG design tokens |
| `index.tsx` | React root: Clerk + Theme + ErrorBoundary bootstrap |
| `types.ts` | All global TypeScript interfaces |
| `services/dataProvider.ts` | Unified data access, MOCK/LIVE switching, fallback cascade |
| `services/apiClient.ts` | `apiFetch()` — auth headers, base URL |
| `services/geminiService.ts` | Direct Gemini calls (fallback path when backend is down) |
| `backend/app/main.py` | FastAPI app, middleware stack, router registration |
| `backend/app/config.py` | All env settings, production validation |
| `backend/app/services/gemini_proxy_service.py` | Server-side Gemini proxy |
| `backend/src/server.ts` | Node.js Express entry, BullMQ scheduler |
| `ARCHITECTURE.md` | Table ownership rules |
| `DEPLOYMENT.md` | Free-tier (Vercel + Render) and Docker deployment steps |
| `vercel.json` | Vercel edge rewrites that replace Caddy in the free deployment |
| `backend/.env.free.example` | Free-tier env template (Neon, Upstash, Resend) |
| `PRODUCTION_RUNBOOK.md` | Key rotation, DNS/TLS, monitoring |
| `ROLLBACK.md` | Rollback procedures |
