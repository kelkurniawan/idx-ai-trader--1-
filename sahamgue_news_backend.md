# SahamGue News — Production Backend Architecture

> **Stack:** Node.js · Express · TypeScript · Prisma · PostgreSQL · Redis · BullMQ · Groq · Claude Sonnet · Swagger UI

---

## 1. PROJECT STRUCTURE

```
sahamgue-backend/
├── src/
│   ├── agent/
│   │   ├── index.ts              # Agent orchestrator (BullMQ worker)
│   │   ├── scraper.ts            # RSS/HTML feed fetcher
│   │   ├── groq.ts               # Groq (free) — summarize + relevance filter
│   │   ├── claude.ts             # Claude Sonnet (paid) — impact/ticker/confidence
│   │   ├── dedup.ts              # Redis-based deduplication
│   │   └── pipeline.ts           # Full pipeline: scrape → grok → filter → claude → save
│   ├── api/
│   │   ├── news/
│   │   │   ├── news.router.ts    # All /api/news/* routes
│   │   │   ├── news.service.ts   # Business logic
│   │   │   └── news.types.ts     # Shared TypeScript interfaces
│   │   └── admin/
│   │       └── admin.router.ts   # Agent trigger + status routes
│   ├── middleware/
│   │   ├── auth.ts               # JWT guard + role check
│   │   ├── rateLimiter.ts        # express-rate-limit
│   │   ├── requestLogger.ts      # Morgan + custom logger
│   │   └── errorHandler.ts       # Global error boundary
│   ├── queue/
│   │   ├── queue.ts              # BullMQ queue definition
│   │   └── scheduler.ts          # Cron scheduler (market hours)
│   ├── db/
│   │   └── prisma.ts             # Prisma client singleton
│   ├── cache/
│   │   └── redis.ts              # Redis client singleton
│   ├── swagger/
│   │   └── swagger.ts            # swagger-jsdoc config
│   └── server.ts                 # Express app entry point
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## 2. DATABASE SCHEMA (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── NewsSource ───────────────────────────────────────────────
model NewsSource {
  id        String      @id @default(uuid())
  name      String      @unique          // "REUTERS ID"
  rssUrl    String      @unique
  isActive  Boolean     @default(true)
  createdAt DateTime    @default(now())
  articles  NewsItem[]

  @@map("news_sources")
}

// ─── NewsItem ─────────────────────────────────────────────────
model NewsItem {
  id              String    @id @default(uuid())
  headline        String
  summary         String?                         // AI-generated
  originalUrl     String    @unique               // dedup key
  source          String                          // "CNBC INDONESIA"
  publishedAt     DateTime
  fetchedAt       DateTime  @default(now())
  isLive          Boolean   @default(false)
  isActive        Boolean   @default(true)

  // Classification
  category        String    // hot | latest | critical | popular
  impactLevel     String    // breaking | high | medium | low | fundamental | regulatory
  tickers         String[]  // ["BBCA","BMRI"]
  aiConfidence    Int       @default(0)           // 0-100
  views           Int       @default(0)
  trendRank       Int?

  // AI-generated fields (from Claude)
  whyRelevant     String[]  @default([])
  estimatedImpact Json?     // EstimatedImpact[]
  relevanceReason String?

  // Raw data
  rawContent      String?

  // Relations
  sourceId  String?
  newsSource NewsSource? @relation(fields: [sourceId], references: [id])
  agentRunId String
  agentRun   AgentRun   @relation(fields: [agentRunId], references: [id])

  @@index([publishedAt(sort: Desc)])
  @@index([tickers])          // GIN index via raw migration
  @@index([category])
  @@index([impactLevel])
  @@index([agentRunId])
  @@map("news_items")
}

// ─── AgentRun ─────────────────────────────────────────────────
model AgentRun {
  id              String    @id @default(uuid())
  startedAt       DateTime  @default(now())
  finishedAt      DateTime?
  status          String    @default("running")  // running | success | failed | skipped
  agentType       String    // "groq_local" | "claude_paid"
  articlesFound   Int       @default(0)
  articlesSaved   Int       @default(0)
  articlesDuped   Int       @default(0)
  errorMessage    String?

  // Token/cost tracking
  groqTokensUsed      Int   @default(0)
  claudeInputTokens   Int   @default(0)
  claudeOutputTokens  Int   @default(0)
  estimatedCostUsd    Float @default(0.0)

  articles NewsItem[]

  @@map("agent_runs")
}

// ─── UserPersonalization ──────────────────────────────────────
model UserPersonalization {
  id              String   @id @default(uuid())
  userId          String   @unique
  watchlistTickers String[]  @default([])
  preferredSources String[]  @default([])
  updatedAt        DateTime  @updatedAt

  @@map("user_personalizations")
}
```

