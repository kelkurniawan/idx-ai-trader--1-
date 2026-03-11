"""
Internal Cross-Service Client

This client handles HTTP communication from the Python backend to the
Node.js backend, allowing us to enforce strict table ownership boundaries
(Python does not directly query Node's Prisma tables, and vice versa).
"""

import httpx
from typing import Any, Dict, Optional
import logging

from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class InternalNodeClient:
    def __init__(self):
        # Default internal URL assumes docker-compose network or local dev
        self.base_url = "http://localhost:3001/api/internal"
        self._client: Optional[httpx.AsyncClient] = None
        self._secret = "dev_internal_secret_key" # Should be in settings in a real app

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={"x-internal-secret": self._secret},
                timeout=10.0
            )
        return self._client

    async def get_user_news_feed(self, user_id: str) -> Dict[str, Any]:
        """
        Example internal call: Fetch personalized news from Node.js service.
        """
        try:
            client = await self._get_client()
            resp = await client.get(f"/news/feed/{user_id}")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as e:
            logger.error(f"Internal request failed: {e}")
            return {"error": str(e), "articles": []}

    async def close(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Singleton
node_client = InternalNodeClient()
