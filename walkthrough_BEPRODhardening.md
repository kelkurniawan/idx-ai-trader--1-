# Async SQLAlchemy Migration Walkthrough

## The Problem
The Python backend (FastAPI) was written as an asynchronous application (`async def` routes), but the database operations underneath were entirely synchronous. We were using the standard `psycopg2` driver along with synchronous SQLAlchemy [Session](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/profile.py#52-79) objects. 

This meant that whenever a user made a request to log in or retrieve their profile, the database queries (like `db.query(User).filter(...)`) would block the **entire Node event loop** while waiting for PostgreSQL to respond. Under heavy load, this architectural flaw results in deadlocks, timeout errors, and severely degraded performance, as no other concurrent requests can be handled while the CPU is frozen waiting for I/O.

## The Solution
We performed a comprehensive migration of the core database layer, changing it to utilize fully non-blocking asynchronous I/O operations. This prevents the server from stalling while waiting for database queries to complete.

### 1. Database Driver & Configuration Setup
We swapped the underlying database driver from the synchronous `psycopg2` to the much faster, asynchronous `asyncpg`. 
This required rewriting [backend/app/database.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py) to utilize SQLAlchemy 2.0's async extensions:
*   `create_engine` was replaced with `create_async_engine`.
*   The connection string was modified from `postgresql://` to `postgresql+asyncpg://`.
*   The dependency injector [get_db](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py#44-48) was transformed into an asynchronous generator (`async def`) yielding an `AsyncSession`, managed by `async_sessionmaker`.

### 2. Application Lifespan Initialization
Previously, the `init_db()` function in [database.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py) was a blocking call used to initialize tables on startup. We moved this logic directly into the FastAPI [lifespan](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/main.py#19-34) event loop inside [main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/main.py), allowing the engine to generate schemas without halting the server initialization:
```python
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)
```

### 3. Service Layer Overhaul
This was the most intensive part of the migration. We updated the following services to accept `AsyncSession` rather than [Session](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/models/profile.py#52-79):
*   [services/auth_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py)
*   [services/profile_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py)
*   [services/notification_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/notification_service.py)

Every single database query was rewritten from the legacy pattern:
```python
# Old Blocking Code
user = db.query(User).filter(User.id == user_id).first()
```
To the new, non-blocking SQLAlchemy 2.0 syntax using `select` and `execute`:
```python
# New Async Code
from sqlalchemy import select
stmt = select(User).where(User.id == user_id)
result = await db.execute(stmt)
user = result.scalar_one_or_none()
```
Every insert or update transaction was also updated to explicitly `await db.commit()` and `await db.refresh()`.

### 4. Router Integrations
With the services prepared, we then updated the main entry points (the API endpoints in [routers/auth.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/auth.py) and [routers/profile.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/profile.py)). 

We updated their Dependency Injections to request the new `AsyncSession` from [get_db](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py#44-48). We then ensured every call to our service functions (e.g., [update_profile](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#43-59), [_handle_mfa_challenge](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/auth.py#57-91), [change_password](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#94-125)) was properly `await`ed.

## Verification
Following the extensive file modifications, we successfully booted up the Uvicorn server connected to the PostgreSQL container.
We ran an end-to-end test using the automated browser, registering a brand new user and proceeding up to the profile dashboard. The login successfully passed without any event loop blocking, logging errors, or deadlocks, proving the `AsyncSession` tokens were correctly queried and written into the PostgreSQL engine.

---

# Production Hardening (P1-P6)

Following the database migration, we executed a 6-step production hardening plan to lock down security and prepare the monorepo for Dockerized deployment (e.g., to Railway):

## P1: Frontend AI SDK Removal
The `@google/genai` SDK and `GEMINI_API_KEY` were completely removed from the Vite frontend bundle. We created a secure [gemini_proxy_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/gemini_proxy_service.py) in the FastAPI backend to handle all AI requests (chart vision, real-time prices, news, stock analysis) using Google Search grounding, ensuring the API key never reaches the user's browser.

## P2: Environment Secrets Hardening
All hardcoded development secrets (e.g., `JWT_SECRET_KEY`) were removed from the application code. We established strict [.env.example](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/.env.example) templates for Python, Node.js, and the frontend, and secured the monorepo by adding comprehensive [.env](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/.env) exclusion patterns to [.gitignore](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/.gitignore).

## P3: Alembic Migrations Infrastructure
We initialized Alembic for the Python backend. The [env.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/alembic/env.py) was sophisticatedly configured to perform `asyncpg` to `psycopg2` URL translation on the fly, and explicitly exclude all Prisma-owned tables to prevent accidental schema destruction during autogeneration.

## P4: Strict Table Ownership Borders
We formalized the dual-backend database boundaries in a new [ARCHITECTURE.md](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/ARCHITECTURE.md) file at the root. SQLAlchemy owns user/auth tables, while Prisma owns news/agent tables. We also scaffolded an internal Python HTTP client to safely request data from the Node.js microservice without cross-querying database tables.

## P5: Caddy API Gateway & CORS
A unified entry point was established. The [Caddyfile](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/Caddyfile) routes `/api/news` to the Node.js backend, `/api` to the Python backend, and all other traffic to the frontend. Both backends had their CORS policies strictly locked down to the gateway and local development origins.

## P6: Docker Containerization
We created optimized, multi-stage `Dockerfile`s for the React frontend, Python backend, and Node.js microservice. The entire stack, including PostgreSQL and Redis, is now orchestrated using [docker-compose.yml](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/docker-compose.yml). Finally, a [DEPLOYMENT.md](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/DEPLOYMENT.md) guide was written to document local Docker Compose usage and Railway production provisioning steps.