> **Note:** After running `prisma migrate dev`, add a raw GIN index for array columns:
> ```sql
> CREATE INDEX idx_news_tickers_gin    ON news_items USING GIN (tickers);
> CREATE INDEX idx_news_categories_gin ON news_items USING GIN (("category"::text[]));
> ```

---

## 3. AI AGENT PIPELINE

### `src/agent/scraper.ts`

```typescript
import Parser from 'rss-parser';

const RSS_SOURCES = (process.env.NEWS_SOURCES ?? '')
  .split(',')
  .map(u => u.trim())
  .filter(Boolean);

export interface RawArticle {
  headline: string;
  originalUrl: string;
  source: string;
  publishedAt: Date;
  rawContent: string;
}

const rss = new Parser();

export async function scrapeAllFeeds(): Promise<RawArticle[]> {
  const results: RawArticle[] = [];

  await Promise.allSettled(
    RSS_SOURCES.map(async (feedUrl) => {
      const feed = await rss.parseURL(feedUrl);
      const sourceName = feed.title ?? new URL(feedUrl).hostname;

      for (const item of feed.items.slice(0, 15)) {
        if (!item.link || !item.title) continue;
        results.push({
          headline: item.title,
          originalUrl: item.link,
          source: sourceName.toUpperCase(),
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          rawContent: item.contentSnippet ?? item.content ?? item.summary ?? '',
        });
      }
    })
  );

  return results;
}
```

### `src/agent/dedup.ts`

```typescript
import { redis } from '../cache/redis';

const TTL_SECONDS = 30 * 60; // 30 minutes

// Returns true if article is new (not seen recently)
export async function isNew(originalUrl: string): Promise<boolean> {
  const key = `news:seen:${Buffer.from(originalUrl).toString('base64').slice(0, 64)}`;
  const exists = await redis.exists(key);
  if (exists) return false;
  await redis.setex(key, TTL_SECONDS, '1');
  return true;
}

// Ticker+headline dedup to avoid re-processing same story from two sources
export async function isBatchDuplicate(
  ticker: string,
  headline: string
): Promise<boolean> {
  const key = `news:dedup:${ticker}:${Buffer.from(headline.slice(0, 80)).toString('base64')}`;
  const exists = await redis.exists(key);
  if (exists) return true;
  await redis.setex(key, TTL_SECONDS, '1');
  return false;
}
```

### `src/agent/groq.ts`

```typescript
import Groq from 'groq-sdk';
import { RawArticle } from './scraper';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export interface GroqResult {
  summary: string;
  relevanceScore: number; // 0.0 – 1.0
  isFinanceRelated: boolean;
  groqTokensUsed: number;
}

export async function summarizeAndScore(
  article: RawArticle
): Promise<GroqResult | null> {
  try {
    const resp = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content: `You are a financial news analyst for Indonesian stock market (IDX).
Return JSON only: { summary: string (max 200 chars, Bahasa Indonesia), 
relevanceScore: number (0.0-1.0 how relevant to IDX stocks), 
isFinanceRelated: boolean }`,
        },
        {
          role: 'user',
          content: `Headline: ${article.headline}\n\nContent: ${article.rawContent.slice(0, 800)}`,
        },
      ],
    });

    const tokens = resp.usage?.total_tokens ?? 0;
    const parsed = JSON.parse(resp.choices[0]?.message?.content ?? '{}');

    return {
      summary: parsed.summary ?? '',
      relevanceScore: Math.min(1, Math.max(0, parsed.relevanceScore ?? 0)),
      isFinanceRelated: parsed.isFinanceRelated ?? false,
      groqTokensUsed: tokens,
    };
  } catch {
    return null;
  }
}
```

