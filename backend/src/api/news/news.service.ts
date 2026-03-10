import { prisma } from '../../db/prisma';
import { FeedQuery, PaginatedResponse, NewsItem, toRelativeTime } from './news.types';

// ─── Transform Prisma row to API NewsItem shape ───────────────
function mapRow(row: any, personalized = false): NewsItem {
  return {
    id:              row.id,
    headline:        row.headline,
    summary:         row.summary,
    source:          row.source,
    publishedAt:     row.publishedAt,
    relativeTime:    toRelativeTime(new Date(row.publishedAt)),
    isLive:          row.isLive,
    category:        row.category,
    impactLevel:     row.impactLevel,
    tickers:         row.tickers ?? [],
    aiConfidence:    row.aiConfidence,
    estimatedImpact: (row.estimatedImpact as any[]) ?? [],
    whyRelevant:     row.whyRelevant ?? [],
    relevanceReason: row.relevanceReason ?? null,
    personalized,
    views:           row.views,
    trendRank:       row.trendRank ?? null,
  };
}

// ─── GET /feed ────────────────────────────────────────────────
export async function getNewsFeed(
  query: FeedQuery
): Promise<PaginatedResponse<NewsItem>> {
  const { tab, category, page, limit } = query;
  const where: any = { isActive: true };

  // tab and category can overlap; tab takes precedence
  if (tab && ['hot', 'latest', 'critical', 'popular'].includes(tab)) {
    where.category = tab;
  } else if (category) {
    where.category = category;
  }

  const orderBy =
    tab === 'popular'
      ? { views: 'desc' as const }
      : { publishedAt: 'desc' as const };

  const [rows, total] = await Promise.all([
    prisma.newsItem.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.newsItem.count({ where }),
  ]);

  return {
    data: rows.map((r) => mapRow(r)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── GET /personalized ────────────────────────────────────────
export async function getPersonalizedNews(
  userId: string | undefined,
  overrideTickers: string[]
): Promise<NewsItem[]> {
  let tickers = overrideTickers;

  // Fall back to stored user preferences if no override
  if (tickers.length === 0 && userId) {
    const prefs = await prisma.userPersonalization.findUnique({
      where: { userId },
    });
    tickers = prefs?.watchlistTickers ?? [];
  }

  if (tickers.length === 0) return [];

  const rows = await prisma.newsItem.findMany({
    where: {
      isActive: true,
      tickers: { hasSome: tickers },
    },
    orderBy: { publishedAt: 'desc' },
    take: 30,
  });

  return rows.map((r) => mapRow(r, true));
}

// ─── GET /ticker/:code ────────────────────────────────────────
export async function getNewsByTicker(code: string): Promise<NewsItem[]> {
  const rows = await prisma.newsItem.findMany({
    where: {
      isActive: true,
      tickers: { has: code },
    },
    orderBy: { publishedAt: 'desc' },
    take: 20,
  });
  return rows.map((r) => mapRow(r));
}

// ─── GET /:id ─────────────────────────────────────────────────
export async function getNewsById(id: string): Promise<NewsItem | null> {
  const row = await prisma.newsItem.findUnique({ where: { id } });
  if (!row) return null;
  return mapRow(row);
}

// ─── Increment view counter (fire and forget) ─────────────────
export function incrementViews(id: string): void {
  prisma.newsItem
    .update({ where: { id }, data: { views: { increment: 1 } } })
    .catch(() => {}); // non-critical
}
