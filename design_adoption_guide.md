# Design Adoption Guide — sahamgue
### Watchlist · Trade Journal · Learning Hub

> **Scope**: Visual design only. Zero changes to API calls, state management, routing, business logic, or function signatures.

---

## 1 · CSS Custom Properties

```css
/* ─────────────────────────────────────────────
   GLOBAL FONT IMPORTS (add to <head>)
───────────────────────────────────────────── */
/*
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
*/

/* ─────────────────────────────────────────────
   DARK MODE (default — matches prototype)
───────────────────────────────────────────── */
:root {
  /* — Typography — */
  --font-sans:  'Plus Jakarta Sans', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;

  /* — Background scale — */
  --color-bg-base:    #0f1117;   /* page background */
  --color-bg-surface: #1a1d27;   /* cards, modals, sheets */
  --color-bg-muted:   #22263a;   /* input fields, info rows */
  --color-bg-raised:  #2a2f45;   /* hover states, selected rows */

  /* — Border — */
  --color-border:         rgba(255,255,255,0.08);
  --color-border-strong:  rgba(255,255,255,0.14);

  /* — Text scale — */
  --color-text-primary:   #f1f5f9;   /* headings, important values */
  --color-text-second:    #94a3b8;   /* body / descriptions */
  --color-text-muted:     #64748b;   /* labels, secondary info */
  --color-text-dim:       #475569;   /* timestamps, placeholders */
  --color-text-dimmer:    #334155;   /* decorative dimmed text */

  /* — Brand accent (green) — */
  --color-accent:         #22c55e;   /* accent text */
  --color-accent-bg:      rgba(34,197,94,0.12);   /* accent fill */
  --color-accent-border:  rgba(34,197,94,0.33);   /* accent outline */

  /* — Semantic: Error / negative — */
  --color-red:            #ef4444;
  --color-red-bg:         rgba(239,68,68,0.12);
  --color-red-border:     rgba(239,68,68,0.33);

  /* — Semantic: Warning / alert — */
  --color-gold:           #f59e0b;
  --color-gold-bg:        rgba(245,158,11,0.10);
  --color-gold-border:    rgba(245,158,11,0.30);
  --color-gold-text:      #b45309;

  /* — Semantic: AI / purple — */
  --color-purple:         #a855f7;
  --color-purple-bg:      rgba(168,85,247,0.12);
  --color-purple-border:  rgba(168,85,247,0.30);

  /* — Nav — */
  --color-nav-bg:         rgba(15,17,23,0.82);    /* frosted nav bar */
  --color-nav-border:     rgba(255,255,255,0.07);
  --color-nav-icon:       #64748b;
  --color-nav-icon-active:#22c55e;
  --color-nav-label-active:#22c55e;
}

/* ─────────────────────────────────────────────
   LIGHT MODE OVERRIDES
───────────────────────────────────────────── */
[data-theme="light"] {
  /* — Background scale — */
  --color-bg-base:    #f8fafc;
  --color-bg-surface: #ffffff;
  --color-bg-muted:   #f1f5f9;
  --color-bg-raised:  #e2e8f0;

  /* — Border — */
  --color-border:         rgba(0,0,0,0.08);
  --color-border-strong:  rgba(0,0,0,0.14);

  /* — Text scale — */
  --color-text-primary:   #0f172a;
  --color-text-second:    #334155;
  --color-text-muted:     #64748b;
  --color-text-dim:       #94a3b8;
  --color-text-dimmer:    #cbd5e1;

  /* — Brand accent — same hue, tightened opacity — */
  --color-accent-bg:      rgba(34,197,94,0.09);
  --color-accent-border:  rgba(34,197,94,0.25);

  /* — Semantic — */
  --color-red-bg:         rgba(239,68,68,0.08);
  --color-red-border:     rgba(239,68,68,0.22);
  --color-gold-bg:        rgba(245,158,11,0.08);
  --color-gold-text:      #92400e;
  --color-purple-bg:      rgba(168,85,247,0.08);

  /* — Nav — */
  --color-nav-bg:         rgba(248,250,252,0.90);
  --color-nav-border:     rgba(0,0,0,0.07);
  --color-nav-icon:       #94a3b8;
}
```

---

## 2 · TypeScript Design Token Object

