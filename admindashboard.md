# Admin Dashboard Guide

This guide explains how to access the SahamGue admin dashboard and what each admin feature is for.

## Access Requirements

The admin dashboard is only visible to authenticated users whose local app profile has:

```text
is_admin = true
```

The frontend checks `user.is_admin` before showing the Admin menu. The backend also protects admin operations endpoints with `require_admin`, so a non-admin user cannot load the operations monitor data even if they know the API URL.

## How To Open The Dashboard

1. Sign in to SahamGue with an admin account.
2. Complete profile setup if the app asks for it.
3. On desktop, open the left sidebar and look for the **SISTEM** section.
4. Click **Admin**.
5. The admin dashboard opens as a full-page admin workspace.

If the Admin menu is not visible, the logged-in user is not marked as an admin in the backend database.

## Admin Tabs

### Ops Monitor

The Ops Monitor is the default admin tab. It gives a high-level operations view of the running app.

It shows:

- Active users
- Deactivated users
- New users in the last 24 hours
- Active subscriptions
- Revenue from paid payments in the last 7 days
- Pending payments
- Failed or expired payments in the last 24 hours
- Total API requests observed by the current backend process
- Error rate
- Average backend latency
- AI endpoint request count
- Configured Gemini default and pro models

Service health cards include:

- Database
- Redis
- Clerk Auth
- Gemini AI
- Xendit Payments
- reCAPTCHA
- Ops Alerts

Traffic views include:

- Recent per-minute request activity
- Top API route groups by request count
- Route-level error counts
- Average route latency

Important limitation: AI token usage currently shows request volume and model configuration. Exact provider token/cost usage requires integration with a billing or usage source such as provider billing export, provider usage APIs, or your own token accounting table.

### Stock Overrides

Use this tab to manage stock-related override data used by the application. This is useful when stock metadata, display names, sectors, or curated values need manual correction.

Typical use cases:

- Correct stock display data
- Maintain manually curated ticker metadata
- Review stock records before they are shown in the app

### News Manager

Use this tab to manage the news content workflow connected to the Node news backend.

Typical use cases:

- Review news entries
- Manage curated or AI-assisted news output
- Trigger or inspect news-related admin workflows, depending on backend availability

### Import / Export

Use this tab for data import and export operations.

Typical use cases:

- Import stock data
- Export operational data
- Move curated data between local, staging, and production environments

Before importing production data, take a database backup.

### Billing Ops

Use this tab to inspect and support billing records.

Typical use cases:

- Review payment support details
- Reconcile billing records
- Inspect failed, pending, expired, or paid invoices
- Support refund or payment status workflows

Billing operations should be treated as sensitive. Always cross-check Xendit records before taking action on customer billing state.

## Backend Endpoint

The Ops Monitor calls:

```text
GET /api/admin/ops/overview
```

Authentication:

- Requires a valid user session or bearer token.
- Requires `is_admin = true`.

The endpoint returns:

- `summary`: user, subscription, payment, traffic, latency, and AI request counts
- `services`: service health/configuration statuses
- `traffic`: recent in-process minute buckets
- `routes`: top route groups by request volume
- `ai`: Gemini model configuration and observed AI request count

## How Metrics Are Collected

The backend records lightweight in-process request metrics through middleware.

Current metrics include:

- Request count
- Error count for HTTP 5xx responses
- Average latency
- Route group
- Recent per-minute request buckets
- AI request count for `/api/ai/*`

Because these metrics are in memory:

- They reset when the backend restarts.
- They are per backend instance.
- They are useful for quick MVP operations visibility.
- They are not a replacement for long-term monitoring such as Sentry, Grafana, Better Stack, CloudWatch, or OpenTelemetry.

## Recommended Production Monitoring

Use the admin dashboard for quick internal visibility, then pair it with external monitoring.

Recommended external checks:

- `GET /healthz`
- `GET /health`
- `GET /api/subscription/plans`
- SSL certificate expiry
- Xendit webhook failure alerts
- Gemini quota or billing alerts
- Database backup success/failure
- Redis availability

The repository includes `monitoring.example.yml` as a starting point.

## Troubleshooting

### Admin Menu Is Missing

Check that the user row in the backend database has:

```text
is_admin = true
```

Then sign out and sign in again so the frontend receives the updated profile state.

### Ops Monitor Shows Missing Services

Check production environment variables:

- `CLERK_SECRET_KEY`
- `GEMINI_API_KEY`
- `XENDIT_SECRET_KEY`
- `XENDIT_WEBHOOK_TOKEN`
- `RECAPTCHA_SECRET_KEY`
- `REDIS_URL`
- `OPS_ALERT_WEBHOOK_URL`

Some services may show `missing` in development if they are intentionally not configured.

### Redis Shows Down

Confirm:

- Redis container/service is running.
- `REDIS_URL` points to the reachable Redis host.
- `OTP_STORE_BACKEND=redis` and `RATE_LIMIT_BACKEND=redis` in production.

### Database Shows Down

Confirm:

- Postgres is running.
- `DATABASE_URL` is correct.
- Migrations have run.
- Network access from backend to database is allowed.

### AI Token Usage Is Not Exact

The current dashboard tracks observed AI endpoint requests, not provider token consumption. To add exact token/cost monitoring, connect one of these sources:

- Gemini billing export
- Provider usage API
- Internal token accounting table in `genai_client`
- External cost monitoring service

## Deployment Checklist

Before relying on the dashboard in production:

1. Run `npm run check`.
2. Run `python scripts/production_preflight.py` with real production env vars.
3. Deploy with HTTPS enabled.
4. Sign in with an admin user.
5. Open **Admin > Ops Monitor**.
6. Confirm database and Redis are healthy.
7. Confirm Clerk, Xendit, reCAPTCHA, and Gemini show configured.
8. Call a few app pages and confirm traffic counters move.
9. Confirm external monitors are also configured.
