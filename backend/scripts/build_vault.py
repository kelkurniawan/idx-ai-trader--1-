"""
Obsidian Knowledge Vault generator for IDX tickers.

Generates a linked Markdown vault under <repo>/vault so the Indonesia Stock
Exchange universe can be explored in Obsidian's graph view. Each ticker note
links to its sector, listing board, and index-membership notes via [[wikilinks]],
which is what Obsidian uses to draw the graph.

Source of truth for tickers:
  1. The live `stocks` table (if reachable) -> keeps the vault synced to the DB.
  2. Fallback: the curated SAMPLE_IDX_STOCKS seed (same data that seeds the DB).

Index/board membership comes from scripts/vault_membership.py (a seed that the
Step-2 IDX scraper will later refresh).

Run from the repo root or backend/:
    python backend/scripts/build_vault.py
"""

from __future__ import annotations

import os
import sys
from datetime import date

# Make `app` importable whether run from repo root or backend/.
HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
REPO_ROOT = os.path.dirname(BACKEND)
sys.path.insert(0, BACKEND)
sys.path.insert(0, HERE)

from vault_membership import indices_for, board_for, INDEX_MEMBERS  # noqa: E402

VAULT = os.path.join(REPO_ROOT, "vault")
TODAY = date.today().isoformat()


