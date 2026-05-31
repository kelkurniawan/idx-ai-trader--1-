
# Changelog

All notable changes to the IDX AI Trader project will be documented in this file.

## [1.9.0] - Real Data Pipeline & Free-Tier Go-Live - 2026-05-31

### Added
- **Real Stock Prices (Yahoo Finance):** Added `backend/app/services/price_ingest_service.py` to fetch 1 year of daily OHLCV per IDX ticker (`.JK` symbols) from Yahoo Finance and upsert it into the existing `stock_prices` table, with per-ticker error isolation and a polite throttle. Seeds the `stocks` universe idempotently.
- **DB-Backed Analysis Read Path:** Added `backend/app/services/stock_repository.py` and rewired `stocks.py` / `market_analyzer.py` so technicals, signals, and prices are computed from stored real OHLCV when `USE_REAL_PRICES=true`, falling back to the deterministic mock per ticker. `data_source` now reports `"live"` vs `"mock"` honestly.
- **Internal Trigger Endpoint:** Added secret-guarded `POST /api/internal/refresh-prices` (`backend/app/routers/internal.py`) protected by `INTERNAL_API_SECRET`, plus the `USE_REAL_PRICES` config flag.
- **Groq Impact Classification:** Extended the Groq summarizer to classify `impactLevel` (breaking/high/medium/low) on every article — it always runs on the free tier, giving real signal for the news tabs.
- **Field-Based News Tabs:** The `/api/news/feed` tabs (Hot/Critical/Popular/Latest) are now computed VIEWS over `impactLevel` / `views` / recency instead of a stored `category` string, so all tabs populate from real data.
- **News Tab UX:** Wired the React News tab to the real `/api/news/*` endpoints (it previously rendered a hardcoded `DUMMY_NEWS` array) and added a manual **Refresh** control plus a **"new articles available"** indicator.
- **GitHub Actions Scheduler:** Added `.github/workflows/daily-data.yml` to trigger the daily stock ingest (16:30 WIB) and news agent (08:30 WIB) externally — required because Render free services sleep and internal timers don't fire.
- **Free-Tier Deployment:** Added `vercel.json` (edge rewrites replacing the Caddy gateway), `backend/.env.free.example` (Neon + Upstash + Resend + Clerk template), and rewrote `DEPLOYMENT.md` with a Vercel + Render + Neon + Upstash + Resend zero-cost path.
- **Documentation:** Added `CLAUDE.md` (repo guide), `knowledgeWell.md` (deployment error→fix log), `docs/hardening-followups.md` (optional robustness backlog), and the real-data design spec + implementation plan under `docs/superpowers/`.

### Changed
- **News Agent Architecture:** Replaced **BullMQ + Redis** job queues with an in-process background runner (`runAgentInBackground`, single-flight `concurrency:1`). BullMQ hangs and drains the Upstash free command quota on a sleeping free-tier instance; the agent now runs in the Node process after the trigger returns `202` immediately. Dedup still uses Redis via `src/cache/redis.ts`.
- **Operational Docs:** Updated `PRODUCTION_RUNBOOK.md` and `CLAUDE.md` for the free-tier providers and the new pipeline.

### Fixed
- **asyncpg SSL Crash:** `database.py` now strips libpq-only query params (`sslmode`, `channel_binding`) that Neon appends and translates SSL intent into an asyncpg `ssl=True` connect arg — fixes the `connect() got an unexpected keyword argument 'sslmode'` startup crash.
- **Prisma on a Shared DB:** Resolved P1012 (SQLAlchemy `+asyncpg` URL rejected by Prisma), P3005 (non-empty shared schema), and a destructive `db push` by isolating Prisma in a dedicated `news` Postgres schema via `backend/docker-entrypoint.sh` (Python keeps `public`).
- **BullMQ ↔ Upstash:** Built a full ioredis connection (auth + TLS) from `REDIS_URL` before retiring BullMQ entirely (see Changed).
- **Boot Crashes:** Lazily instantiate the Groq/Anthropic/DeepSeek SDK clients so a missing API key no longer crashes the news server at import; fixed `node-cron` v4 breaking change and several TypeScript build errors in the news backend.
- **Ingest Resilience:** Added `await db.rollback()` on a per-ticker ingest failure so one bad ticker can't cascade-fail the rest of the run on PostgreSQL.

## [1.8.0] - Pre-Deployment Security Hardening - 2026-05-17