```typescript
/** design-tokens.ts
 *  Import: import { THEME } from './design-tokens';
 *  Usage:  const t = THEME[colorMode];          // 'dark' | 'light'
 */

export type ThemeMode = 'dark' | 'light';

export interface ThemeTokens {
  // Backgrounds
  bgBase:    string;
  bgSurface: string;
  bgMuted:   string;
  bgRaised:  string;
  // Borders
  border:       string;
  borderStrong: string;
  // Text
  textPrimary: string;
  textSecond:  string;
  textMuted:   string;
  textDim:     string;
  textDimmer:  string;
  // Accent (green)
  accent:       string;
  accentBg:     string;
  accentBorder: string;
  // Error
  red:       string;
  redBg:     string;
  redBorder: string;
  // Warning
  gold:       string;
  goldBg:     string;
  goldBorder: string;
  goldText:   string;
  // AI / special
  purple:       string;
  purpleBg:     string;
  purpleBorder: string;
  // Nav
  navBg:         string;
  navBorder:     string;
  navIcon:       string;
  navIconActive: string;
}

const dark: ThemeTokens = {
  bgBase:    '#0f1117',
  bgSurface: '#1a1d27',
  bgMuted:   '#22263a',
  bgRaised:  '#2a2f45',

  border:       'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  textPrimary: '#f1f5f9',
  textSecond:  '#94a3b8',
  textMuted:   '#64748b',
  textDim:     '#475569',
  textDimmer:  '#334155',

  accent:       '#22c55e',
  accentBg:     'rgba(34,197,94,0.12)',
  accentBorder: 'rgba(34,197,94,0.33)',

  red:       '#ef4444',
  redBg:     'rgba(239,68,68,0.12)',
  redBorder: 'rgba(239,68,68,0.33)',

  gold:       '#f59e0b',
  goldBg:     'rgba(245,158,11,0.10)',
  goldBorder: 'rgba(245,158,11,0.30)',
  goldText:   '#b45309',

  purple:       '#a855f7',
  purpleBg:     'rgba(168,85,247,0.12)',
  purpleBorder: 'rgba(168,85,247,0.30)',

  navBg:         'rgba(15,17,23,0.82)',
  navBorder:     'rgba(255,255,255,0.07)',
  navIcon:       '#64748b',
  navIconActive: '#22c55e',
};

const light: ThemeTokens = {
  bgBase:    '#f8fafc',
  bgSurface: '#ffffff',
  bgMuted:   '#f1f5f9',
  bgRaised:  '#e2e8f0',

  border:       'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.14)',

  textPrimary: '#0f172a',
  textSecond:  '#334155',
  textMuted:   '#64748b',
  textDim:     '#94a3b8',
  textDimmer:  '#cbd5e1',

  accent:       '#22c55e',
  accentBg:     'rgba(34,197,94,0.09)',
  accentBorder: 'rgba(34,197,94,0.25)',

  red:       '#ef4444',
  redBg:     'rgba(239,68,68,0.08)',
  redBorder: 'rgba(239,68,68,0.22)',

  gold:       '#f59e0b',
  goldBg:     'rgba(245,158,11,0.08)',
  goldBorder: 'rgba(245,158,11,0.30)',
  goldText:   '#92400e',

  purple:       '#a855f7',
  purpleBg:     'rgba(168,85,247,0.08)',
  purpleBorder: 'rgba(168,85,247,0.30)',

  navBg:         'rgba(248,250,252,0.90)',
  navBorder:     'rgba(0,0,0,0.07)',
  navIcon:       '#94a3b8',
  navIconActive: '#22c55e',
};

export const THEME: Record<ThemeMode, ThemeTokens> = { dark, light };

/* ── Sector color map ── */
export const SECTOR_COLORS: Record<string, string> = {
  Financials:  '#3b82f6',
  Energy:      '#f59e0b',
  Technology:  '#7c3aed',
  Industrials: '#06b6d4',
  Consumer:    '#ec4899',
  Healthcare:  '#22c55e',
  Mining:      '#a78bfa',
  Infra:       '#f97316',
};
/** Helper: returns { color, bg, border } for a sector chip */
export function sectorChipStyle(sector: string) {
  const c = SECTOR_COLORS[sector] ?? '#64748b';
  return {
    color:  c,
    background: c + '2e',   // ~18 % opacity
    border: `1px solid ${c}54`,  // ~33 % opacity
  };
}

/* ── Learning/Journal category color map ── */
export const CATEGORY_COLORS: Record<string, string> = {
  'Technical Analysis': '#6366f1',
  'Indicators':         '#7c3aed',
  'Strategy':           '#22c55e',
  'Fundamental':        '#f59e0b',
  'Psychology':         '#ec4899',
  'Macroeconomics':     '#06b6d4',
};
```

---

## 3 · Typography Scale Table

