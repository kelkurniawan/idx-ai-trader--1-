"""
Lightweight request guards for rate limiting and abuse prevention.

These counters are process-local. For multi-instance production deployments,
swap the backing store to Redis or another shared cache.
"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

_request_counters: dict[str, list[float]] = defaultdict(list)


def request_identifier(request: Request, fallback: str = "anonymous") -> str:
    """Build a stable identifier from the request IP and user agent."""
    client_host = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return f"{client_host}:{user_agent[:80]}:{fallback}"


def enforce_rate_limit(scope: str, key: str, limit: int, window_seconds: int) -> None:
    """Raise 429 if the key exceeds the configured limit in the current window."""
    now = time.time()
    bucket = f"{scope}:{key}"
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