### Added
- **Password Reset Flow:** Added expiring, one-time local password reset tokens, reset email delivery, backend reset endpoints, and frontend reset screens for `?resetToken=...` links.
- **Global API Guardrails:** Added request IDs, global API rate limiting, Trusted Host validation, and origin/referrer checks for browser API requests.
- **Custom Error Handling:** Added structured backend error responses, React render-failure recovery UI, and `errorhandler.md`.
- **Critical Alerts:** Added ops webhook alerts for unhandled backend exceptions and billing/plan background job failures.
- **Alembic Baseline:** Added a current-schema Alembic baseline with production indexes for auth/session/reset, user, subscription, payment, portfolio, trade journal, stock price, and analysis-cache queries.
- **Rollback Guide:** Added `ROLLBACK.md` and expanded the production runbook with rollback readiness.

### Changed
- **User Isolation Checks:** Kept user-owned portfolio, profile, subscription, and AI routes scoped to authenticated users; Clerk profile sync now rejects mismatched token/request emails when the Clerk token exposes email claims.
- **Input Sanitization:** Added shared schema validators for text, ticker, URL, email, profile, auth, and portfolio/trade fields.
- **Operational Docs:** Updated production env requirements for `PUBLIC_APP_URL`, `TRUSTED_HOSTS`, global rate limits, reset-link expiry, and ops alert webhooks.

## [1.7.0] - Production Readiness & Admin Ops Monitor - 2026-05-15

### Added
- **Admin Ops Monitor:** Added a new default `Ops Monitor` tab inside the existing admin dashboard for monitoring API traffic, service health, users, subscriptions, payments, AI usage, route latency, and error rates.
- **Admin Ops API:** Added the admin-only `GET /api/admin/ops/overview` FastAPI endpoint protected by `require_admin`.
- **Runtime Request Metrics:** Added in-process request telemetry middleware to capture total requests, route-level counts, errors, average latency, recent traffic buckets, and AI endpoint request volume.
- **Service Health Checks:** Added backend health summaries for database, Redis, Clerk, Gemini AI, Xendit, reCAPTCHA, and ops alert configuration.
- **Production Preflight Script:** Added `scripts/production_preflight.py` to detect unsafe deployment state, missing runtime environment variables, and accidentally tracked sensitive/runtime artifacts.
- **Expanded Go-Live Smoke Test:** Extended `scripts/go_live_smoke_test.py` to verify security headers, legal pages, and unauthenticated AI endpoint protection.
- **Legal & Risk Pages:** Added static `public/terms.html` and `public/privacy.html`, plus visible landing-page links.
- **Trading Risk Disclaimer:** Added in-app and landing-page disclaimers clarifying that AI/market analysis is informational and not financial advice.
- **Production Runbook:** Added `PRODUCTION_RUNBOOK.md` covering key rotation, git history purge, env setup, DNS/TLS, backups, provider checks, monitoring, and launch gates.
- **Monitoring Template:** Added `monitoring.example.yml` with suggested uptime checks and alert triggers.
- **Production Readiness Tests:** Added `backend/tests/test_production_readiness.py` to guard production config validation and AI endpoint authentication.
- **Admin Dashboard Guide:** Added `admindashboard.md` with access steps, dashboard feature descriptions, troubleshooting, and operational guidance.

### Changed
- **Admin Dashboard UX:** Updated `components/admin/AdminDashboard.tsx` so `Ops Monitor` is the first/default tab, alongside Stock Overrides, News Manager, Import / Export, and Billing Ops.
- **Production Config Validation:** Hardened `backend/app/config.py` so production fails fast on unsafe defaults such as SQLite, localhost CORS, placeholder secrets, test Clerk/reCAPTCHA keys, missing Redis, non-live Xendit, or missing Gemini configuration.
- **AI Fallback Behavior:** Updated Gemini proxy behavior so production returns controlled service errors instead of silently returning mock trading analysis when AI configuration or provider calls fail.
- **AI Endpoint Protection:** Protected `/api/ai/*` routes with authenticated user checks and per-user/IP rate limits.
- **Database Startup:** Stopped production FastAPI startup from mutating schema with `Base.metadata.create_all`; production schema changes now rely on migrations.
- **Production Gateway:** Updated `Caddyfile.production`, `Dockerfile.frontend`, and `docker-compose.production.yml` to support real-domain HTTPS, frontend build-time env injection, and production gateway ports.
- **Project Checks:** Added `npm run check` to build the frontend, build the Node backend, and run Python readiness tests.
- **Ignore Rules:** Expanded `.gitignore` for production env files, local databases, uploads, Python caches, pytest cache, and generated logs/output.

### Removed
- **Tracked Runtime Artifacts:** Removed tracked env files, SQLite database, Python cache files, logs, and TypeScript output files from git tracking while preserving local copies where applicable.

