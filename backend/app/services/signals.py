"""
Signal Generation Service

Generates trading signals by combining technical analysis, broker data, and AI insights.
"""

from typing import List, Optional

from ..schemas.stock import TechnicalIndicators, TrendDirection
from ..schemas.analysis import (
    SignalType,
    TradingSignal,
    BrokerSummary,
    VolumeAnalysis,
    VolumeTrend,
    AIAnalysisResult,
)


class SignalGeneratorService:
    """Service for generating trading signals."""
    
    def generate_signal(
        self,
        current_price: float,
        technicals: TechnicalIndicators,
        broker_summary: Optional[BrokerSummary] = None,
        volume_analysis: Optional[VolumeAnalysis] = None,
        ai_result: Optional[AIAnalysisResult] = None,
    ) -> TradingSignal:
        """
        Generate comprehensive trading signal from multiple data sources.
        Weights: Technical 40%, Broker 25%, Volume 15%, AI 20%
        """
        scores = []
        reasoning = []
        
        # 1. Technical Analysis Score (40%)
        tech_score, tech_reasons = self._score_technicals(current_price, technicals)
        scores.append(("technical", tech_score, 0.40))
        reasoning.extend(tech_reasons)
        
        # 2. Broker Summary Score (25%)
        if broker_summary:
            broker_score, broker_reasons = self._score_broker_data(broker_summary)
            scores.append(("broker", broker_score, 0.25))
            reasoning.extend(broker_reasons)
        
        # 3. Volume Analysis Score (15%)
        if volume_analysis:
            vol_score, vol_reasons = self._score_volume(volume_analysis)
            scores.append(("volume", vol_score, 0.15))
            reasoning.extend(vol_reasons)
        
        # 4. AI Analysis Score (20%)
        if ai_result:
            ai_score = self._signal_to_score(ai_result.signal)
            scores.append(("ai", ai_score, 0.20))
            reasoning.append(f"AI Analysis: {ai_result.summary[:100]}")
        
        # Calculate weighted average
        total_weight = sum(weight for _, _, weight in scores)
        weighted_score = sum(score * weight for _, score, weight in scores) / total_weight
        
        # Convert score to signal
        signal = self._score_to_signal(weighted_score)
        confidence = self._calculate_confidence(weighted_score, scores)
        
        # Calculate entry/exit points
        entry_price = self._calculate_entry(current_price, signal, technicals)
        stop_loss = self._calculate_stop_loss(current_price, signal, technicals)
        take_profit = self._calculate_take_profit(current_price, signal, technicals)
        
        # Risk/Reward ratio
        if stop_loss and take_profit and entry_price:
            risk = abs(entry_price - stop_loss)
            reward = abs(take_profit - entry_price)
            rr_ratio = reward / risk if risk > 0 else 0
        else:
            rr_ratio = None
        
        return TradingSignal(
            action=signal,
            confidence=round(confidence, 1),
            entry_price=round(entry_price, 2) if entry_price else None,
            stop_loss=round(stop_loss, 2) if stop_loss else None,
            take_profit=round(take_profit, 2) if take_profit else None,
            risk_reward_ratio=round(rr_ratio, 2) if rr_ratio else None,
            reasoning=reasoning[:5],  # Top 5 reasons
        )
    
    def _score_technicals(self, price: float, tech: TechnicalIndicators) -> tuple:
        """Score technical indicators from -100 to +100."""
        score = 0
        reasons = []
        
        # RSI (0-100 -> -100 to +100)
        if tech.rsi < 30:
            score += 30
            reasons.append(f"RSI {tech.rsi:.0f}: Oversold - bullish reversal potential")
        elif tech.rsi > 70:
            score -= 30
            reasons.append(f"RSI {tech.rsi:.0f}: Overbought - bearish reversal risk")
        elif tech.rsi > 50:
            score += 10
        else:
            score -= 10
        
        # MACD
        if tech.macd.histogram > 0 and tech.macd.line > tech.macd.signal:
            score += 20
            reasons.append("MACD: Bullish crossover with positive momentum")
        elif tech.macd.histogram < 0 and tech.macd.line < tech.macd.signal:
            score -= 20
            reasons.append("MACD: Bearish crossover with negative momentum")
        
        # Trend alignment
        trend_values = {
            TrendDirection.BULLISH: 1,
            TrendDirection.NEUTRAL: 0,
            TrendDirection.BEARISH: -1
        }
        trend_score = (
            trend_values[tech.trend_short] * 1 +
            trend_values[tech.trend_medium] * 1.5 +
            trend_values[tech.trend_long] * 2
        )
        score += trend_score * 10
        
        if trend_score > 3:
            reasons.append("Strong bullish alignment across all timeframes")
        elif trend_score < -3:
            reasons.append("Strong bearish alignment across all timeframes")
        
        # Bollinger Band position
        if price <= tech.bollinger.lower:
            score += 15
            reasons.append("Price at lower Bollinger - potential bounce")
        elif price >= tech.bollinger.upper:
            score -= 15
            reasons.append("Price at upper Bollinger - potential pullback")
        
        return max(-100, min(100, score)), reasons
    
    def _score_broker_data(self, broker: BrokerSummary) -> tuple:
        """Score broker activity from -100 to +100."""
        reasons = []
        
        # Use accumulation score directly
        score = broker.accumulation_score
        
        # Foreign flow
        if broker.foreign_flow.flow_trend == TrendDirection.BULLISH:
            score += 20
            reasons.append(f"Net foreign buying: {broker.foreign_flow.net_value:,.0f} IDR")
        elif broker.foreign_flow.flow_trend == TrendDirection.BEARISH:
            score -= 20
            reasons.append(f"Net foreign selling: {abs(broker.foreign_flow.net_value):,.0f} IDR")
        
        # Smart money signal
        if broker.smart_money_signal:
            reasons.append(f"Smart money: {broker.smart_money_signal}")
        
        return max(-100, min(100, score)), reasons
    
    def _score_volume(self, vol: VolumeAnalysis) -> tuple:
        """Score volume data from -100 to +100."""
        reasons = []
        score = 0
        
        # Volume ratio
        if vol.ratio > 2.0:
            score += 30
            reasons.append(f"Volume {vol.ratio:.1f}x average - high interest")
        elif vol.ratio > 1.5:
            score += 15
        elif vol.ratio < 0.5:
            score -= 15
            reasons.append(f"Volume {vol.ratio:.1f}x average - low interest")
        
        # Volume trend
        if vol.trend == VolumeTrend.VERY_HIGH:
            score += 20
        elif vol.trend == VolumeTrend.HIGH:
            score += 10
        elif vol.trend == VolumeTrend.LOW:
            score -= 10
        elif vol.trend == VolumeTrend.VERY_LOW:
            score -= 20
        
        if vol.unusual_activity:
            reasons.append(f"Unusual activity: {vol.unusual_reason}")
        
        return max(-100, min(100, score)), reasons
    
    def _signal_to_score(self, signal: SignalType) -> float:
        """Convert signal type to numerical score."""
        mapping = {
            SignalType.STRONG_BUY: 80,
            SignalType.BUY: 40,
            SignalType.NEUTRAL: 0,
            SignalType.SELL: -40,
            SignalType.STRONG_SELL: -80,
        }
        return mapping.get(signal, 0)
    
    def _score_to_signal(self, score: float) -> SignalType:
        """Convert numerical score to signal type."""
        if score >= 50:
            return SignalType.STRONG_BUY
        elif score >= 20:
            return SignalType.BUY
        elif score <= -50:
            return SignalType.STRONG_SELL
        elif score <= -20:
            return SignalType.SELL
        else:
            return SignalType.NEUTRAL
    
    def _calculate_confidence(self, weighted_score: float, scores: List[tuple]) -> float:
        """Calculate confidence based on score magnitude and agreement."""
        # Base confidence from score magnitude
        base_conf = min(abs(weighted_score), 100)
        
        # Bonus for agreement between sources
        if len(scores) >= 3:
            signs = [1 if s > 0 else -1 if s < 0 else 0 for _, s, _ in scores]
            agreement = abs(sum(signs)) / len(signs)
            base_conf += agreement * 10
        
        return min(base_conf, 95)  # Cap at 95%
    
    def _calculate_entry(self, price: float, signal: SignalType, tech: TechnicalIndicators) -> Optional[float]:
        """Calculate suggested entry price."""
        if signal in [SignalType.STRONG_BUY, SignalType.BUY]:
            # Entry on pullback for buys
            return max(price * 0.99, min(tech.support) if tech.support else price * 0.98)
        elif signal in [SignalType.STRONG_SELL, SignalType.SELL]:
            # Entry on bounce for sells
            return min(price * 1.01, max(tech.resistance) if tech.resistance else price * 1.02)
        return price
    
    def _calculate_stop_loss(self, price: float, signal: SignalType, tech: TechnicalIndicators) -> Optional[float]:
        """Calculate stop loss level."""
        if signal in [SignalType.STRONG_BUY, SignalType.BUY]:
            # Stop below support
            support = min(tech.support) if tech.support else price * 0.95
            return support * 0.98
        elif signal in [SignalType.STRONG_SELL, SignalType.SELL]:
            # Stop above resistance
            resistance = max(tech.resistance) if tech.resistance else price * 1.05
            return resistance * 1.02
        return None
    
    def _calculate_take_profit(self, price: float, signal: SignalType, tech: TechnicalIndicators) -> Optional[float]:
        """Calculate take profit level."""
        if signal in [SignalType.STRONG_BUY, SignalType.BUY]:
            # Target at resistance
            return max(tech.resistance) if tech.resistance else price * 1.10
        elif signal in [SignalType.STRONG_SELL, SignalType.SELL]:
            # Target at support
            return min(tech.support) if tech.support else price * 0.90
        return None
    
    def analyze_volume(self, current: float, average: float) -> VolumeAnalysis:
        """Create volume analysis from current and average volume."""
        ratio = current / average if average > 0 else 1.0
        
        # Determine trend
        if ratio >= 2.5:
            trend = VolumeTrend.VERY_HIGH
            prediction = "HIGH"
        elif ratio >= 1.5:
            trend = VolumeTrend.HIGH
            prediction = "HIGH"
        elif ratio >= 0.7:
            trend = VolumeTrend.NORMAL
            prediction = "NORMAL"
        elif ratio >= 0.4:
            trend = VolumeTrend.LOW
            prediction = "LOW"
        else:
            trend = VolumeTrend.VERY_LOW
            prediction = "LOW"
        
        # Check for unusual activity
        unusual = ratio >= 3.0 or ratio <= 0.3
        unusual_reason = None
        if ratio >= 3.0:
            unusual_reason = "Exceptionally high volume - possible news or institutional activity"
        elif ratio <= 0.3:
            unusual_reason = "Extremely low volume - market fatigue or holiday effect"
        
        return VolumeAnalysis(
            current=current,
            average=average,
            ratio=round(ratio, 2),
            trend=trend,
            prediction=prediction,
            unusual_activity=unusual,
            unusual_reason=unusual_reason,
        )


# Singleton instance
signal_generator_service = SignalGeneratorService()
