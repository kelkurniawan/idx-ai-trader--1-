"""
Technical Analysis Service

Calculates technical indicators: RSI, MACD, EMA, SMA, Bollinger Bands, etc.
All calculations use NumPy for performance.
"""

from typing import List, Tuple
import numpy as np

from ..schemas.stock import (
    TechnicalIndicators,
    TrendDirection,
    MACDIndicator,
    BollingerBands,
    StochasticIndicator,
)
from ..schemas.analysis import TrendAnalysis


class TechnicalAnalysisService:
    """Service for calculating technical indicators."""
    
    @staticmethod
    def calculate_sma(prices: np.ndarray, period: int) -> np.ndarray:
        """Calculate Simple Moving Average."""
        if len(prices) < period:
            return np.array([np.mean(prices)] * len(prices))
        
        result = np.convolve(prices, np.ones(period) / period, mode='valid')
        # Pad the beginning
        padding = np.array([result[0]] * (period - 1))
        return np.concatenate([padding, result])
    
    @staticmethod
    def calculate_ema(prices: np.ndarray, period: int) -> np.ndarray:
        """Calculate Exponential Moving Average."""
        if len(prices) == 0:
            return np.array([])
        
        multiplier = 2 / (period + 1)
        ema = np.zeros(len(prices))
        ema[0] = prices[0]
        
        for i in range(1, len(prices)):
            ema[i] = (prices[i] * multiplier) + (ema[i-1] * (1 - multiplier))
        
        return ema
    
    @staticmethod
    def calculate_rsi(prices: np.ndarray, period: int = 14) -> float:
        """Calculate Relative Strength Index."""
        if len(prices) < period + 1:
            return 50.0  # Neutral if not enough data
        
        deltas = np.diff(prices)
        gains = np.where(deltas > 0, deltas, 0)
        losses = np.where(deltas < 0, -deltas, 0)
        
        avg_gain = np.mean(gains[-period:])
        avg_loss = np.mean(losses[-period:])
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return round(rsi, 2)
    
    @staticmethod
    def calculate_macd(
        prices: np.ndarray,
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9
    ) -> MACDIndicator:
        """Calculate MACD (Moving Average Convergence Divergence)."""
        if len(prices) < slow_period:
            return MACDIndicator(line=0, signal=0, histogram=0)
        
        ema_fast = TechnicalAnalysisService.calculate_ema(prices, fast_period)
        ema_slow = TechnicalAnalysisService.calculate_ema(prices, slow_period)
        
        macd_line = ema_fast - ema_slow
        signal_line = TechnicalAnalysisService.calculate_ema(macd_line, signal_period)
        histogram = macd_line - signal_line
        
        return MACDIndicator(
            line=round(float(macd_line[-1]), 2),
            signal=round(float(signal_line[-1]), 2),
            histogram=round(float(histogram[-1]), 2),
        )
    
    @staticmethod
    def calculate_bollinger(
        prices: np.ndarray,
        period: int = 20,
        std_dev: float = 2.0
    ) -> BollingerBands:
        """Calculate Bollinger Bands."""
        if len(prices) < period:
            mid = float(np.mean(prices))
            std = float(np.std(prices)) * std_dev
            return BollingerBands(upper=mid + std, middle=mid, lower=mid - std)
        
        sma = TechnicalAnalysisService.calculate_sma(prices, period)
        
        # Calculate rolling standard deviation
        rolling_std = np.array([
            np.std(prices[max(0, i-period+1):i+1])
            for i in range(len(prices))
        ])
        
        upper = sma + (rolling_std * std_dev)
        lower = sma - (rolling_std * std_dev)
        
        return BollingerBands(
            upper=round(float(upper[-1]), 2),
            middle=round(float(sma[-1]), 2),
            lower=round(float(lower[-1]), 2),
        )
    
    @staticmethod
    def calculate_stochastic(
        prices: np.ndarray,
        high_prices: np.ndarray = None,
        low_prices: np.ndarray = None,
        k_period: int = 14,
        d_period: int = 3
    ) -> StochasticIndicator:
        """Calculate Stochastic Oscillator."""
        if high_prices is None:
            high_prices = prices * 1.02  # Estimate if not provided
        if low_prices is None:
            low_prices = prices * 0.98
        
        if len(prices) < k_period:
            return StochasticIndicator(k=50.0, d=50.0)
        
        # Calculate %K
        lowest_low = np.min(low_prices[-k_period:])
        highest_high = np.max(high_prices[-k_period:])
        
        if highest_high == lowest_low:
            k = 50.0
        else:
            k = ((prices[-1] - lowest_low) / (highest_high - lowest_low)) * 100
        
        # %D is SMA of %K (simplified - using current K)
        d = k  # In production, would track historical K values
        
        return StochasticIndicator(k=round(k, 2), d=round(d, 2))
    
    @staticmethod
    def calculate_atr(
        prices: np.ndarray,
        high_prices: np.ndarray = None,
        low_prices: np.ndarray = None,
        period: int = 14
    ) -> float:
        """Calculate Average True Range."""
        if high_prices is None:
            high_prices = prices * 1.02
        if low_prices is None:
            low_prices = prices * 0.98
        
        if len(prices) < 2:
            return 0.0
        
        # True Range = max(H-L, |H-Cp|, |L-Cp|)
        tr_values = []
        for i in range(1, len(prices)):
            h_l = high_prices[i] - low_prices[i]
            h_cp = abs(high_prices[i] - prices[i-1])
            l_cp = abs(low_prices[i] - prices[i-1])
            tr_values.append(max(h_l, h_cp, l_cp))
        
        if len(tr_values) < period:
            return float(np.mean(tr_values))
        
        return round(float(np.mean(tr_values[-period:])), 2)
    
    @staticmethod
    def detect_trend(current_price: float, ma: float, tolerance: float = 0.01) -> TrendDirection:
        """Determine trend direction based on price vs moving average."""
        diff = (current_price - ma) / ma
        
        if diff > tolerance:
            return TrendDirection.BULLISH
        elif diff < -tolerance:
            return TrendDirection.BEARISH
        else:
            return TrendDirection.NEUTRAL
    
    @staticmethod
    def calculate_support_resistance(prices: np.ndarray, levels: int = 2) -> Tuple[List[float], List[float]]:
        """Calculate support and resistance levels using local minima/maxima."""
        if len(prices) < 10:
            return [float(np.min(prices))], [float(np.max(prices))]
        
        # Find local minima for support
        supports = []
        resistances = []
        
        for i in range(2, len(prices) - 2):
            # Local minimum
            if prices[i] < prices[i-1] and prices[i] < prices[i+1] and \
               prices[i] < prices[i-2] and prices[i] < prices[i+2]:
                supports.append(prices[i])
            # Local maximum
            if prices[i] > prices[i-1] and prices[i] > prices[i+1] and \
               prices[i] > prices[i-2] and prices[i] > prices[i+2]:
                resistances.append(prices[i])
        
        # Get the most recent levels
        supports = sorted(set(supports))[-levels:] if supports else [float(np.min(prices))]
        resistances = sorted(set(resistances))[-levels:] if resistances else [float(np.max(prices))]
        
        return [round(s, 2) for s in supports], [round(r, 2) for r in resistances]
    
    def calculate_all(self, prices: List[float]) -> TechnicalIndicators:
        """Calculate all technical indicators from price data."""
        price_array = np.array(prices)
        current_price = prices[-1] if prices else 0
        
        # Moving Averages
        ema20 = self.calculate_ema(price_array, 20)
        sma50 = self.calculate_sma(price_array, 50)
        sma200 = self.calculate_sma(price_array, 200)
        
        # Support & Resistance
        support, resistance = self.calculate_support_resistance(price_array)
        
        return TechnicalIndicators(
            rsi=self.calculate_rsi(price_array),
            macd=self.calculate_macd(price_array),
            stochastic=self.calculate_stochastic(price_array),
            ema20=round(float(ema20[-1]), 2) if len(ema20) > 0 else current_price,
            sma50=round(float(sma50[-1]), 2) if len(sma50) > 0 else current_price,
            sma200=round(float(sma200[-1]), 2) if len(sma200) > 0 else current_price,
            bollinger=self.calculate_bollinger(price_array),
            atr=self.calculate_atr(price_array),
            support=support,
            resistance=resistance,
            trend_short=self.detect_trend(current_price, float(ema20[-1]) if len(ema20) > 0 else current_price),
            trend_medium=self.detect_trend(current_price, float(sma50[-1]) if len(sma50) > 0 else current_price),
            trend_long=self.detect_trend(current_price, float(sma200[-1]) if len(sma200) > 0 else current_price),
        )
    
    def analyze_trend(self, prices: List[float]) -> TrendAnalysis:
        """Analyze trend from price data."""
        price_array = np.array(prices)
        current_price = prices[-1] if prices else 0
        
        ema20 = self.calculate_ema(price_array, 20)
        sma50 = self.calculate_sma(price_array, 50)
        sma200 = self.calculate_sma(price_array, 200)
        
        short = self.detect_trend(current_price, float(ema20[-1]) if len(ema20) > 0 else current_price)
        medium = self.detect_trend(current_price, float(sma50[-1]) if len(sma50) > 0 else current_price)
        long_term = self.detect_trend(current_price, float(sma200[-1]) if len(sma200) > 0 else current_price)
        
        # Calculate trend strength
        bullish_count = sum(1 for t in [short, medium, long_term] if t == TrendDirection.BULLISH)
        bearish_count = sum(1 for t in [short, medium, long_term] if t == TrendDirection.BEARISH)
        
        if bullish_count >= 2:
            strength = 60 + (bullish_count * 10)
            desc = "Strong bullish trend with price above key moving averages"
        elif bearish_count >= 2:
            strength = 60 + (bearish_count * 10)
            desc = "Strong bearish trend with price below key moving averages"
        else:
            strength = 40 + abs(bullish_count - bearish_count) * 10
            desc = "Mixed signals, trend is neutral to sideways"
        
        return TrendAnalysis(
            short_term=short,
            medium_term=medium,
            long_term=long_term,
            strength=min(strength, 100),
            description=desc,
        )


# Singleton instance
technical_service = TechnicalAnalysisService()