| Role | Font Family | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| `page-title` | Plus Jakarta Sans | 18px | 800 | 1.2 | -0.3px |
| `page-subtitle` | Plus Jakarta Sans | 11px | 500 | 1.4 | 0 |
| `section-label` | Plus Jakarta Sans | 10px | 700 | 1 | 0.8px (uppercase) |
| `card-ticker-primary` | JetBrains Mono | 15px | 800 | 1.2 | 0 |
| `card-company-name` | Plus Jakarta Sans | 10px | 600 | 1.3 | 0 |
| `price-display` | JetBrains Mono | 14px | 800 | 1 | 0 |
| `price-change-pct` | JetBrains Mono | 11px | 700 | 1 | 0 |
| `chip-label` | Plus Jakarta Sans | 8.5px | 700 | 1 | 0.5px |
| `chip-label-index` | Plus Jakarta Sans | 8px | 700 | 1 | 0.4px |
| `signal-alert-label` | Plus Jakarta Sans | 8px | 800 | 1 | 1px (uppercase) |
| `set-price-value` | JetBrains Mono | 12px | 700 | 1 | 0 |
| `modal-title` | Plus Jakarta Sans | 15px | 800 | 1.3 | 0 |
| `modal-subtitle` | Plus Jakarta Sans | 11px | 500 | 1.5 | 0 |
| `modal-input-label` | Plus Jakarta Sans | 10px | 700 | 1 | 0.6px (uppercase) |
| `journal-pnl-amount` | JetBrains Mono | 15px | 800 | 1 | 0 |
| `journal-pnl-pct` | JetBrains Mono | 11px | 700 | 1 | 0 |
| `trade-card-ticker` | JetBrains Mono | 15px | 800 | 1.2 | 0 |
| `trade-card-stat-label` | Plus Jakarta Sans | 9px | 700 | 1 | 0.5px (uppercase) |
| `trade-card-stat-value` | JetBrains Mono | 11px | 700 | 1.2 | 0 |
| `trade-card-notes` | Plus Jakarta Sans | 11px | 400 | 1.6 | 0 |
| `trade-card-date` | Plus Jakarta Sans | 10px | 500 | 1 | 0 |
| `form-input-text` | Plus Jakarta Sans | 13px | 600 | 1 | 0 |
| `form-input-prefix` | Plus Jakarta Sans | 11px | 700 | 1 | 0 |
| `stats-bar-value` | JetBrains Mono | 16px | 800 | 1 | 0 |
| `stats-bar-label` | Plus Jakarta Sans | 9.5px | 600 | 1 | 0.3px |
| `course-title` | Plus Jakarta Sans | 13.5px | 800 | 1.4 | 0 |
| `course-description`| Plus Jakarta Sans | 11px | 500 | 1.6 | 0 |
| `course-duration` | Plus Jakarta Sans | 10.5px | 600 | 1 | 0 |
| `course-cta` | Plus Jakarta Sans | 11px | 700 | 1 | 0 |
| `article-title` | Plus Jakarta Sans | 20px | 800 | 1.3 | -0.2px |
| `article-body` | Plus Jakarta Sans | 12.5px | 400 | 1.75 | 0 |
| `article-takeaway-label` | Plus Jakarta Sans | 10px | 800 | 1 | 0.8px (uppercase) |
| `disclaimer-text` | Plus Jakarta Sans | 10px | 500 | 1.4 | 0 |
| `filter-chip-text` | Plus Jakarta Sans | 11px | 700 | 1 | 0.3px |
| `bottom-nav-label` | Plus Jakarta Sans | 9px | 600 | 1 | 0.3px |

---

## 4 · Component Visual Specs

### ─ Spacing & Radius Reference ─

| Token name | Value | Used for |
|---|---|---|
| `radius-page-card` | 14px | Ticker cards, form rows |
| `radius-modal` | 18px | Alert modal dialog |
| `radius-sheet` | 20px 20px 0 0 | Bottom sheet top corners |
| `radius-avatar` | 12px | Ticker avatar square |
| `radius-chip` | 999px (pill) | All chips / filter pills |
| `radius-chip-square` | 6px | Strategy chip square variant |
| `radius-icon-block` | 12px | Course and page icon blocks |
| `radius-input` | 10px | All form inputs |
| `pad-page-h` | 16px | Page horizontal padding |
| `pad-card` | 14px 16px | Ticker card inner padding |
| `pad-modal` | 24px | Modal / bottom-sheet inner H padding |
| `pad-form-field` | 10px 14px | Input field padding |
| `gap-card-sections` | 10px | Between left / center / right card zones |
| `gap-chip-row` | 6px | Between sector + index chips |
| `bottom-nav-clearance` | 88px | `padding-bottom` on page scroll container |

---

### PAGE 1 — WATCHLIST

#### 4.1 — Page Header

- **Layout**: `display: flex; align-items: center; gap: 12px; margin-bottom: 20px`
- **Icon block**: 40×40px, `border-radius: 12px`, background = `linear-gradient(135deg, #22c55e22, #22c55e44)`, border = `1px solid var(--color-accent-border)`. Contains SVG eye icon in `var(--color-accent)`.
- **Title**: `font: 800 18px/1.2 var(--font-sans)`, color = `var(--color-text-primary)`, letter-spacing -0.3px.
- **Subtitle**: `font: 500 11px/1.4 var(--font-sans)`, color = `var(--color-text-muted)`, displayed below title with `margin-top: 2px`.

> **Production gap**: Current header uses Tailwind classes on a plain `<div>` with a grey/slate icon block. Swap icon block background to the green-tinted gradient above; update font weights and sizes; the `h2` text and SVG remain unchanged.

#### 4.2 — Add-Ticker Bar

- **Container**: `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 14px`, `padding: 14px 16px`
- **Inner layout**: `display: flex; gap: 10px; align-items: center`
- **Prefix label**: text `"IDX:"`, `font: 800 10px/1 var(--font-sans)`, color = `var(--color-text-dim)`, `letter-spacing: 0.5px`, positioned absolute left 14px, vertically centred in input.
- **Input field**: `background: var(--color-bg-muted)`, `border: 1px solid var(--color-border)`, `border-radius: 10px`, `padding: 10px 14px 10px 46px`, `font: 700 13px var(--font-mono)`, color = `var(--color-text-primary)`. On focus: border → `var(--color-accent-border)`.
- **Add button**: `background: var(--color-accent)`, `color: #0f1117`, `border-radius: 10px`, `padding: 10px 20px`, `font: 800 12px/1 var(--font-sans)`, no border. Hover: opacity 0.88. Active: `transform: scale(0.97)`.

> **Production gap**: Current implementation uses `bg-slate-800` for button and plain input. Button should switch to `var(--color-accent)` with dark text. Input background moves from `bg-slate-50` to `var(--color-bg-muted)` (dark-theme aware).

#### 4.3 — Ticker Card (PortfolioRow)

