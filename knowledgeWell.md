# Knowledge Well — Deployment Errors & Fixes

A running log of every error hit while deploying **SahamGue / IDX AI Trader** to the free-tier stack (Vercel + Render + Neon + Upstash + Resend), and exactly how each was solved. Use this as the first reference when a deploy breaks.

**Stack recap**
- **Frontend:** Vercel (`idx-ai-trader-1.vercel.app`) — serves the React SPA and rewrites `/api/*` to the backends.
- **Python API:** Render web service `sahamgue-api` (FastAPI, port 8000).
- **Node news API:** Render web service `sahamgue-news` (Express, port 3001).
- **Database:** Neon PostgreSQL (shared — Python owns `public` schema, Prisma owns `news` schema).
- **Redis:** Upstash.
- **Email:** Resend SMTP.

---

## 1. Node build — TypeScript: `req.params` is `string | string[]`

**Where:** Render build of `sahamgue-news`, `npm run build` (`tsc`).

**Error**
```
src/api/news/news.router.ts(137,34): error TS2339: Property 'toUpperCase' does not exist on type 'string | string[]'.
src/api/news/news.router.ts(173,36): error TS2345: Argument of type 'string | string[]' is not assignable to parameter of type 'string'.
```

**Cause:** `@types/express@5` types route params as `string | string[]`, so `.toUpperCase()` / passing them to string functions fails type-checking.

**Fix:** Wrap param access in `String(...)`.
```ts
const code = String(req.params.code).toUpperCase();
const id   = String(req.params.id);
```

---

## 2. Node build — TypeScript: morgan logger ternary

**Where:** Same `tsc` build.

**Error**
```
src/middleware/requestLogger.ts(17,3): error TS2769: No overload matches this call.
```

**Cause:** Assigning `morgan(fn)` vs `morgan('dev')` in a single ternary confused TypeScript's overload resolution.

**Fix:** Split into two separately-typed variables, then choose:
```ts
const jsonLogger = morgan((tokens, req, res) => JSON.stringify({ ... }));
const devLogger  = morgan('dev');
export const requestLogger = process.env.NODE_ENV === 'production' ? jsonLogger : devLogger;
```

---

## 3. Node build — `node-cron` v4 removed `scheduled`

**Where:** `tsc` build.

**Error**
```
src/queue/scheduler.ts(62,7): error TS2353: Object literal may only specify known properties, and 'scheduled' does not exist in type 'TaskOptions'.
```

**Cause:** `node-cron` was bumped from v3 → v4. In v4 the `scheduled: true` option was removed (tasks are scheduled by default).

**Fix:** Delete the `scheduled: true` line from `cron.schedule(..., { timezone: 'UTC' })`.

---

## 4. Node runtime — Prisma P1012: wrong URL protocol

**Where:** `sahamgue-news` startup, `prisma migrate deploy`.

**Error**
```
Error code: P1012
error: the URL must start with the protocol `postgresql://` or `postgres://`.
```

**Cause:** The Node service's `DATABASE_URL` was the SQLAlchemy format `postgresql+asyncpg://...`. Prisma doesn't understand the `+asyncpg` suffix.

**Fix:** Normalize the URL at container start (strip `+asyncpg`). Added to `backend/docker-entrypoint.sh`:
```sh
DATABASE_URL=$(printf '%s' "$DATABASE_URL" | sed -e 's|postgresql+asyncpg://|postgresql://|')
```
> The two backends share one DB but need different URL formats: **Python** = `postgresql+asyncpg://`, **Node/Prisma** = plain `postgresql://`. Both must use the Neon **direct** endpoint (no `-pooler`).

---

## 5. Node runtime — Prisma P3005: schema not empty

**Where:** `sahamgue-news` startup, `prisma migrate deploy`.

**Error**
```
Error: P3005
The database schema is not empty.
```

