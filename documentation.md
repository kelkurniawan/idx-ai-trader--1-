# IDX AI Trader Documentation

## 1. Project Overview

IDX AI Trader is a full-stack stock analysis platform focused on the Indonesia Stock Exchange. It combines:

- a React frontend
- a Python FastAPI backend for auth, profile, AI, portfolio, and subscriptions
- a Node.js backend for news and agent-style workloads
- PostgreSQL for persistent relational data
- Redis for shared OTP and rate-limit state in production
- Xendit for subscription billing

The current product includes:

- authentication with Clerk-backed sign-in/sign-up plus local app user synchronization
- stock analysis and AI-assisted workflows
- portfolio, journal, and watchlist features
- subscription plans, trial flow, renewal controls, and admin billing operations

## 2. High-Level Architecture

The repository is a monorepo with three main runtime layers:

### Frontend

- React + TypeScript + Vite
- Public user interface
- Calls backend APIs over `/api/*`

### Python backend

- FastAPI + SQLAlchemy Async
- Owns:
  - authentication
  - profiles
  - MFA
  - portfolio routes
  - AI proxy routes
  - subscription and Xendit routes
  - billing reconciliation

### Node backend

- Secondary service for news and agent workflows
- Routed separately behind the gateway

### Infrastructure

- PostgreSQL for persistent data
- Redis for shared OTP state and shared rate limiting in production
- Caddy as reverse proxy / static frontend gateway

## 3. Repository Layout

Top-level directories and important files:

- `App.tsx`
  - main frontend app shell and view routing
- `components/`
  - frontend UI components
- `pages/`
  - top-level frontend pages
- `services/`
  - frontend API client wrappers
- `backend/app/`
  - Python backend application
- `backend/app/routers/`
  - FastAPI route modules
- `backend/app/services/`
  - backend business logic and integrations
- `backend/app/models/`
  - SQLAlchemy models
- `backend/app/schemas/`
  - Pydantic request/response schemas
- `docker-compose.yml`
  - local/dev container stack
- `docker-compose.production.yml`
  - production-oriented container stack
- `Caddyfile.production`
  - production gateway config
- `backend/.env.production.example`
  - production environment template
- `LAUNCH_DAY_GUIDE.md`
  - practical launch-day checklist
- `XENDIT_LAUNCH_CHECKLIST.md`
  - Xendit-specific billing launch checklist

## 4. Frontend

### Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Lucide icons

### Main frontend responsibilities

- user navigation and page rendering
- auth/session-aware UI
- profile and billing controls
- admin dashboard
- subscription flows
- loading and skeleton states

### Important frontend files

- `App.tsx`
  - app-level routing and lazy loading
- `components/profile/ProfileTabs.tsx`
  - profile, security, notifications, and current billing controls
- `components/admin/AdminDashboard.tsx`
  - admin shell
- `components/admin/BillingOps.tsx`
  - admin billing overview, reconciliation, payment support actions
- `services/subscriptionApi.ts`
  - subscription and billing API client
- `services/profileApi.ts`
  - profile API client

### Frontend build

```bash
npm install
npm run build
```

## 5. Python Backend

### Stack

- FastAPI
- SQLAlchemy Async
- Pydantic
- Alembic
- Redis client
- Google Gen AI SDK

### Main backend routes

Mounted in `backend/app/main.py`:

- `/api/auth`
- `/api/profile`
- `/api/stocks`
- `/api/analyze`
- `/api/predict`
- `/api/ai`
- `/api/portfolio`
- `/api/strip`
- `/api/subscription`
- `/api/webhooks/xendit`

### Important backend service modules

- `backend/app/services/auth_service.py`
  - auth dependencies and cookie handling
- `backend/app/services/mfa_service.py`
  - OTP and MFA helpers
- `backend/app/services/otp_service.py`
  - profile OTP store abstraction
- `backend/app/services/request_guard.py`
  - rate limiting
- `backend/app/services/plan_service.py`
  - subscription lifecycle and plan activation
