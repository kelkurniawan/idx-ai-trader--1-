# Walkthrough: Xendit Payment Gateway Integration

## Summary

Integrated Xendit Invoice API into the SahamGue backend to support a 3-tier subscription model (**Free / Pro / Expert**) with IDR pricing, multiple billing cycles, a 30-day free Pro trial, and 3-day grace period.

---

## New Files Created

### Models
- [subscription.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/models/subscription.py) — `Subscription` and `PaymentHistory` SQLAlchemy models

### Schemas
- [subscription.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/schemas/subscription.py) — Pydantic request/response schemas for subscription endpoints

### Services
- [plan_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/services/plan_service.py) — Centralized plan management: pricing, feature gates, trial activation, expiry cron
- [xendit_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/services/xendit_service.py) — Xendit Invoice API client with dev mock mode

### Routers
- [subscription.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/subscription.py) — `/api/subscription/*` endpoints (plans, subscribe, status, history)
- [webhook.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/webhook.py) — `/api/webhooks/xendit/*` webhook handler

---

## Modified Files

| File | Change |
|---|---|
| [user.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/models/user.py) | Added `plan_grace_until`, `has_used_trial`, `subscription_cycle` columns |
| [__init__.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/models/__init__.py) | Added import for `Subscription`, `PaymentHistory` |
| [config.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/config.py) | Added Xendit config vars (secret key, webhook token, URLs, environment) |
| [main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/main.py) | Registered subscription + webhook routers, added hourly plan expiry cron job |
| [profile_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/services/profile_service.py) | Replaced old 2-tier `PLAN_FEATURES` dict with import from centralized `plan_service` |
| [profile.py (schema)](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/schemas/profile.py) | Expanded `PlanFeaturesResponse` with 14 feature gate fields |
| [profile.py (router)](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/profile.py) | Simplified plan endpoint to use `PlanFeaturesResponse(**features)` |
| [auth.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/auth.py) | Added 30-day Pro trial activation on both email and Google registration |
| [.env](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/.env) | Added Xendit env vars |
| [.env.example](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/.env.example) | Added Xendit env vars documentation |

---

## New API Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/subscription/plans` | ❌ Public | List all plans with pricing and features |
| `POST` | `/api/subscription/subscribe` | ✅ JWT | Create Xendit invoice for plan upgrade |
| `GET` | `/api/subscription/status` | ✅ JWT | Get current subscription status |
| `GET` | `/api/subscription/history` | ✅ JWT | Get payment history |
| `POST` | `/api/webhooks/xendit/invoice` | x-callback-token | Xendit invoice status webhook |

---

## Key Design Decisions

1. **Centralized plan_service.py** — All pricing, feature gates, and plan logic lives in one file for easy maintenance
2. **Dev mock mode** — When `XENDIT_SECRET_KEY` is empty, the invoice API returns mock data with no real Xendit calls
3. **Idempotent webhooks** — Duplicate Xendit callbacks are safely ignored by checking if the payment is already marked as PAID
4. **Trial = Subscription record** — Trials are stored as `Subscription(is_trial=True, status="TRIAL")`, using the same infrastructure as paid subscriptions
5. **Feature gate extensibility** — Adding a new feature gate is as simple as adding a key to the `PLAN_FEATURES` dict in `plan_service.py`

---

## What's Tested
- ✅ All 6 new files pass `py_compile` syntax checks
- ✅ All 5 modified files pass `py_compile` syntax checks

## What's Remaining
- Alembic migration (run when PostgreSQL is available)
- Full startup test with database connection
- Frontend: Pricing Page, upgrade flow, feature lock overlays
- Xendit Dashboard: account creation, API key generation, webhook URL setup
