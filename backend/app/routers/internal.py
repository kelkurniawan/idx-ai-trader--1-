"""Internal trigger endpoints, guarded by INTERNAL_API_SECRET.

Called by the GitHub Actions scheduler (not by browsers).
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status

from ..config import get_settings
from ..services.price_ingest_service import run_ingest_in_background

router = APIRouter()
settings = get_settings()


def _require_internal_secret(x_internal_secret: str | None = Header(default=None)) -> None:
    expected = settings.INTERNAL_API_SECRET
    if not expected or x_internal_secret != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal secret.",
        )


@router.post("/refresh-prices")
async def refresh_prices(_: None = Depends(_require_internal_secret)):
    """Kick off the daily Yahoo Finance price ingest in the background.

    Returns 202 immediately — the full-universe scrape runs on the event loop
    so the HTTP trigger never times out.
    """
    return run_ingest_in_background()
