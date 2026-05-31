"""Internal trigger endpoints, guarded by INTERNAL_API_SECRET.

Called by the GitHub Actions scheduler (not by browsers).
"""

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..services.price_ingest_service import ingest_all

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
async def refresh_prices(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(_require_internal_secret),
):
    """Run the daily Yahoo Finance price ingest for all tickers."""
    return await ingest_all(db)
