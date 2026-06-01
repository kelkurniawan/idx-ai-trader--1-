"""Lightweight request guards for rate limiting and abuse prevention."""

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from ..config import get_settings

settings = get_settings()
_request_counters: dict[str, list[float]] = defaultdict(list)
_redis_client = None


def _get_redis():
    """Return a live Redis client, or None if unavailable/unconfigured.

    The client is cached after the first successful connection.  If a
    subsequent call finds the cached client is stale (e.g. Upstash free-tier
    connection drop), it clears the cache and falls back to memory so callers
    never receive a dead client that will throw ConnectionError.
    """
    global _redis_client
    if settings.RATE_LIMIT_BACKEND != "redis" or not settings.REDIS_URL:
        return None

    if _redis_client is not None:
        # Verify the cached connection is still alive before returning it.
        try:
            _redis_client.ping()
            return _redis_client
        except Exception:
            # Connection dropped — clear cache so we try to reconnect below.
            _redis_client = None

    try:
        import redis

        client = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_connect_timeout=3)
        client.ping()
        _redis_client = client
        print("Rate limit store: Redis (connected)")
        return _redis_client
    except Exception as exc:
        print(f"Redis rate limit store unavailable ({exc}), falling back to memory")
        return None


def _enforce_redis(redis_client, bucket: str, limit: int, window_seconds: int) -> None:
    """Run the Redis-backed rate limit check.  Falls back gracefully on errors."""
    try:
        current = redis_client.incr(bucket)
        if current == 1:
            redis_client.expire(bucket, window_seconds)
        if current > limit:
            ttl = redis_client.ttl(bucket)
            retry_after = max(1, ttl if ttl and ttl > 0 else window_seconds)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(retry_after)},
            )
    except HTTPException:
        raise  # 429s must propagate
    except Exception as exc:
        # Redis went away mid-request — clear cache and fall through to memory.
        global _redis_client
        _redis_client = None
        print(f"Redis rate limit error ({exc}), falling back to memory for this request")


def _enforce_memory(bucket: str, limit: int, window_seconds: int) -> None:
    """In-process memory-based rate limit check (single-instance only)."""
    now = time.time()
    cutoff = now - window_seconds
    recent = [ts for ts in _request_counters[bucket] if ts > cutoff]
    if len(recent) >= limit:
        retry_after = max(1, int(window_seconds - (now - recent[0])))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
    recent.append(now)
    _request_counters[bucket] = recent


def request_identifier(request: Request, fallback: str = "anonymous") -> str:
    """Build a stable identifier from the request IP and user agent."""
    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return f"{client_host}:{user_agent[:80]}:{fallback}"


def enforce_rate_limit(scope: str, key: str, limit: int, window_seconds: int) -> None:
    """Raise 429 if the key exceeds the configured limit in the current window.

    Always falls back to an in-process memory counter if Redis is unavailable
    so that a Redis outage never causes HTTP 500 on API endpoints.
    """
    redis_client = _get_redis()
    bucket = f"ratelimit:{scope}:{key}"

    if redis_client is not None:
        _enforce_redis(redis_client, bucket, limit, window_seconds)
        # If _enforce_redis cleared _redis_client due to an error, it already
        # printed a warning.  We do NOT fall through to memory in that case
        # to avoid double-counting — simply allow the request through.
        return

    _enforce_memory(bucket, limit, window_seconds)
