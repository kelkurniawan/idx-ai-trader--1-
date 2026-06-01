"""
KSEI Ownership Ingest Service

Fetches the monthly KSEI "Balance Position" file (share ownership composition)
and stores each ticker's foreign-vs-local ownership snapshot on the `stocks`
table.

Source: web.ksei.co.id publishes a monthly ZIP per month-end at
    https://web.ksei.co.id/Download/BalanceposEfek{YYYYMMDD}.zip
containing a single pipe-delimited TXT (`Balancepos{YYYYMMDD}.txt`).

Cadence is MONTHLY (month-end), not daily.

File columns (pipe-delimited, 25 fields):
    Date | Code | Type | Sec. Num | Price |
    Local IS..Local OT (9) | Total(local, idx 14) |
    Foreign IS..Foreign OT (9) | Total(foreign, idx 24)

We parse by POSITION because the header has two columns both named "Total".
Cloudflare-aware download via curl_cffi (Chrome impersonation), off-thread.
"""

from __future__ import annotations

import asyncio
import io
import logging
import re
import zipfile
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.stock import Stock

logger = logging.getLogger(__name__)
settings = get_settings()

KSEI_BASE = "https://web.ksei.co.id"
KSEI_ARCHIVE = f"{KSEI_BASE}/archive_download/holding_composition"
KSEI_FILE = KSEI_BASE + "/Download/BalanceposEfek{date}.zip"

# Column positions in the pipe-delimited Balance Position file.
_COL_CODE = 1
_COL_TYPE = 2
_COL_SECNUM = 3
_COL_PRICE = 4
_COL_LOCAL_TOTAL = 14
_COL_FOREIGN_TOTAL = 24
_MIN_COLS = 25


# ─────────────────────────────────────────────────────────────────────────────
# Pure parsing (no network) — unit testable
# ─────────────────────────────────────────────────────────────────────────────
def _num(s: str) -> float:
    try:
        return float(s.strip())
    except (ValueError, AttributeError):
        return 0.0


def parse_balance_position(text: str) -> list[dict]:
    """Parse the pipe-delimited Balance Position text into ownership rows.

    Only EQUITY rows are kept. Returns dicts with ticker, shares, local/foreign
    totals and computed ownership percentages. Rows with zero shares are skipped.
    """
    rows: list[dict] = []
    for i, line in enumerate(text.splitlines()):
        if not line or "|" not in line:
            continue
        parts = line.split("|")
        if i == 0 and parts[0].strip().lower() == "date":
            continue  # header
        if len(parts) < _MIN_COLS:
            continue
        if parts[_COL_TYPE].strip().upper() != "EQUITY":
            continue

        ticker = parts[_COL_CODE].strip().upper()
        sec_num = _num(parts[_COL_SECNUM])
        if not ticker or sec_num <= 0:
            continue

        local_total = _num(parts[_COL_LOCAL_TOTAL])
        foreign_total = _num(parts[_COL_FOREIGN_TOTAL])
        denom = local_total + foreign_total
        if denom <= 0:
            denom = sec_num
        foreign_pct = round(foreign_total / denom * 100, 2) if denom else 0.0
        local_pct = round(local_total / denom * 100, 2) if denom else 0.0

        rows.append({
            "ticker": ticker,
            "shares": sec_num,
            "price": _num(parts[_COL_PRICE]),
            "local_total": local_total,
            "foreign_total": foreign_total,
            "foreign_pct": foreign_pct,
            "local_pct": local_pct,
        })
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Network (curl_cffi) — runs in a thread
# ─────────────────────────────────────────────────────────────────────────────
def _new_session():
    try:
        from curl_cffi import requests as cffi_requests
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("curl_cffi is not installed. Add 'curl_cffi' to requirements.txt.") from exc
    return cffi_requests.Session(impersonate="chrome")


def _list_available_dates_sync() -> list[str]:
    """Scrape the archive page for available BalanceposEfek YYYYMMDD dates (desc)."""
    session = _new_session()
    try:
        resp = session.get(KSEI_ARCHIVE, headers={"Referer": KSEI_BASE}, timeout=45)
        resp.raise_for_status()
        dates = re.findall(r"BalanceposEfek(\d{8})\.zip", resp.text)
        return sorted(set(dates), reverse=True)
    finally:
        session.close()