- **Container**: `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 14px`, `padding: 14px 16px`, `display: flex; align-items: center; gap: 12px`. On hover: border → `var(--color-border-strong)`, `box-shadow: 0 4px 24px rgba(0,0,0,0.18)`.
- **Alert active state**: border → `var(--color-accent-border)`, `box-shadow: 0 0 0 1px var(--color-accent-border)`.

**Left — Avatar block**
- Size: 46×46px
- `border-radius: 12px`
- Background: `var(--color-bg-muted)`
- Border: `1px solid var(--color-border-strong)`
- Text (ticker code): `font: 800 10px/1 var(--font-mono)`, color = `var(--color-text-primary)`, centered.

**Center — Info column**
- `display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0`
- Ticker code (large): `font: 800 15px/1.2 var(--font-mono)`, color = `var(--color-text-primary)`.
- Company name: `font: 600 10px/1.3 var(--font-sans)`, color = `var(--color-text-muted)`, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
- Tag row: `display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px`
  - **Sector chip**: Apply `sectorChipStyle(sector)` from token object. `padding: 2px 7px`, `border-radius: 999px`, `font: 700 8.5px/1 var(--font-sans)`, `letter-spacing: 0.5px`, uppercase suffix `#SectorName`.
  - **Index chip** (IDX30 / LQ45 etc.): `background: rgba(245,158,11,0.10)`, `border: 1px solid rgba(245,158,11,0.28)`, color = `#f59e0b`. Same padding/font as sector chip.

> **Production gap**: Current implementation already renders sector + index chips. Only visual changes: update chip backgrounds from indigo/amber Tailwind classes to the token-driven values above. Add icon prefix to sector chip (already present in production code as `IDX_SECTORS.find(...)?.icon`).

**Right — Price column**
- `display: flex; flex-direction: column; align-items: flex-end; gap: 2px; min-width: 88px`
- Price: `font: 800 14px/1 var(--font-mono)`, color = `var(--color-text-primary)`.
- Change %: `font: 700 11px/1 var(--font-mono)`. Positive → `var(--color-accent)`. Negative → `var(--color-red)`.

**Far Right — Signal Alert column**
- `display: flex; flex-direction: column; align-items: flex-end; gap: 4px; min-width: 100px`
- "SIGNAL ALERT" label: `font: 800 8px/1 var(--font-sans)`, color = `var(--color-text-dim)`, `letter-spacing: 1px`, uppercase.
- **Set-Price trigger** (no price set): text `"Set Price"`, `font: 700 12px/1 var(--font-mono)`, color = `var(--color-text-dim)`. On hover: color → `var(--color-accent)`.
- **Set-Price value** (price saved): `font: 700 12px/1 var(--font-mono)`, color = `var(--color-accent)`. Bell icon beside it in `var(--color-accent)`.
- **Alert firing state** (price threshold met): value text pulses (CSS `animation: pulse 1.5s ease-in-out infinite`), color → `var(--color-gold)`.
- **Action icons**: chart icon + trash icon. Size 18×18px. Default color = `var(--color-text-muted)`. Chart icon hover → `var(--color-accent)`. Trash icon hover → `var(--color-red)`. Tap area ≥ 36×36px.

**Below-card: Alert Confirmation Strip** *(conditional — shown when targetPrice is saved)*
- `margin-top: 8px; padding: 7px 12px; border-radius: 8px`
- `background: var(--color-accent-bg)`, `border: 1px solid var(--color-accent-border)`
- Text: `font: 600 10px/1.4 var(--font-sans)`, color = `var(--color-accent)`.
- Content: `"🔔 Alert set at Rp {targetPrice}" ` with IDR format.
- Visibility: tied to `targetPrice !== undefined` condition (pre-existing in `PortfolioRow`).

> **Production gap**: No alert confirmation strip exists yet. Wrap the existing `isEditing` render block in a parent that adds this strip below when `targetPrice` is defined and the card is not in edit mode.

#### 4.4 — Alert Price Modal

- **Overlay**: `position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 50; display: flex; align-items: center; justify-content: center`.
- **Dialog card**: `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border-strong)`, `border-radius: 18px`, `padding: 24px`, `width: min(320px, 90vw)`, `display: flex; flex-direction: column; gap: 16px`.
- **Dialog title**: `font: 800 15px/1.3 var(--font-sans)`, color = `var(--color-text-primary)`.
- **Dialog subtitle**: `font: 500 11px/1.5 var(--font-sans)`, color = `var(--color-text-muted)`. Ticker code within it: `var(--color-accent)` font-weight 700.
- **Price input row**: `display: flex; align-items: center; gap: 8px; background: var(--color-bg-muted); border: 1px solid var(--color-border); border-radius: 10px; padding: 10px 14px`. "Rp" prefix: `font: 700 11px var(--font-sans)`, color = `var(--color-text-dim)`. Input itself: no border, transparent bg, `font: 700 14px var(--font-mono)`, color = `var(--color-text-primary)`, `flex: 1`.
- **Cancel button**: `background: var(--color-bg-muted)`, `border: 1px solid var(--color-border)`, `border-radius: 10px`, `padding: 10px 16px`, `font: 700 12px var(--font-sans)`, color = `var(--color-text-muted)`. Hover: border → `var(--color-border-strong)`.
- **Set Alert button**: `background: var(--color-accent-bg)`, `border: 1px solid var(--color-accent-border)`, color = `var(--color-accent)`, same padding/radius. Hover: `background` → solid `var(--color-accent)`, color → `#0f1117`.

