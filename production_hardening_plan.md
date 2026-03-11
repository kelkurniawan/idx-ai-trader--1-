# Production Hardening Implementation Plan (P1–P6)

## Pre-Task Audit Results

### Files Read
| File | Lines | Key Finding |
|---|---|---|
| [services/geminiService.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts) | 304 | 4 exports: [analyzeChartWithVision](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#30-100), [getRealTimeStockData](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#101-159), [fetchStockNews](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#160-178), [analyzeStockWithGemini](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#179-299) — all use `@google/genai` with Google Search grounding |
| [package.json](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/package.json) (root) | 31 | `"@google/genai": "^1.38.0"` in dependencies |
| [vite.config.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/vite.config.ts) | 24 | **CRITICAL**: `process.env.API_KEY` baked into bundle from `GEMINI_API_KEY` env var — exposed to every user |
| [services/dataProvider.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/dataProvider.ts) | — | Imports [analyzeStockWithGemini](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#179-299), [getRealTimeStockData](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#101-159), [fetchStockNews](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#160-178) from geminiService |
| [components/PortfolioRow.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/PortfolioRow.tsx) | — | Imports [getRealTimeStockData](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#101-159) from geminiService |
| [components/ChartAnalyzer.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/ChartAnalyzer.tsx) | — | Imports [analyzeChartWithVision](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#30-100) from geminiService |
| [services/backendApi.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/backendApi.ts) | 482 | Uses `VITE_API_URL` env var, [apiFetch](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/backendApi.ts#51-70) helper (no auth header — uses HTTP-only cookies) |
| [services/authApi.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/authApi.ts) | 194 | Cookie-based auth via `credentials: 'include'` — no Bearer token headers needed |
| [backend/app/config.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/config.py) | 172 | pydantic-settings (`BaseSettings`) already in use. JWT default is hardcoded dev placeholder |
| [backend/app/database.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py) | 48 | Fully async, asyncpg — **no Alembic yet** |
| [backend/app/main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/main.py) | 103 | `/health` endpoint exists. CORS from `settings.cors_origins_list` |
| [backend/app/models/user.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/user.py) | 80 | Tables: `users`, [remember_me_tokens](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py#216-221) |
| [backend/app/models/profile.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/profile.py) | 79 | Tables: `notification_preferences`, `user_sessions` |
| [backend/prisma/schema.prisma](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/prisma/schema.prisma) | 110 | Tables: `news_sources`, `news_items`, `agent_runs`, `user_personalizations` |
| [backend/requirements.txt](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/requirements.txt) | 55 | No asyncpg, no alembic, no psycopg2 |
| [backend/package.json](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/package.json) | 48 | Node.js runs on `PORT` env var (defaults to 3001 in server.ts). Uses `@anthropic-ai/sdk`, `groq-sdk`, `jsonwebtoken` |
| [backend/src/server.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/src/server.ts) | 60 | [cors()](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/config.py#142-146) with zero configuration — wide open |
| [backend/.env](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env) | 32 | GROQ/Anthropic keys are `xxx` placeholders. DATABASE_URL is real (not committed secret) |
| [docker-compose.yml](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/docker-compose.yml) | 29 | Only postgres + redis — **no application containers** |
| [.gitignore](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/.gitignore) | 25 | **MISSING**: [.env](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env) pattern — [backend/.env](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env) could be committed |

---

## Integration Risks

> [!WARNING]
> **P1 Risk**: [geminiService.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts) uses **Google Search grounding** (`tools: [{ googleSearch: {} }]`) — this cannot be proxied simply as a chat call. The backend AI proxy must support structured JSON responses with grounding. The three grounding functions map to `GET /api/ai/realtime-price/{ticker}`, `GET /api/ai/stock-news/{ticker}`, and `POST /api/ai/analyze` on the backend.

> [!WARNING]
> **P1 Risk**: [analyzeChartWithVision](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#30-100) sends a base64 image. The proxy endpoint must accept multipart or base64 body.

> [!IMPORTANT]
> **P4 Finding**: Zero table overlap between SQLAlchemy and Prisma. Python owns: `users`, [remember_me_tokens](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py#216-221), `notification_preferences`, `user_sessions`. Node.js owns: `news_sources`, `news_items`, `agent_runs`, `user_personalizations`. **P4 is a no-op enforcement of what already exists** — mostly documentation + `ARCHITECTURE.md` creation.

> [!CAUTION]
> **P3 Risk**: [database.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py) uses `asyncpg` driver. Alembic cannot run with asyncpg — needs psycopg2-binary as a separate migration-only dep.

> [!NOTE]
> **P5 Note**: The monorepo root is also the frontend source (no `frontend/` subdirectory). [App.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx), `services/`, `components/` are all at root level. The Caddy `frontend/dist` path must reflect this.

---

## Priority Execution Plan

### P1 — Remove @google/genai from Frontend

**Files to CREATE:**
- `backend/app/services/gemini_proxy_service.py` — 4 async methods mirroring geminiService.ts functions
- `backend/app/routers/ai.py` — 4 endpoints, JWT-optional (some are public data)
- [services/geminiService.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts) — REPLACE: remove SDK imports, replace all 4 exports with [fetch](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/PortfolioRow.tsx#143-153) calls to `/api/ai/*`

**Files to MODIFY:**
- [package.json](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/package.json) — remove `@google/genai`
- [vite.config.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/vite.config.ts) — remove `process.env.API_KEY` define block
- [backend/requirements.txt](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/requirements.txt) — add `google-generativeai>=0.8.0` (already there from requirements.txt check — ✓)
- [backend/app/main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/main.py) — include new [ai](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/profileApi.ts#167-171) router
- [.env.example](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env.example) — add `GEMINI_API_KEY=`

**Endpoint mapping:**
| Frontend function | New backend endpoint | Method |
|---|---|---|
| [analyzeChartWithVision(base64, type)](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#30-100) | `POST /api/ai/chart-vision` | Body: `{image: base64, trading_type}` |
| [getRealTimeStockData(ticker)](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#101-159) | `GET /api/ai/realtime-price/{ticker}` | No body |
| [fetchStockNews(ticker, company)](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#160-178) | `GET /api/ai/stock-news/{ticker}?company=` | No body |
| [analyzeStockWithGemini(ticker, history, technicals, rt)](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/geminiService.ts#179-299) | `POST /api/ai/analyze-stock` | Body: full data object |

**Auth strategy**: All 4 endpoints are **unauthenticated** at the backend level (the market analysis features are public). This matches current behavior where geminiService.ts is called without any auth context.

---

### P2 — Secrets Hardening

**Current hardcoded values found:**

| File | Line | Type | Masked Value | Env Var |
|---|---|---|---|---|
| [backend/app/config.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/config.py) | 48 | JWT Secret default | `dev-secret-key-CHANGE-THIS-IN-PRODUCTION-12345` | `JWT_SECRET_KEY` (already reads from env, default is the problem) |
| [backend/app/config.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/config.py) | 56-57 | reCAPTCHA test keys | Google test keys | Already in Settings, just need to clear defaults |
| [vite.config.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/vite.config.ts) | 14-15 | Gemini API key in bundle | `process.env.API_KEY` | Removed in P1 |
| [backend/src/server.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/src/server.ts) | 15 | Port default | `process.env.PORT \|\| 3001` | Fine as-is |
| [.gitignore](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/.gitignore) | — | Missing .env patterns | — | Add `**/.env` |

**Analysis**: Python config.py is already using pydantic-settings correctly. The only "secret" hardcoded is the JWT default value and reCAPTCHA test keys — both are flagged in comments as dev-only. The real fix is: **remove the defaults entirely** so startup fails fast if not set in production.

**Files to CREATE:**
- [backend/.env.example](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env.example) (Python) — complete with all Settings fields, grouped with comments
- `backend/.env.example.node` — Node.js env vars
- [.env.example](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env.example) (root, frontend)

**Files to MODIFY:**
- [backend/app/config.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/config.py) — Remove default values for `JWT_SECRET_KEY`, `MFA_ENCRYPTION_KEY` (make them required in prod)
- [.gitignore](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/.gitignore) — Add comprehensive [.env](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env) patterns
- [vite.config.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/vite.config.ts) — Remove API_KEY define (done in P1)

---

### P3 — Alembic Migration Infrastructure

**Files to CREATE:**
- `backend/alembic.ini`
- `backend/alembic/env.py`
- `backend/alembic/versions/README.md`

**Files to MODIFY:**
- [backend/requirements.txt](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/requirements.txt) — add `alembic`, `asyncpg`, `psycopg2-binary` (migration-only)

**Key technical decision**: [database.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py) converts `postgresql://` → `postgresql+asyncpg://`. For Alembic, `env.py` must do the reverse: read `settings.DATABASE_URL`, convert to psycopg2 URL.

**Prisma tables to exclude from Alembic autogenerate:**
```python
PRISMA_TABLES = {
    "news_sources", "news_items", "agent_runs", "user_personalizations",
    "_prisma_migrations"  # Prisma internal
}
```

**Commands user must run after files are created:**
```bash
cd backend
.\venv\Scripts\pip install alembic psycopg2-binary asyncpg
.\venv\Scripts\alembic revision --autogenerate -m "initial_schema"
.\venv\Scripts\alembic upgrade head
```

---

### P4 — Table Ownership Enforcement

**Ownership matrix (already correct — zero overlap found):**

| Table | SQLAlchemy | Prisma | Owner |
|---|---|---|---|
| `users` | ✓ | ✗ | **Python** |
| [remember_me_tokens](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py#216-221) | ✓ | ✗ | **Python** |
| `notification_preferences` | ✓ | ✗ | **Python** |
| `user_sessions` | ✓ | ✗ | **Python** |
| `news_sources` | ✗ | ✓ | **Node.js** |
| `news_items` | ✗ | ✓ | **Node.js** |
| `agent_runs` | ✗ | ✓ | **Node.js** |
| `user_personalizations` | ✗ | ✓ | **Node.js** |

**Files to CREATE:**
- `ARCHITECTURE.md` — documents ownership boundary, communication rules
- `backend/app/services/internal_client.py` — httpx client for Python→Node.js calls (even if no overlap now, establishes the pattern)

**No model deletions or Prisma schema changes needed.** This priority is primarily documentation + `internal_client.py` scaffolding.

---

### P5 — Caddy API Gateway

> [!IMPORTANT]
> **Monorepo structure clarification**: There is no `frontend/` subdirectory. All frontend source files are at root. The Caddy production config must serve from the root `/dist/` directory, not `/frontend/dist/`.

**Port mapping:**
- Frontend dev server: `:3000` (Vite, per `vite.config.ts`)
- Python backend: `:8000`
- Node.js backend: `:3001` (per `server.ts` default)
- Caddy gateway: `:8080`

**Files to CREATE:**
- `Caddyfile` — local dev gateway
- `Caddyfile.production` — Railway-ready with env var placeholders

**Files to MODIFY:**
- `vite.config.ts` — add proxy fallback for `/api/news` → `:3001`, `/api` → `:8000`
- `services/backendApi.ts` — update default URL to `:8080`
- `services/authApi.ts` — update default URL to `:8080`
- `backend/app/config.py` — update CORS default to include `:8080`
- `backend/src/server.ts` — restrict CORS to gateway only

---

### P6 — Docker + docker-compose

> [!IMPORTANT]
> **Build context**: Frontend Dockerfile must use the monorepo root as context (not `./frontend`), since `App.tsx`, `services/`, `components/` are all at root level.

**Files to CREATE:**
- `Dockerfile.python` (in `backend/`)
- `Dockerfile.node` (in `backend/`)
- `Dockerfile.frontend` (at root)
- `docker-compose.yml` — replace existing minimal one
- `backend/.dockerignore`
- `.dockerignore` (root, for frontend)
- `DEPLOYMENT.md`

**Python version**: 3.12 (latest stable, matches asyncpg compatibility)
**Node.js version**: 20 LTS (matches `@types/node` version in package.json)

---

## Verification Plan

After all priorities:
1. `curl http://localhost:8080/health` → `{"status":"healthy"}`
2. `curl http://localhost:8080/api/news/articles` → news data from Node.js
3. `docker-compose up --build` → all 5 services healthy 
4. `alembic current` → shows revision hash
5. Zero `@google/genai` in any `.ts` or `.tsx` file
6. Zero `VITE_GEMINI_API_KEY` in any `.env` file
