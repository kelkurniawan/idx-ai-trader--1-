"""Shared test fixtures: an isolated in-memory async SQLite engine."""

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from backend.app.database import Base
# Import models so their tables register on Base.metadata
from backend.app import models  # noqa: F401
from backend.app.models import stock as _stock_models  # noqa: F401  ensure stock tables register


def make_sqlite_sessionmaker():
    """Return (engine, sessionmaker) backed by a shared in-memory SQLite DB."""
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    sessionmaker = async_sessionmaker(engine, expire_on_commit=False)
    return engine, sessionmaker


async def create_all(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
