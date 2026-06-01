# IDX Knowledge Vault

An [Obsidian](https://obsidian.md) vault of the Indonesia Stock Exchange universe
(93 tickers), generated from the project database/seed.

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