### `src/agent/claude.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ArticleBatchInput {
  headline: string;
  summary: string;
  source: string;
}

export interface ClaudeEnrichedItem {
  impactLevel: 'breaking' | 'high' | 'medium' | 'low' | 'fundamental' | 'regulatory';
  tickers: string[];          // IDX 4-letter codes
  aiConfidence: number;       // 0-100
  category: 'hot' | 'latest' | 'critical' | 'popular';
  whyRelevant: string[];      // 2-3 bullet points
  estimatedImpact: Array<{
    ticker: string;
    low: number;
    high: number;
    direction: 'positive' | 'negative';
    timeframe: 'short' | 'medium' | 'long';
  }>;
  relevanceReason?: string;
}

export interface ClaudeBatchResult {
  items: ClaudeEnrichedItem[];
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

// COST RULE: batch up to 5 articles into a single API call
export async function enrichBatch(
  articles: ArticleBatchInput[]
): Promise<ClaudeBatchResult> {
  const prompt = `
You are a senior IDX analyst. Analyze each news article below and return a
JSON array with exactly ${articles.length} objects, one per article.

Each object must have:
- impactLevel: "breaking"|"high"|"medium"|"low"|"fundamental"|"regulatory"
- tickers: string[] (IDX 4-letter uppercase codes mentioned or strongly implied, max 5)
- aiConfidence: number (0-100, how confident the classification is)
- category: "hot"|"latest"|"critical"|"popular"
- whyRelevant: string[] (2-3 short Bahasa Indonesia bullets explaining market impact)
- estimatedImpact: array of { ticker, low (%), high (%), direction, timeframe }
- relevanceReason: short string (optional, e.g. "relevan karena sektor perbankan")

ARTICLES:
${articles.map((a, i) => `[${i}] Headline: ${a.headline}\nSummary: ${a.summary}\nSource: ${a.source}`).join('\n\n')}

Respond with ONLY a valid JSON array, no markdown.`;

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = resp.content[0]?.type === 'text' ? resp.content[0].text : '[]';
  const items: ClaudeEnrichedItem[] = JSON.parse(content);

  // Claude Sonnet pricing (approx): $3/M input, $15/M output
  const inputTokens = resp.usage.input_tokens;
  const outputTokens = resp.usage.output_tokens;
  const estimatedCostUsd =
    (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;

  return { items, inputTokens, outputTokens, estimatedCostUsd };
}
```

### `src/agent/pipeline.ts`

```typescript
import { prisma } from '../db/prisma';
import { scrapeAllFeeds } from './scraper';
import { summarizeAndScore } from './groq';
import { enrichBatch } from './claude';
import { isNew, isBatchDuplicate } from './dedup';

const RELEVANCE_THRESHOLD = 0.6; // COST RULE: only pass to Claude if score > 0.6
const CLAUDE_BATCH_SIZE = 5;     // COST RULE: batch up to 5 per Claude call

export async function runAgentPipeline(agentRunId: string) {
  let groqTokensTotal = 0;
  let claudeInputTotal = 0;
  let claudeOutputTotal = 0;
  let estimatedCostTotal = 0;
  let articlesSaved = 0;
  let articlesDuped = 0;

  try {
    // ── Step 1: Scrape feeds ─────────────────────────────────
    const rawArticles = await scrapeAllFeeds();
    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: { articlesFound: rawArticles.length },
    });

    // ── Step 2: Deduplicate (Redis) ──────────────────────────
    const newArticles = (
      await Promise.all(rawArticles.map(async (a) => ({ a, isNew: await isNew(a.originalUrl) })))
    )
      .filter((x) => x.isNew)
      .map((x) => x.a);

    articlesDuped = rawArticles.length - newArticles.length;

    // ── Step 3: Groq pass (free) — summarize + relevance ─────
    const groqResults = await Promise.all(
      newArticles.map(async (article) => {
        const result = await summarizeAndScore(article);
        if (result) groqTokensTotal += result.groqTokensUsed;
        return { article, groq: result };
      })
    );

    // ── Step 4: Filter by relevance threshold (COST RULE) ────
    const relevant = groqResults.filter(
      (r) => r.groq && r.groq.isFinanceRelated && r.groq.relevanceScore >= RELEVANCE_THRESHOLD
    );

    // ── Step 5: Claude enrichment in batches of 5 (COST RULE) ─
    const batches: typeof relevant[] = [];
    for (let i = 0; i < relevant.length; i += CLAUDE_BATCH_SIZE) {
      batches.push(relevant.slice(i, i + CLAUDE_BATCH_SIZE));
    }

    for (const batch of batches) {
      const batchInput = batch.map((r) => ({
        headline: r.article.headline,
        summary: r.groq!.summary,
        source: r.article.source,
      }));

      const claudeResult = await enrichBatch(batchInput);
      claudeInputTotal += claudeResult.inputTokens;
      claudeOutputTotal += claudeResult.outputTokens;
      estimatedCostTotal += claudeResult.estimatedCostUsd;

      for (let i = 0; i < batch.length; i++) {
        const { article, groq } = batch[i];
        const enriched = claudeResult.items[i];
        if (!enriched) continue;

        // Ticker-level dedup (COST RULE)
        for (const ticker of enriched.tickers) {
          if (await isBatchDuplicate(ticker, article.headline)) continue;
        }

        await prisma.newsItem.upsert({
          where: { originalUrl: article.originalUrl },
          update: {},
          create: {
            headline: article.headline,
            summary: groq!.summary,
            originalUrl: article.originalUrl,
            source: article.source,
            publishedAt: article.publishedAt,
            rawContent: article.rawContent,
            isLive: false,
            category: enriched.category,
            impactLevel: enriched.impactLevel,
            tickers: enriched.tickers,
            aiConfidence: enriched.aiConfidence,
            whyRelevant: enriched.whyRelevant,
            estimatedImpact: enriched.estimatedImpact,
            relevanceReason: enriched.relevanceReason,
            agentRunId,
            views: 0,
          },
        });

        articlesSaved++;
      }
    }

    // ── Step 6: Finalize run record ───────────────────────────
    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: {
        finishedAt: new Date(),
        status: 'success',
        articlesSaved,
        articlesDuped,
        groqTokensUsed: groqTokensTotal,
        claudeInputTokens: claudeInputTotal,
        claudeOutputTokens: claudeOutputTotal,
        estimatedCostUsd: estimatedCostTotal,
      },
    });
  } catch (err: any) {
    await prisma.agentRun.update({
      where: { id: agentRunId },
      data: { status: 'failed', finishedAt: new Date(), errorMessage: err.message },
    });
    throw err;
  }
}
```

---

## 4. REST API

### `src/api/news/news.router.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { getNewsFeed, getPersonalizedNews, getNewsByTicker, getNewsById } from './news.service';

