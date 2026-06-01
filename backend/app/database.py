"""
Database Configuration

SQLite for development, PostgreSQL-ready for production.
"""

from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

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

# asyncpg does not accept libpq-style query parameters (e.g. sslmode,
# channel_binding) that providers like Neon/Supabase append to the URL.
# Passing them through SQLAlchemy raises:
#   TypeError: connect() got an unexpected keyword argument 'sslmode'
# Strip them here and translate SSL intent into an asyncpg `ssl` connect arg.
connect_args: dict = {}
if "asyncpg" in db_url:
    parts = urlsplit(db_url)
    query = dict(parse_qsl(parts.query))
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)  # libpq-only, unsupported by asyncpg
    db_url = urlunsplit(parts._replace(query=urlencode(query)))
    # Any sslmode other than an explicit "disable" means: use TLS.
    if (sslmode or "require") != "disable":
        connect_args["ssl"] = True
elif "sqlite" in db_url:
    connect_args["check_same_thread"] = False

# Create async engine
# pool_pre_ping=True  — validates connections before use so that stale connections
#                       from Neon/Supabase auto-suspend are silently recycled instead
#                       of raising a ConnectionDoesNotExistError (→ HTTP 500).
# pool_recycle=300    — force-recycle connections every 5 min to match Neon's
#                       auto-suspend window on free-tier instances.
engine = create_async_engine(
    db_url,
    echo=False,
    future=True,
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300,
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
