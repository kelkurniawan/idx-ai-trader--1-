"""
Resilient migration runner for deploy startup.

Replaces a bare `alembic upgrade head` in the start command. It handles the
case where the database schema already exists (created by an earlier
`Base.metadata.create_all` run before Alembic was authoritative) but has no
`alembic_version` row — which makes a plain `alembic upgrade head` fail with
`DuplicateTable: relation "users" already exists`.

Decision table:
  - alembic_version present            → upgrade head        (normal path)
  - no alembic_version, core tables    → stamp head          (adopt existing schema)
  - no alembic_version, empty database → upgrade head        (fresh create)

Run from the backend/ directory:  python run_migrations.py
"""

import os
import sys

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, pool

# Ensure app/ is importable (we run from backend/).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings  # noqa: E402


# A table that always exists once the schema has been created. Used to detect
# a pre-existing (create_all-built) database that was never stamped.
_SENTINEL_TABLE = "users"


def _sync_url() -> str:
    """App URL (asyncpg/aiosqlite) → synchronous driver URL for Alembic."""
    url = get_settings().DATABASE_URL
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("sqlite+aiosqlite://"):
        return url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    return url


def main() -> None:
    sync_url = _sync_url()
    cfg = Config(os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic.ini"))

    engine = create_engine(sync_url, poolclass=pool.NullPool)
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
    finally:
        engine.dispose()

    has_version = "alembic_version" in tables
    has_schema = _SENTINEL_TABLE in tables

    if not has_version and has_schema:
        # Schema exists from a pre-Alembic create_all run — adopt it as-is.
        print(
            "[migrate] Existing schema detected without alembic_version - "
            "stamping head to adopt it (no DDL will run)."
        )
        command.stamp(cfg, "head")
        print("[migrate] Stamped head. Future deploys will upgrade normally.")
        return

    # Fresh database, or already tracked by Alembic → apply pending migrations.
    print("[migrate] Running 'alembic upgrade head'...")
    command.upgrade(cfg, "head")
    print("[migrate] Migrations up to date.")


if __name__ == "__main__":
    main()
