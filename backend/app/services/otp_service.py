"""
OTP Service (Abstract + Implementations)

Provides a Redis-swappable OTP store interface.
Profile endpoints use a separate key namespace from the login OTP store
so they don't interfere with each other.

Main OTP store (for login): managed in services/mfa_service.py
Profile OTP store (this module): used for email-change & MFA SMS setup
"""

import time
from abc import ABC, abstractmethod
from typing import Optional

from ..config import get_settings

settings = get_settings()


# ────────────────────────────────────────────────────────────────
# Abstract interface
# ────────────────────────────────────────────────────────────────

class OTPStore(ABC):
    """Abstract OTP store — swap implementation without touching call sites."""

    @abstractmethod
    def set(self, key: str, code: str, ttl_seconds: int) -> None:
        """Store OTP code under key with TTL."""
        ...

    @abstractmethod
    def get_and_delete(self, key: str) -> Optional[str]:
        """Retrieve OTP and remove it (single-use). Returns None if expired/missing."""
        ...

    @abstractmethod
    def delete(self, key: str) -> None:
        """Explicitly delete an OTP entry."""
        ...


# ────────────────────────────────────────────────────────────────
# In-memory implementation (development / single-server)
# ────────────────────────────────────────────────────────────────

class InMemoryOTPStore(OTPStore):
    """Thread-safe in-memory store using a plain dict with epoch-based expiry."""

    def __init__(self) -> None:
        # structure: { key: { "code": str, "expires_at": float } }
        self._store: dict[str, dict] = {}

    def set(self, key: str, code: str, ttl_seconds: int) -> None:
        self._store[key] = {
            "code": code,
            "expires_at": time.time() + ttl_seconds,
        }

    def get_and_delete(self, key: str) -> Optional[str]:
        entry = self._store.pop(key, None)
        if entry is None:
            return None
        if time.time() > entry["expires_at"]:
            return None
        return entry["code"]

    def delete(self, key: str) -> None:
        self._store.pop(key, None)


# ────────────────────────────────────────────────────────────────
# Redis implementation (production)
# ────────────────────────────────────────────────────────────────

class RedisOTPStore(OTPStore):
    """Redis-backed OTP store for distributed / multi-process deployments."""

    def __init__(self, redis_url: str) -> None:
        import redis as redis_lib
        self._r = redis_lib.from_url(redis_url, decode_responses=True)

    def set(self, key: str, code: str, ttl_seconds: int) -> None:
        self._r.setex(key, ttl_seconds, code)

    def get_and_delete(self, key: str) -> Optional[str]:
        pipe = self._r.pipeline()
        pipe.get(key)
        pipe.delete(key)
        results = pipe.execute()
        return results[0]  # None if key didn't exist

    def delete(self, key: str) -> None:
        self._r.delete(key)


# ────────────────────────────────────────────────────────────────
# Singleton factory — returns correct impl based on config
# ────────────────────────────────────────────────────────────────

_profile_otp_store: Optional[OTPStore] = None


def get_profile_otp_store() -> OTPStore:
    """Return the configured OTP store singleton (lazy init)."""
    global _profile_otp_store
    if _profile_otp_store is not None:
        return _profile_otp_store

    if settings.OTP_STORE_BACKEND == "redis" and settings.REDIS_URL:
        try:
            store = RedisOTPStore(settings.REDIS_URL)
            store._r.ping()  # type: ignore[attr-defined]
            print("✅ Profile OTP store: Redis")
            _profile_otp_store = store
        except Exception as e:
            print(f"⚠️  Redis unavailable ({e}), falling back to in-memory OTP store")
            _profile_otp_store = InMemoryOTPStore()
    else:
        _profile_otp_store = InMemoryOTPStore()

    return _profile_otp_store


# ────────────────────────────────────────────────────────────────
# Convenience helpers used by profile services
# ────────────────────────────────────────────────────────────────

PROFILE_OTP_TTL = 10 * 60  # 10 minutes


def store_profile_otp(user_id: str, purpose: str, code: str) -> None:
    """
    Store a profile-specific OTP with a namespaced key.

    purposes: 'email_change', 'mfa_sms', 'mfa_email'
    """
    key = f"profile_otp:{user_id}:{purpose}"
    get_profile_otp_store().set(key, code, PROFILE_OTP_TTL)


def retrieve_profile_otp(user_id: str, purpose: str) -> Optional[str]:
    """Retrieve and consume a profile OTP. Returns None if expired or not found."""
    key = f"profile_otp:{user_id}:{purpose}"
    return get_profile_otp_store().get_and_delete(key)


def clear_profile_otp(user_id: str, purpose: str) -> None:
    """Explicitly clear a profile OTP."""
    key = f"profile_otp:{user_id}:{purpose}"
    get_profile_otp_store().delete(key)