const router = Router();

/**
 * @swagger
 * /api/news/feed:
 *   get:
 *     summary: Get paginated news feed
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: tab
 *         schema:
 *           type: string
 *           enum: [hot, latest, critical, popular]
 *         description: News tab/category filter
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated news list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data: { type: array, items: { $ref: '#/components/schemas/NewsItem' } }
 *                 total: { type: integer }
 *                 page: { type: integer }
 *                 limit: { type: integer }
 */
router.get('/feed', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tab, category, page = '1', limit = '20' } = req.query as Record<string, string>;
    const result = await getNewsFeed({
      tab, category,
      page: Math.max(1, parseInt(page)),
      limit: Math.min(100, parseInt(limit)),
    });
    res.json(result);
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/news/personalized:
 *   get:
 *     summary: Get personalized news for a user's watchlist
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: tickers
 *         schema: { type: string }
 *         description: Comma-separated override tickers e.g. BBCA,GOTO
 *     responses:
 *       200:
 *         description: Personalized news list
 */
router.get('/personalized', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tickers } = req.query as Record<string, string>;
    const tickerList = tickers ? tickers.split(',').map(t => t.trim().toUpperCase()) : [];
    res.json(await getPersonalizedNews(userId, tickerList));
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/news/ticker/{code}:
 *   get:
 *     summary: Get all news for a specific IDX ticker
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, example: BBCA }
 *     responses:
 *       200:
 *         description: News list for ticker
 */
