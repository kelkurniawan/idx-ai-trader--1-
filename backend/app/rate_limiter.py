from types import SimpleNamespace

try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
except ImportError:
    # Keep the API bootable even when slowapi is not installed yet.
    limiter = SimpleNamespace(enabled=False)
    RateLimitExceeded = Exception

    async def _rate_limit_exceeded_handler(*_args, **_kwargs):
        raise RuntimeError("Rate limiting is unavailable because slowapi is not installed.")
