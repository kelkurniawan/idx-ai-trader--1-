"""Shared input normalization helpers for API schemas."""

import html
import re
from typing import Optional
from urllib.parse import urlparse

CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
TICKER_PATTERN = re.compile(r"^[A-Z0-9._-]{1,10}$")


def clean_text(value: Optional[str], *, max_length: int, field_name: str = "Text") -> Optional[str]:
    """Trim, remove control characters, escape HTML, and enforce length."""
    if value is None:
        return None
    cleaned = CONTROL_CHARS.sub("", value).strip()
    cleaned = html.escape(cleaned, quote=True)
    if len(cleaned) > max_length:
        raise ValueError(f"{field_name} must be {max_length} characters or fewer")
    return cleaned


def clean_required_text(value: str, *, min_length: int = 1, max_length: int, field_name: str = "Text") -> str:
    cleaned = clean_text(value, max_length=max_length, field_name=field_name) or ""
    if len(cleaned) < min_length:
        raise ValueError(f"{field_name} must be at least {min_length} characters")
    return cleaned


def clean_email(value: str) -> str:
    return value.strip().lower()


def clean_ticker(value: str) -> str:
    ticker = CONTROL_CHARS.sub("", value).strip().upper()
    if not TICKER_PATTERN.match(ticker):
        raise ValueError("Ticker must be 1-10 letters, digits, dots, dashes, or underscores")
    return ticker


def clean_url(value: Optional[str], *, max_length: int = 500, field_name: str = "URL") -> Optional[str]:
    cleaned = clean_text(value, max_length=max_length, field_name=field_name)
    if not cleaned:
        return cleaned
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{field_name} must be a valid http(s) URL")
    return cleaned