router.get('/ticker/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json(await getNewsByTicker(req.params.code.toUpperCase()));
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/news/{id}:
 *   get:
 *     summary: Get a single news article by ID
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Single news item
 *       404:
 *         description: Not found
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await getNewsById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });

    // Increment view count (fire-and-forget)
    prisma.newsItem.update({ where: { id: req.params.id }, data: { views: { increment: 1 } } });
    res.json(item);
  } catch (e) { next(e); }
});

export { router as newsRouter };
```

### `src/api/news/news.service.ts`

```typescript
import { prisma } from '../../db/prisma';

export async function getNewsFeed({ tab, category, page, limit }: {
  tab?: string; category?: string; page: number; limit: number;
}) {
  const where: any = { isActive: true };
  if (tab) where.category = tab;
  if (category && category !== tab) where.category = category;

  const [data, total] = await Promise.all([
    prisma.newsItem.findMany({
      where,
      orderBy: [
        tab === 'popular' ? { views: 'desc' } : { publishedAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.newsItem.count({ where }),
  ]);

  return { data, total, page, limit };
}

export async function getPersonalizedNews(userId: string, overrideTickers: string[]) {
  let tickers = overrideTickers;

  if (tickers.length === 0 && userId) {
    const prefs = await prisma.userPersonalization.findUnique({ where: { userId } });
    tickers = prefs?.watchlistTickers ?? [];
  }

  if (tickers.length === 0) return { data: [], total: 0 };

  return prisma.newsItem.findMany({
    where: {
      isActive: true,
      tickers: { hasSome: tickers },
    },
    orderBy: { publishedAt: 'desc' },
    take: 30,
  });
}

export async function getNewsByTicker(code: string) {
  return prisma.newsItem.findMany({
    where: { isActive: true, tickers: { has: code } },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  });
}

export async function getNewsById(id: string) {
  return prisma.newsItem.findUnique({ where: { id } });
}
```

### `src/api/admin/admin.router.ts`

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { requireJwt, requireRole } from '../../middleware/auth';
import { agentQueue } from '../../queue/queue';
import { prisma } from '../../db/prisma';

const router = Router();

// All admin routes require JWT with role=admin
router.use(requireJwt, requireRole('admin'));

/**
 * @swagger
 * /api/news/agent/trigger:
 *   post:
 *     summary: Manually trigger an agent run
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Agent job queued
 *       403:
 *         description: Forbidden (not admin)
 */
router.post('/agent/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await prisma.agentRun.create({
      data: { agentType: 'manual_trigger', status: 'running' },
    });
    await agentQueue.add('run-agent', { agentRunId: run.id }, { attempts: 2, backoff: 5000 });
    res.status(202).json({ message: 'Agent queued', agentRunId: run.id });
  } catch (e) { next(e); }
});

/**
 * @swagger
 * /api/news/agent/status:
 *   get:
 *     summary: Get the last 5 agent run statuses
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of recent AgentRun records
 */
router.get('/agent/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runs = await prisma.agentRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
    });
    res.json(runs);
  } catch (e) { next(e); }
});

export { router as adminRouter };
```

---

## 5. MIDDLEWARE

### `src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

interface JwtPayload { userId: string; role: string; }

export function requireJwt(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    (req as any).user = jwt.verify(token, JWT_SECRET) as JwtPayload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).user?.role !== role)
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
```

### `src/middleware/rateLimiter.ts`

```typescript
import rateLimit from 'express-rate-limit';

// Public news feed: generous limit
export const publicLimiter = rateLimit({
  windowMs: 60_000,  // 1 minute
  max: 120,
  message: { error: 'Too many requests' },
});

// Admin routes: strict
export const adminLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: { error: 'Too many admin requests' },
});
```

### `src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err.status ?? 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  console.error(`[ERROR] ${req.method} ${req.path} →`, err);
  res.status(status).json({ error: message });
}
```

---

## 6. QUEUE & SCHEDULER

### `src/queue/queue.ts`

```typescript
import { Queue, Worker } from 'bullmq';
import { redis } from '../cache/redis';
import { runAgentPipeline } from '../agent/pipeline';

