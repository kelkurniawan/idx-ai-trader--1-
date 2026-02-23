
# Changelog

All notable changes to the IDX AI Trader project will be documented in this file.

## [1.3.0] - Auth & UI Enhancements - 2026-02-24

### Added
- **Authentication System:** Complete backend authentication system using JWT in HTTP-only cookies, password hashing with bcrypt, and MFA support (TOTP & OTP).
- **Frontend Auth Flow:** Added `ProfileSetup`, `MfaSetup`, and `MfaVerify` components to handle secure login, registration, and complete user auth flows.
- **Watchlist Hashtags:** Sector and Index tags (e.g., `#Financials`, `LQ45`) are now displayed on the Watchlist tab (`PortfolioRow`), visually linking the Watchlist to the Market Analysis tab.

### Fixed
- **CORS Configuration:** Added `http://localhost:3001` to the backend CORS allowed origins list to resolve dev server connection failures.

## [1.2.1] - Stability Patch - 2025-01-22

### Fixed
- **API Resilience:** Implemented `fetchWithRetry` in `geminiService.ts`. The app now automatically retries on 429 errors and falls back to simulated data if the API is unreachable, fixing crash issues with GOTO/BBCA.
- **Component Safety:** `PortfolioRow` now suppresses console errors when data fails to load, showing an "Offline" badge instead of crashing the React tree.

### Changed
- **Mock Data Logic:** Updated `marketDataService` to use deterministic seeding. This ensures that when the app falls back to mock data, the "simulated" prices don't change randomly on every refresh.

## [1.2.0] - "Fintech Pro" UI Overhaul - 2025-01-22

### Added
- **Sidebar Navigation:** Replaced top-nav with a responsive, glassmorphic sidebar.
- **Bento Grid Dashboard:** Redesigned the main landing view into a modular grid layout.
- **Theme Engine:** Added system-aware Dark Mode support (`html.dark` class strategy).
- **Skeleton Loaders:** Added `HeaderPriceSkeleton`, `AnalysisSkeleton`, and `GaugeSkeleton` for smoother data fetching states.

### Changed
- **Visual Language:** 
    - Color palette shifted to professional Slate (900/50) + Indigo/Emerald accents.
    - Added "Glow" effects to inputs and active states.
    - Chart tooltips are now dark-mode native with blur effects.
- **Gauge Component:** Completely rewritten using SVG paths for smoother animation and sharper visuals on high-DPI screens.

## [1.1.0] - Analysis Tools Expansion

### Added
- **Chart Vision:** `ChartAnalyzer.tsx` now supports image uploads. AI returns JSON coordinates to draw Support/Resistance lines directly on the image.
- **Backtester:** Added client-side strategy simulation (SMA, RSI, Momentum).
- **Trade Journal:** CRUD functionality for logging trades with PnL tracking.
- **Community Feed:** Social interaction simulation.

## [1.0.0] - Initial Release

### Features
- Real-time stock data fetching via Gemini (`googleSearch`).
- Technical Indicator calculation (RSI, MACD, EMA).
- Basic Interactive Charts (`recharts`).
- Authentication (Mock Login/Register).
