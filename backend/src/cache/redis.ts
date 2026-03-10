import { Redis } from 'ioredis';

// Singleton Redis client with auto-reconnect & lazy connection
let redis: Redis;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      lazyConnect: false,
    });

    redis.on('connect', () => console.log('[Redis] Connected'));
    redis.on('error', (err) => console.error('[Redis] Error:', err));
    redis.on('reconnecting', () => console.warn('[Redis] Reconnecting...'));
  }
  return redis;
}

export { redis };

// Initialize on import
getRedis();
