"""
One-off live test for the IDX EOD scraper.

Run this locally to confirm the IDX Stock Summary endpoint is reachable through
Cloudflare and that the response shape matches the parser. It does NOT touch the
database — it only fetches + parses + prints a sample.

Usage (from repo root or backend/):
    python backend/scripts/test_idx_fetch.py            # today
    python backend/scripts/test_idx_fetch.py 20260529   # a specific YYYYMMDD

If you get 0 rows, paste the printed raw keys here and we'll adjust the parser.
"""

import asyncio
import os
import sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)

from app.services.idx_ingest_service import (  # noqa: E402
    _fetch_stock_summary_sync,
    parse_stock_summary,
)


def main() -> None:
    date_str = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime("%Y%m%d")
    print(f"[test] fetching IDX Stock Summary for {date_str} ...")

    try:
        payload = _fetch_stock_summary_sync(date_str)
    except Exception as exc:  # noqa: BLE001
        print(f"[test] FETCH FAILED: {type(exc).__name__}: {exc}")
        print("[test] If this is a Cloudflare/403 error, that's the hurdle we expected.")
        sys.exit(1)

    top_keys = list(payload.keys()) if isinstance(payload, dict) else type(payload)
    print(f"[test] payload top-level keys: {top_keys}")

    data = (payload or {}).get("data") or []
    print(f"[test] raw data rows: {len(data)}")
    if data:
        print(f"[test] first raw row keys: {list(data[0].keys())}")

    rows = parse_stock_summary(payload)
    print(f"[test] parsed tradable rows: {len(rows)}")
    for r in rows[:3]:
        print(f"   {r['ticker']:6} close={r['close']:>10.2f} vol={r['volume']:>14.0f} "
              f"val={r['value']:>16.0f} freq={r['frequency']:>7} fb={r['foreign_buy']:.0f}")

    if not rows:
        print("[test] No rows parsed — paste 'first raw row keys' above so we can map fields.")


if __name__ == "__main__":
    main()
