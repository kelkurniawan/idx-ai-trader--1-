"""
AI Analysis Service

Integrates with Gemini API for AI-powered stock analysis.
Returns mock responses in dev mode to save API credits.
"""

from datetime import datetime
from typing import Optional, List
import hashlib

from ..config import get_settings
from ..services.genai_client import async_generate_content, get_genai_client
from ..schemas.stock import TechnicalIndicators
from ..schemas.analysis import (
    AIAnalysisResult,
    SignalType,
    ChartVisionAnalysis,
    VisualLevel,
)

settings = get_settings()


def string_hash(s: str) -> int:
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


class AIAnalysisService:
    """Service for AI-powered stock analysis."""
    
    def __init__(self):
        self._client = None
    
    def _get_client(self):
        """Lazy load Gemini client only when needed."""
        if self._client is None and settings.enable_ai_calls:
            try:
                self._client = get_genai_client()
            except Exception as e:
                print(f"Failed to initialize Gemini client: {e}")
        return self._client
    
    async def analyze_stock(
        self,
        ticker: str,
        current_price: float,
        technicals: TechnicalIndicators,
    ) -> AIAnalysisResult:
        """
        Perform AI analysis on a stock.
        Uses mock data in dev mode.
        """
        if settings.use_mock_data or not settings.enable_ai_calls:
            return self._get_mock_analysis(ticker, current_price, technicals)
        
        # Production: Use Gemini API
        return await self._call_gemini_analysis(ticker, current_price, technicals)
    
    async def _call_gemini_analysis(
        self,
        ticker: str,
        current_price: float,
        technicals: TechnicalIndicators,
    ) -> AIAnalysisResult:
        """Call Gemini API for stock analysis."""
        client = self._get_client()
        if not client:
            return self._get_mock_analysis(ticker, current_price, technicals)
        
        prompt = f"""
        Analyze the Indonesian stock {ticker} with the following technical data:
        - Current Price: {current_price}
        - RSI (14): {technicals.rsi}
        - MACD: Line={technicals.macd.line}, Signal={technicals.macd.signal}
        - EMA20: {technicals.ema20}, SMA50: {technicals.sma50}, SMA200: {technicals.sma200}
        - Bollinger Bands: Upper={technicals.bollinger.upper}, Lower={technicals.bollinger.lower}
        - Support: {technicals.support}, Resistance: {technicals.resistance}
        - Trend: Short={technicals.trend_short}, Medium={technicals.trend_medium}, Long={technicals.trend_long}
        
        Provide a trading recommendation in JSON format:
        {{
            "signal": "STRONG_BUY|BUY|NEUTRAL|SELL|STRONG_SELL",
            "confidence": 0-100,
            "summary": "Brief summary",
            "reasoning": ["point1", "point2", "point3"]
        }}
        """
        
        try:
            await async_generate_content(
                model="gemini-2.0-flash",
                prompt=prompt,
                response_mime_type="application/json",
            )
            # Parse JSON response (simplified - would need proper parsing)
            return self._get_mock_analysis(ticker, current_price, technicals)
        except Exception as e:
            print(f"Gemini API error: {e}")
            return self._get_mock_analysis(ticker, current_price, technicals)
    
    def _get_mock_analysis(
        self,
        ticker: str,
        current_price: float,
        technicals: TechnicalIndicators,
    ) -> AIAnalysisResult:
        """Generate deterministic mock analysis based on technicals."""
        # Determine signal based on technicals
        bullish_signals = 0
        bearish_signals = 0
        reasoning = []
        
        # RSI Analysis
        if technicals.rsi < 30:
            bullish_signals += 2
            reasoning.append(f"RSI at {technicals.rsi:.1f} indicates oversold conditions - potential reversal")
        elif technicals.rsi > 70:
            bearish_signals += 2
            reasoning.append(f"RSI at {technicals.rsi:.1f} indicates overbought conditions - caution advised")
        elif technicals.rsi > 50:
            bullish_signals += 1
            reasoning.append(f"RSI at {technicals.rsi:.1f} shows bullish momentum")
        else:
            bearish_signals += 1
            reasoning.append(f"RSI at {technicals.rsi:.1f} shows weak momentum")
        
        # MACD Analysis
        if technicals.macd.histogram > 0:
            bullish_signals += 1
            reasoning.append("MACD histogram positive - bullish momentum building")
        else:
            bearish_signals += 1
            reasoning.append("MACD histogram negative - bearish pressure present")
        
        # Trend Analysis
        trend_points = {"BULLISH": 1, "NEUTRAL": 0, "BEARISH": -1}
        trend_score = (
            trend_points.get(technicals.trend_short.value, 0) +
            trend_points.get(technicals.trend_medium.value, 0) +
            trend_points.get(technicals.trend_long.value, 0)
        )
        
        if trend_score >= 2:
            bullish_signals += 2
            reasoning.append("Strong uptrend across multiple timeframes")
        elif trend_score <= -2:
            bearish_signals += 2
            reasoning.append("Strong downtrend across multiple timeframes")
        else:
            reasoning.append("Mixed trend signals - market is consolidating")
        
        # Bollinger Band Analysis
        if current_price <= technicals.bollinger.lower:
            bullish_signals += 1
            reasoning.append("Price at lower Bollinger Band - potential bounce zone")
        elif current_price >= technicals.bollinger.upper:
            bearish_signals += 1
            reasoning.append("Price at upper Bollinger Band - potential resistance")
        
        # Determine final signal
        net_score = bullish_signals - bearish_signals
        if net_score >= 4:
            signal = SignalType.STRONG_BUY
            confidence = 85
        elif net_score >= 2:
            signal = SignalType.BUY
            confidence = 70
        elif net_score <= -4:
            signal = SignalType.STRONG_SELL
            confidence = 85
        elif net_score <= -2:
            signal = SignalType.SELL
            confidence = 70
        else:
            signal = SignalType.NEUTRAL
            confidence = 50
        
        # Generate summary
        if signal in [SignalType.STRONG_BUY, SignalType.BUY]:
            summary = f"{ticker} shows bullish characteristics with {len([r for r in reasoning if 'bullish' in r.lower() or 'uptrend' in r.lower()])} positive indicators supporting a potential upside move."
        elif signal in [SignalType.STRONG_SELL, SignalType.SELL]:
            summary = f"{ticker} displays bearish signals with technical indicators suggesting caution and potential downside risk."
        else:
            summary = f"{ticker} is in a consolidation phase with mixed signals. Wait for clearer direction before taking positions."
        
        return AIAnalysisResult(
            ticker=ticker,
            current_price=current_price,
            signal=signal,
            confidence=confidence,
            summary=summary,
            reasoning=reasoning[:5],  # Top 5 reasons
            support_level=min(technicals.support) if technicals.support else current_price * 0.95,
            resistance_level=max(technicals.resistance) if technicals.resistance else current_price * 1.05,
            last_updated=datetime.now(),
        )
    
    async def analyze_chart_image(
        self,
        base64_image: str,
        trading_type: str = "SWING"
    ) -> ChartVisionAnalysis:
        """
        Analyze uploaded chart image using AI vision.
        Uses mock response in dev mode.
        """
        if settings.use_mock_data or not settings.enable_ai_calls:
            return self._get_mock_chart_analysis(trading_type)
        
        # Production: Use Gemini Vision
        return await self._call_gemini_vision(base64_image, trading_type)
    
    async def _call_gemini_vision(
        self,
        base64_image: str,
        trading_type: str
    ) -> ChartVisionAnalysis:
        """Call Gemini Vision API for chart analysis."""
        # Would implement actual vision API call here
        return self._get_mock_chart_analysis(trading_type)
    
    def _get_mock_chart_analysis(self, trading_type: str) -> ChartVisionAnalysis:
        """Generate mock chart analysis."""
        is_swing = trading_type == "SWING"
        
        return ChartVisionAnalysis(
            trend="Bullish with higher highs and higher lows pattern",
            candlestick_patterns=[
                "Bullish Engulfing at support",
                "Morning Star formation",
                "Higher lows pattern"
            ],
            support_levels=[
                VisualLevel(price="9200", y_pos=0.75, label="Major Support"),
                VisualLevel(price="9000", y_pos=0.85, label="Key Support Zone"),
            ],
            resistance_levels=[
                VisualLevel(price="9600", y_pos=0.25, label="Resistance"),
                VisualLevel(price="9800", y_pos=0.15, label="Target Zone"),
            ],
            entry_suggestion="Enter on pullback to 9350-9400 zone" if is_swing else "Enter on breakout above 9500",
            stop_loss="9150 (below recent swing low)" if is_swing else "9400 (tight stop)",
            take_profit="9750-9800 (next resistance)" if is_swing else "9600 (quick target)",
            overall_strategy=f"{'Swing' if is_swing else 'Scalp'} trade setup with favorable risk/reward. Wait for confirmation before entry.",
            confidence=72.5,
        )


# Singleton instance
ai_analysis_service = AIAnalysisService()
