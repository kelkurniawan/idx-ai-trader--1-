# SahamGue Design System Standardization

This document records the official standardized design rules, color palettes, typography, and theme properties for the IDX AI Trader application.

## 1. Color System (CSS Variables)

The application uses CSS variables in `index.css` to manage Light and Dark themes dynamically.

### Semantic Colors
| Token Name | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--bg-base` | `#d4dde6` | `#0f1117` | Main application background |
| `--bg-header` | `#c2cdd8` | `#0d1117` | Header or top navigation |
| `--bg-surface` | `#dce5ee` | `#1a1d27` | Card and panel backgrounds |
| `--bg-surface-2` | `#d0dae4` | `#22263a` | Secondary surfaces / nested cards |
| `--bg-muted` | `#c8d3de` | `#2a2f45` | Inactive, disabled, or secondary backgrounds |
| `--border` | `#b2bfcc` | `rgba(255,255,255,0.08)` | Standard borders and dividers |

### State & Action Colors
| Semantic Role | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| **Accent (Green)** | `#166534` | `#22c55e` | Primary positive actions, Buy signals, Active states |
| **Accent Deep** | `#14532d` | `#16a34a` | Hover states for primary actions |
| **Red** | `#b91c1c` | `#ef4444` | Negative actions, Sell signals, Alerts |
| **Gold** | `#92400e` | `#f59e0b` | Warnings, Hold signals, Premium badges |
| **AI (Purple)** | `#6d28d9` | `#a855f7` | Used globally for AI features and badges |
| **Cyan** | `#0891b2` | `#06b6d4` | Alternative AI accents |

### Typography Colors
| Token Name | Light | Dark | Usage |
|---|---|---|---|
| `--text-primary` | `#0c1b26` | `#f1f5f9` | Main headings and body text |
| `--text-second` | `#1e3a4f` | `#94a3b8` | Subheadings, descriptions |
| `--text-muted` | `#3d5a6e` | `#64748b` | Labels, tertiary text, placeholders |
| `--text-dim` | `#526d7e` | `#475569` | Minor details, inactive tabs |

## 2. Typography

The default font family uses sans-serif for reading and monospace for financial data.

- **Primary Font**: `'Plus Jakarta Sans', 'Inter', system-ui, sans-serif` 
  - *Class helper*: `.font-jakarta`
- **Trading Font (Monospace)**: `'JetBrains Mono', monospace` 
  - *Class helper*: `.font-mono-trading` (Used for numbers, prices, tickers, tabular layouts)

### Responsive Typography (Tailwind Config)
```javascript
fontSize: {
  'fluid-h1': ['clamp(2rem, 5vw, 3.5rem)', '1.1'],
  'fluid-h2': ['clamp(1.5rem, 4vw, 2.5rem)', '1.2'],
  'fluid-body': ['clamp(1rem, 1.5vw, 1.125rem)', '1.6'],
}
```

## 3. Iconography

- **Library**: `lucide-react`
- **Style**: **Hollow / Line Art**
- **Rule**: Solid or colorful emojis are NOT allowed. All icons must be highly consistent using `lucide-react`.
- **Stroke**: Standard `stroke-[2]` is recommended.

**Examples:**
- Home: `<Home />`
- Market Analysis: `<LineChart />`
- Trade Journal: `<ClipboardList />`
- Ticker Watchlist: `<Eye />`
- News: `<Newspaper />`
- Learning: `<BookOpen />`

## 4. UI Components & Effects

### Glassmorphism System
Premium transparent blurring for overlays and floating cards. Use `.glass-card`.
- **Light Mode**: `background: rgba(255, 255, 255, 0.72); backdrop-filter: blur(20px) saturate(180%);`
- **Dark Mode**: `background: rgba(15, 23, 42, 0.65);`

### Base Backgrounds and Cards
Use `.sg-surface` for standardized cards:
```css
.sg-surface {
  background: var(--bg-surface);
  border: 1px solid var(--border);
}
```

### Animations
Standard keyframes for interactive and dynamic data loading:
- **`animate-slide-up`**: `0.4s ease-out` (Used for initial component mounting and staggering cards in lists using `.stagger-1`, `.stagger-2`, etc.)
- **`animate-shimmer`**: `2s ease-in-out infinite` (Used for skeleton placeholder loading states)
- **`animate-glow`**: `3s ease-in-out infinite` (Used for active AI or active signal emphasis)
- **`price-flash-up` / `price-flash-down`**: `0.8s ease-out` (Flashes background green or red whenever a stock price updates over websocket)
- **`ticker-scroll`**: `30s linear infinite` (Used for horizontal sliding news or ticker strips)

## 5. Spacing System

Extended from default Tailwind:
- `touch`: `2.75rem` (`44px` minimum height for touch areas on Mobile)
- `input`: `3rem` (`48px` standard input form height)
