"""
Broker Summary Service

Provides broker activity data, foreign flow, and smart money analysis.
Uses mock data in dev/staging, ready for real IDX API in production.
"""

from datetime import datetime
from typing import List, Optional
import hashlib

from ..config import get_settings
from ..schemas.stock import TrendDirection
from ..schemas.analysis import (
    BrokerSummary,
    BrokerActivity,
    ForeignFlow,
)

settings = get_settings()


# Sample broker codes for IDX
SAMPLE_BROKERS = [
    {"code": "YP", "name": "Mirae Asset Sekuritas"},
    {"code": "CC", "name": "Mandiri Sekuritas"},
    {"code": "AK", "name": "BCA Sekuritas"},
    {"code": "DX", "name": "BNI Sekuritas"},
    {"code": "PD", "name": "Indo Premier Sekuritas"},
    {"code": "NI", "name": "Maybank Sekuritas"},
    {"code": "RX", "name": "Macquarie Sekuritas"},
    {"code": "KK", "name": "JP Morgan Sekuritas"},
    {"code": "GR", "name": "Credit Suisse Sekuritas"},
    {"code": "DB", "name": "Deutsche Bank Sekuritas"},
    {"code": "ZP", "name": "Morgan Stanley Sekuritas"},
    {"code": "LG", "name": "CLSA Sekuritas"},
]


class SeededRNG:
    """Deterministic random for consistent mock data."""
    
    def __init__(self, seed: int):
        self.seed = seed
    
    def next(self) -> float:
        self.seed = (self.seed * 1103515245 + 12345) & 0x7FFFFFFF
        return self.seed / 0x7FFFFFFF
    
    def random_range(self, min_val: float, max_val: float) -> float:
        return min_val + (max_val - min_val) * self.next()
    
    def random_int(self, min_val: int, max_val: int) -> int:
        return int(self.random_range(min_val, max_val + 1))
    
    def shuffle(self, lst: list) -> list:
        """Shuffle a list deterministically."""
        result = lst.copy()
        for i in range(len(result) - 1, 0, -1):
            j = self.random_int(0, i)
            result[i], result[j] = result[j], result[i]
        return result


def string_hash(s: str) -> int:
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


class BrokerSummaryService:
    """Service for broker summary and foreign flow analysis."""
    
    def get_broker_summary(self, ticker: str, current_price: float = 1000) -> BrokerSummary:
        """
        Get broker summary for a stock.
        In dev mode, generates deterministic mock data.
        """
        if not settings.use_mock_data:
            # TODO: Implement real IDX broker summary API
            pass
        
        return self._generate_mock_broker_summary(ticker, current_price)
    
    def _generate_mock_broker_summary(self, ticker: str, current_price: float) -> BrokerSummary:
        """Generate deterministic mock broker summary."""
        today = datetime.now().strftime("%Y-%m-%d")
        seed = string_hash(f"{ticker}_{today}_broker")
        rng = SeededRNG(seed)
        
        # Shuffle brokers for this ticker
        shuffled_brokers = rng.shuffle(SAMPLE_BROKERS)
        
        # Generate top buyers
        top_buyers: List[BrokerActivity] = []
        for i, broker in enumerate(shuffled_brokers[:5]):
            buy_vol = rng.random_int(100_000, 10_000_000) // (i + 1)
            sell_vol = rng.random_int(10_000, buy_vol // 2)
            
            top_buyers.append(BrokerActivity(
                broker_code=broker["code"],
                broker_name=broker["name"],
                buy_volume=buy_vol,
                sell_volume=sell_vol,
                net_volume=buy_vol - sell_vol,
                buy_value=buy_vol * current_price,
                sell_value=sell_vol * current_price,
                net_value=(buy_vol - sell_vol) * current_price,
            ))
        
        # Generate top sellers
        top_sellers: List[BrokerActivity] = []
        for i, broker in enumerate(shuffled_brokers[5:10]):
            sell_vol = rng.random_int(100_000, 8_000_000) // (i + 1)
            buy_vol = rng.random_int(10_000, sell_vol // 2)
            
            top_sellers.append(BrokerActivity(
                broker_code=broker["code"],
                broker_name=broker["name"],
                buy_volume=buy_vol,
                sell_volume=sell_vol,
                net_volume=buy_vol - sell_vol,
                buy_value=buy_vol * current_price,
                sell_value=sell_vol * current_price,
                net_value=(buy_vol - sell_vol) * current_price,
            ))
        
        # Generate foreign flow
        foreign_buy = rng.random_int(1_000_000, 20_000_000)
        foreign_sell = rng.random_int(1_000_000, 20_000_000)
        foreign_net = foreign_buy - foreign_sell
        
        # Determine flow trend
        if foreign_net > 5_000_000:
            flow_trend = TrendDirection.BULLISH
        elif foreign_net < -5_000_000:
            flow_trend = TrendDirection.BEARISH
        else:
            flow_trend = TrendDirection.NEUTRAL
        
        foreign_flow = ForeignFlow(
            buy_volume=foreign_buy,
            sell_volume=foreign_sell,
            net_volume=foreign_net,
            buy_value=foreign_buy * current_price,
            sell_value=foreign_sell * current_price,
            net_value=foreign_net * current_price,
            flow_trend=flow_trend,
        )
        
        # Calculate accumulation score (-100 to 100)
        total_buy = sum(b.buy_volume for b in top_buyers)
        total_sell = sum(s.sell_volume for s in top_sellers)
        if total_buy + total_sell > 0:
            accumulation = ((total_buy - total_sell) / (total_buy + total_sell)) * 100
        else:
            accumulation = 0
        
        # Smart money signal
        smart_money = None
        if accumulation > 50 and flow_trend == TrendDirection.BULLISH:
            smart_money = "Strong institutional accumulation detected"
        elif accumulation < -50 and flow_trend == TrendDirection.BEARISH:
            smart_money = "Institutional distribution in progress"
        elif abs(foreign_net) > 10_000_000:
            smart_money = "Significant foreign activity detected"
        
        return BrokerSummary(
            top_buyers=top_buyers,
            top_sellers=top_sellers,
            foreign_flow=foreign_flow,
            accumulation_score=round(accumulation, 2),
            smart_money_signal=smart_money,
        )
    
    def detect_unusual_activity(self, ticker: str, current_volume: float, avg_volume: float) -> Optional[str]:
        """Detect unusual broker activity patterns."""
        volume_ratio = current_volume / avg_volume if avg_volume > 0 else 1
        
        if volume_ratio > 3:
            return f"Extremely high volume ({volume_ratio:.1f}x average) - possible accumulation/distribution"
        elif volume_ratio > 2:
            return f"High volume ({volume_ratio:.1f}x average) - increased institutional interest"
        elif volume_ratio < 0.5:
            return f"Low volume ({volume_ratio:.1f}x average) - reduced trading activity"
        
        return None


# Singleton instance
broker_summary_service = BrokerSummaryService()
