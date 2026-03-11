# Alembic Migration Versions

This directory contains all auto-generated Alembic migration files for the
SahamGue Python backend (SQLAlchemy-owned tables only).

## Ownership Rule
**Python / Alembic owns:**  `users`, `remember_me_tokens`, `notification_preferences`, `user_sessions`

**Node.js / Prisma owns:** `news_sources`, `news_items`, `agent_runs`, `user_personalizations`

Prisma tables are excluded from Alembic autogenerate via `include_object()` in `env.py`.
Never create an Alembic migration that touches a Prisma-owned table.

---

## Workflow

### Create a new migration after changing a model
```bash
cd backend
alembic revision --autogenerate -m "describe_your_change"
alembic upgrade head
```

### Naming convention
Use short, descriptive slugs: `add_user_theme_column`, `create_sessions_table`, etc.

### Apply all pending migrations
```bash
alembic upgrade head
```

### Roll back one step
```bash
alembic downgrade -1
```

### Roll back to a specific revision
```bash
alembic downgrade <revision_hash>
```

### Check current revision
```bash
alembic current
```

### Show migration history
```bash
alembic history --verbose
```

---

## Rules

1. **Never manually edit** a generated migration file after it has been applied to any environment.
2. If a migration has a mistake, **create a new corrective migration** rather than editing the old one.
3. The `alembic upgrade head` command runs automatically on Docker container startup (see `Dockerfile.python`).
4. Always test migrations locally before merging to main.
