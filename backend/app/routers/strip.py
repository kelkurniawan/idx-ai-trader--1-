"""
Strip Router

Public endpoint for the hybrid scrolling strip.
Returns EOD movers + hot headlines for the ticker bar.
No authentication required — visible to all visitors.
"""

import logging
from typing import List, Literal

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from ..database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


# ────────────────────────────────────────────────────────────────
# Pydantic v2 response models
# ────────────────────────────────────────────────────────────────

class MoverItem(BaseModel):
    code: str
    price: int
    pct: float
    dir: Literal["up", "dn"]


class HeadlineItem(BaseModel):
    id: str
    label: str
    color: str
    text: str
    tickers: List[str]


class StripData(BaseModel):
    movers: List[MoverItem]
    headlines: List[HeadlineItem]


# ────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────

def _headline_label(impact_level: str) -> str:
    if impact_level == "breaking":
        return "⚡"
    if impact_level == "high":
        return "🔴"
    return "🟡"


def _headline_color(impact_level: str) -> str:
    if impact_level == "breaking":
        return "#a78bfa"
    if impact_level == "high":
        return "#fca5a5"
    return "#fde68a"


def _truncate(s: str, max_len: int = 72) -> str:
    if len(s) > max_len:
        return s[:max_len] + "…"
    return s


# ────────────────────────────────────────────────────────────────
# Endpoint
# ────────────────────────────────────────────────────────────────

@router.get("/data", response_model=StripData)
async def get_strip_data(
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — no auth required.
    Returns top 3 gainers + top 2 losers (EOD) and up to 6 hot headlines.
    Cache-Control: max-age=300 (5 minutes).
    On any error: returns empty lists, never 500.
    """
    movers: List[MoverItem] = []
    headlines: List[HeadlineItem] = []

    # ── MOVERS ──────────────────────────────────────────────────
    try:
        # StockPrice table: ticker, close, date columns
        # Get the latest date, then fetch all prices for that date
        # Compute pct change vs previous day's close
        movers_sql = text("""
            WITH latest AS (
                SELECT MAX(date) AS max_date FROM stock_prices
            ),
            prev AS (
                SELECT MAX(date) AS prev_date
                FROM stock_prices
                WHERE date < (SELECT max_date FROM latest)
            ),
            today AS (
                SELECT sp.ticker, sp.close AS price
                FROM stock_prices sp, latest l
                WHERE sp.date = l.max_date
            ),
            yesterday AS (
                SELECT sp.ticker, sp.close AS prev_price
                FROM stock_prices sp, prev p
                WHERE sp.date = p.prev_date
            ),
            changes AS (
                SELECT
                    t.ticker,
                    CAST(t.price AS INTEGER) AS price,
                    CASE
                        WHEN y.prev_price IS NOT NULL AND y.prev_price > 0
                        THEN ROUND(((t.price - y.prev_price) / y.prev_price * 100)::NUMERIC, 2)
                        ELSE 0
                    END AS pct
                FROM today t
                LEFT JOIN yesterday y ON t.ticker = y.ticker
            ),
            ranked AS (
                (SELECT ticker, price, pct FROM changes ORDER BY pct DESC LIMIT 3)
                UNION ALL
                (SELECT ticker, price, pct FROM changes ORDER BY pct ASC LIMIT 2)
            )
            SELECT ticker, price, pct FROM ranked
        """)
        result = await db.execute(movers_sql)
        rows = result.fetchall()
        for row in rows:
            movers.append(MoverItem(
                code=row.ticker,
                price=int(row.price),
                pct=float(row.pct),
                dir="up" if float(row.pct) >= 0 else "dn",
            ))
    except Exception as e:
        logger.error("Strip movers query failed: %s", e, exc_info=True)

    # ── HEADLINES ───────────────────────────────────────────────
    try:
        # news_items table (Prisma-owned):
        #   Prisma field names ARE the column names (camelCase):
        #   id, headline, category, "impactLevel", views, tickers, "publishedAt"
        headlines_sql = text("""
            SELECT id, headline, category, "impactLevel", tickers
            FROM news_items
            WHERE "isActive" = true
              AND (
                category = 'hot'
                OR "impactLevel" IN ('breaking', 'high')
              )
            ORDER BY views DESC
            LIMIT 6
        """)
        result = await db.execute(headlines_sql)
        rows = result.fetchall()
        for row in rows:
            impact = row.impactLevel or "medium"
            raw_tickers = row.tickers or []
            headlines.append(HeadlineItem(
                id=str(row.id),
                label=_headline_label(impact),
                color=_headline_color(impact),
                text=_truncate(row.headline),
                tickers=list(raw_tickers[:2]),
            ))
    except Exception as e:
        logger.error("Strip headlines query failed: %s", e, exc_info=True)

    # Build response with Cache-Control header
    data = StripData(movers=movers, headlines=headlines)
    response = JSONResponse(content=data.model_dump())
    response.headers["Cache-Control"] = "max-age=300"
    return response