- `backend/app/services/billing_ops_service.py`
  - reconciliation, admin billing metrics, support actions
- `backend/app/services/xendit_service.py`
  - Xendit integration
- `backend/app/services/alert_service.py`
  - external ops alert delivery
- `backend/app/services/genai_client.py`
  - wrapper around `google.genai`

### Background work

`backend/app/main.py` starts an hourly background task that:

1. checks for expired plans
2. applies renewal/downgrade logic
3. runs billing reconciliation

## 6. Authentication and Security

### Authentication model

- Clerk provides the user-facing authentication experience
- the frontend sends Clerk bearer tokens to the Python backend
- the backend verifies Clerk tokens and syncs users into the local `users` table using `clerk_user_id`
- local app ownership remains the source of truth for:
  - `is_admin`
  - subscription state
  - Xendit customer and payment records
  - profile completeness and other app-specific data
- legacy local auth paths may still exist during migration, but Clerk is now the intended primary login flow

### Security controls currently present

- HTTP-only auth cookies
- security headers middleware
- reCAPTCHA on auth entry points
- encrypted TOTP secret storage
- admin-only route guards
- webhook token validation
- rate limits on sensitive auth, subscription, and webhook routes

### Production security recommendations

- always run behind HTTPS
- use production reCAPTCHA keys
- restrict `CORS_ORIGINS` to your real domain
- keep `JWT_SECRET_KEY` and `MFA_ENCRYPTION_KEY` private and strong
- use Redis-backed shared state in production

## 7. Billing and Subscriptions

### Current billing model

- Plans:
  - `FREE`
  - `PRO`
  - `EXPERT`
- Billing cycles:
  - `MONTHLY`
  - `QUARTERLY`
  - `ANNUAL`
- One-time free trial flow for `PRO`
- Auto-renew support through saved payment method

### Subscription routes

Main routes under `/api/subscription`:

- `GET /plans`
- `GET /status`
- `POST /start-trial`
- `POST /start-trial/confirm`
- `POST /subscribe`
- `GET /history`
- `GET /auto-renew`
- `POST /auto-renew/disable`
- `POST /cancel`
- `GET /admin/overview`
- `POST /admin/reconcile`
- `GET /admin/payments/{payment_id}`
- `POST /admin/payments/{payment_id}/refund-support`

### Billing operations implemented

- trial activation only after payment method confirmation
- renewal/entitlement extension logic
- customer auto-renew disable and cancel-at-period-end
- admin billing overview
- admin reconciliation
- admin payment support drill-down
- refund support state recording
- optional access revocation

### Important billing note

The admin refund support action is an internal control and audit step. The actual provider-side refund must still be performed in Xendit Dashboard unless you later add a full provider refund integration for the specific payment primitives you use.

## 8. Xendit Integration

### Current usage

The app uses Xendit for:

- invoice creation
- invoice webhook handling
- customer creation
- payment method tokenization
- payment method status lookup
- saved payment method charging

### Important files

- `backend/app/services/xendit_service.py`
- `backend/app/routers/webhook.py`
- `XENDIT_LAUNCH_CHECKLIST.md`

### Webhook

The main webhook endpoint is:

- `/api/webhooks/xendit/invoice`

The webhook handler validates:

- callback token
- local invoice existence
- amount consistency

It also emits ops alerts on:

- token mismatch
- unknown invoice
- amount mismatch

## 9. Data Ownership

This project uses a dual-backend approach with strict ownership boundaries.

### Python-owned concerns

- users
- sessions
- remember-me tokens
- notification preferences
- subscriptions
- payment history
- profile and MFA state

### Node-owned concerns

- news pipeline
- agent runs
- other Node-side content/automation tables

Python and Node should communicate over internal HTTP where cross-service behavior is required rather than directly sharing ORM access to each other’s tables.

## 10. Redis Usage

Redis is used in production for:

- OTP storage
- shared rate limiting

Relevant config:

- `OTP_STORE_BACKEND=redis`
- `RATE_LIMIT_BACKEND=redis`
- `REDIS_URL=redis://redis:6379/0`