> **Production gap**: Current production has an inline edit field directly on the card row instead of a modal. Wrap existing `handleSaveTarget` + `onUpdateTarget` call inside a new modal shell per the spec above. Zero changes to the handler functions themselves.

---

### PAGE 2 — TRADE JOURNAL (Jurnal)

#### 4.5 — Page Header

- **Layout**: `display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px`
- **Left group**: flex row, gap 12px, same structure as Watchlist header.
- **Icon block**: 40×40px, `border-radius: 12px`, background = `linear-gradient(135deg, #ef444422, #ef444444)`, border = `1px solid var(--color-red-border)`. SVG pencil icon in `var(--color-red)`.
- **Title / subtitle**: same sizing as §4.1 but title uses `var(--color-text-primary)` and subtitle uses `var(--color-text-muted)`.
- **"+ Log Trade" button** (top right): `background: linear-gradient(135deg, #7c3aed, #a855f7)`, `color: #ffffff`, `border-radius: 10px`, `padding: 10px 18px`, `font: 800 12px/1 var(--font-sans)`, no border. Hover: opacity 0.88. Active: `scale(0.97)`.

> **Production gap**: Existing header button is `bg-indigo-600`. Change to the purple gradient above. Icon block needs the red-gradient treatment. No logic change — the `onClick` handler (`setShowForm(!showForm)`) is untouched.

#### 4.6 — Stats Bar *(visible only when entries.length > 0)*

- **Container**: `display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: var(--color-bg-surface); border: 1px solid var(--color-border); border-radius: 14px; padding: 2px; margin-bottom: 16px`.
- **Each stat cell**: `background: var(--color-bg-muted); border-radius: 12px; padding: 12px 10px; display: flex; flex-direction: column; gap: 4px; align-items: center`.
- **Stat value**: `font: 800 16px/1 var(--font-mono)`. Total P&L → positive uses `var(--color-accent)`, negative uses `var(--color-red)`. Win Rate → `var(--color-accent)`. Total Trades → `var(--color-text-primary)`.
- **Stat label**: `font: 600 9.5px/1 var(--font-sans)`, color = `var(--color-text-muted)`, `letter-spacing: 0.3px`, uppercase.
- **Data source**: derive from `entries` array. No new data fetching. `totalPnL = sum of calculatePnL(e).pnl`, `winRate = (count where pnl > 0 / count closed) * 100`, `totalTrades = entries.length`.

> **Production gap**: Stats bar does not exist today. Add it as a pure presentation wrapper above the entries list, reading from the same `entries` state already available in the component.

#### 4.7 — Log Form (Bottom Sheet)

- **Overlay**: `position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 40; display: flex; align-items: flex-end`.
- **Sheet**: `background: var(--color-bg-surface)`, `border-top: 1px solid var(--color-border-strong)`, `border-radius: 20px 20px 0 0`, `padding: 20px var(--pad-page-h) 32px`, `width: 100%`, `max-height: 90vh`, `overflow-y: auto`.
- **Sheet drag handle**: centered bar, `width: 40px; height: 4px; border-radius: 999px; background: var(--color-border-strong); margin: 0 auto 16px`.
- **Sheet title**: `font: 800 15px/1 var(--font-sans)`, color = `var(--color-text-primary)`.

**Field layout inside sheet**:

| Row | Columns | Fields |
|---|---|---|
| 1 | 2-col (1:1) | Ticker text input \| BUY / SELL toggle |
| 2 | 3-col | Entry Price \| Exit Price \| Lot count |
| 3 | auto | Strategy chips (pill toggles) then Date input |
| 4 | 1-col | Notes textarea |
| CTA | 1-col | "Simpan Trade" full-width button |

- **Field label**: `font: 700 10px/1 var(--font-sans)`, color = `var(--color-text-dim)`, uppercase, `letter-spacing: 0.6px`, `margin-bottom: 6px`.
- **Input field**: `background: var(--color-bg-muted)`, `border: 1px solid var(--color-border)`, `border-radius: 10px`, `padding: 10px 14px`, `font: 600 13px var(--font-sans)`, color = `var(--color-text-primary)`. Focus: border → `var(--color-accent-border)`.
- **"Rp" prefix**: inside price inputs, same as §4.4 price input row.
- **BUY pill (active)**: `background: var(--color-accent-bg)`, `border: 1px solid var(--color-accent-border)`, color = `var(--color-accent)`, `font: 800 11px var(--font-sans)`, `border-radius: 8px`.
- **SELL pill (active)**: `background: var(--color-red-bg)`, `border: 1px solid var(--color-red-border)`, color = `var(--color-red)`. Same font.
- **BUY / SELL inactive**: `background: var(--color-bg-muted)`, `border: 1px solid var(--color-border)`, color = `var(--color-text-muted)`.
- **Strategy chip (active)**: `background: var(--color-accent-bg)`, `border: 1px solid var(--color-accent-border)`, color = `var(--color-accent)`, `border-radius: 999px`, `padding: 5px 12px`, `font: 700 10.5px var(--font-sans)`.
- **Strategy chip (inactive)**: transparent bg, `border: 1px solid var(--color-border)`, color = `var(--color-text-muted)`.
- **"Simpan Trade" button**: Full-width, `background: var(--color-accent)`, color `#0f1117`, `border-radius: 12px`, `padding: 14px`, `font: 800 13px var(--font-sans)`. Hover: opacity 0.88.

