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


# Complete IDX Stock Database (sourced from LQ45, IDX30, IDX80, KOMPAS100)
SAMPLE_IDX_STOCKS: List[Dict[str, Any]] = [
    # Financials
    {"ticker": "BBCA", "name": "Bank Central Asia Tbk", "sector": "Financials", "base_price": 9500},
    {"ticker": "BBRI", "name": "Bank Rakyat Indonesia Tbk", "sector": "Financials", "base_price": 5200},
    {"ticker": "BMRI", "name": "Bank Mandiri Tbk", "sector": "Financials", "base_price": 6800},
    {"ticker": "BBNI", "name": "Bank Negara Indonesia Tbk", "sector": "Financials", "base_price": 5100},
    {"ticker": "BRIS", "name": "Bank Syariah Indonesia Tbk", "sector": "Financials", "base_price": 2450},
    {"ticker": "BBTN", "name": "Bank Tabungan Negara Tbk", "sector": "Financials", "base_price": 1350},
    {"ticker": "ARTO", "name": "Bank Jago Tbk", "sector": "Financials", "base_price": 2900},
    {"ticker": "BNGA", "name": "Bank CIMB Niaga Tbk", "sector": "Financials", "base_price": 1750},
    {"ticker": "BDMN", "name": "Bank Danamon Indonesia Tbk", "sector": "Financials", "base_price": 2600},
    {"ticker": "MEGA", "name": "Bank Mega Tbk", "sector": "Financials", "base_price": 6200},
    {"ticker": "BTPS", "name": "Bank BTPN Syariah Tbk", "sector": "Financials", "base_price": 1200},

    # Energy
    {"ticker": "ADRO", "name": "Adaro Energy Indonesia Tbk", "sector": "Energy", "base_price": 2680},
    {"ticker": "MEDC", "name": "Medco Energi Internasional Tbk", "sector": "Energy", "base_price": 1350},
    {"ticker": "PGAS", "name": "Perusahaan Gas Negara Tbk", "sector": "Energy", "base_price": 1650},
    {"ticker": "PTBA", "name": "Bukit Asam Tbk", "sector": "Energy", "base_price": 2900},
    {"ticker": "AKRA", "name": "AKR Corporindo Tbk", "sector": "Energy", "base_price": 1520},
    {"ticker": "BUMI", "name": "Bumi Resources Tbk", "sector": "Energy", "base_price": 145},
    {"ticker": "ESSA", "name": "ESSA Industries Indonesia Tbk", "sector": "Energy", "base_price": 870},
    {"ticker": "PGEO", "name": "Pertamina Geothermal Energy Tbk", "sector": "Energy", "base_price": 1260},
    {"ticker": "DSSA", "name": "Dian Swastatika Sentosa Tbk", "sector": "Energy", "base_price": 38000},
    {"ticker": "ELSA", "name": "Elnusa Tbk", "sector": "Energy", "base_price": 380},
    {"ticker": "RAJA", "name": "Rukun Raharja Tbk", "sector": "Energy", "base_price": 490},
    {"ticker": "INDY", "name": "Indika Energy Tbk", "sector": "Energy", "base_price": 1480},

    # Basic Materials
    {"ticker": "ANTM", "name": "Aneka Tambang Tbk", "sector": "Basic Materials", "base_price": 1780},
    {"ticker": "INCO", "name": "Vale Indonesia Tbk", "sector": "Basic Materials", "base_price": 4200},
    {"ticker": "BRPT", "name": "Barito Pacific Tbk", "sector": "Basic Materials", "base_price": 1050},
    {"ticker": "INKP", "name": "Indah Kiat Pulp & Paper Tbk", "sector": "Basic Materials", "base_price": 8650},
    {"ticker": "TKIM", "name": "Pabrik Kertas Tjiwi Kimia Tbk", "sector": "Basic Materials", "base_price": 7500},
    {"ticker": "SMGR", "name": "Semen Indonesia Tbk", "sector": "Basic Materials", "base_price": 4100},
    {"ticker": "INTP", "name": "Indocement Tunggal Prakarsa Tbk", "sector": "Basic Materials", "base_price": 7200},
    {"ticker": "MBMA", "name": "Merdeka Battery Materials Tbk", "sector": "Basic Materials", "base_price": 520},
    {"ticker": "MDKA", "name": "Merdeka Copper Gold Tbk", "sector": "Basic Materials", "base_price": 1950},
    {"ticker": "NCKL", "name": "Trimegah Bangun Persada Tbk", "sector": "Basic Materials", "base_price": 820},
    {"ticker": "AMMN", "name": "Amman Mineral Internasional Tbk", "sector": "Basic Materials", "base_price": 9650},
    {"ticker": "BREN", "name": "Barito Renewables Energy Tbk", "sector": "Basic Materials", "base_price": 6800},

    # Technology
    {"ticker": "GOTO", "name": "GoTo Gojek Tokopedia Tbk", "sector": "Technology", "base_price": 76},
    {"ticker": "BUKA", "name": "Bukalapak.com Tbk", "sector": "Technology", "base_price": 124},
    {"ticker": "EMTK", "name": "Elang Mahkota Teknologi Tbk", "sector": "Technology", "base_price": 470},
    {"ticker": "DCII", "name": "DCI Indonesia Tbk", "sector": "Technology", "base_price": 36500},
    {"ticker": "MTDL", "name": "Metrodata Electronics Tbk", "sector": "Technology", "base_price": 590},
    {"ticker": "BELI", "name": "Global Digital Niaga Tbk", "sector": "Technology", "base_price": 342},
    {"ticker": "WIFI", "name": "Solusi Sinergi Digital Tbk", "sector": "Technology", "base_price": 250},

    # Consumer Non-Cyclicals
    {"ticker": "UNVR", "name": "Unilever Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 4280},
    {"ticker": "ICBP", "name": "Indofood CBP Sukses Makmur Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 11200},
    {"ticker": "INDF", "name": "Indofood Sukses Makmur Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 6875},
    {"ticker": "HMSP", "name": "HM Sampoerna Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 875},
    {"ticker": "GGRM", "name": "Gudang Garam Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 23000},
    {"ticker": "CPIN", "name": "Charoen Pokphand Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 5300},
    {"ticker": "JPFA", "name": "JAPFA Comfeed Indonesia Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 1700},
    {"ticker": "AMRT", "name": "Sumber Alfaria Trijaya Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 2900},
    {"ticker": "MYOR", "name": "Mayora Indah Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 2450},
    {"ticker": "KLBF", "name": "Kalbe Farma Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 1590},
    {"ticker": "SIDO", "name": "Industri Jamu Sido Muncul Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 620},
    {"ticker": "AALI", "name": "Astra Agro Lestari Tbk", "sector": "Consumer Non-Cyclicals", "base_price": 6500},

    # Consumer Cyclicals
    {"ticker": "ASII", "name": "Astra International Tbk", "sector": "Consumer Cyclicals", "base_price": 5025},
    {"ticker": "MAPI", "name": "Mitra Adiperkasa Tbk", "sector": "Consumer Cyclicals", "base_price": 1700},
    {"ticker": "MAPA", "name": "MAP Aktif Adiperkasa Tbk", "sector": "Consumer Cyclicals", "base_price": 850},
    {"ticker": "ACES", "name": "Aspirasi Hidup Indonesia Tbk", "sector": "Consumer Cyclicals", "base_price": 740},
    {"ticker": "ERAA", "name": "Erajaya Swasembada Tbk", "sector": "Consumer Cyclicals", "base_price": 440},
    {"ticker": "SCMA", "name": "Surya Citra Media Tbk", "sector": "Consumer Cyclicals", "base_price": 168},
    {"ticker": "AUTO", "name": "Astra Otoparts Tbk", "sector": "Consumer Cyclicals", "base_price": 2200},
    {"ticker": "SSIA", "name": "Surya Semesta Internusa Tbk", "sector": "Consumer Cyclicals", "base_price": 820},

    # Healthcare
    {"ticker": "HEAL", "name": "Medikaloka Hermina Tbk", "sector": "Healthcare", "base_price": 1350},
    {"ticker": "SILO", "name": "Siloam International Hospitals Tbk", "sector": "Healthcare", "base_price": 2700},
    {"ticker": "MIKA", "name": "Mitra Keluarga Karyasehat Tbk", "sector": "Healthcare", "base_price": 2900},
    {"ticker": "SAME", "name": "Sarana Meditama Metropolitan Tbk", "sector": "Healthcare", "base_price": 710},
    {"ticker": "PRDA", "name": "Prodia Widyahusada Tbk", "sector": "Healthcare", "base_price": 4300},

    # Infrastructures
    {"ticker": "TLKM", "name": "Telkom Indonesia Tbk", "sector": "Infrastructures", "base_price": 3450},
    {"ticker": "ISAT", "name": "Indosat Ooredoo Hutchison Tbk", "sector": "Infrastructures", "base_price": 8200},
    {"ticker": "EXCL", "name": "XL Axiata Tbk", "sector": "Infrastructures", "base_price": 2350},
    {"ticker": "TOWR", "name": "Sarana Menara Nusantara Tbk", "sector": "Infrastructures", "base_price": 980},
    {"ticker": "TBIG", "name": "Tower Bersama Infrastructure Tbk", "sector": "Infrastructures", "base_price": 1850},
    {"ticker": "JSMR", "name": "Jasa Marga Tbk", "sector": "Infrastructures", "base_price": 4200},
    {"ticker": "MTEL", "name": "Dayamitra Telekomunikasi Tbk", "sector": "Infrastructures", "base_price": 640},

    # Transportation & Logistics
    {"ticker": "BIRD", "name": "Blue Bird Tbk", "sector": "Transportation & Logistics", "base_price": 1500},
    {"ticker": "GIAA", "name": "Garuda Indonesia Tbk", "sector": "Transportation & Logistics", "base_price": 68},
    {"ticker": "SMDR", "name": "Samudera Indonesia Tbk", "sector": "Transportation & Logistics", "base_price": 410},
    {"ticker": "ASSA", "name": "Adi Sarana Armada Tbk", "sector": "Transportation & Logistics", "base_price": 820},
    {"ticker": "TMAS", "name": "Temas Tbk", "sector": "Transportation & Logistics", "base_price": 290},

    # Industrials
    {"ticker": "UNTR", "name": "United Tractors Tbk", "sector": "Industrials", "base_price": 26000},
    {"ticker": "ITMG", "name": "Indo Tambangraya Megah Tbk", "sector": "Industrials", "base_price": 27500},
    {"ticker": "WIKA", "name": "Wijaya Karya Tbk", "sector": "Industrials", "base_price": 340},
    {"ticker": "WSKT", "name": "Waskita Karya Tbk", "sector": "Industrials", "base_price": 258},
    {"ticker": "PTRO", "name": "Petrosea Tbk", "sector": "Industrials", "base_price": 3200},
    {"ticker": "ADMR", "name": "Adaro Minerals Indonesia Tbk", "sector": "Industrials", "base_price": 1320},
    {"ticker": "SRTG", "name": "Saratoga Investama Sedaya Tbk", "sector": "Industrials", "base_price": 2400},

    # Property & Real Estate
    {"ticker": "CTRA", "name": "Ciputra Development Tbk", "sector": "Property & Real Estate", "base_price": 1100},
    {"ticker": "SMRA", "name": "Summarecon Agung Tbk", "sector": "Property & Real Estate", "base_price": 580},
    {"ticker": "BSDE", "name": "Bumi Serpong Damai Tbk", "sector": "Property & Real Estate", "base_price": 1050},
    {"ticker": "PWON", "name": "Pakuwon Jati Tbk", "sector": "Property & Real Estate", "base_price": 430},
    {"ticker": "KIJA", "name": "Kawasan Industri Jababeka Tbk", "sector": "Property & Real Estate", "base_price": 128},
    {"ticker": "LPKR", "name": "Lippo Karawaci Tbk", "sector": "Property & Real Estate", "base_price": 108},
    {"ticker": "DILD", "name": "Intiland Development Tbk", "sector": "Property & Real Estate", "base_price": 172},
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
