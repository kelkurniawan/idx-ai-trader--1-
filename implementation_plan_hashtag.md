# Goal Description
The user wants to display sector and index hashtags (e.g., `#Financials`, `LQ45`) on the Watchlist tab, similar to how they are currently displayed on the Market Analysis tab. This will help link the visual identity between the Watchlist and Scanner/Market Analysis tabs.

## Proposed Changes

### UI & Components

#### [MODIFY] PortfolioRow.tsx(file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/components/PortfolioRow.tsx)
- Import `SAMPLE_IDX_STOCKS`, `IDX_SECTORS`, and `IDX_STOCK_INDICES` from `../types`.
- Use the provided `ticker` prop to find the corresponding stock profile in `SAMPLE_IDX_STOCKS`.
- Add a flex container below the stock ticker/name in the left-hand column to render the hashtags.
- Re-use the styling from [App.tsx](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/App.tsx) for the tags:
  - **Sector Tag:** Indigo background/text with the sector icon.
  - **Index Tags:** Amber background/text with the index icon.
- Replace the generic "IDX Market" text with the actual company name if available in the stock profile.

## Verification Plan

### Automated Tests
- N/A (Frontend cosmetic changes)

### Manual Verification
1. Open the application and navigate to the **Watchlist** tab.
2. Ensure there are stocks in the watchlist (e.g., `BBCA`, `GOTO`, `TLKM`).
3. Verify that the sector and index hashtags appear under the stock ticker in each row.
4. Verify that `BBCA` displays tags like `#Financials`, `IDX30`, `LQ45`, `IDX80`, `KOMPAS100`.
5. Check for proper responsiveness and layout on different screen sizes to ensure the additional tags don't break the component.