> **Production gap**: Form currently renders inline (in-page panel). The existing `showForm` flag and `handleSubmit` / all field state stay untouched. Wrap the form `<div>` in the overlay + sheet container defined above. Field names change: the production form uses LONG/SHORT — these map directly to BUY/SELL pills visually (confirm label text with product owner, as this may differ intentionally). The submit button label changes from "Save Trade" → "Simpan Trade".

#### 4.8 — Trade Card

- **Container**: `background: var(--color-bg-surface)`, `border-radius: 14px`, `padding: 14px 16px`, `display: flex; flex-direction: column; gap: 10px`. Border:
  - P&L positive (`pnl.pnl >= 0`): `border: 1px solid var(--color-accent-border)`
  - P&L negative: `border: 1px solid var(--color-red-border)`
  - Entry open (no P&L yet): `border: 1px solid var(--color-border)`

**Row 1: Summary row**
- `display: flex; align-items: center; gap: 8px; justify-content: space-between`
- **BUY pill**: `background: var(--color-accent-bg)`, `border: 1px solid var(--color-accent-border)`, color = `var(--color-accent)`, `padding: 3px 8px`, `border-radius: 6px`, `font: 800 9px var(--font-sans)`.
- **SELL pill**: same but with red tokens.
- **Ticker code**: `font: 800 15px/1.2 var(--font-mono)`, color = `var(--color-text-primary)`, `margin-left: 4px`.
- **Strategy chip**: same as inactive form chip but smaller — `padding: 3px 8px`, `font-size: 8.5px`.
- **P&L amount** (right-aligned): `font: 800 15px/1 var(--font-mono)`. Positive → `var(--color-accent)` with `+` prefix. Negative → `var(--color-red)`.
- **P&L percentage**: `font: 700 11px var(--font-mono)`, same color rules. Displayed immediately below amount.

**Row 2: Mini stat grid**
- `display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px`
- Each cell: `background: var(--color-bg-muted)`, `border-radius: 8px`, `padding: 6px 10px`
- Label: `font: 700 9px/1 var(--font-sans)`, color = `var(--color-text-dim)`, uppercase.
- Value: `font: 700 11px/1.2 var(--font-mono)`, color = `var(--color-text-second)`. IDR format for prices.

**Row 3: Notes** *(conditional — visible only when `entry.notes` is non-empty)*
- `padding-top: 8px; border-top: 1px solid var(--color-border)`
- `font: 400 11px/1.6 var(--font-sans)`, color = `var(--color-text-muted)`, max 2 lines (CSS `line-clamp: 2`).

**Footer**
- `display: flex; justify-content: space-between; align-items: center`
- Date: `font: 500 10px/1 var(--font-sans)`, color = `var(--color-text-dimmer)`. Display in WIB (UTC+7). Format: "DD MMM YYYY · HH:mm WIB".
- Delete button: icon 16×16px, color = `var(--color-text-dim)`. Hover → `var(--color-red)`. Always visible (remove the current `group-hover:opacity-100` pattern — mobile users cannot hover).

> **Production gap**: Current card is a large padded card with a prominent 48×48 LONG/SHORT badge on the left and a "Review Chart" button. The new design collapses the badge to a small pill inline in Row 1. The chart review feature is NOT in the new visual design — keep the button but style it as a subtle secondary action (icon-only, `var(--color-text-muted)`) so it doesn't break the new layout.

#### 4.9 — Empty State (Journal)

- **Container**: `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 16px`, `padding: 48px 24px`, `display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center`.
- **Icon**: 📝 emoji, `font-size: 44px`, `opacity: 0.6`.
- **Title**: `"Your journal is empty"`, `font: 700 14px/1.3 var(--font-sans)`, color = `var(--color-text-primary)`.
- **Body**: `"Start logging your trades to track your journey."`, `font: 500 11px/1.5 var(--font-sans)`, color = `var(--color-text-muted)`.

> **Production gap**: Current empty state uses `bg-slate-50 rounded-3xl border-dashed`. Replace with the above solid-border dark card. The condition (`entries.length === 0`) is unchanged.

---

### PAGE 3 — LEARNING HUB (Belajar)

#### 4.10 — Page Header

- **Layout**: same as §4.1
- **Icon block**: background = `linear-gradient(135deg, #f59e0b22, #f59e0b44)`, border = `1px solid rgba(245,158,11,0.30)`. SVG graduation cap in `var(--color-gold)`.
- **Title**: `"Learning Hub"` (unchanged). **Subtitle**: `"Master the markets with expert guides"` (unchanged).

> **Production gap**: Icon block currently uses solid `bg-amber-500`. Change to the amber gradient + border treatment. No text changes needed.

#### 4.11 — Filter Chips Row

- **Container**: `display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; margin-bottom: 16px; scrollbar-width: none` (hide scrollbar cross-browser: `-webkit-scrollbar { display: none }`).
- **Active chip**: `background: var(--color-accent-bg)`, `border: 1px solid var(--color-accent-border)`, color = `var(--color-accent)`, `border-radius: 999px`, `padding: 6px 14px`, `font: 700 11px/1 var(--font-sans)`, `letter-spacing: 0.3px`, `white-space: nowrap`.
- **Inactive chip**: `background: transparent`, `border: 1px solid var(--color-border)`, color = `var(--color-text-muted)`. Same padding/font.
- **Chip list**: "All" + one chip per `ARTICLES[].category` value.

