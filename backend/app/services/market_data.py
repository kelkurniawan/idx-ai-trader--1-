"""
Market Data Service

Handles stock data fetching and mock data generation.
Uses deterministic random for consistent mock data in dev/staging.
"""

import hashlib
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from ..config import get_settings
from ..schemas.stock import StockProfile, StockDataPoint, StockPriceOHLCV, RealTimePrice

settings = get_settings()


# Sample IDX Stocks (same as frontend)
SAMPLE_IDX_STOCKS: List[Dict[str, Any]] = [
    {"ticker": "BBCA", "name": "Bank Central Asia Tbk", "sector": "Finance", "base_price": 9500},
    {"ticker": "BBRI", "name": "Bank Rakyat Indonesia", "sector": "Finance", "base_price": 5200},
    {"ticker": "BMRI", "name": "Bank Mandiri", "sector": "Finance", "base_price": 6800},
    {"ticker": "BBNI", "name": "Bank Negara Indonesia", "sector": "Finance", "base_price": 5100},
    {"ticker": "BRIS", "name": "Bank Syariah Indonesia", "sector": "Finance", "base_price": 2450},
    {"ticker": "GOTO", "name": "GoTo Gojek Tokopedia", "sector": "Technology", "base_price": 76},
    {"ticker": "BUKA", "name": "Bukalapak.com", "sector": "Technology", "base_price": 124},
    {"ticker": "ADRO", "name": "Adaro Energy", "sector": "Energy", "base_price": 2680},
    {"ticker": "TLKM", "name": "Telkom Indonesia", "sector": "Infrastructure", "base_price": 3450},
    {"ticker": "ASII", "name": "Astra International", "sector": "Conglomerate", "base_price": 5025},
    {"ticker": "UNVR", "name": "Unilever Indonesia", "sector": "Consumer", "base_price": 4280},
    {"ticker": "ICBP", "name": "Indofood CBP Sukses Makmur", "sector": "Consumer", "base_price": 11200},
    {"ticker": "INDF", "name": "Indofood Sukses Makmur", "sector": "Consumer", "base_price": 6875},
    {"ticker": "KLBF", "name": "Kalbe Farma", "sector": "Healthcare", "base_price": 1590},
    {"ticker": "HMSP", "name": "HM Sampoerna", "sector": "Consumer", "base_price": 875},
]


class SeededRNG:
    """Deterministic random number generator for consistent mock data."""
    
    def __init__(self, seed: int):
        self.seed = seed
    
    def next(self) -> float:
        """Generate next random number between 0 and 1."""
        self.seed = (self.seed * 1103515245 + 12345) & 0x7FFFFFFF
        return self.seed / 0x7FFFFFFF
    
    def random_range(self, min_val: float, max_val: float) -> float:
        """Generate random number in range."""
        return min_val + (max_val - min_val) * self.next()
    
    def random_int(self, min_val: int, max_val: int) -> int:
        """Generate random integer in range."""
        return int(self.random_range(min_val, max_val + 1))


def string_hash(s: str) -> int:
    """Generate deterministic hash from string."""
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