### Notes
- Exact AI token/cost accounting is not yet connected to a provider billing API. The current Ops Monitor tracks observed AI endpoint request volume and configured Gemini models.
- Live operational work still required outside the repo: rotate exposed credentials, purge git history if the repo was pushed/shared, configure DNS/HTTPS, set production env vars, enable provider billing alerts, and verify backups.

## [1.6.0] - Clerk Authentication Rollout & Launch Hardening - 2026-04-09

### Added
- **Clerk Authentication Bridge:** Added Clerk-backed frontend authentication with local app-user synchronization so billing, admin access, and Xendit ownership remain in the project database.
- **Clerk Failure Diagnostics:** Added a dedicated frontend error state when Clerk sign-in succeeds but backend profile hydration fails, so setup issues are visible instead of silently returning users to the landing page.
- **Clerk Config Guidance:** Added launch-ready Clerk configuration notes across project docs and env templates, including the recommended email/password, verified email, MFA, and backup-code setup.

### Changed
- **Frontend Auth UX:** Updated the sign-in and sign-up messaging in `components/Auth.tsx` to reflect a basic secure Clerk launch flow centered on email/password and verified email.
- **Backend Clerk Verification:** Updated Clerk token verification to derive the issuer and JWKS URL automatically from the Clerk publishable key in development when explicit issuer values are not yet configured.
- **Environment Templates:** Clarified that the frontend must use `VITE_CLERK_PUBLISHABLE_KEY` because the app uses Vite rather than Next.js, and expanded backend production env guidance for Clerk.
- **Project Documentation:** Expanded `documentation.md` and `LAUNCH_DAY_GUIDE.md` with Clerk dashboard security settings, environment notes, and launch configuration recommendations.

### Fixed
- **Blank Sign-In Page:** Removed the stale `@google/genai` import map from `index.html`, which was causing Vite dependency resolution failures and a blank sign-in experience.
- **Missing Clerk Config Crash:** Reworked frontend bootstrapping so missing Clerk env configuration shows a clear setup screen instead of crashing to a blank page.
- **Post-Sign-In Redirect Loop:** Fixed the login flow so successful Clerk authentication can hydrate the local user profile and return the user to the homepage instead of silently dropping back to the landing page.
- **Backend Schema Mismatch:** Applied the missing Alembic migration for `users.clerk_user_id`, resolving the `UndefinedColumnError` that blocked Clerk profile synchronization.

## [1.5.0] - Production Readiness & Profile Management - 2026-03-12

### Added
- **Profile Management System:** Added comprehensive backend `profile.py` models, routers, and schemas, along with frontend components (`ProfilePage`, `ProfileTabs`, `ProfileMenu`) and hooks (`useProfile`, `useMfa`, `useNotifications`) to manage user profiles, MFA settings, and notification preferences.
- **Production Architecture:** Introduced dual-backend monorepo architecture with distinct table ownership (FastAPI + Prisma). Added `ARCHITECTURE.md` and `DEPLOYMENT.md` along with Dockerfiles and a `Caddyfile` gateway for streamlined deployment to production environments (like Railway).
- **Notification Services:** Added robust backend service layers for notifications including `notification_service`, `otp_service`, and `sms_service`.
- **Developer Guides:** Added `design_adoption_guide.md` and new walkthrough documents to assist frontend developers in adhering to the new SahamGue design system without altering functionality.

### Changed
- **UI & Theme Enhancements:** Major modifications to `LearningCenter`, `PortfolioRow`, `TradeJournal`, and `Watchlist` to align with the restyled SahamGue dark theme and new design tokens. Replaced explicit hex color usages with CSS variable tokens (e.g., `SG.bgBase`, `SG.textMuted`) in `App.tsx` and mapped them to `index.css` for robust light/dark theme switching, alongside the addition of a `ThemeToggle` component.

## [1.4.0] - AI News Feature & SahamGue Restyle - 2026-03-11

### Added
- **AI News Page (`NewsPage.tsx`):** Dedicated news section with 5 curated tabs (My News, Hot, Terbaru, Critical, Terpopuler) and filter chips.
- **Smart News Cards:** News cards featuring AI Confidence Score bars, 6 distinct Impact Badges, and interactive ticker tags.
- **Ticker News Panel:** Integrated an AI-curated "Latest News" panel into the Market Analysis tab, including estimated price impact and expandable AI reasoning.
- **Navigation Update:** Expanded the bottom navigation bar to 6 tabs to cleanly include the new News tab on mobile devices.