> **Production gap**: No filter UI exists today. Add the chips row as a presentational wrapper. Wire the active chip index to your existing content filtering logic (or a new `activeCategory` state). Zero changes to `ARTICLES` array or article routing.

#### 4.12 — Course Card

- **Container**: `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 14px`, `padding: 14px 16px`, `display: flex; align-items: flex-start; gap: 12px`, `cursor: pointer`. Hover: `border-color: {categoryColor}66`, `transform: translateY(-1px)`, `transition: all 0.15s ease`.

**Left — Icon block**
- Size: 44×44px, `flex-shrink: 0`, `border-radius: 12px`
- Background: gradient using category color, e.g. `linear-gradient(135deg, {categoryColor}22, {categoryColor}44)`
- Border: `1px solid {categoryColor}44`
- Emoji: centered, `font-size: 22px`
- Category color: from `CATEGORY_COLORS[article.category]`

**Right — Content column**
- `display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0`
- **Category chip**: `display: inline-flex`, `width: fit-content`, `padding: 3px 8px`, `border-radius: 999px`, `background: {categoryColor}1e`, `border: 1px solid {categoryColor}3d`, color = `categoryColor`, `font: 700 8.5px/1 var(--font-sans)`, uppercase.
- **Title**: `font: 800 13.5px/1.4 var(--font-sans)`, color = `var(--color-text-primary)`.
- **Description**: `font: 500 11px/1.6 var(--font-sans)`, color = `var(--color-text-second)`, max 2 lines (`overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical`).
- **Footer row**: `display: flex; justify-content: space-between; align-items: center; margin-top: 2px`.
  - Duration: `"⏱ {readTime}"`, `font: 600 10.5px var(--font-sans)`, color = `var(--color-text-muted)`.
  - CTA: `"Read Now →"`, `font: 700 11px var(--font-sans)`, color = `categoryColor`. No underline.

> **Production gap**: Current cards are large vertical grid cards with separate icon / category / title / description / footer areas. The new layout is a compact horizontal row card. The internal `article` data model is unchanged — only the render layout changes. Layout switches from `grid grid-cols-1 md:grid-cols-3` to a vertical `flex-col gap-3` list.

#### 4.13 — Coming Soon Card

- Positioned after the last course card in the same list.
- **Container**: `border: 1.5px dashed var(--color-border)`, `border-radius: 14px`, `padding: 24px`, `display: flex; align-items: center; gap: 12px`, `opacity: 0.55`.
- **Icon**: 🚀 emoji, `font-size: 28px`.
- **Title**: `"More Coming Soon"`, `font: 700 13px/1.3 var(--font-sans)`, color = `var(--color-text-primary)`.
- **Body**: `"New courses added weekly"`, `font: 500 10.5px var(--font-sans)`, color = `var(--color-text-muted)`.

> **Production gap**: Currently a vertical center-aligned card in a grid. New design is a horizontal flex row in the list. Structure is unchanged; only layout and padding change.

#### 4.14 — Article Reader

- **Back button**: `"← Kembali ke Learning Hub"`, `font: 700 12px var(--font-sans)`, color = `var(--color-text-muted)`. No box, just a text link. On click: calls existing `setActiveArticle(null)`.
- **Reader header**: `display: flex; align-items: center; gap: 12px; margin-bottom: 20px`
  - Icon block: 52×52px, same gradient style as course card but slightly larger.
  - Category chip: same as course card chip.
  - Title: `font: 800 20px/1.3 var(--font-sans)`, color = `var(--color-text-primary)`, letter-spacing -0.2px.
  - Duration badge: `"⏱ {readTime}"`, `font: 600 10.5px var(--font-sans)`, color = `var(--color-text-muted)`.
- **Body card**: `background: var(--color-bg-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 16px`, `padding: 18px`.
  - Body paragraphs: `font: 400 12.5px/1.75 var(--font-sans)`, color = `var(--color-text-second)`.
- **Key Takeaway box** (after main body):
  - `background: var(--color-bg-muted)`, `border-left: 3px solid {categoryColor}`, `border-radius: 0 10px 10px 0`, `padding: 12px 14px`.
  - Label `"💡 KEY TAKEAWAY"`: `font: 800 10px/1 var(--font-sans)`, color = `categoryColor`, uppercase, `letter-spacing: 0.8px`.
  - Body text: `font: 500 12px/1.6 var(--font-sans)`, color = `var(--color-text-second)`.
- **Disclaimer strip** (bottom of reader):
  - `background: var(--color-gold-bg)`, `border: 1px solid var(--color-gold-border)`, `border-radius: 10px`, `padding: 10px 14px`.
  - `"⚠️ "` prefix + disclaimer text: `font: 500 10px/1.4 var(--font-sans)`, color = `var(--color-gold-text)`.
  - Static text: `"Konten ini hanya bersifat edukatif dan bukan merupakan saran investasi."`.

> **Production gap**: Article reader structure is similar but uses `prose` Tailwind classes and a sticky header. The sticky header can be preserved — simply update its background to `var(--color-bg-surface)` with `backdrop-filter: blur(12px)`. Add the Key Takeaway box and Disclaimer strip as new presentational blocks below existing `activeArticle.content`. Existing `setActiveArticle(null)` wiring remains untouched.

