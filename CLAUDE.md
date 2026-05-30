# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IDX AI Trader / SahamGue** is an AI-powered stock analysis SPA for the Indonesia Stock Exchange (IDX). It is a dual-backend monorepo: a Python FastAPI core API and a Node.js Express news microservice share a single PostgreSQL database, fronted by a React 19/Vite SPA and a Caddy reverse proxy.

Current version: **1.8.0** (see [CHANGELOG.md](CHANGELOG.md) for full history).

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

Express server on :3001 with BullMQ + Redis job queues. Routes: `/api/news` (public + admin). AI pipeline uses Anthropic Claude and Groq. Swagger UI at `/api-docs`.

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
