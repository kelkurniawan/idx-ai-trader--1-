"""
Refresh index membership for the knowledge vault from live IDX data.

IDX publishes official index constituents only as PDFs (no clean JSON endpoint),
so this derives a liquidity-ranked proxy from the IDX Stock Summary:
  - rank all tradable tickers by traded Value (desc) for a date
  - top 30 -> IDX30, top 45 -> LQ45, top 80 -> IDX80, top 100 -> KOMPAS100

This is DERIVED (liquidity), not the official committee selection — but it
auto-refreshes and is grounded in real trading data. Writes
`vault_membership_generated.json`, which vault_membership.py prefers over the
hardcoded seed.

Usage (from repo root or backend/):
    python backend/scripts/refresh_membership.py            # latest trading day
    python backend/scripts/refresh_membership.py 20260529   # specific YYYYMMDD
    python backend/scripts/refresh_membership.py 20260529 --build-vault
"""

import asyncio
import json
import os
import sys
from datetime import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
sys.path.insert(0, BACKEND)
sys.path.insert(0, HERE)

from app.services.idx_ingest_service import fetch_idx_stock_summary  # noqa: E402

OUT = os.path.join(HERE, "vault_membership_generated.json")

# index name -> number of top-by-value tickers (nested)
INDEX_SIZES = {"IDX30": 30, "LQ45": 45, "IDX80": 80, "KOMPAS100": 100}


async def build(date_str: str) -> dict:
    rows = await fetch_idx_stock_summary(date_str)
    if not rows:
        raise SystemExit(f"[membership] IDX returned no rows for {date_str} "
                         f"(non-trading day or Cloudflare block).")

    ranked = sorted(rows, key=lambda r: r.get("value", 0.0), reverse=True)
    tickers = [r["ticker"] for r in ranked]

    indices = {name: tickers[:size] for name, size in INDEX_SIZES.items()}
    return {
        "source": f"idx-value-ranked ({date_str})",
        "derived": True,
        "note": "Liquidity-derived (top-N by traded value), NOT the official IDX committee list.",
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "universe_size": len(tickers),
        "indices": indices,
    }


def main() -> None:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    flags = {a for a in sys.argv[1:] if a.startswith("--")}
    date_str = args[0] if args else datetime.now().strftime("%Y%m%d")

    data = asyncio.run(build(date_str))
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"[membership] wrote {OUT}")
    print(f"[membership] source: {data['source']} | universe: {data['universe_size']}")
    for name, members in data["indices"].items():
        print(f"[membership]   {name:10} {len(members)} (top: {', '.join(members[:5])} ...)")

    if "--build-vault" in flags:
        print("[membership] regenerating vault ...")
        import importlib
        import vault_membership
        import build_vault
        # The generated JSON was just written, so reload so the new rankings
        # are picked up (both modules bind membership at import time).
        importlib.reload(vault_membership)
        importlib.reload(build_vault)
        build_vault.main()


if __name__ == "__main__":
    main()
