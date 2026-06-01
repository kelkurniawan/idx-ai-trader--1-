"""
Resilient, self-diagnosing migration runner for deploy startup.

Replaces a bare `alembic upgrade head` in the start command. Handles the case
where the database schema already exists (created by an earlier
`Base.metadata.create_all` run before Alembic was authoritative) but has no /
stale `alembic_version` row — which makes `alembic upgrade head` fail with
`DuplicateTable: relation "users" already exists` (or `column ... already
exists` for incremental migrations).

Strategy:
  - schema already present (``users`` table exists)  -> STAMP head (adopt; no DDL)
  - empty database                                   -> UPGRADE head (fresh create)

Stamping is safe here because the existing schema was built from the current
SQLAlchemy models, so it already matches `head`. Everything is wrapped so the
FULL traceback is printed to the deploy log on any failure.

Run from the backend/ directory:  python run_migrations.py
"""

import os
import sys
import traceback

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# A table that always exists once the schema has been created. Used to detect a
# pre-existing (create_all-built) database.
_SENTINEL_TABLE = "users"


def _log(msg: str) -> None:
    print(f"[migrate] {msg}", flush=True)


def _sync_url_from_env() -> str:
    """
    Read DATABASE_URL straight from the environment and convert it to a sync
    (psycopg2) URL. We deliberately avoid get_settings() here so that the
    migration step does not depend on full production-readiness validation —
    it only needs the database URL.
    """
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL is not set in the environment.")
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("sqlite+aiosqlite://"):
        return url.replace("sqlite+aiosqlite://", "sqlite://", 1)
    return url


def _strip_libpq_params(url: str) -> str:
    """psycopg2 accepts sslmode but not channel_binding; drop the latter."""
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

    parts = urlsplit(url)
    if not parts.query:
        return url
    query = [(k, v) for k, v in parse_qsl(parts.query) if k != "channel_binding"]
    return urlunsplit(parts._replace(query=urlencode(query)))


def main() -> None:
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import create_engine, inspect, pool, text

    _log("starting migration runner")

    sync_url = _strip_libpq_params(_sync_url_from_env())
    _log(f"using sync driver URL host: {sync_url.split('@')[-1].split('/')[0] if '@' in sync_url else 'local'}")

    cfg = Config(os.path.join(HERE, "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(HERE, "alembic"))
    cfg.set_main_option("sqlalchemy.url", sync_url)

    engine = create_engine(sync_url, poolclass=pool.NullPool)
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        _log(f"tables found: {len(tables)} (users={_SENTINEL_TABLE in tables}, "
             f"alembic_version={'alembic_version' in tables})")

        if "alembic_version" in tables:
            with engine.connect() as conn:
                rows = [r[0] for r in conn.execute(text("SELECT version_num FROM alembic_version"))]
            _log(f"current alembic_version: {rows}")
    finally:
        engine.dispose()

    if _SENTINEL_TABLE in tables:
        # Schema already present → adopt it. Stamping is idempotent and runs no
        # DDL, so it can never collide with existing tables/columns.
        _log("existing schema detected -> stamping head (adopt, no DDL)")
        command.stamp(cfg, "head")
        _log("stamped head OK. Future deploys will upgrade normally.")
    else:
        _log("empty database -> running upgrade head (fresh create)")
        command.upgrade(cfg, "head")
        _log("upgrade head OK.")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        print("[migrate] FAILED with traceback:", flush=True)
        traceback.print_exc()
        sys.exit(1)
