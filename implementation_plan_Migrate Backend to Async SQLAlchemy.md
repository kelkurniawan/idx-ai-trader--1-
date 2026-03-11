# Migrate Backend to Async SQLAlchemy

## Overview
The FastAPI backend currently uses synchronous SQLAlchemy ([Session](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/profileApi.ts#40-47), `db.query`) inside `async def` routes. This blocks the main event loop and causes severe performance bottlenecks and deadlocks under load. We need to migrate the database layer to be fully asynchronous using `asyncpg` and SQLAlchemy 2.0's `AsyncSession`.

## Proposed Changes

### 1. Database Configuration
#### [MODIFY] [backend/app/database.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py)
- Change engine creation to `create_async_engine`.
- Change dialect to `postgresql+asyncpg://`.
- Change `sessionmaker` to `async_sessionmaker` mapped to `AsyncSession`.
- Update [get_db](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py#28-35) dependency to be an `async def` generator yielding `AsyncSession`.
- Remove synchronous [init_db](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/database.py#37-41).

### 2. Application Lifespan
#### [MODIFY] [backend/app/main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/main.py)
- Update the [lifespan](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/main.py#18-29) context manager to use `engine.begin()` and `conn.run_sync(Base.metadata.create_all)` to initialize the database asynchronously.

### 3. Service Layer Refactor
Update all dependencies from [Session](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/profileApi.ts#40-47) to `AsyncSession`. Replace `db.query(Model).filter(...)` with `await db.execute(select(Model).where(...))` and extract results using `.scalar_one_or_none()` or `.scalars().all()`. Await all `db.commit()`, `db.refresh()`, and `db.add()` (if needed, though adding is sync).

#### [MODIFY] [backend/app/services/auth_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py)
- [validate_remember_me_token](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py#192-208)
- [revoke_remember_me_tokens](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py#210-214)
- [get_current_user](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/auth_service.py#234-282)

#### [MODIFY] [backend/app/services/profile_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py)
- [update_profile](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#42-58)
- [delete_account](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#64-86)
- [complete_email_change](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#168-191)
- [update_theme](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#197-203)
- `create_session`
- [list_sessions](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#242-254)
- [revoke_session](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#256-273)
- [revoke_all_other_sessions](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/profile_service.py#275-282)

#### [MODIFY] [backend/app/services/notification_service.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/notification_service.py)
- [get_or_create_prefs](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/notification_service.py#16-31)
- [update_prefs](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/services/notification_service.py#33-49)

### 4. Router Layer Refactor
Update dependency injections `db: Session = Depends(get_db)` to `db: AsyncSession = Depends(get_db)`. Update any direct database queries in the routers to use `await db.execute(select(...))`.

#### [MODIFY] [backend/app/routers/auth.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/auth.py)
- All auth endpoints ([login](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/auth.py#163-207), [register](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/services/authApi.ts#77-95), [auth_status](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/auth.py#545-581), [google_auth](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/auth.py#213-310), MFA routes).

#### [MODIFY] [backend/app/routers/profile.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/profile.py)
- All profile endpoints ([get_profile](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/profile.py#134-138), [update_profile_endpoint](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/backend/app/routers/profile.py#140-149), session management, MFA setup/verify routes).

## Verification Plan
1. Start the PostgreSQL database via Docker.
2. Start the FastAPI server using Uvicorn. Verify `app.main:lifespan` successfully creates/verifies tables asynchronously.
3. Use the browser to test the full End-to-End Registration and Login flow.
4. Verify no `extra_forbidden` or `psycopg2` errors occur. Ensure all database operations succeed fully asynchronously without blocking the event loop.
