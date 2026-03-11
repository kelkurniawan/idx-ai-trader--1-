# SahamGue Architecture & Database Boundaries

## Dual-Backend Monorepo

The SahamGue architecture employs a dual-backend model sharing a single PostgreSQL database. To prevent race conditions, schema drift, and data inconsistencies, we enforce **strict table ownership boundaries**.

### 1. Python (FastAPI) / SQLAlchemy
Handles core user interactions, authentication, profile management, and AI analysis.
*   **Engine:** `SQLAlchemy` (Async)
*   **Migrations:** `Alembic`
*   **Owned Tables:**
    *   `users`
    *   `remember_me_tokens`
    *   `notification_preferences`
    *   `user_sessions`

### 2. Node.js / Prisma
Acts as a microservice agent managing background job queues (BullMQ), LLM scraping, and the news pipeline.
*   **Engine:** `Prisma`
*   **Migrations:** `Prisma Migrate`
*   **Owned Tables:**
    *   `news_sources`
    *   `news_items`
    *   `agent_runs`
    *   `user_personalizations`

## Rules of Engagement

1.  **No Cross-Access:** The Python API must **never** directly query Prisma-owned tables using SQLAlchemy. The Node.js API must **never** directly query SQLAlchemy-owned tables using Prisma.
2.  **Schema Enforcement:** 
    *   Prisma schema must NOT contain models for `users` or session data.
    *   Alembic `env.py` is configured to `exclude` all Prisma tables during `--autogenerate`.
3.  **Cross-Service Communication:** If Python needs news data, or if Node.js needs user validation, they must communicate via internal HTTP calls over `localhost` (or docker network). These endpoints should be scoped under `/api/internal/...` and secured via an internal API secret.

## Deployment Topology
*   **Gateway:** Caddy Reverse Proxy (`:8080` or `443`) points frontend requests to the correct backend.
*   `/api/auth` -> Python
*   `/api/news` -> Node.js
*   `/api/ai` -> Python