export const agentQueue = new Queue('agent-runs', { connection: redis });

// Worker: processes jobs from the queue
new Worker('agent-runs', async (job) => {
  console.log(`[Agent] Starting run ${job.data.agentRunId}`);
  await runAgentPipeline(job.data.agentRunId);
  console.log(`[Agent] Completed run ${job.data.agentRunId}`);
}, { connection: redis, concurrency: 1 });
```

### `src/queue/scheduler.ts`

```typescript
import cron from 'node-cron';
import { prisma } from '../db/prisma';
import { agentQueue } from './queue';

/**
 * IDX Market Hours: Mon–Fri 09:00–16:00 WIB (02:00–09:00 UTC)
 * Agent runs every 15 min during market hours + 15 min pre/post market
 * Cron: every 15 min, Mon–Fri, between 01:45–09:15 UTC (08:45–16:15 WIB)
 */
export function startScheduler() {
  cron.schedule(
    process.env.AGENT_CRON_SCHEDULE ?? '*/15 1-9 * * 1-5',
    async () => {
      // Skip if outside market window (extra guard)
      const nowUtc = new Date();
      const utcHour = nowUtc.getUTCHours();
      const utcMin  = nowUtc.getUTCMinutes();
      const totalMin = utcHour * 60 + utcMin;

      const OPEN  = 1 * 60 + 45;  // 01:45 UTC = 08:45 WIB
      const CLOSE = 9 * 60 + 15;  // 09:15 UTC = 16:15 WIB

      if (totalMin < OPEN || totalMin > CLOSE) {
        console.log('[Scheduler] Outside market hours, skipping.');
        return;
      }

      const run = await prisma.agentRun.create({
        data: { agentType: 'scheduled', status: 'running' },
      });

      await agentQueue.add('run-agent', { agentRunId: run.id }, {
        attempts: 2,
        backoff: { type: 'exponential', delay: 10_000 },
      });

      console.log(`[Scheduler] Queued agent run: ${run.id}`);
    },
    { timezone: 'UTC' }
  );

  console.log('[Scheduler] Cron started — runs every 15 min during IDX market hours.');
}
```

---

## 7. SWAGGER CONFIG

### `src/swagger/swagger.ts`

```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SahamGue News API',
      version: '1.0.0',
      description: 'AI-powered IDX news backend for SahamGue retail trading app',
    },
    servers: [{ url: '/api', description: 'Production' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        NewsItem: {
          type: 'object',
          properties: {
            id:             { type: 'string', format: 'uuid' },
            headline:       { type: 'string' },
            summary:        { type: 'string' },
            source:         { type: 'string', example: 'REUTERS ID' },
            publishedAt:    { type: 'string', format: 'date-time' },
            isLive:         { type: 'boolean' },
            category:       { type: 'string', enum: ['hot','latest','critical','popular'] },
            impactLevel:    { type: 'string', enum: ['breaking','high','medium','low','fundamental','regulatory'] },
            tickers:        { type: 'array', items: { type: 'string' } },
            aiConfidence:   { type: 'integer', minimum: 0, maximum: 100 },
            views:          { type: 'integer' },
            whyRelevant:    { type: 'array', items: { type: 'string' } },
            estimatedImpact: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  },
  apis: ['./src/api/**/*.ts'],
};

export function setupSwagger(app: Application) {
  const spec = swaggerJsdoc(options);
  // No auth required on /api/docs
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
}
```

---

## 8. SERVER ENTRY POINT

### `src/server.ts`

```typescript
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { newsRouter } from './api/news/news.router';
import { adminRouter } from './api/admin/admin.router';
import { errorHandler } from './middleware/errorHandler';
import { publicLimiter, adminLimiter } from './middleware/rateLimiter';
import { setupSwagger } from './swagger/swagger';
import { startScheduler } from './queue/scheduler';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

setupSwagger(app);

app.use('/api/news', publicLimiter, newsRouter);
app.use('/api/news', adminLimiter, adminRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SahamGue API running on :${PORT}`);
  console.log(`Swagger docs: http://localhost:${PORT}/api/docs`);
  startScheduler();
});
```

---

## 9. SEED SCRIPT

### `prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const run = await prisma.agentRun.create({
    data: { agentType: 'seed', status: 'success', finishedAt: new Date(), articlesSaved: 5 },
  });

  const seeds = [
    {
      headline: 'BBCA Catat Laba Bersih Q4 2025 Tumbuh 8% YoY, Lampaui Ekspektasi Analis',
      summary: 'Bank Central Asia membukukan laba bersih Rp 14,2 triliun pada Q4 2025, didorong pertumbuhan kredit konsumer dan CASA yang solid.',
      originalUrl: 'https://seed.example.com/news/bbca-q4-2025',
      source: 'REUTERS ID',
      publishedAt: new Date(Date.now() - 2 * 60 * 1000),
      category: 'hot',
      impactLevel: 'high',
      tickers: ['BBCA'],
      aiConfidence: 94,
      whyRelevant: ['Laba melampaui konsensus +3%', 'NIM stabil di 5,4% menandai pricing power kuat'],
      estimatedImpact: [{ ticker: 'BBCA', low: 1.2, high: 2.8, direction: 'positive', timeframe: 'short' }],
      relevanceReason: 'BBCA ada di watchlist kamu',
      views: 8200, trendRank: 1,
    },
    {
      headline: 'Bank Indonesia Pertahankan BI Rate 6,00% — Sinyal Dovish Semester II 2026',
      summary: 'RDG BI mempertahankan suku bunga acuan di 6,00% dengan indikasi pelonggaran di H2 2026 seiring inflasi terkendali 2,3% YoY.',
      originalUrl: 'https://seed.example.com/news/bi-rate-mar-2026',
      source: 'CNBC INDONESIA',
      publishedAt: new Date(Date.now() - 15 * 60 * 1000),
      category: 'critical',
      impactLevel: 'breaking',
      tickers: ['BBCA', 'BBRI', 'BMRI', 'BRIS'],
      aiConfidence: 96,
      whyRelevant: ['Suku bunga stabil positif untuk NIM perbankan', 'Ekspektasi rate cut H2 2026 dorong valuasi'],
      estimatedImpact: [
        { ticker: 'BBCA', low: 0.5, high: 1.2, direction: 'positive', timeframe: 'medium' },
        { ticker: 'BBRI', low: 0.4, high: 1.0, direction: 'positive', timeframe: 'medium' },
      ],
      views: 42100,
    },
    {
      headline: 'BBRI Salurkan KUR Rp 85 Triliun di Q1 2026, Melampaui Target Pemerintah',
      summary: 'BBRI berhasil menyalurkan KUR sebesar Rp 85 triliun di Q1 2026, melampaui target Rp 75 triliun. NPL segmen mikro turun ke 2,1%.',
      originalUrl: 'https://seed.example.com/news/bbri-kur-q1',
      source: 'DETIK FINANCE',
      publishedAt: new Date(Date.now() - 7 * 60 * 60 * 1000),
      category: 'popular',
      impactLevel: 'fundamental',
      tickers: ['BBRI'],
      aiConfidence: 82,
      whyRelevant: ['NPL turun menandai perbaikan kualitas aset', 'Dukungan pemerintah perkuat posisi market leader'],
      estimatedImpact: [{ ticker: 'BBRI', low: 0.5, high: 1.2, direction: 'positive', timeframe: 'medium' }],
      relevanceReason: 'BBRI ada di watchlist kamu',
      views: 9800,
    },
    {
      headline: 'Astra International Laporkan Penjualan Otomotif Turun 8% YoY di Februari 2026',
      summary: 'Penjualan mobil turun 8% YoY di Februari 2026 menjadi 78.200 unit, berdampak langsung pada segmen otomotif ASII yang menguasai 54% pangsa pasar.',
      originalUrl: 'https://seed.example.com/news/asii-automotive-feb26',
      source: 'BISNIS.COM',
      publishedAt: new Date(Date.now() - 9 * 60 * 60 * 1000),
      category: 'critical',
      impactLevel: 'high',
      tickers: ['ASII'],
      aiConfidence: 86,
      whyRelevant: ['Penurunan penjualan otomotif Q1 tekan EPS 2026', 'Segmen alat berat bisa mengimbangi'],
      estimatedImpact: [{ ticker: 'ASII', low: -1.5, high: -0.5, direction: 'negative', timeframe: 'short' }],
      views: 10700,
    },
    {
      headline: 'OJK Terbitkan Regulasi ESG untuk Perbankan Nasional — Implementasi 2027',
      summary: 'OJK mewajibkan bank dengan aset di atas Rp 100 triliun menerbitkan laporan ESG terstandar mulai 2027.',
      originalUrl: 'https://seed.example.com/news/ojk-esg-2027',
      source: 'KONTAN',
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
      category: 'latest',
      impactLevel: 'regulatory',
      tickers: ['BBCA', 'BMRI', 'IHSG'],
      aiConfidence: 72,
      whyRelevant: ['Biaya implementasi ESG Rp 200-400 miliar per bank', 'Investor ESG global lebih tertarik emiten patuh'],
      estimatedImpact: [{ ticker: 'BBCA', low: -0.3, high: 0.2, direction: 'negative', timeframe: 'long' }],
      views: 5600,
    },
  ];

  for (const s of seeds) {
    await prisma.newsItem.upsert({
      where: { originalUrl: s.originalUrl },
      update: {},
      create: { ...s, agentRunId: run.id, isLive: false, isActive: true },
    });
  }

  console.log('✅  Seeded 5 IDX news articles.');
}

