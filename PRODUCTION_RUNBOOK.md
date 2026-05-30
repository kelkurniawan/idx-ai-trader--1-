# Production Runbook

This runbook covers the remaining launch steps that require operator access to provider dashboards, DNS, or production infrastructure.

## 1. Rotate Exposed Secrets

Rotate every credential that ever appeared in committed files or logs:

- Clerk secret key and publishable key pair
- Xendit secret key and webhook verification token
- Gemini API key
- JWT secret
- MFA encryption key
- SMTP credentials
- Ops alert webhook bearer/token
- Database passwords

Do not reuse old values. Treat the old local SQLite database as compromised test data.

## 2. Purge Git History

The current tree removes sensitive files from tracking, but old commits may still contain them if the repo was pushed or shared.

Recommended flow on a protected branch:

```powershell
pip install git-filter-repo
git clone --mirror <repo-url> repo-cleanup.git
cd repo-cleanup.git
git filter-repo --path backend/.env --path .env.production --path backend/idx_trader.db --invert-paths
git push --force --mirror
```

After rewriting history, every collaborator must re-clone or carefully reset their local clone.

## 3. Production Environment

For the **free tier deployment** (Vercel + Render + Neon + Upstash + Resend) use `backend/.env.free.example` as the template — it includes provider-specific notes and free-tier connection string formats.

For a **Docker / VPS deployment** use `backend/.env.production.example`.

Set all vars in the deployment platform dashboard, never in committed files:

```text
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql+asyncpg://...   # Neon direct URL (free) or your Postgres host
JWT_SECRET_KEY=<64+ random chars>
MFA_ENCRYPTION_KEY=<64 hex chars>
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_ISSUER=https://...
GOOGLE_OAUTH_CLIENT_ID=...
GEMINI_API_KEY=...                       # Free: 1 500 req/day on Gemini Flash
RECAPTCHA_SECRET_KEY=...
RECAPTCHA_ENABLED=true
OTP_STORE_BACKEND=redis
RATE_LIMIT_BACKEND=redis
REDIS_URL=redis://redis:6379/0
PUBLIC_APP_URL=https://your-domain.com
CORS_ORIGINS=https://your-domain.com
TRUSTED_HOSTS=your-domain.com,www.your-domain.com
STRICT_ORIGIN_CHECK=true
GLOBAL_API_RATE_LIMIT_PER_MINUTE=300
PASSWORD_RESET_EXPIRE_MINUTES=30
OPS_ALERT_WEBHOOK_URL=https://...
OPS_ALERT_WEBHOOK_BEARER=...
XENDIT_SECRET_KEY=...
XENDIT_WEBHOOK_TOKEN=...
XENDIT_ENVIRONMENT=LIVE
XENDIT_SUCCESS_URL=https://your-domain.com/payment/success
XENDIT_FAILURE_URL=https://your-domain.com/payment/failed
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_API_URL=
APP_SITE_ADDRESS=your-domain.com
```

## 4. Preflight

Run locally before building images:

```powershell
python scripts/production_preflight.py --skip-env
npm run check
```

Run on the production host or CI environment with real env vars:

```powershell
python scripts/production_preflight.py
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
python scripts/go_live_smoke_test.py --base-url https://your-domain.com
```

## 5. Database And Backups

- Use PostgreSQL for production.
- Confirm `alembic upgrade head` succeeds before app traffic.
- Confirm Prisma migrations succeed for the Node service.
- Enable automated daily Postgres backups.
- Test restore before launch day.
- Take a manual backup before each migration.
- Confirm the Alembic baseline and indexes are applied with `alembic upgrade head`.
- Keep the rollback tag, DB backup name, and deployed image digest in the release notes.

## 6. Provider Dashboard Checks

- Clerk production instance uses the live domain and redirect URLs.
- reCAPTCHA allows the live domain.
- Xendit webhook URL points to `https://your-domain.com/api/webhooks/xendit/invoice`.
- Xendit webhook token matches production env.
- Gemini quota/billing alerts are enabled.
- SMTP is configured if local-account password reset emails are enabled.

## 7. Monitoring

At minimum, monitor:

- `GET /healthz`
- `GET /health`
- `GET /api/subscription/plans`
- Error logs from Python backend, Node backend, Caddy, Postgres, and Redis
- Xendit webhook failures
- Gemini quota or 5xx failures
- Critical backend alerts from `OPS_ALERT_WEBHOOK_URL`
- Password reset email delivery failures

Suggested external monitors: Better Stack, Sentry, Grafana Cloud, UptimeRobot, or your hosting provider's native alerts.

## 8. Rollback Readiness

Before launch, rehearse the rollback path in `ROLLBACK.md`:

- Tag the last known good release.
- Store the image digest or hosting deployment id.
- Take a pre-migration database backup.
- Verify that a previous image can be redeployed without rebuilding.
- Use database downgrade only for known non-destructive migrations; otherwise restore the backup.

## 9. Launch Decision

Launch only when:

- `npm run check` passes.
- `production_preflight.py` passes with real env vars.
- `go_live_smoke_test.py` passes over HTTPS.
- Secrets have been rotated.
- Git history has been purged if the repo was shared.
- Legal pages have been reviewed for your jurisdiction.