---

## 5 · Migration Checklist

### ✦ WATCHLIST

| Priority | Element | Current State | Target State | Logic Change? |
|---|---|---|---|---|
| 1 | **Page background** | `bg-white` / `bg-slate-50` | `var(--color-bg-base)` dark | None — CSS variable swap |
| 2 | **Card backgrounds** | `bg-white` | `var(--color-bg-surface)` | None |
| 3 | **Ticker card layout** | flex row, compact | flex row with defined L/C/R zones per §4.3 | None — visual layout only |
| 4 | **Add-ticker button** | `bg-slate-800` | `var(--color-accent)` green, dark text | None |
| 5 | **Sector chip colors** | single indigo style | `sectorChipStyle()` per sector | None — replace CSS class with token lookup |
| 6 | **Price font** | system sans | JetBrains Mono 14px 800 | None |
| 7 | **Page header icon block** | grey solid fill | green-tinted gradient `§4.1` | None |
| 8 | **Alert confirmation strip** | no element | add strip below card when `targetPrice` defined | **Wrap existing render** — no logic change inside |
| 9 | **Set-price → modal** | inline edit-in-row | full overlay modal per §4.4 | **Wrap** `handleSaveTarget` in new modal shell |
| 10 | **Font family** | system-ui / Tailwind default | Import `Plus Jakarta Sans` + `JetBrains Mono` | None |

### ✦ TRADE JOURNAL (Jurnal)

| Priority | Element | Current State | Target State | Logic Change? |
|---|---|---|---|---|
| 1 | **Page background** | `animate-fade-in` on white | `var(--color-bg-base)` | None |
| 2 | **Trade card border color** | `border-slate-200` / `border-indigo-500` selected | `accentBorder` if positive P&L, `redBorder` if negative | None — conditional CSS |
| 3 | **Trade card layout** | Large LONG/SHORT badge left + 4-col stat grid | compact pill in Row 1 + 3-col mini grid Row 2 per §4.8 | None — layout-only refactor |
| 4 | **Log Trade button** | `bg-indigo-600` solid | purple gradient `linear-gradient(135deg,#7c3aed,#a855f7)` | None |
| 5 | **Page header icon block** | `bg-rose-500` solid | red-tinted gradient per §4.5 | None |
| 6 | **Form → bottom sheet** | inline in-page reveal | fixed overlay + bottom sheet per §4.7 | **Wrap** existing form div — no field/handler changes |
| 7 | **BUY/SELL pills** (form) | `bg-emerald-500` / `bg-red-500` on full-width row | token-driven pill per §4.7 | None — visual style change |
| 8 | **Strategy chips** (form) | SWING/SCALP `bg-indigo-500`/`bg-violet-500` | accent/red token pills per §4.7 | None |
| 9 | **Stats bar** | absent | 3-column grid calculating from `entries` state per §4.6 | **New presentational block** deriving from existing state |
| 10 | **Empty state** | `bg-slate-50 border-dashed` | `bgSurface` solid border card per §4.9 | None — CSS changes only |
| 11 | **Delete button visibility** | `opacity-0 group-hover:opacity-100` | always visible (mobile parity) | None |
| 12 | **Font family** | system-ui | `Plus Jakarta Sans` + `JetBrains Mono` | None |

### ✦ LEARNING HUB (Belajar)

| Priority | Element | Current State | Target State | Logic Change? |
|---|---|---|---|---|
| 1 | **Page background** | white | `var(--color-bg-base)` | None |
| 2 | **Card layout** | 3-column grid of large vertical cards | vertical list of compact horizontal row cards per §4.12 | None — layout-only |
| 3 | **Course card icon block** | color-coded emoji box `bg-{color}-50` | gradient icon block with category color per §4.12 | None |
| 4 | **Category chip on card** | top-right corner tag | inline chip in right content column per §4.12 | None — structural reorder |
| 5 | **Card hover** | `hover:shadow-xl hover:border-indigo-300` | `translateY(-1px)` + category-colored border per §4.12 | None |
| 6 | **Page header icon block** | `bg-amber-500` solid | amber gradient per §4.10 | None |
| 7 | **Filter chips row** | absent | horizontal scroll row per §4.11 | **New presentational block** — wire to existing or new category filter state |
| 8 | **Article reader back button** | icon-only button in sticky header | text link `"← Kembali ke Learning Hub"` per §4.14 | None — only label / style change |
| 9 | **Article key takeaway box** | no element | new styled box below content per §4.14 | **Wrap** existing content block — no data changes |
| 10 | **Article disclaimer strip** | no element | static gold-tinted strip at bottom per §4.14 | None — purely additive |
| 11 | **Coming soon card** | center-aligned in grid | left-aligned horizontal row in list per §4.13 | None — layout only |
| 12 | **Font family** | system-ui | `Plus Jakarta Sans` + `JetBrains Mono` | None |

---

> **IDR Format rule** (all three pages): monetary values must render as `Rp {space}{dot-separated integer}` — e.g. `Rp 14.750`. Use `amount.toLocaleString('id-ID')` in JavaScript, which produces the correct dot separator for Indonesian locale.
>
> **Timestamp rule**: Dates stored as UTC ISO-8601. Display with `+07:00` offset. Format in WIB: `new Date(utcString).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })`.
