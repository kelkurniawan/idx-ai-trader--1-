
# IDX AI Trader

**IDX AI Trader** is a professional-grade, AI-powered financial analysis Single Page Application (SPA) tailored for the Indonesia Stock Exchange (IDX). It integrates Google's Gemini API to provide real-time technical analysis, computer vision-based chart pattern recognition, and automated market scanning.

## 🛠️ Tech Stack & Environment

*   **Runtime:** Browser-native ES Modules (No Webpack/Vite build step required).
*   **Core Framework:** React 19 (`react`, `react-dom` via ESM).
*   **Language:** TypeScript (Transpiled via browser-side Babel or standard TS handling in IDEs).
*   **Styling:** Tailwind CSS v3.4 (CDN loaded, using `class` strategy for Dark Mode).
*   **AI SDK:** `@google/genai` v1.38.0.
*   **Charting:** `recharts` v3.6.0.
*   **Icons:** Heroicons (via SVG inline).

## 📂 Project Structure

For AI Context: This project uses a flat file structure where `src` concepts apply conceptually but files are located in the root or specific folders.

```
/
├── index.html              # Entry point, Tailwind config, Import maps
├── index.tsx               # React Root mount
├── App.tsx                 # Main Layout, Routing (State-based), View Controller
├── types.ts                # Global TypeScript Interfaces (User, StockData, AIResult)
├── metadata.json           # Permissions & App Meta
├── services/
│   ├── geminiService.ts    # AI Logic, API Calls, Rate Limit Handling
│   └── marketDataService.ts# Math helpers (RSI, MACD), Mock Data Generators (RNG)
├── components/
│   ├── Chart.tsx           # Recharts wrapper with custom gradients/tooltips
│   ├── Gauge.tsx           # SVG-based Sentiment Gauge
│   ├── ChartAnalyzer.tsx   # AI Vision Tool (Image Upload + Overlay)
│   ├── Backtester.tsx      # Strategy Simulation Engine
│   ├── TradeJournal.tsx    # CRUD Logic for trades
│   └── ...                 # Other UI components (Watchlist, Community, etc)
```

## 🧠 Architecture & Logic

### 1. Hybrid Data Engine (`geminiService.ts`)
The application utilizes a **Fail-Safe Hybrid Data Approach**:
1.  **Primary:** Attempts to fetch real-time data using Gemini 2.0 Flash (`googleSearch` tool).
2.  **Fallback:** If the API returns `429` (Rate Limit) or fails, it seamlessly switches to `marketDataService.ts`.
3.  **Simulation:** The fallback uses a **Deterministic RNG** (seeded by Ticker + Date). This ensures that "mock" data remains consistent across reloads for the same asset, preventing UI jitter.

### 2. AI Vision Analysis
*   **Input:** Base64 encoded images (User uploads).
*   **Processing:** Sends image to `gemini-3-flash-preview`.
*   **Output:** Structured JSON containing trend, patterns, and **normalized coordinates (yPos 0-1)**.
*   **Rendering:** The frontend overlays HTML/CSS lines on top of the image based on these coordinates.

### 3. State Management
*   Global state (User, Theme) is handled in `App.tsx`.
*   Persistence is handled via `localStorage` keys: `idx_user`, `idx_watchlist`, `idx_trade_journal`, `idx_theme`.

## ✨ Feature Set

1.  **Market Scanner:** Real-time price/volume scanning with "Fintech Pro" UI.
2.  **Swing/Scalp Vision:** Drag-and-drop chart analysis with AI-drawn support/resistance lines.
3.  **Backtester:** Client-side simulation of SMA Crossover and RSI strategies.
4.  **Journal:** Trade logging with PnL calculation and historical chart replay.
5.  **Watchlist:** Price alert monitoring with visual indicators.
6.  **Community:** Social feed simulation with sentiment tags.

## 🎨 UI/UX Design System

*   **Theme:** Slate/Indigo/Emerald palette.
*   **Glassmorphism:** Heavy use of `backdrop-blur-xl` and `bg-white/80`.
*   **Typography:** Inter (UI) and JetBrains Mono (Financial Data).
*   **Interactive:** Bento-grid layouts, hover-lift effects, and loading skeletons.
