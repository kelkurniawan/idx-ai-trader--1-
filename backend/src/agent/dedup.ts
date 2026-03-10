import { getRedis } from '../cache/redis';

const TTL = parseInt(process.env.DEDUP_TTL_SECONDS ?? '1800', 10); // 30 min default

function urlKey(originalUrl: string): string {
  const encoded = Buffer.from(originalUrl).toString('base64').slice(0, 64);
  return `news:dedup:url:${encoded}`;
}

function tickerHeadlineKey(ticker: string, headline: string): string {
  const encoded = Buffer.from(`${ticker}:${headline.slice(0, 80)}`).toString('base64').slice(0, 64);
  return `news:dedup:th:${encoded}`;
}

/**
 * Returns true if the article URL has NOT been seen in the last TTL seconds.
 * Marks it as seen on first call (atomic GET+SET pattern).
 */
export async function isNewUrl(originalUrl: string): Promise<boolean> {
  const redis = getRedis();
  const key = urlKey(originalUrl);
  const exists = await redis.exists(key);
  if (exists) return false;
  await redis.setex(key, TTL, '1');
  return true;
}

/**
 * Returns true if the ticker+headline combo is a duplicate.
 * Used to avoid re-processing the same story from multiple sources.
 */
export async function isBatchDup(ticker: string, headline: string): Promise<boolean> {
  const redis = getRedis();
  const key = tickerHeadlineKey(ticker, headline);
  const set = await redis.setnx(key, '1');
  if (set === 1) {
    await redis.expire(key, TTL);
    return false; // first time seen
  }
  return true; // duplicate
}
