# SahamGue Deployment Guide

This document outlines how to deploy the SahamGue stack locally via Docker Compose or to production (e.g., Railway).

## Local Deployment (Docker Compose)

0. **Prerequisites**: Ensure Docker and Docker Compose are installed.
1. **Environment Setup**:
   Copy `.env.example.python` to `backend/.env` and update the values.
   (The `docker-compose.yml` mounts `backend/.env` to both backend containers).
2. **Build and Run**:
   ```bash
   docker-compose up --build -d
   ```
3. **Access the App**: Navigate to `http://localhost:8080`.

## Production Deployment (Railway)

Railway deployment works best by creating a single "Project" and explicitly provisioning these 5 services:
1.  **PostgreSQL Plugin**: Provision from Railway dashboard.
2.  **Redis Plugin**: Provision from Railway dashboard.
3.  **Python Backend**: Connect to monorepo, set root directory to `backend`, set Dockerfile to `Dockerfile.python`. Link PostgreSQL & Redis variables.
4.  **Node.js Backend**: Connect to monorepo, set root directory to `backend`, set Dockerfile to `Dockerfile.node`. Link PostgreSQL & Redis variables.
5.  **Frontend + Caddy Gateway**: Connect to monorepo, set root directory to `/`, set Dockerfile to `Dockerfile.frontend`. Wait to map internal domains.

### Internal Networking on Railway
Ensure `python_backend` and `node_backend` are given internal Railway domains (e.g., `python-backend.railway.internal`). Update `Caddyfile.production` to point to these internal domains, allowing Caddy to proxy traffic securely.

## Production Notes

1. Copy `backend/.env.production.example` to `backend/.env.production` and fill in live secrets.
2. Use `OTP_STORE_BACKEND=redis` and `RATE_LIMIT_BACKEND=redis` for any multi-instance deployment.
3. Set `OPS_ALERT_WEBHOOK_URL` if you want external alerts for webhook mismatches and reconciliation anomalies.
4. For Docker-based production, use:
   ```bash
   docker compose -f docker-compose.production.yml up --build -d
   ```
5. After deploy, run:
   ```bash
   python scripts/go_live_smoke_test.py --base-url https://your-domain.com
   ```
