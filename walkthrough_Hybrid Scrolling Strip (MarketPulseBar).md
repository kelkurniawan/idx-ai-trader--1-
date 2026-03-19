# Hybrid Scrolling Strip (MarketPulseBar) — Walkthrough

## What Was Built

End-to-end full production implementation of the [MarketPulseBar](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/HomeDashboard.tsx#152-243) scrolling strip, replacing the hardcoded `MOCK_INDICES` array. The strip mixes live **EOD movers** and **Hot News** headlines fetched seamlessly from a cached endpoint.

---

## Backend (2 files)

| Action | File | What |
|---|---|---|
| **NEW** | [strip.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/strip.py) | Full public API `/api/strip/data` endpoint serving `movers` and `headlines`. Includes 300s cache, silent empty list fallback gracefully handling exception states. Uses raw SQL CTEs for optimized price queries. |
| **MOD** | [main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/main.py) | Added 2-line registration block: `import strip`, `app.include_router(strip.router, prefix="/api/strip", tags=["Strip"])` |

### Query Details

*   **Movers**: A complex raw SQL Common Table Expression (CTE) is utilized on the `stock_prices` table. It pairs `max_date` with `max_date - 1`, resolving daily `%` changes, ranking 3 top gainers + 2 worst losers and computing `.dir = 'up' | 'dn'`.
*   **Headlines**: A raw SQL fetch pointing to Prisma's own `news_items` table resolving `camelCase` constraints explicitly (`"impactLevel"`, `isActive`, etc.) mapping colors and impact symbols seamlessly.

---

## Frontend (4 files)

| Action | File | What |
|---|---|---|
| **NEW** | [strip.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/types/strip.ts) | Strict TypeScript typing defining [MoverItem](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types/strip.ts#7-13), [HeadlineItem](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types/strip.ts#14-21), and [StripData](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/strip.py#44-47). |
| **NEW** | [stripApi.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/services/stripApi.ts) | Simple [fetchStripData](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/stripApi.ts#12-23) wrapper enforcing silent 200 fallback behavior. |
| **NEW** | [useStripData.ts](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/hooks/useStripData.ts) | Data injection hook holding [StripData](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/strip.py#44-47). Polled cleanly using a 300,000ms timer. |
| **MOD** | [HomeDashboard.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/components/HomeDashboard.tsx) | Rewrote [MarketPulseBar](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/HomeDashboard.tsx#152-243) using a highly performant programmatic `requestAnimationFrame()` translation loop over React's inline `transform : translateX()`. Removes CSS keyframes replacing them directly with accurate boundary tracking (`scrollWidth / 2`). |

---

## Verification

- **TypeScript Compilation**: ✅ `npx tsc --noEmit` processed seamlessly without structural failures.
- **Loop Seamlessness**: Arrays visually duplicated into `.displayItems` guaranteeing `scrollPos >= contentRef.current.scrollWidth/2` smoothly resets back to 0 without jolts.
