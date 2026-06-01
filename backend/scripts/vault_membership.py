"""
Membership data for the Obsidian knowledge vault.

Index membership resolution order:
  1. `vault_membership_generated.json` (if present) — produced by
     refresh_membership.py from the IDX Stock Summary, ranked by traded value
     (a liquidity-derived proxy: top-30 = IDX30, top-45 = LQ45, top-80 = IDX80,
     top-100 = KOMPAS100). This is DERIVED, not the official IDX committee list
     (which IDX only publishes as PDFs), but it auto-refreshes and is grounded
     in real trading data.
  2. The hardcoded SEED below — used until the refresh script has run.

Listing boards: "Utama" (Main), "Pengembangan" (Development), "Akselerasi".
"""

import json
import os

_GENERATED = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                          "vault_membership_generated.json")

# Stable seed (used until refresh_membership.py generates real rankings).
_SEED_INDEX_MEMBERS: dict[str, set[str]] = {
    "LQ45": {
        "BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "UNVR", "ICBP", "INDF",
        "KLBF", "GGRM", "UNTR", "ADRO", "ANTM", "PGAS", "PTBA", "SMGR", "INKP",
        "INTP", "CPIN", "AKRA", "ITMG", "MDKA", "MEDC", "AMRT", "BRPT", "TOWR",
        "TBIG", "ARTO", "GOTO", "ISAT", "MAPI", "BRIS", "EXCL", "INCO",
    },
    "IDX30": {
        "BBCA", "BBRI", "BMRI", "BBNI", "TLKM", "ASII", "UNVR", "ICBP", "KLBF",
        "ADRO", "ANTM", "PGAS", "PTBA", "SMGR", "CPIN", "MDKA", "MEDC", "AMRT",
        "BRPT", "TOWR", "GOTO", "ISAT", "BRIS", "INCO", "UNTR", "AKRA",
    },
}

# Default: everything in the curated seed is Main board ("Utama").
# Override here only for known non-main-board tickers.
BOARD_OVERRIDES: dict[str, str] = {
    # "EXAMPLE": "Pengembangan",
}
DEFAULT_BOARD = "Utama"


def _load_index_members() -> tuple[dict[str, set[str]], str]:
    """Generated rankings (preferred) over the seed. Returns (members, source)."""
    if os.path.exists(_GENERATED):
        try:
            with open(_GENERATED, encoding="utf-8") as f:
                raw = json.load(f)
            members = {k: set(v) for k, v in (raw.get("indices") or {}).items()}
            if members:
                return members, raw.get("source", "generated")
        except Exception:  # noqa: BLE001 - fall back to seed on any parse issue
            pass
    return {k: set(v) for k, v in _SEED_INDEX_MEMBERS.items()}, "seed"


INDEX_MEMBERS, MEMBERSHIP_SOURCE = _load_index_members()


def indices_for(ticker: str) -> list[str]:
    return sorted(idx for idx, members in INDEX_MEMBERS.items() if ticker in members)


def board_for(ticker: str) -> str:
    return BOARD_OVERRIDES.get(ticker, DEFAULT_BOARD)
