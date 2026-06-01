"""Internal trigger endpoints, guarded by INTERNAL_API_SECRET.

Called by the GitHub Actions scheduler (not by browsers).
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status

from pydantic import BaseModel

from ..config import get_settings
from ..services.price_ingest_service import run_ingest_in_background
from ..services.idx_ingest_service import run_idx_ingest_in_background
from ..services.ksei_ingest_service import run_ksei_ingest_in_background

router = APIRouter()
settings = get_settings()


class IdxEodRequest(BaseModel):
    """Optional body for the IDX EOD trigger. `date` is YYYYMMDD (defaults to today)."""
    date: str | None = None


class KseiOwnershipRequest(BaseModel):
    """Optional body for the KSEI trigger. `date` is a month-end YYYYMMDD
    (defaults to the latest available file)."""
    date: str | None = None


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


@router.post("/refresh-idx-eod")
async def refresh_idx_eod(
    body: IdxEodRequest | None = None,
    _: None = Depends(_require_internal_secret),
):
    """Kick off the daily IDX (Bursa Efek Indonesia) end-of-day ingest.

    Primary EOD source — one IDX Stock Summary call covers every ticker for the
    given trading date (defaults to today). Runs in the background and returns
    immediately. The Yahoo path (/refresh-prices) remains the fallback.
    """
    date_str = body.date if body else None
    return run_idx_ingest_in_background(date_str)


@router.post("/refresh-ksei-ownership")
async def refresh_ksei_ownership(
    body: KseiOwnershipRequest | None = None,
    _: None = Depends(_require_internal_secret),
):
    """Kick off the MONTHLY KSEI share-ownership ingest.

    Downloads the KSEI Balance Position file (defaults to the latest available
    month-end) and stores each ticker's foreign/local ownership % on `stocks`.
    Runs in the background and returns immediately.
    """
    date_str = body.date if body else None
    return run_ksei_ingest_in_background(date_str)