### Changed
- **SahamGue Design System Restyle:** Completely overhauled `HomeDashboard.tsx` and `App.tsx` navigation elements to match the unified SahamGue design tokens.
- **Visual Upgrades:** Applied glassmorphic cards, deep navy backgrounds (`#0a0f10`), JetBrains Mono for financial data, and a new auto-scrolling Market Pulse Bar with price flash animations.
- **Sidebar & Nav:** Restyled the desktop sidebar and mobile bottom nav with green active indicators and the new 'SG' monogram logo.

### Fixed
- **Market Analysis Crash:** Fixed a React object-as-child error (`Objects are not valid as a React child`) caused by a `selectedStock` object being passed incorrectly to a string prop during a ticker scan.

## [1.3.0] - Auth & UI Enhancements - 2026-02-24

### Added
- **Authentication System:** Complete backend authentication system using JWT in HTTP-only cookies, password hashing with bcrypt, and MFA support (TOTP & OTP).
- **Frontend Auth Flow:** Added `ProfileSetup`, `MfaSetup`, and `MfaVerify` components to handle secure login, registration, and complete user auth flows.
- **Watchlist Hashtags:** Sector and Index tags (e.g., `#Financials`, `LQ45`) are now displayed on the Watchlist tab (`PortfolioRow`), visually linking the Watchlist to the Market Analysis tab.

### Fixed
- **CORS Configuration:** Added `http://localhost:3001` to the backend CORS allowed origins list to resolve dev server connection failures.

## [1.2.1] - Stability Patch - 2025-01-22

### Fixed
- **API Resilience:** Implemented `fetchWithRetry` in `geminiService.ts`. The app now automatically retries on 429 errors and falls back to simulated data if the API is unreachable, fixing crash issues with GOTO/BBCA.
- **Component Safety:** `PortfolioRow` now suppresses console errors when data fails to load, showing an "Offline" badge instead of crashing the React tree.

### Changed
- **Mock Data Logic:** Updated `marketDataService` to use deterministic seeding. This ensures that when the app falls back to mock data, the "simulated" prices don't change randomly on every refresh.

## [1.2.0] - "Fintech Pro" UI Overhaul - 2025-01-22

### Added
- **Sidebar Navigation:** Replaced top-nav with a responsive, glassmorphic sidebar.
- **Bento Grid Dashboard:** Redesigned the main landing view into a modular grid layout.
- **Theme Engine:** Added system-aware Dark Mode support (`html.dark` class strategy).
- **Skeleton Loaders:** Added `HeaderPriceSkeleton`, `AnalysisSkeleton`, and `GaugeSkeleton` for smoother data fetching states.

### Changed
- **Visual Language:** 
    - Color palette shifted to professional Slate (900/50) + Indigo/Emerald accents.
    - Added "Glow" effects to inputs and active states.
    - Chart tooltips are now dark-mode native with blur effects.
- **Gauge Component:** Completely rewritten using SVG paths for smoother animation and sharper visuals on high-DPI screens.

## [1.1.0] - Analysis Tools Expansion

### Added
- **Chart Vision:** `ChartAnalyzer.tsx` now supports image uploads. AI returns JSON coordinates to draw Support/Resistance lines directly on the image.
- **Backtester:** Added client-side strategy simulation (SMA, RSI, Momentum).
- **Trade Journal:** CRUD functionality for logging trades with PnL tracking.
- **Community Feed:** Social interaction simulation.

## [1.0.0] - Initial Release

### Features
- Real-time stock data fetching via Gemini (`googleSearch`).
- Technical Indicator calculation (RSI, MACD, EMA).
- Basic Interactive Charts (`recharts`).
- Authentication (Mock Login/Register).
-   * * [ U I / U X ] * *   R e s t y l e d   t h e   M a r k e t   A n a l y s i s   T a b   a n d   a l l   o f   i t s   c o m p o n e n t s   ( S e c t o r / I n d e x   S c a n n e r s ,   T i c k e r   s e a r c h ,   F u n d a m e n t a l / Q u a l i t a t i v e   A n a l y s i s   C a r d s ,   T o p   c h a r t s ,   a n d   A I   I n s i g h t s )   u s i n g   t h e   n e w   S a h a m G u e   d a r k   t h e m e   a n d   J e t B r a i n s   M o n o   t y p o g r a p h y .  
 -   * * [ U I / U X ] * *   F i x e d   m o b i l e   r e s p o n s i v e n e s s   i n   t h e   M a r k e t   A n a l y s i s   t a b   b y   e n s u r i n g   h e l p e r   c a r d s   ( T r e n d ,   V e r d i c t ,   e t c . )   s t a c k   p r o p e r l y   o n   s m a l l   s c r e e n s ,   s h r i n k i n g   m a s s i v e   t e x t   s i z e s ,   a n d   a d j u s t i n g   c h a r t   c o n t r o l s .  
 