If Redis is unavailable, the app falls back to in-memory behavior, which is acceptable for local development but not ideal for multi-instance production.

## 11. Ops Alerting

The backend can send external alert webhooks for operational issues.

Relevant config:

- `OPS_ALERT_WEBHOOK_URL`
- `OPS_ALERT_WEBHOOK_BEARER`

Current alert sources include:

- webhook token mismatch
- webhook amount mismatch
- reconciliation anomalies

Recommended target:

- Slack incoming webhook
- Discord webhook
- internal incident endpoint

## 12. Production Environment Variables

Use `backend/.env.production.example` as the source of truth.

Main categories:

- app mode
- database
- JWT / encryption
- reCAPTCHA
- Redis
- SMTP
- Google OAuth / Gemini
- Xendit
- ops alerting
- CORS

Frontend production values are in `.env.production`.

### Clerk environment naming note

This frontend is built with Vite, so the public Clerk key must use:

- `VITE_CLERK_PUBLISHABLE_KEY`

Do not use:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

That `NEXT_PUBLIC_*` prefix is for Next.js projects and will not be exposed to this Vite app.

Backend Clerk values stay server-side and should use:

- `CLERK_SECRET_KEY`
- `CLERK_ISSUER`
- `CLERK_JWKS_URL`

## 13. Local Development

### Frontend

```bash
npm install
npm run dev
```

### Backend

Use the Python virtual environment and backend env file, then run FastAPI. If you use Docker locally, the repo already includes `docker-compose.yml`.

### Local full stack

```bash
docker compose up --build -d
```

Default local gateway:

- `http://localhost:8080`

## 14. Production Deployment

### Main production files

- `docker-compose.production.yml`
- `Caddyfile.production`
- `backend/.env.production`

### Production deploy command

```bash
docker compose -f docker-compose.production.yml up --build -d
```

### Post-deploy smoke test

```bash
python scripts/go_live_smoke_test.py --base-url https://your-domain.com
```

## 15. Admin Operations

### Admin billing tasks now supported

- view revenue and billing summary
- inspect pending and paid invoices
- run reconciliation
- inspect a payment’s customer and entitlement context
- record refund request / refund completion state
- disable renewal
- optionally revoke access when appropriate

### Admin operational recommendation

For billing support cases:

1. inspect the payment in admin billing ops
2. verify provider state in Xendit Dashboard
3. process provider action first if needed
4. record support state in the app
5. run reconciliation if billing state looks inconsistent

## 16. Testing and Verification

Useful checks already used during hardening:

- backend import test
- Python compile check
- frontend production build
- post-deploy smoke test

Commands:

```bash
.\.venv\Scripts\python.exe -m compileall backend\app scripts
.\.venv\Scripts\python.exe -c "from backend.app.main import app; print(app.title)"
npm run build
python scripts/go_live_smoke_test.py --base-url https://your-domain.com
```

## 17. Remaining Improvements

The project is much closer to production-ready, but these are still good next steps:

- provider-side automated refund integration if needed
- Redis health monitoring and alerting
- centralized structured logging
- admin audit log for billing/admin actions
- chunk-size optimization on frontend build
- expanded end-to-end automated tests for paid flows

## 18. Recommended Reading in This Repo

- `DEPLOYMENT.md`
- `ARCHITECTURE.md`
- `LAUNCH_DAY_GUIDE.md`
- `XENDIT_LAUNCH_CHECKLIST.md`
- `production_hardening_plan.md`

## 19. Owner Notes

This documentation reflects the current repository state after the launch-hardening work:

- shared Redis-ready production state
- migrated Gemini integration to `google.genai`
- billing ops dashboard and support actions
- Xendit launch and reconciliation tooling
- Docker/Caddy production deployment path

If you change domain, hosting, or payment primitives later, update:

- `backend/.env.production`
- `Caddyfile.production`
- `docker-compose.production.yml`
- `LAUNCH_DAY_GUIDE.md`
- `XENDIT_LAUNCH_CHECKLIST.md`
