"""
Database Configuration

SQLite for development, PostgreSQL-ready for production.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from .config import get_settings

settings = get_settings()

# Ensure we use the asyncpg driver instead of psycopg2
db_url = settings.DATABASE_URL
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
# Handle sqlite async fallback if needed
elif db_url.startswith("sqlite://"):
    db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)

# Create async engine
engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    # SQLite-specific args
    connect_args={"check_same_thread": False} if "sqlite" in db_url else {}
)

# Async Session factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def get_db():
    """Dependency to get async database session."""
    async with AsyncSessionLocal() as session:
        yield session
