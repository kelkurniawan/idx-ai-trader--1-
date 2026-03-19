# Manual Portfolio + Trade Journal — Walkthrough

## What Was Built

End-to-end manual portfolio tracking and trade journal feature for SahamGue.

---

## Backend (5 files)

| Action | File | What |
|---|---|---|
| **NEW** | [portfolio.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/models/portfolio.py) | 3 models: [PortfolioHolding](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/portfolio.py#21-48), [TradeJournalEntry](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/portfolio.py#50-80), [BrokerCash](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/portfolioApi.ts#71-75) |
| **NEW** | [portfolio.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/schemas/portfolio.py) | Pydantic v2 schemas for all req/res + computed [PortfolioSummary](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/schemas/portfolio.py#186-194), [TradeStats](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/portfolioApi.ts#86-95) |
| **NEW** | [portfolio.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/portfolio.py) | Full CRUD on `/api/portfolio` with weighted-average merge, IDX lot math, PnL computation |
| **MOD** | [main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/main.py) | Added [portfolio](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/portfolioApi.ts#100-112) router import and `include_router` |
| **MOD** | [env.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/alembic/env.py) | Added [portfolio](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/portfolioApi.ts#100-112) model import for autogenerate |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/portfolio/summary` | Full portfolio summary with aggregates |
| `GET` | `/api/portfolio/holdings` | List all holdings |
| `POST` | `/api/portfolio/holdings` | Add holding (merges on same ticker) |
| `PUT` | `/api/portfolio/holdings/:id` | Update holding |
| `DELETE` | `/api/portfolio/holdings/:id` | Delete holding |
| `GET` | `/api/portfolio/cash` | Get broker cash |
| `PUT` | `/api/portfolio/cash` | Upsert broker cash |
| `GET` | `/api/portfolio/trades` | List trades with filters |
| `GET` | `/api/portfolio/trades/stats` | Aggregate trade statistics |
| `POST` | `/api/portfolio/trades` | Log new trade |
| `PUT` | `/api/portfolio/trades/:id` | Update trade |
| `DELETE` | `/api/portfolio/trades/:id` | Delete trade |

---

## Frontend (5 files)

| Action | File | What |
|---|---|---|
| **NEW** | [portfolioApi.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/services/portfolioApi.ts) | API client with types, same auth pattern as [authApi.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/authApi.ts) |
| **NEW** | [usePortfolio.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/hooks/usePortfolio.ts) | React hook managing all portfolio state + mutations |
| **MOD** | [TradeJournal.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/components/TradeJournal.tsx) | 2-tab layout (Trade Log / Portofolio), API-backed |
| **MOD** | [HomeDashboard.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/components/HomeDashboard.tsx) | Live PortfolioSnapshot using API, clickable → journal |
| **MOD** | [App.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/App.tsx) | Added `onNavigateJournal` prop |

---

## Verification

- **TypeScript Build**: ✅ `npx tsc --noEmit` — 0 new errors (only pre-existing [tailwind.config.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/tailwind.config.ts) safelist issue)
- **Alembic Migration**: ⏳ Needs `alembic revision --autogenerate` after DB connection
- **Manual Testing**: ⏳ Needs running backend + frontend
