import Parser from 'rss-parser';

// ─── Types ────────────────────────────────────────────────────
export interface RawArticle {
  headline: string;
  originalUrl: string;
  source: string;
  publishedAt: Date;
  rawContent: string;
}

// ─── Config ───────────────────────────────────────────────────
const RSS_SOURCES = (process.env.NEWS_SOURCES ?? '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

const rss = new Parser({
  customFields: {
    item: [['media:content', 'mediaContent', { keepArray: false }]],
  },
  timeout: 15000,
});

// Map RSS feed URL to a clean source name
function resolveSourceName(feedUrl: string, feedTitle?: string): string {
  const hostname = new URL(feedUrl).hostname.toLowerCase();
  if (hostname.includes('kontan'))       return 'KONTAN';
  if (hostname.includes('cnbcindonesia')) return 'CNBC INDONESIA';
  if (hostname.includes('bisnis'))       return 'BISNIS.COM';
  if (hostname.includes('detik'))        return 'DETIK FINANCE';
  if (hostname.includes('idxchannel'))   return 'IDX CHANNEL';
  return (feedTitle ?? hostname).toUpperCase();
}

// ─── Main scraper ─────────────────────────────────────────────
export async function scrapeAllFeeds(): Promise<RawArticle[]> {
  if (RSS_SOURCES.length === 0) {
    console.warn('[Scraper] No RSS sources configured in NEWS_SOURCES env var.');
    return [];
  }

  const results: RawArticle[] = [];

  await Promise.allSettled(
    RSS_SOURCES.map(async (feedUrl) => {
      try {
        const feed = await rss.parseURL(feedUrl);
        const sourceName = resolveSourceName(feedUrl, feed.title);

        for (const item of (feed.items ?? []).slice(0, 15)) {
          if (!item.link || !item.title) continue;

          const rawContent =
            item.contentSnippet ??
            item.content ??
            (item as any).summary ??
            item.title ??
            '';

          results.push({
            headline: item.title.trim(),
            originalUrl: item.link.trim(),
            source: sourceName,
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            rawContent: rawContent.slice(0, 2000), // cap at 2k chars for Groq
          });
        }

        console.log(`[Scraper] ${sourceName}: ${feed.items?.length ?? 0} items fetched`);
      } catch (err) {
        console.error(`[Scraper] Failed to parse ${feedUrl}:`, err);
      }
    })
  );

  console.log(`[Scraper] Total articles fetched: ${results.length}`);
  return results;
}