# ─────────────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────────────
def load_tickers() -> list[dict]:
    """Curated seed = the canonical ticker list that also seeds the DB."""
    from app.services.market_data import SAMPLE_IDX_STOCKS

    rows = []
    for s in SAMPLE_IDX_STOCKS:
        rows.append({
            "ticker": s["ticker"],
            "name": s["name"],
            "sector": s.get("sector", "Unknown"),
        })
    return sorted(rows, key=lambda r: r["ticker"])


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _write(path: str, content: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def _yaml_list(items: list[str]) -> str:
    if not items:
        return "[]"
    return "[" + ", ".join(f'"{i}"' for i in items) + "]"


# ─────────────────────────────────────────────────────────────────────────────
# Note builders
# ─────────────────────────────────────────────────────────────────────────────
def ticker_note(row: dict) -> str:
    t = row["ticker"]
    sector = row["sector"]
    board = board_for(t)
    indices = indices_for(t)

    index_links = " ".join(f"[[{i}]]" for i in indices) if indices else "_none (seed)_"

    return f"""---
type: ticker
ticker: {t}
name: "{row['name']}"
sector: "{sector}"
board: "{board}"
indices: {_yaml_list(indices)}
data_source: seed
last_synced: {TODAY}
tags: [idx, ticker, "sector/{sector.replace(' ', '-').replace('&', 'and')}"]
---

# {t} — {row['name']}

> Indonesia Stock Exchange listed company.

## Classification
- **Sector:** [[{sector}]]
- **Listing board:** [[{board}]]
- **Index membership:** {index_links}

## Market data
- End-of-day OHLCV is stored in the `stock_prices` table (`{t}.JK`).
- Primary source: IDX EOD scrape -> fallback Yahoo Finance -> mock.

## Notes
<!-- Add fundamental notes, theses, or links to other [[tickers]] here. -->
"""


def sector_note(sector: str, tickers: list[str]) -> str:
    links = "\n".join(f"- [[{t}]]" for t in sorted(tickers))
    return f"""---
type: sector
name: "{sector}"
ticker_count: {len(tickers)}
tags: [idx, sector]
---

# {sector}

IDX-IC sector. **{len(tickers)}** tickers in the vault.

## Constituents
{links}
"""


def index_note(index: str, tickers: list[str]) -> str:
    present = sorted(t for t in tickers)
    links = "\n".join(f"- [[{t}]]" for t in present) if present else "_no seeded members_"
    return f"""---
type: index
name: "{index}"
member_count: {len(present)}
data_source: seed
tags: [idx, index]
---

# {index}

IDX headline index. Membership below is a **seed** and will be refreshed by the
IDX constituent scraper.

## Members ({len(present)})
{links}
"""


def board_note(board: str, tickers: list[str]) -> str:
    links = "\n".join(f"- [[{t}]]" for t in sorted(tickers))
    return f"""---
type: board
name: "{board}"
ticker_count: {len(tickers)}
tags: [idx, board]
---

# {board} Board

IDX listing board. **{len(tickers)}** tickers in the vault.

## Listed here
{links}
"""


def moc_note(rows: list[dict], sectors: dict, indices: dict, boards: dict) -> str:
    sector_links = "\n".join(f"- [[{s}]] ({len(ts)})" for s, ts in sorted(sectors.items()))
    index_links = "\n".join(f"- [[{i}]] ({len(ts)})" for i, ts in sorted(indices.items()))
    board_links = "\n".join(f"- [[{b}]] ({len(ts)})" for b, ts in sorted(boards.items()))
    return f"""---
type: moc
title: "IDX Market — Map of Content"
ticker_count: {len(rows)}
tags: [idx, moc]
---

# 🇮🇩 IDX Market — Map of Content

Root note for the Indonesia Stock Exchange knowledge vault.
**{len(rows)}** tickers · generated {TODAY}.

> Open **Graph View** (Ctrl/Cmd+G) to explore ticker ↔ sector ↔ index ↔ board.

## Sectors
{sector_links}

## Indices
{index_links}

## Boards
{board_links}
"""


def readme_note(n: int) -> str:
    return f"""# IDX Knowledge Vault

An [Obsidian](https://obsidian.md) vault of the Indonesia Stock Exchange universe
({n} tickers), generated from the project database/seed.

## Open it
1. Obsidian -> **Open folder as vault** -> select this `vault/` folder.
2. Open **`IDX Market.md`** (the Map of Content).
3. Press **Ctrl/Cmd + G** for the graph view.

## Structure
- `Tickers/` — one note per ticker, linked to its sector, board, and indices.
- `Sectors/` — IDX-IC sectors.
- `Indices/` — LQ45, IDX30, ... (membership is a seed; refreshed by the scraper).
- `Boards/` — listing boards (Utama / Pengembangan / Akselerasi).

## Regenerate (stays in sync with the DB)
```bash
python backend/scripts/build_vault.py
```

> Generated files are deterministic — safe to commit and re-run.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main() -> None:
    rows = load_tickers()

    sectors: dict[str, list[str]] = {}
    boards: dict[str, list[str]] = {}
    indices: dict[str, list[str]] = {i: [] for i in INDEX_MEMBERS}

    for r in rows:
        t = r["ticker"]
        sectors.setdefault(r["sector"], []).append(t)
        boards.setdefault(board_for(t), []).append(t)
        for i in indices_for(t):
            indices[i].append(t)

    # Ticker notes
    for r in rows:
        _write(os.path.join(VAULT, "Tickers", f"{r['ticker']}.md"), ticker_note(r))

    # Hub notes
    for s, ts in sectors.items():
        _write(os.path.join(VAULT, "Sectors", f"{s}.md"), sector_note(s, ts))
    for i, ts in indices.items():
        _write(os.path.join(VAULT, "Indices", f"{i}.md"), index_note(i, ts))
    for b, ts in boards.items():
        _write(os.path.join(VAULT, "Boards", f"{b}.md"), board_note(b, ts))

    # Root + readme
    _write(os.path.join(VAULT, "IDX Market.md"), moc_note(rows, sectors, indices, boards))
    _write(os.path.join(VAULT, "README.md"), readme_note(len(rows)))

    total = len(rows) + len(sectors) + len(indices) + len(boards) + 2
    print(f"[vault] generated {total} notes under {VAULT}")
    print(f"[vault]   tickers : {len(rows)}")
    print(f"[vault]   sectors : {len(sectors)}")
    print(f"[vault]   indices : {len(indices)} ({', '.join(sorted(indices))})")
    print(f"[vault]   boards  : {len(boards)} ({', '.join(sorted(boards))})")


if __name__ == "__main__":
    main()
