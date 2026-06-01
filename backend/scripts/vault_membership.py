"""
Seed membership data for the Obsidian knowledge vault.

This is intentionally a SEED. Index membership (LQ45/IDX30/...) changes every
evaluation period, and listing board can change too. The Step-2 IDX scraper
(scrape_idx_constituents) is the authoritative source and will overwrite this.

Until then, this provides enough structure for a meaningful Obsidian graph.
Anything not listed here is treated as Main board with no index membership.

Listing boards: "Utama" (Main), "Pengembangan" (Development), "Akselerasi".
"""

# Tickers that are (as a stable seed) part of each headline index.
# NOTE: seed only — refresh via the scraper for accuracy.
INDEX_MEMBERS: dict[str, set[str]] = {
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


def indices_for(ticker: str) -> list[str]:
    return sorted(idx for idx, members in INDEX_MEMBERS.items() if ticker in members)


def board_for(ticker: str) -> str:
    return BOARD_OVERRIDES.get(ticker, DEFAULT_BOARD)