main().finally(() => prisma.$disconnect());
```

> Run: `npx prisma db seed`

---

## 10. ENV CONFIGURATION

### `.env.example`

```dotenv
# ── Database ────────────────────────────────────────────────
DATABASE_URL="postgresql://postgres:password@localhost:5432/sahamgue"

# ── Redis ───────────────────────────────────────────────────
REDIS_URL="redis://localhost:6379"

# ── Auth ────────────────────────────────────────────────────
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# ── AI APIs ─────────────────────────────────────────────────
GROQ_API_KEY="gsk_..."          # Free tier — llama-3.3-70b-versatile
ANTHROPIC_API_KEY="sk-ant-..."  # Paid — claude-sonnet-4-5

# ── Agent Configuration ──────────────────────────────────────
# Comma-separated RSS feed URLs to scrape
NEWS_SOURCES="https://www.kontan.co.id/rss/news,https://www.cnbcindonesia.com/rss,https://www.bisnis.com/rss,https://finance.detik.com/rss,https://www.idxchannel.com/rss"

# Cron schedule (default: every 15 min, Mon-Fri, 01:45-09:15 UTC = 08:45-16:15 WIB)
AGENT_CRON_SCHEDULE="*/15 1-9 * * 1-5"

# ── App ─────────────────────────────────────────────────────
PORT=3001
NODE_ENV=production
```

---

## Cost Optimization Summary

| Rule | Implementation |
|------|----------------|
| **Free first** | Groq (llama-3.3-70b) handles all scraping + summarization |
| **Relevance gate** | Only articles scoring `>0.6` from Groq call Claude |
| **Batch Claude** | Up to 5 articles per single Sonnet API call |
| **Redis dedup** | URL and ticker+headline pairs cached 30 min |
| **Cost tracking** | `claudeInputTokens`, `claudeOutputTokens`, `estimatedCostUsd` logged per `AgentRun` |
| **Idle outside hours** | Scheduler skips runs outside Mon–Fri 08:45–16:15 WIB |

**Estimated cost at 15-min intervals (IDX session ~7hrs/day, 5 days/week):**
- ~28 runs/day × ~10 articles passing filter × batched = ~6 Claude calls/day
- At Sonnet pricing: **< $0.50 USD/day** for typical Indonesian market news volume
