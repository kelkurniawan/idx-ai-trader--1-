# IDX AI Trader - Backend API

AI-powered stock analysis backend for Indonesia Stock Exchange (IDX).

## Quick Start

```bash
# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Set up environment
copy .env.example .env
# Edit .env with your settings

# 4. Run the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Visit `http://localhost:8000/docs` for interactive Swagger UI.

## Key Endpoints

### Market Analyzer (Priority #1)

| Endpoint | Description |
|----------|-------------|
| `GET /api/analyze/{ticker}` | **Complete analysis** - technicals, trend, volume, broker summary, signals |
| `GET /api/analyze/{ticker}/technicals` | Technical indicators only |
| `GET /api/analyze/{ticker}/trend` | Trend analysis |
| `GET /api/analyze/{ticker}/volume` | Volume analysis |
| `GET /api/analyze/{ticker}/broker-summary` | Broker summary & foreign flow |
| `GET /api/analyze/{ticker}/signals` | Trading signals |
| `POST /api/analyze/chart` | Chart image AI analysis |

### Stock Data

| Endpoint | Description |
|----------|-------------|
| `GET /api/stocks` | List all stocks |
| `GET /api/stocks/{ticker}` | Stock profile |
| `GET /api/stocks/{ticker}/price` | Current price |
| `GET /api/stocks/{ticker}/history` | Historical data |

### Predictions

| Endpoint | Description |
|----------|-------------|
| `GET /api/predict/{ticker}/price` | Price prediction |
| `GET /api/predict/{ticker}/trend` | Trend prediction |
| `GET /api/predict/{ticker}/volume` | Volume prediction |

## Environment Modes

| Mode | Mock Data | AI Calls | Use Case |
|------|-----------|----------|----------|
| `development` | ✅ Yes | ❌ No | Local dev, saves API credits |
| `staging` | ✅ Yes | ❌ No | Testing |
| `production` | ❌ No | ✅ Yes | Live with real data |

## Sample Stocks

BBCA, BBRI, BMRI, BBNI, BRIS, GOTO, BUKA, ADRO, TLKM, ASII, UNVR, ICBP, INDF, KLBF, HMSP
