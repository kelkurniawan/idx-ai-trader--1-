#!/bin/sh
set -e

# --- Normalize DATABASE_URL for Prisma ------------------------------------
# Prisma only accepts postgresql:// / postgres://. Strip a SQLAlchemy-style
# "+asyncpg" suffix so the same Neon connection string works for either backend.
DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed -e 's|postgresql+asyncpg://|postgresql://|')

# --- Scope Prisma to its own "news" schema --------------------------------
# This is a SHARED database. Python owns the public schema (users, sessions,
# subscriptions, alembic_version, ...). Prisma owns only 4 tables. Isolating
# Prisma in a dedicated "news" schema means db push never sees — and never
# drops — the Python-owned tables in public.
case "$DATABASE_URL" in
  *schema=*) : ;;                                   # already scoped, leave as-is
  *\?*)      DATABASE_URL="${DATABASE_URL}&schema=news" ;;
  *)         DATABASE_URL="${DATABASE_URL}?schema=news" ;;
esac
export DATABASE_URL

echo "[entrypoint] Syncing Prisma-owned tables into the 'news' schema..."
npx prisma db push --skip-generate

echo "[entrypoint] Starting news server..."
exec node dist/server.js
