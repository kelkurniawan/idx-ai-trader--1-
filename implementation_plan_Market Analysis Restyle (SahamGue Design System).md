# Market Analysis Restyle (SahamGue Design System)

The user wants to bring the **Market Analysis** tab (`view === 'analysis'`) inline with the new **SahamGue** design system that was recently applied to the Home Dashboard.

This means replacing the current 'slate/indigo' generic Tailwind theme with the dark, high-contrast, professional look of the SG design tokens:
- **Colors:** Deep Navy (`#0a0f10`, `#151b1e`, `#1e2a2f`) and vibrant accents (Green `#22c55e`, Red `#ef4444`).
- **Typography:** `Plus Jakarta Sans` for UI elements, `JetBrains Mono` for all prices, tickers, and financial metrics.
- **Glassmorphism:** Dark cards with subtle borders instead of flat white/slate cards.

---

## Proposed Changes

### [MODIFY] [App.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/App.tsx)

**1. Update Helper Components (Lines 70-300)**
These sub-components render the analysis cards. We will update their classes to use dark theme utility values or inline SG tokens as appropriate.
- [FundamentalsCard](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx#70-108): Replace `glass-card bg-white dark:bg-slate-900` with `sg-surface` style. Change numbers to use `font-mono-trading`. Change accent from emerald to the new green (`#22c55e`).
- [VerdictCard](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx#109-160): Update the 'Buy/Sell/Hold' gauge and metrics to use SG red/green/amber tokens and dark surface backgrounds.
- [QualitativeCard](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx#161-185), [QuantitativeCard](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx#186-216), [AnalysisApproachCard](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx#217-247): Apply dark surfaces (`#151b1e`), `font-mono-trading` for quantitative tables (Income Statement, Balance Sheet), and update border colors to `#1e2a2f`. Use green (`#22c55e`) for bullish indicators and red (`#ef4444`) for bearish ones.

**2. Update Browse Sector/Index Views (Lines 850-950)**
- The grid cards for browsing sectors (e.g., Financials, Consumer) and indices (e.g., LQ45, IDX30) currently use `bg-white dark:bg-slate-800/50`.
- Update these to use the dark surface color (`#151b1e`) with the standard dark border (`#1e2a2f`). 
- Hover states should subtlely lighten the border (`border-[#22c55e]`) or add a subtle green glow.

**3. Update Scanner View (Lines 950-1250)**
- **Header/Search Box:** The "Back to Scanner" and "Jump to ticker..." input should use SG form styles (dark background, distinct focus rings).
- **Price Header (`TickerHeader` equivalent):** Ensure the main stock price and percentage changes utilize `JetBrains Mono` and correct SG Green/Red colors. Include the LIVE/CLOSED badge aesthetic if applicable. 
- **Chart Area:** Update the container for the `ResponsiveContainer` line chart to have a dark border (`#1e2a2f`) and dark background. Note: The chart lines themselves may need stroke color updates (Green if standard, Red if down, or neutral blue depending on context. Default to green).
- **AI Engine Insight:** The large text box summarizing the AI's thoughts should align with the dark premium aesthetic.

## Verification Plan

### Build Check
1. Run `npm run build` to ensure no syntax errors.

### Visual Verification
1. Click the "Market Analysis" tab in the desktop sidebar or mobile bottom nav.
2. Verify the initial scanner menu (Browse by Sector/Index) uses dark `#151b1e` cards.
3. Click a ticker (e.g., BBCA) to load the analysis view.
4. Verify the top price header uses `JetBrains Mono` (tabular numbers).
5. Verify [FundamentalsCard](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx#70-108) (P/E, PBV, ROE) uses `JetBrains Mono` for all numbers.
6. Verify [QuantitativeCard](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx#186-216) (Revenue, Gross Margin, etc) uses `JetBrains Mono` for all figures. 
7. Verify all card backgrounds are dark (`#151b1e`), borders are `#1e2a2f`, and typography is primarily `Plus Jakarta Sans` for labels.
8. Verify no stark white backgrounds remain in the `analysis` view.
