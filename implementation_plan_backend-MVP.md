# IDX AI Trader Backend MVP - Implementation Plan

## Overview

Build a **Python FastAPI backend** (chosen for reliability, maintainability, and high performance) to power the IDX AI Trader with:
- **Market Analyzer** as the primary feature (Priority #1)
- Technical analysis calculations (RSI, MACD, Bollinger Bands, etc.)
- Trend & Volume prediction with AI insights
- **Broker Summary** data integration
- Buy/Sell signal generation with confidence scoring
- Extensible architecture for future features

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Backend Stack** | Python FastAPI | Async performance, easy to maintain, great ML/data ecosystem, auto-generated docs |
| **Database** | SQLite (dev) → PostgreSQL (prod) | Zero-config for MVP, easy migration path |
| **Data Strategy** | Mock data (dev/staging) → Live IDX (prod) | Preserve API credits, test safely |
| **AI Calls** | Disabled in dev mode | Use pre-computed mock analysis, save Gemini credits |

---

## Priority Features (MVP)

### 🎯 Priority 1: Market Analyzer Tab
The core feature providing comprehensive stock analysis:

1. **Technical Analysis** - RSI, MACD, EMA, SMA, Bollinger Bands, Support/Resistance
2. **Trend Analysis** - Short/Medium/Long term trend detection with AI insights  
3. **Volume Analysis** - Volume trends, unusual volume detection, volume prediction
4. **Broker Summary** - Top buyers/sellers, net foreign flow, broker activity patterns
5. **Buy/Sell Signals** - Aggregated signals with confidence scores

### 🔮 Future Extensibility Preparation
- Modular service architecture (easy to add new indicators)
- Plugin-ready data source layer (swap mock → real IDX API)
- WebSocket-ready for real-time updates
- Caching layer for performance optimization

---

## Proposed Changes

### Backend Project Structure

```
idx-ai-trader/
├── backend/                     # [NEW] Python Backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI entry point
│   │   ├── config.py           # Environment configuration
│   │   ├── database.py         # SQLite/Database setup
│   │   │
│   │   ├── models/             # Database models
│   │   │   ├── __init__.py
│   │   │   ├── stock.py
│   │   │   └── analysis.py
│   │   │
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── stock.py
│   │   │   └── analysis.py
│   │   │
│   │   ├── services/           # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── market_data.py  # Stock data fetching & generation
│   │   │   ├── technicals.py   # RSI, MACD, EMA, Bollinger
│   │   │   ├── ai_analysis.py  # Gemini integration
│   │   │   └── signals.py      # Buy/Sell signal generation
│   │   │
│   │   └── routers/            # API endpoints
│   │       ├── __init__.py
│   │       ├── stocks.py
│   │       ├── analysis.py
│   │       └── predictions.py
│   │
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
```

---

### Component: Core Setup

#### [NEW] [requirements.txt](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/requirements.txt)

Dependencies for Python backend:
- `fastapi` - High-performance async API framework
- `uvicorn` - ASGI server
- `google-generativeai` - Gemini SDK
- `numpy` - Numerical calculations for indicators
- `pandas` - Data manipulation
- `pydantic` - Data validation
- `pydantic-settings` - Environment config
- `python-dotenv` - Load `.env` files
- `sqlalchemy` - Database ORM (SQLite for MVP)

#### [NEW] [main.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/main.py)

FastAPI application entry point with:
- CORS middleware for frontend connection
- Router mounting for all API endpoints
- Health check endpoint
- OpenAPI/Swagger documentation at `/docs`

#### [NEW] [config.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/config.py)

Environment configuration using `pydantic-settings`:
```python
class Settings(BaseSettings):
    GEMINI_API_KEY: str
    DATABASE_URL: str = "sqlite:///./idx_trader.db"
    DEBUG: bool = False
```

---

### Component: Data Models & Schemas

#### [NEW] [models/stock.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/models/stock.py)

SQLAlchemy models for:
- [Stock](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types.ts#88-93) - IDX stock profiles (ticker, name, sector)
- `StockPrice` - Historical price data (date, OHLCV)
- `Watchlist` - User watchlist items

#### [NEW] [schemas/stock.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/schemas/stock.py)

Pydantic schemas matching existing frontend types:
- [StockDataPoint](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types.ts#2-7) - Date/price/volume triplet
- [TechnicalIndicators](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types.ts#20-32) - RSI, MACD, MAs, Bollinger, trends
- [RealTimeMarketData](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types.ts#33-41) - Current price/change/volume

#### [NEW] [schemas/analysis.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/schemas/analysis.py)

- [AIAnalysisResult](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types.ts#50-62) - Full AI analysis response
- [ChartVisionAnalysis](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20%281%29/types.ts#70-80) - Chart pattern recognition result
- `SignalType` enum - STRONG_BUY to STRONG_SELL

---

### Component: Services (Business Logic)

#### [NEW] [services/market_data.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/services/market_data.py)

Stock data generation and retrieval:
- `generate_mock_stock_data(ticker, days)` - Deterministic random walk simulation
- `get_intraday_data(ticker)` - Minute-level data for 1D charts
- `get_stock_profile(ticker)` - Company info lookup
- Ready for swap to real IDX API integration

#### [NEW] [services/technicals.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/services/technicals.py)

Technical indicator calculations using NumPy:
- `calculate_rsi(prices, period=14)` - Relative Strength Index
- `calculate_macd(prices)` - MACD line, signal, histogram
- `calculate_ema(prices, period)` - Exponential Moving Average
- `calculate_sma(prices, period)` - Simple Moving Average
- `calculate_bollinger(prices, period=20)` - Upper/Lower bands
- `calculate_stochastic(prices)` - Stochastic Oscillator
- `calculate_support_resistance(prices)` - Key price levels
- `calculate_all_technicals(data)` - Full indicator suite

#### [NEW] [services/broker_summary.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/services/broker_summary.py)

Broker activity analysis (mock data for dev, real IDX data for production):
- `get_broker_summary(ticker)` - Top buyers/sellers ranking
- `get_foreign_flow(ticker)` - Net foreign buy/sell
- `get_broker_accumulation(ticker)` - Accumulation/distribution patterns
- `detect_unusual_broker_activity(ticker)` - Smart money alerts

#### [NEW] [services/ai_analysis.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/services/ai_analysis.py)

Gemini API integration (disabled in dev mode, uses mock responses):
- `analyze_stock(ticker, history, technicals)` - Full analysis with reasoning
- `analyze_chart_image(base64_image, trading_type)` - Vision-based chart analysis
- `get_mock_analysis(ticker)` - Pre-computed mock responses for dev
- Rate limit handling with retry logic

#### [NEW] [services/signals.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/services/signals.py)

Buy/Sell signal generation:
- `generate_signal(technicals, broker_data, ai_result)` - Combined signal logic
- `get_entry_exit_points(signal, price)` - Entry, Stop Loss, Take Profit
- `calculate_confidence_score(signals)` - Weighted confidence scoring

---

### Component: API Endpoints

#### [NEW] [routers/stocks.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/stocks.py)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stocks` | GET | List all IDX stocks |
| `/api/stocks/{ticker}` | GET | Get stock profile |
| `/api/stocks/{ticker}/history` | GET | Historical price data (with timeframe param) |
| `/api/stocks/{ticker}/intraday` | GET | Intraday minute-level data |

#### [NEW] [routers/market_analyzer.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/market_analyzer.py) (Priority #1)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analyze/{ticker}` | GET | **Complete Market Analysis** (all data in one call) |
| `/api/analyze/{ticker}/technicals` | GET | Technical indicators only |
| `/api/analyze/{ticker}/trend` | GET | Trend analysis (short/medium/long) |
| `/api/analyze/{ticker}/volume` | GET | Volume analysis & prediction |
| `/api/analyze/{ticker}/broker-summary` | GET | Broker summary & foreign flow |
| `/api/analyze/{ticker}/signals` | GET | Buy/Sell signals with confidence |
| `/api/analyze/chart` | POST | Upload chart image for AI analysis |

**Complete Market Analysis Response** (`/api/analyze/{ticker}`):
```json
{
  "ticker": "BBCA",
  "price": { "current": 9500, "change": 125, "changePercent": 1.33 },
  "technicals": {
    "rsi": 65.2, "macd": { "line": 45.2, "signal": 42.1, "histogram": 3.1 },
    "ema20": 9420, "sma50": 9350, "sma200": 9100,
    "bollinger": { "upper": 9680, "middle": 9450, "lower": 9220 },
    "support": [9200, 9000], "resistance": [9600, 9800]
  },
  "trend": { "short": "BULLISH", "medium": "BULLISH", "long": "NEUTRAL" },
  "volume": { 
    "current": 15000000, "average": 12000000, "ratio": 1.25, 
    "trend": "INCREASING", "prediction": "HIGH" 
  },
  "brokerSummary": {
    "topBuyers": [...], "topSellers": [...],
    "foreignFlow": { "buy": 5000000, "sell": 3000000, "net": 2000000 }
  },
  "signal": { "action": "BUY", "confidence": 78, "reasoning": [...] },
  "lastUpdated": "2026-01-23T12:00:00"
}
```

#### [NEW] [routers/predictions.py](file:///c:/Users/kurni/OneDrive/Documents/idx-ai-trader%20(1)/backend/app/routers/predictions.py)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/predict/{ticker}/price` | GET | Price target prediction |
| `/api/predict/{ticker}/trend` | GET | Future trend prediction |
| `/api/predict/{ticker}/volume` | GET | Volume prediction |

---

## Verification Plan

### Automated Tests

1. **Start the Backend Server**:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

2. **Test API Endpoints via Browser**:
- Navigate to `http://localhost:8000/docs` for Swagger UI
- Test each endpoint interactively

3. **Sample API Calls**:
```bash
# Health check
curl http://localhost:8000/health

# Get stock list
curl http://localhost:8000/api/stocks

# Get BBCA analysis
curl http://localhost:8000/api/analysis/BBCA

# Get technical indicators
curl http://localhost:8000/api/stocks/GOTO/technicals
```

### Manual Verification

- Verify technical indicator calculations match expected values
- Test chart image upload and AI analysis response
- Confirm signal generation logic produces sensible recommendations
- Test error handling when Gemini API is unavailable