**Cause:** Both backends share one Neon database. The Python service already ran `alembic upgrade head` and created its tables (`users`, `alembic_version`, ...) in the `public` schema. `prisma migrate deploy` assumes it exclusively owns the schema and refuses when it finds unmanaged tables with no migration history.

**Fix (intermediate):** Switched from `migrate deploy` to `prisma db push`. (Superseded by fix #6.)

---

## 6. Node runtime — `db push` wanted to DROP the Python tables ⚠️

**Where:** `sahamgue-news` startup, `prisma db push`.

**Error**
```
⚠️ You are about to drop the `alembic_version` table, which is not empty (1 rows).
Error: Use the --accept-data-loss flag ...
```

**Cause:** `db push` reconciles the **whole** target schema to match Prisma's 4 models — so it planned to **drop every Python-owned table**. It only *warned* about `alembic_version` (the one with data); the empty Python tables would have been dropped silently.

**DO NOT** add `--accept-data-loss` — it would wipe the entire Python auth/billing schema.

**Fix (permanent):** Give Prisma its **own Postgres schema** (`news`). Python keeps `public`, Prisma keeps `news`, neither can touch the other. In `backend/docker-entrypoint.sh`, append `schema=news` to the URL before pushing:
```sh
case "$DATABASE_URL" in
  *schema=*) : ;;
  *\?*)      DATABASE_URL="${DATABASE_URL}&schema=news" ;;
  *)         DATABASE_URL="${DATABASE_URL}?schema=news" ;;
esac
export DATABASE_URL
```

---

## 7. Node runtime — `db push` hung 23s then exited (schema didn't exist)

**Where:** `sahamgue-news` startup, after scoping to `schema=news`.

**Symptom**
```
[entrypoint] Syncing Prisma-owned tables into the 'news' schema...
==> Exited with status 1     (after ~23s, no Prisma output)
```

**Cause:** `prisma db push` did not reliably auto-create the non-existent `news` schema; it stalled and died without a clear error.

**Fix:** Explicitly create the schema (idempotent) before pushing, in `backend/docker-entrypoint.sh`:
```sh
echo 'CREATE SCHEMA IF NOT EXISTS news;' | npx prisma db execute --stdin --url "$DATABASE_URL"
npx prisma db push --skip-generate
```
This also surfaces a clear connection error instead of a silent hang.

---

## 8. Node runtime — server crashed on boot: missing `GROQ_API_KEY`

**Where:** `sahamgue-news` startup, after DB sync succeeded.

**Error**
```
GroqError: The GROQ_API_KEY environment variable is missing or empty
    at Object.<anonymous> (/app/dist/agent/groq.js:8:14)
```

**Cause:** `groq.ts`, `claude.ts`, and `deepseek.ts` each created their SDK client **at module-load time** (top-level `new Groq(...)`). A missing/empty key threw during *import*, crashing the whole server at boot. `pipeline.ts` imports all three, so even with a Groq key, the missing `ANTHROPIC_API_KEY` would crash next.

**Fix:** Make all three AI clients **lazy** — instantiate on first use via a `get*()` helper:
```ts
let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
  return _groq;
}
// usage: await getGroq().chat.completions.create(...)
```
Now the server boots with only the free `GROQ_API_KEY` set; `provider.ts` already returns neutral fallback enrichment when other keys are absent.

---

## 9. Python runtime — asyncpg rejects Neon's `sslmode` param

**Where:** `sahamgue-api` (FastAPI) startup / DB connection.

**Error**
```
TypeError: connect() got an unexpected keyword argument 'sslmode'
```

**Cause:** Neon appends libpq-only query params (`sslmode`, `channel_binding`) to `DATABASE_URL`. `asyncpg` (via SQLAlchemy) doesn't accept them as kwargs.

**Fix:** In `backend/app/database.py`, strip those params and translate SSL intent into an asyncpg connect arg:
```python
if "asyncpg" in db_url:
    parts = urlsplit(db_url)
    query = dict(parse_qsl(parts.query))
    sslmode = query.pop("sslmode", None)
    query.pop("channel_binding", None)
    db_url = urlunsplit(parts._replace(query=urlencode(query)))
    if (sslmode or "require") != "disable":
        connect_args["ssl"] = True
```
> Note: **Alembic** uses sync `psycopg2`, which *does* understand `sslmode=require` — so the plain `postgresql://...?sslmode=require` URL is fine for migrations.

---

## 10. Login fails — `404` on `/api/auth/clerk/sync` (no Python backend)

**Where:** Live app, after Clerk sign-in. Browser console:
```
Failed to load resource: 404  /api/auth/clerk/sync
Clerk session hydration failed: Error: Network error
```

**Diagnosis:** `curl https://sahamgue-api.onrender.com/health` returned
```
HTTP/1.1 404 Not Found
x-render-routing: no-server
```
`no-server` = **no web service running at that URL**. The Vercel rewrite was working fine; the Python backend simply didn't exist — only the Node service had been created. `sahamgue-api` existed only as an **Environment Group**, not a web service.

**Fix:** Create the Python web service on Render (see #11/#12). Once `sahamgue-api.onrender.com/health` returns `{"status":"healthy"}`, login works with no frontend/`vercel.json` changes (that URL is already wired up).

---

## 11. Python service create — wrong Language (Node) demands a Start Command

**Where:** Render "New Web Service" form for `sahamgue-api`.

**Symptom:** Form shows **Build Command** (`npm install`) and a **required Start Command** (`yarn start`) — i.e. Render auto-detected **Node** (because `package.json` exists at repo root).

**Fix:** Change the **Language** dropdown away from **Node**:
- **Docker** → fields vanish; set Root Directory `backend`, Dockerfile Path `./Dockerfile.python`. No start command.
- **Python 3** → set:
  - Build Command: `pip install -r requirements.txt`
  - Start Command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000`

---

## 12. Python service — "Root directory does not exist"

**Where:** `sahamgue-api` deploy.

**Error**
```
==> Root directory "Dockerfile.python" does not exist. Verify the Root Directory ...
```

**Cause:** The **Dockerfile path was typed into the Root Directory field**. Root Directory is a *folder*.

**Fix (Render → Settings → Build & Deploy):**
| Field | Wrong | Correct |
|---|---|---|
| Root Directory | `Dockerfile.python` | `backend` |
| Dockerfile Path | — | `./Dockerfile.python` (Docker mode only) |

The command-prompt prefix in Settings reflects the Root Directory: it should read `backend/ $`, not `Dockerfile.python/ $`.

---

## General Lessons

1. **Shared database, two ORMs:** isolate each ORM in its own Postgres schema (`public` for Python/Alembic, `news` for Prisma). Never let one ORM's migration tool reconcile the whole schema.
2. **Same env-var name, different formats:** `DATABASE_URL` must be `postgresql+asyncpg://` for SQLAlchemy and plain `postgresql://` for Prisma. Normalize at runtime so a paste mistake can't break the deploy.
3. **Always use Neon's direct endpoint** (no `-pooler`) for migrations — PgBouncer breaks migration locks.
4. **Lazy-init optional integrations.** Never instantiate an SDK client (AI, payments, etc.) at module top level — a missing key should degrade one feature, not crash the whole server.
5. **`x-render-routing: no-server`** means the service doesn't exist / isn't running at that URL — not a code bug.
6. **Render "Language"** auto-detects from repo files. For a Python app in a JS monorepo, you must explicitly pick **Docker** or **Python 3**, and set **Root Directory = `backend`**.
7. **Render free tier sleeps** after 15 min idle; first request after sleep takes ~50s (cold start). Not an error.
8. **Shell scripts need LF line endings** — `.gitattributes` has `*.sh text eol=lf` so Windows checkouts don't corrupt `docker-entrypoint.sh`.
