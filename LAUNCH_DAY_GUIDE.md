# Launch Day Guide

This guide assumes you will deploy the stack using the production files already in this repository:

- `backend/.env.production`
- `docker-compose.production.yml`
- `Caddyfile.production`
- `scripts/go_live_smoke_test.py`

Assumption:
- Main app domain: `https://your-domain.com`
- Hosting: Docker with Caddy as the public gateway
- Internal services: `python_backend`, `node_backend`, `postgres`, `redis`

If your real domain or hosting is different, keep the same checklist and replace only the domain/service details.

## 1. Create `backend/.env.production`

Copy:

```bash
cp backend/.env.production.example backend/.env.production
```

Fill these values before launch:

### Core app

- `ENVIRONMENT=production`
- `DEBUG=false`

### Database

- `DATABASE_URL=postgresql+asyncpg://<user>:<password>@postgres:5432/<db_name>`

### Security

- `JWT_SECRET_KEY=<64 hex chars>`
- `MFA_ENCRYPTION_KEY=<64 hex chars>`
- `CORS_ORIGINS=https://your-domain.com`

Generate the two secrets with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### reCAPTCHA

- `RECAPTCHA_SECRET_KEY=<live secret>`
- `RECAPTCHA_SITE_KEY=<live site key>`
- `RECAPTCHA_ENABLED=true`

### Redis-backed shared state

- `OTP_STORE_BACKEND=redis`
- `RATE_LIMIT_BACKEND=redis`
- `REDIS_URL=redis://redis:6379/0`

### Email / OTP

- `SMTP_HOST=<your smtp host>`
- `SMTP_PORT=587`
- `SMTP_USER=<smtp user>`
- `SMTP_PASSWORD=<smtp password>`
- `SMTP_FROM=noreply@your-domain.com`

### Google / AI

- `GOOGLE_OAUTH_CLIENT_ID=<live google oauth client id>`
- `GEMINI_API_KEY=<live gemini key>`

### Xendit

- `XENDIT_SECRET_KEY=<live xendit secret>`
- `XENDIT_WEBHOOK_TOKEN=<live webhook verification token>`
- `XENDIT_ENVIRONMENT=LIVE`
- `XENDIT_SUCCESS_URL=https://your-domain.com/payment/success`
- `XENDIT_FAILURE_URL=https://your-domain.com/payment/failed`

### Ops alerting

- `OPS_ALERT_WEBHOOK_URL=<slack, discord, or webhook endpoint>`
- `OPS_ALERT_WEBHOOK_BEARER=<optional bearer token>`

Recommended: point this to a Slack/Discord/incident webhook so you get alerts for:
- webhook token mismatch
- payment amount mismatch
- reconciliation anomalies

## 2. Frontend production env

The repo already sets:

- `.env.production`
  - `VITE_APP_MODE=production`
  - `VITE_API_URL=`

Leave `VITE_API_URL` empty if frontend and API are served from the same public domain through Caddy.

## 3. Xendit dashboard checklist

Before deploy:

1. Set invoice webhook URL to:
   - `https://your-domain.com/api/webhooks/xendit/invoice`
2. Set the Xendit verification token.
3. Copy that exact token into `XENDIT_WEBHOOK_TOKEN`.
4. Confirm success/failure redirect URLs:
   - `https://your-domain.com/payment/success`
   - `https://your-domain.com/payment/failed`
5. Confirm your live account is active and payment methods are enabled.

## 4. Launch commands

### Build and start

```bash
docker compose -f docker-compose.production.yml up --build -d
```

### Check container status

```bash
docker compose -f docker-compose.production.yml ps
```

### Check backend logs

```bash
docker compose -f docker-compose.production.yml logs -f python_backend
```

### Check gateway logs

```bash
docker compose -f docker-compose.production.yml logs -f frontend_gateway
```

## 5. Smoke test after deploy

Run:

```bash
python scripts/go_live_smoke_test.py --base-url https://your-domain.com
```

Expected checks:
- gateway health passes
- backend health passes
- subscription plans endpoint returns data
- frontend root page loads

## 6. First manual production checks

After smoke test:

1. Open the site in browser.
2. Register a real account.
3. Log in.
4. Open profile page.
5. Confirm billing status loads.
6. Open admin billing ops.
7. Confirm overview loads.
8. Create a paid invoice in Xendit test/live-safe flow.
9. Pay it.
10. Confirm the webhook marks it paid and the user plan upgrades.
11. Open admin billing ops again and confirm:
   - no anomaly
   - payment row visible
   - support detail loads

## 7. Rollback plan

If launch day goes wrong:

1. Disable public marketing/payment CTA first.
2. Keep app online for existing users if auth is healthy.
3. Inspect:
   - `python_backend` logs
   - `frontend_gateway` logs
   - webhook delivery logs in Xendit
4. Run admin reconciliation.
5. If billing state is inconsistent, pause campaigns and fix state before resuming paid acquisition.

## 8. Post-launch daily checks

Every day for the first week:

1. Check pending invoices.
2. Check reconciliation anomalies.
3. Check ops alert webhook channel.
4. Check users with paid plan but no linked subscription.
5. Check users with auto-renew disabled unexpectedly.
6. Check login / MFA / trial rate-limit spikes.

## 9. Quick command set

```bash
cp backend/.env.production.example backend/.env.production
docker compose -f docker-compose.production.yml up --build -d
docker compose -f docker-compose.production.yml ps
python scripts/go_live_smoke_test.py --base-url https://your-domain.com
docker compose -f docker-compose.production.yml logs -f python_backend
```
