# Design Adoption — Implementation Walkthrough

## What Was Done

### [index.css](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/index.css) — Token Foundation
- Expanded the `:root` block from 9 partial tokens to the full 28-token design system
- Added `--bg-muted`, `--bg-raised`, `--border-strong`, full text scale (`--text-second`, `--text-dimmer`), `--accent-green-border`, `--accent-red-border`, `--accent-gold-*`, `--accent-purple-*`, and nav tokens
- Added a `[data-theme="light"]` override block covering all background, border, text, and semantic tokens
- Pre-existing `font-jakarta`, `font-mono-trading`, animations, and scrollbar utilities are untouched

---

### [Watchlist.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/Watchlist.tsx) — Page Redesign

| Change | Details |
|---|---|
| Page header | Icon block: 40×40 green-gradient with `--accent-green-border` |
| Fonts | Title: 18px/800/−0.3px tracking. Subtitle: 11px/500 |
| Add-ticker bar | `--bg-surface` card, `--bg-muted` input, `--accent-green` button |
| Input font | JetBrains Mono 13px 700, uppercase |
| Empty state | Dark `--bg-surface` card with sad eye emoji and soft text |
| Logic | Zero changes — all [handleAdd](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/Watchlist.tsx#33-45), [handleRemove](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/Watchlist.tsx#46-49), [handleUpdateTarget](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/Watchlist.tsx#50-53) untouched |

---

### [PortfolioRow.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/PortfolioRow.tsx) — Card + Modal Redesign

| Change | Details |
|---|---|
| Card layout | 5-zone flex row: Avatar (46×46) → Info column → Price → Signal → Actions |
| Sector chips | Per-sector hex colour via [sectorChipStyle()](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/PortfolioRow.tsx#25-29) — Financials blue, Energy amber, etc. |
| Index chips | Amber `#f59e0b` pill for IDX30/LQ45 etc. |
| Price display | JetBrains Mono 14px/800; green/red by `data.change >= 0` |
| Signal Alert | Collapses inline "Set Price" to compact `font-mono` trigger with bell icon |
| Alert strip | Green `--accent-green-bg` strip below card when `targetPrice` set; gold strip when triggered |
| Set-price modal | New [AlertModal](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/PortfolioRow.tsx#37-132) overlay — `rgba(0,0,0,0.65)` overlay, `border-radius: 18px` dialog, Rp-prefixed number input |
| Action icons | Chart (hover → green), Trash (hover → red), always visible on mobile |
| Logic | `getRealTimeStockData`, `onUpdateTarget`, `onAnalyze`, `onRemove` — 100% unchanged |

---

### [TradeJournal.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/TradeJournal.tsx) — Full Visual Overhaul

| Change | Details |
|---|---|
| Page header icon | Red-gradient icon block with `--accent-red-border` |
| "+ Log Trade" button | `linear-gradient(135deg, #7c3aed, #a855f7)` purple gradient |
| Stats bar | New 3-col grid: Total P&L (green/red) · Win Rate (green) · Total Trades. Visible when `entries.length > 0`. Derived from existing `entries` state via [calculatePnL](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/TradeJournal.tsx#93-100) |
| Log form → bottom sheet | Fixed overlay + sheet with `border-radius: 20px 20px 0 0` and drag handle bar. All field state and [handleSubmit](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/TradeJournal.tsx#67-79) untouched |
| BUY/SELL toggle | Token-driven pills: accent-green-bg/border for BUY, accent-red for SELL |
| Strategy chips | Pill toggles across 5 strategy options (SWING, SCALP, BREAKOUT, REVERSAL, MOMENTUM) |
| CTA button label | "Save Trade" → "Simpan Trade" |
| Trade card border | `--accent-green-border` when P&L positive, `--accent-red-border` when negative |
| Trade card Row 1 | Compact inline: BUY/SELL pill + ticker mono + strategy chip + P&L right-aligned |
| Trade card Row 2 | 3-col mini grid (Entry / Exit / Stop) in `--bg-muted` cells |
| Trade card footer | Date in WIB (UTC+7), compact Chart/Delete buttons always visible |
| Empty state | `--bg-surface` solid-border card with 📝 44px emoji |
| Review chart | Preserved as a subtle secondary action; Chart component and all its logic untouched |
| Logic | All state, [calculatePnL](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/TradeJournal.tsx#93-100), [handleDelete](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/TradeJournal.tsx#80-86), [handleSubmit](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/TradeJournal.tsx#67-79), `generateTradeReviewData` — zero changes |

---

### [LearningCenter.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/LearningCenter.tsx) — Learning Hub Redesign

| Change | Details |
|---|---|
| Page header icon | Amber-gradient icon block with `--accent-gold-border` |
| Filter chips | New horizontal-scroll row: "All" + per-category chips. Active: `--accent-green-bg`. Wired to new `activeCategory` state |
| Course card layout | Changed from 3-col grid of tall cards → vertical list of compact horizontal row cards |
| Course card colours | Icon block, category chip, CTA text, and hover border all derive from `CATEGORY_COLORS` map |
| Card hover | `translateY(-1px)` + category-coloured border `{color}66` |
| Coming soon card | Horizontal flex row (was centered grid card) |
| Article back button | `"← Kembali ke Learning Hub"` text link (was icon button) |
| Key takeaway box | New `--bg-muted` box with 3px left border in category colour + 💡 label |
| Disclaimer strip | New `--accent-gold-bg` strip with Indonesian disclaimer text |
| Article data | `ARTICLES` array 100% unchanged — all content and `content: React.ReactNode` preserved |

---

## Verification

```
npx tsc --noEmit
```

**Result**: Only pre-existing error: `tailwind.config.ts(31,5): 'safelist' does not exist` — this originates from the prior Tailwind v4 migration and is unrelated to this work. All four rewritten components are type-error free.

> **Zero logic changes** confirmed: no API calls, state managers, routing, prop signatures, or service function bodies were modified.