def _fetch_balance_text_sync(date_str: str) -> str:
    """Download + unzip the Balance Position file for a YYYYMMDD month-end date."""
    session = _new_session()
    try:
        url = KSEI_FILE.format(date=date_str)
        resp = session.get(url, headers={"Referer": KSEI_ARCHIVE}, timeout=120)
        resp.raise_for_status()
        if resp.content[:2] != b"PK":
            raise RuntimeError(f"KSEI did not return a ZIP for {date_str}")
        zf = zipfile.ZipFile(io.BytesIO(resp.content))
        name = next((n for n in zf.namelist() if n.lower().endswith(".txt")), None)
        if not name:
            raise RuntimeError(f"No .txt inside KSEI zip for {date_str}")
        with zf.open(name) as f:
            return f.read().decode("utf-8", "replace")
    finally:
        session.close()


async def latest_available_date() -> Optional[str]:
    try:
        dates = await asyncio.to_thread(_list_available_dates_sync)
        return dates[0] if dates else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("[KSEIIngest] could not list archive: %s", exc)
        return None


async def fetch_ownership(date_str: str) -> list[dict]:
    """Download + parse one month's ownership file. [] on any failure."""
    try:
        text = await asyncio.to_thread(_fetch_balance_text_sync, date_str)
        rows = parse_balance_position(text)
        logger.info("[KSEIIngest] %s -> %d equity ownership rows", date_str, len(rows))
        return rows
    except Exception as exc:  # noqa: BLE001
        logger.warning("[KSEIIngest] fetch failed for %s: %s", date_str, exc)
        return []


# ─────────────────────────────────────────────────────────────────────────────
# Persistence — update the latest ownership snapshot on `stocks`
# ─────────────────────────────────────────────────────────────────────────────
async def upsert_ownership(db: AsyncSession, rows: list[dict], as_of: datetime) -> int:
    """Update foreign/local ownership % on existing `stocks` rows. Idempotent.

    Only updates tickers already present in `stocks` (the EOD ingest owns row
    creation); KSEI lists thousands of non-equity instruments we don't track.
    """
    if not rows:
        return 0
    known = {
        t for (t,) in (await db.execute(select(Stock.ticker))).all()
    }
    updated = 0
    for r in rows:
        if r["ticker"] not in known:
            continue
        stock = (await db.execute(
            select(Stock).where(Stock.ticker == r["ticker"])
        )).scalar_one()
        stock.foreign_ownership_pct = r["foreign_pct"]
        stock.local_ownership_pct = r["local_pct"]
        stock.ownership_as_of = as_of
        updated += 1
    await db.commit()
    return updated


# ─────────────────────────────────────────────────────────────────────────────
# Orchestration
# ─────────────────────────────────────────────────────────────────────────────
def _parse_yyyymmdd(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y%m%d")


async def ingest_ksei_ownership(db: AsyncSession, date_str: Optional[str] = None) -> dict:
    """Fetch the given (or latest available) month's ownership file and store it."""
    if not date_str:
        date_str = await latest_available_date()
    if not date_str:
        return {"date": None, "source": "none", "matched": 0, "rows": 0}

    rows = await fetch_ownership(date_str)
    matched = await upsert_ownership(db, rows, _parse_yyyymmdd(date_str)) if rows else 0
    summary = {
        "date": date_str,
        "source": "ksei" if rows else "none",
        "rows": len(rows),
        "matched": matched,
    }
    logger.info("[KSEIIngest] ownership complete: %s", summary)
    return summary


_ksei_running = False


def is_ksei_ingest_running() -> bool:
    return _ksei_running


def run_ksei_ingest_in_background(date_str: Optional[str] = None) -> dict:
    """Start a KSEI ownership ingest in the background, return 202-style status."""
    global _ksei_running
    if _ksei_running:
        return {"started": False, "message": "A KSEI ingest run is already in progress"}
    _ksei_running = True

    async def _run() -> None:
        global _ksei_running
        from ..database import AsyncSessionLocal
        try:
            async with AsyncSessionLocal() as db:
                summary = await ingest_ksei_ownership(db, date_str)
                logger.info("[KSEIIngest] background run complete: %s", summary)
        except Exception as exc:  # noqa: BLE001
            logger.error("[KSEIIngest] background run failed: %s", exc)
        finally:
            _ksei_running = False

    asyncio.create_task(_run())
    return {"started": True, "message": "KSEI ownership ingest started in background"}