class MarketDataService:
    """Service for market data operations."""
    
    def __init__(self):
        self.stocks = {s["ticker"]: s for s in SAMPLE_IDX_STOCKS}
    
    def get_all_stocks(self) -> List[StockProfile]:
        """Get all available IDX stocks."""
        return [
            StockProfile(
                ticker=s["ticker"],
                name=s["name"],
                sector=s["sector"],
            )
            for s in SAMPLE_IDX_STOCKS
        ]
    
    def get_stock_profile(self, ticker: str) -> Optional[StockProfile]:
        """Get stock profile by ticker."""
        stock = self.stocks.get(ticker.upper())
        if not stock:
            return None
        return StockProfile(
            ticker=stock["ticker"],
            name=stock["name"],
            sector=stock["sector"],
        )
    
    def get_base_price(self, ticker: str) -> float:
        """Get base price for a stock."""
        stock = self.stocks.get(ticker.upper())
        return stock["base_price"] if stock else 1000
    
    def generate_mock_history(
        self,
        ticker: str,
        days: int = 365,
        anchor_price: Optional[float] = None
    ) -> List[StockDataPoint]:
        """
        Generate deterministic mock historical data.
        Uses seeded RNG for consistent data across requests.
        """
        today = datetime.now().strftime("%Y-%m-%d")
        seed = string_hash(f"{ticker}_{today}")
        rng = SeededRNG(seed)
        
        base_price = anchor_price or self.get_base_price(ticker)
        volatility = 0.02 if base_price > 1000 else 0.05  # Higher volatility for penny stocks
        
        data: List[StockDataPoint] = []
        price = base_price
        
        for i in range(days, 0, -1):
            date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
            
            # Random walk with mean reversion
            change = rng.random_range(-volatility, volatility)
            mean_reversion = (base_price - price) / base_price * 0.05
            price = price * (1 + change + mean_reversion)
            price = max(price, base_price * 0.5)  # Floor at 50% of base
            price = min(price, base_price * 1.5)  # Cap at 150% of base
            
            # Volume varies with price movement
            base_volume = 10_000_000 if base_price > 1000 else 50_000_000
            volume = base_volume * rng.random_range(0.5, 2.0)
            if abs(change) > 0.03:
                volume *= 1.5  # Higher volume on big moves
            
            data.append(StockDataPoint(
                date=date,
                price=round(price, 2),
                volume=round(volume, 0),
            ))
        
        return data
    
    def generate_intraday_data(
        self,
        ticker: str,
        current_price: Optional[float] = None
    ) -> List[StockDataPoint]:
        """Generate intraday minute-level data."""
        today = datetime.now().strftime("%Y-%m-%d")
        seed = string_hash(f"{ticker}_{today}_intraday")
        rng = SeededRNG(seed)
        
        base_price = current_price or self.get_base_price(ticker)
        opening_price = base_price * rng.random_range(0.98, 1.02)
        
        data: List[StockDataPoint] = []
        price = opening_price
        
        # IDX trading hours: 9:00 - 15:50 (with lunch break 11:30-13:30)
        current_hour = datetime.now().hour
        current_minute = datetime.now().minute
        
        for hour in range(9, min(16, current_hour + 1)):
            # Skip lunch break
            if hour in [12, 13]:
                continue
                
            max_minute = 60 if hour < current_hour else min(current_minute, 50 if hour == 15 else 60)
            
            for minute in range(0, max_minute, 5):  # 5-minute intervals
                time_str = f"{today} {hour:02d}:{minute:02d}"
                
                # Small random walk
                change = rng.random_range(-0.003, 0.003)
                price = price * (1 + change)
                
                # Volume higher at open and close
                base_vol = 500_000
                if hour == 9 or hour == 15:
                    base_vol *= 2
                volume = base_vol * rng.random_range(0.5, 1.5)
                
                data.append(StockDataPoint(
                    date=time_str,
                    price=round(price, 2),
                    volume=round(volume, 0),
                ))
        
        return data
    
    def get_realtime_price(self, ticker: str) -> Optional[RealTimePrice]:
        """Get real-time price (mock in dev mode)."""
        if not settings.use_mock_data:
            # TODO: Implement real IDX API integration
            pass
        
        stock = self.stocks.get(ticker.upper())
        if not stock:
            return None
        
        today = datetime.now().strftime("%Y-%m-%d")
        seed = string_hash(f"{ticker}_{today}_realtime")
        rng = SeededRNG(seed)
        
        base_price = stock["base_price"]
        
        # Generate consistent "current" price
        change_pct = rng.random_range(-0.05, 0.05)
        current = base_price * (1 + change_pct)
        previous_close = base_price * rng.random_range(0.98, 1.02)
        change = current - previous_close
        
        return RealTimePrice(
            current=round(current, 2),
            change=round(change, 2),
            change_percent=round((change / previous_close) * 100, 2),
            open=round(previous_close * rng.random_range(0.99, 1.01), 2),
            high=round(current * rng.random_range(1.0, 1.03), 2),
            low=round(current * rng.random_range(0.97, 1.0), 2),
            previous_close=round(previous_close, 2),
            volume=rng.random_int(5_000_000, 50_000_000),
            value=rng.random_range(50_000_000_000, 500_000_000_000),
            last_updated=datetime.now(),
        )


# Singleton instance
market_data_service = MarketDataService()
