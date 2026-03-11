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
