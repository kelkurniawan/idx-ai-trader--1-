"""Lightweight request guards for rate limiting and abuse prevention."""

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from ..config import get_settings

settings = get_settings()
_request_counters: dict[str, list[float]] = defaultdict(list)
_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if settings.RATE_LIMIT_BACKEND != "redis" or not settings.REDIS_URL:
        return None

    try:
        import redis

        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        _redis_client.ping()
        print("Rate limit store: Redis")
        return _redis_client
    except Exception as exc:
        print(f"Redis rate limit store unavailable ({exc}), falling back to memory")
        return None


def request_identifier(request: Request, fallback: str = "anonymous") -> str:
    """Build a stable identifier from the request IP and user agent."""
    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return f"{client_host}:{user_agent[:80]}:{fallback}"


def enforce_rate_limit(scope: str, key: str, limit: int, window_seconds: int) -> None:
    """Raise 429 if the key exceeds the configured limit in the current window."""
    redis_client = _get_redis()
    bucket = f"ratelimit:{scope}:{key}"
    if redis_client is not None:
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
        return

    now = time.time()
    cutoff = now - window_seconds
    recent = [timestamp for timestamp in _request_counters[bucket] if timestamp > cutoff]
    if len(recent) >= limit:
        retry_after = max(1, int(window_seconds - (now - recent[0])))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )
    recent.append(now)
    _request_counters[bucket] = recent
