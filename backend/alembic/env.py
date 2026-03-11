"""
Alembic environment configuration for SahamGue Python backend.

Key responsibilities:
  1. Read DATABASE_URL from environment (via pydantic Settings) — never hardcoded.
  2. Convert postgresql+asyncpg:// → postgresql+psycopg2:// for the sync migration runner.
     (Alembic uses synchronous psycopg2; the app runtime uses asyncpg.)
  3. Import ALL SQLAlchemy models so autogenerate detects schema changes.
  4. Exclude Prisma-owned tables via include_object() to prevent conflicts.
"""

import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# ─── Ensure app package is importable ────────────────────────────────────────
# alembic is run from the backend/ directory, so app/ is on the Python path.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ─── Import settings (reads DATABASE_URL from .env) ──────────────────────────
from app.config import get_settings

# ─── Import ALL SQLAlchemy models so autogenerate can detect them ─────────────
# Import Base first, then ALL model modules so metadata is populated.
from app.database import Base  # noqa: F401
from app.models import user, profile, analysis, stock  # noqa: F401

# ─── Alembic Config object ───────────────────────────────────────────────────
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ─── Target metadata ─────────────────────────────────────────────────────────
target_metadata = Base.metadata


# ─── Tables owned by Node.js / Prisma — EXCLUDE from Alembic autogenerate ───
# These tables are managed exclusively by Prisma migrations.
# Adding them here would cause Alembic to try to DROP them on cleanup.
PRISMA_OWNED_TABLES = frozenset({
    "news_sources",
    "news_items",
    "agent_runs",
    "user_personalizations",
    # Prisma internal migration table
    "_prisma_migrations",
})


def include_object(object, name, type_, reflected, compare_to):
    """
    Filter function for autogenerate.
    Returns False for any table that Prisma owns — Alembic will ignore it.
    """
    if type_ == "table" and name in PRISMA_OWNED_TABLES:
        return False
    return True


def get_sync_database_url() -> str:
    """
    Convert the app's asyncpg DATABASE_URL to a synchronous psycopg2 URL
    that Alembic's synchronous migration runner can use.

    Transformation examples:
      postgresql+asyncpg://user:pass@host/db  → postgresql+psycopg2://user:pass@host/db
      postgresql://user:pass@host/db          → postgresql+psycopg2://user:pass@host/db
      sqlite+aiosqlite:///./db.sqlite         → sqlite:///./db.sqlite
    """
    settings = get_settings()
    url = settings.DATABASE_URL

    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    elif url.startswith("sqlite+aiosqlite://"):
        return url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    # Unknown scheme — return as-is and let SQLAlchemy raise a meaningful error
    return url


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine.
    Calls to context.execute() emit the given string to the script output.
    """
    url = get_sync_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode using a synchronous psycopg2 engine.

    Alembic is a synchronous tool — we must use psycopg2 here even though
    the application itself uses asyncpg. Both connect to the same PostgreSQL
    database; only the Python driver differs.
    """
    sync_url = get_sync_database_url()

    # Override the sqlalchemy.url from alembic.ini (which is left blank)
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = sync_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


# ─── Entry point ─────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
