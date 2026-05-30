# SahamGue Deployment Guide

Two deployment options are available. **Option A (Free Tier)** is the recommended minimum-budget path. **Option B (Docker)** is for self-hosted VPS or a managed container platform.

---

## Option A — Free Tier (Recommended)

### Stack

| Layer | Provider | Free Tier |
|---|---|---|
| Frontend + routing | Vercel | Free forever |
| Python API | Render | Free (sleeps after 15 min inactivity) |
| Node.js news backend | Render | Free (sleeps after 15 min inactivity) |
| PostgreSQL | Neon | Free — 0.5 GB, no expiry |
| Redis | Upstash | Free — 10 K commands/day, 256 MB |
| Email / OTP | Resend | Free — 3 000 emails/month |

**Total monthly cost: $0** at low-to-moderate traffic.

**Known limitation:** Render free services spin down after 15 minutes of inactivity. The first request after a sleep takes ~30–60 seconds (cold start). For a trading app with concentrated market-hours usage (09:00–16:00 WIB Mon–Fri) this is acceptable. Services warm up by the time users arrive.

### How routing works

Vercel's `vercel.json` rewrites replace Caddy. All `/api/*` requests from the browser go to `your-app.vercel.app` and are proxied at the edge to the correct Render service — no CORS negotiation, no separate gateway to maintain.

```
Browser → Vercel edge
  /api/news/**  → Render Node.js service
  /api/agent/** → Render Node.js service
  /api/**       → Render Python service
```

---

### Step 1 — PostgreSQL on Neon

1. Sign up at https://neon.tech (free, no card).
2. Create a project named `sahamgue`, region **Singapore** (`ap-southeast-1`).
3. Note the two connection strings shown on the dashboard:
   - **Direct** (for Python): `postgresql://user:pass@ep-xxxx.ap-southeast-1.aws.neon.tech/sahamgue?sslmode=require`
   - **Pooled** (for Prisma/Node.js): `postgresql://user:pass@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/sahamgue?sslmode=require`

### Step 2 — Redis on Upstash

1. Sign up at https://upstash.com (free, no card).
2. Create a Redis database, region **Singapore**.
3. Copy the **TLS connection URL** — it looks like `rediss://default:TOKEN@region.upstash.io:6379`.
4. Use this same URL for both `REDIS_URL` vars (Python and Node.js).

### Step 3 — Email on Resend

1. Sign up at https://resend.com (free, no card).
2. Create an API key.
3. (Optional) Verify your domain for a custom `From` address. Without a verified domain, use `onboarding@resend.dev` for testing only.

SMTP settings for `backend/.env`:
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASSWORD=<your Resend API key>
SMTP_FROM=noreply@yourdomain.com
```

### Step 4 — Python backend on Render

1. Sign up at https://render.com (free, no card).
2. **New Web Service** → connect GitHub → select this repo.
3. Settings:
   - **Root directory:** `backend`
   - **Dockerfile path:** `Dockerfile.python`
   - **Port:** `8000`
   - **Region:** Singapore
4. Add environment variables (see `backend/.env.free.example`).
5. Deploy. Note your service URL: `https://sahamgue-api.onrender.com`.

### Step 5 — Node.js backend on Render

1. **New Web Service** → same repo.
2. Settings:
   - **Root directory:** `backend`
   - **Dockerfile path:** `Dockerfile.node`
   - **Port:** `3001`
   - **Region:** Singapore
3. Add environment variables (see `backend/.env.free.example`).
4. Deploy. Note your service URL: `https://sahamgue-news.onrender.com`.

### Step 6 — Frontend on Vercel

1. Sign up at https://vercel.com (free, no card).
2. **New Project** → import GitHub repo.
3. Vercel auto-detects Vite. No extra build config needed.
4. Set environment variables in the Vercel dashboard:
   ```
   VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
   VITE_API_URL=
   VITE_APP_MODE=production
   ```
   Leave `VITE_API_URL` empty — rewrites handle routing.
5. Deploy. Note your URL: `https://sahamgue.vercel.app`.

### Step 7 — Wire up vercel.json

Open `vercel.json` and replace the placeholder URLs with your actual Render service URLs:

```json
{
  "rewrites": [
    {
      "source": "/api/news/:path*",
      "destination": "https://sahamgue-news.onrender.com/api/news/:path*"
    },
    {
      "source": "/api/agent/:path*",
      "destination": "https://sahamgue-news.onrender.com/api/agent/:path*"
    },
    {
      "source": "/api/:path*",
      "destination": "https://sahamgue-api.onrender.com/api/:path*"
    }
  ]
}
```

Commit and push — Vercel redeploys automatically.

### Step 8 — Fix CORS on the Python backend

Go to your **Render Python service → Environment** and update:

```
CORS_ORIGINS=https://sahamgue.vercel.app
TRUSTED_HOSTS=sahamgue-api.onrender.com
PUBLIC_APP_URL=https://sahamgue.vercel.app
XENDIT_SUCCESS_URL=https://sahamgue.vercel.app/payment/success
XENDIT_FAILURE_URL=https://sahamgue.vercel.app/payment/failed
```

Render will restart the service automatically.

### Step 9 — Custom domain (optional, free on Vercel)

1. In Vercel project settings → **Domains** → add your domain.
2. Point your DNS `CNAME` to `cname.vercel-dns.com`.
3. Update `CORS_ORIGINS`, `PUBLIC_APP_URL`, and Xendit URLs to use the custom domain.

### Step 10 — Smoke test

```bash
python scripts/go_live_smoke_test.py --base-url https://sahamgue.vercel.app
```

---

## Option B — Docker (Self-hosted / VPS)

Use this option if you have a VPS or want to self-host on a machine you control.

### Prerequisites
- Docker and Docker Compose installed
- A domain pointed at the server's IP

### Setup

1. Copy `backend/.env.production.example` to `backend/.env.production` and fill in all values.
2. Update `Caddyfile.production` — replace `{$APP_SITE_ADDRESS}` with your real domain.
3. Build and start:

```bash
docker compose -f docker-compose.production.yml up --build -d
```

4. Check container status:

```bash
docker compose -f docker-compose.production.yml ps
docker compose -f docker-compose.production.yml logs -f python_backend
```

5. After first deploy, run migrations:

```bash
docker compose -f docker-compose.production.yml exec python_backend alembic upgrade head
docker compose -f docker-compose.production.yml exec node_backend npx prisma migrate deploy
```

6. Smoke test:

```bash
python scripts/go_live_smoke_test.py --base-url https://your-domain.com
```

### Notes

- Production requires PostgreSQL and Redis — the compose file provisions them in containers.
- Use `OTP_STORE_BACKEND=redis` and `RATE_LIMIT_BACKEND=redis` for any multi-instance deployment.
- Set `OPS_ALERT_WEBHOOK_URL` for external alerts on billing and reconciliation failures.
