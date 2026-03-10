// ─── Shared TypeScript interfaces ─────────────────────────────
// These match the frontend NewsItem type exactly

export interface EstimatedImpact {
  ticker: string;
  low: number;
  high: number;
  direction: 'positive' | 'negative';
  timeframe: 'short' | 'medium' | 'long';
}

export type ImpactLevel =
  | 'breaking'
  | 'high'
  | 'medium'
  | 'low'
  | 'fundamental'
  | 'regulatory';

export type NewsCategory = 'hot' | 'latest' | 'critical' | 'popular';

export interface NewsItem {
  id: string;
  headline: string;
  summary: string | null;
  source: string;
  publishedAt: Date;
  relativeTime: string;       // computed: "2 mnt lalu"
  isLive: boolean;
  category: NewsCategory;
  impactLevel: ImpactLevel;
  tickers: string[];
  aiConfidence: number;
  estimatedImpact: EstimatedImpact[];
  whyRelevant: string[];
  relevanceReason?: string | null;
  personalized: boolean;
  views: number;
  trendRank?: number | null;
}

// ─── Query param types ────────────────────────────────────────
export interface FeedQuery {
  tab?: string;
  category?: string;
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Utility: relative time in Bahasa Indonesia ───────────────
export function toRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr  = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr  / 24);

  if (diffSec < 60)   return 'Baru saja';
  if (diffMin < 60)   return `${diffMin} mnt lalu`;
  if (diffHr  < 24)   return `${diffHr} jam lalu`;
  if (diffDay === 1)  return 'Kemarin';
  return `${diffDay} hari lalu`;
}
