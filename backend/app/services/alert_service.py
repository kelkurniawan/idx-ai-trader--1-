"""Operational alert delivery helpers."""

import json
from typing import Any

import httpx

from ..config import get_settings

settings = get_settings()


async def send_ops_alert(title: str, message: str, details: dict[str, Any] | None = None) -> None:
    """Send an ops alert to an external webhook if configured."""
    if not settings.OPS_ALERT_WEBHOOK_URL:
        return

    payload = {
        "title": title,
        "message": message,
        "details": details or {},
    }
    headers = {"Content-Type": "application/json"}
    if settings.OPS_ALERT_WEBHOOK_BEARER:
        headers["Authorization"] = f"Bearer {settings.OPS_ALERT_WEBHOOK_BEARER}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.OPS_ALERT_WEBHOOK_URL,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
    except Exception as exc:
        print(f"Failed to send ops alert: {exc} | payload={json.dumps(payload, default=str)}")
