# Rollback Guide

Use this when a production deployment crashes, migrations fail, or a release causes critical user impact.

## Golden Rule

Never roll back code across an already-applied destructive database migration without first confirming the old code can run against the current schema.

## Before Every Release

1. Tag the currently healthy release:

```powershell
git tag prod-YYYYMMDD-HHMM
git push origin prod-YYYYMMDD-HHMM
```

2. Take a manual PostgreSQL backup before `alembic upgrade head` and Prisma migrations.
3. Confirm `npm run check`, `python scripts/production_preflight.py`, and the go-live smoke test pass.
4. Record the Docker image digest or hosting provider deployment id.

## Fast Code Rollback

If the new code crashes but migrations are compatible:

1. Re-deploy the previous image/deployment id from the hosting provider.
2. Keep the database as-is.
3. Run smoke tests:

```powershell
python scripts/go_live_smoke_test.py --base-url https://your-domain.com
```

4. Confirm admin Ops Monitor health and logs.

## Database Rollback

If the migration itself failed before completion, restore the pre-release backup instead of guessing table state.

If the migration completed and you must roll back schema:

```powershell
cd backend
alembic current
alembic downgrade -1
```

Only do this when the migration downgrade is known to be non-destructive. For billing/auth data, restoring a verified backup is safer than downgrading blindly.

## Emergency User-Safe Mode

If payments, auth, or AI providers are unstable:

- Keep the frontend online.
- Disable high-cost or risky traffic at the gateway or provider dashboard.
- Keep `/health`, legal pages, and support/contact routes reachable.
- Pause subscription operations in Xendit if billing state is uncertain.

## After Rollback

1. Open the admin Ops Monitor and verify API error rate, latency, user counts, and service cards.
2. Check provider dashboards for Clerk, Xendit, Gemini, Redis, and database.
3. Review alerts using the request id from `errorhandler.md`.
4. Create a post-incident note before attempting a new deployment.
