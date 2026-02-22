"""
Analysis & Signal Schemas

Pydantic models for AI analysis, broker summary, and trading signals.
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

from .stock import TechnicalIndicators, TrendDirection, RealTimePrice


class SignalType(str, Enum):
    """Trading signal types."""
    STRONG_BUY = "STRONG_BUY"
    BUY = "BUY"
    NEUTRAL = "NEUTRAL"
    SELL = "SELL"
    STRONG_SELL = "STRONG_SELL"


class VolumeTrend(str, Enum):
    """Volume trend classification."""
    VERY_HIGH = "VERY_HIGH"
    HIGH = "HIGH"
    NORMAL = "NORMAL"
    LOW = "LOW"
    VERY_LOW = "VERY_LOW"


class VolumeAnalysis(BaseModel):
    """Volume analysis data."""
    current: float = Field(..., description="Current day volume")
    average: float = Field(..., description="Average volume (20-day)")
    ratio: float = Field(..., description="Current/Average ratio")
    trend: VolumeTrend = Field(..., description="Volume trend classification")
    prediction: str = Field(..., description="Volume prediction (HIGH/NORMAL/LOW)")
    unusual_activity: bool = Field(False, description="Unusual volume detected")
    unusual_reason: Optional[str] = None


class TrendAnalysis(BaseModel):
    """Trend analysis data."""
    short_term: TrendDirection = Field(..., description="Short-term (1-20 days)")
    medium_term: TrendDirection = Field(..., description="Medium-term (20-50 days)")
    long_term: TrendDirection = Field(..., description="Long-term (50-200 days)")
    strength: float = Field(..., ge=0, le=100, description="Trend strength 0-100")
    description: str = Field(..., description="Human-readable trend summary")


class BrokerActivity(BaseModel):
    """Individual broker activity data."""
    broker_code: str = Field(..., description="Broker code (e.g., YP, CC)")
    broker_name: Optional[str] = Field(None, description="Broker full name")
    buy_volume: float = Field(..., description="Buy volume")
    sell_volume: float = Field(..., description="Sell volume")
    net_volume: float = Field(..., description="Net volume (buy - sell)")
    buy_value: float = Field(..., description="Buy value in IDR")
    sell_value: float = Field(..., description="Sell value in IDR")
    net_value: float = Field(..., description="Net value in IDR")


class ForeignFlow(BaseModel):
    """Foreign investor flow data."""
    buy_volume: float = Field(..., description="Foreign buy volume")
    sell_volume: float = Field(..., description="Foreign sell volume")
    net_volume: float = Field(..., description="Net foreign volume")
    buy_value: float = Field(..., description="Foreign buy value in IDR")
    sell_value: float = Field(..., description="Foreign sell value in IDR")
    net_value: float = Field(..., description="Net foreign value in IDR")
    flow_trend: TrendDirection = Field(..., description="Foreign flow trend")


class BrokerSummary(BaseModel):
    """Complete broker summary data."""
    top_buyers: List[BrokerActivity] = Field(default_factory=list, max_length=10)
    top_sellers: List[BrokerActivity] = Field(default_factory=list, max_length=10)
    foreign_flow: ForeignFlow
    accumulation_score: float = Field(..., ge=-100, le=100, description="Accumulation score (-100 to 100)")
    smart_money_signal: Optional[str] = Field(None, description="Smart money activity indicator")


class TradingSignal(BaseModel):
    """Trading signal with confidence and reasoning."""
    action: SignalType = Field(..., description="Recommended action")
    confidence: float = Field(..., ge=0, le=100, description="Confidence score 0-100")
    entry_price: Optional[float] = Field(None, description="Suggested entry price")
    stop_loss: Optional[float] = Field(None, description="Suggested stop loss")
    take_profit: Optional[float] = Field(None, description="Suggested take profit")
    risk_reward_ratio: Optional[float] = Field(None, description="Risk/reward ratio")
    reasoning: List[str] = Field(default_factory=list, description="Signal reasoning points")


class FundamentalData(BaseModel):
    """Fundamental analysis data."""
    pe_ratio: float = Field(..., description="Price-to-Earnings ratio")
    pbv_ratio: float = Field(..., description="Price-to-Book Value ratio")
    roe: float = Field(..., description="Return on Equity (%)")
    der: float = Field(..., description="Debt-to-Equity Ratio")
    market_cap: str = Field(..., description="Market capitalization (e.g., '15.2T IDR')")
    dividend_yield: float = Field(..., description="Dividend yield (%)")


class InvestmentVerdict(BaseModel):
    """Investment recommendation verdict."""
    rating: str = Field(..., description="Buy, Hold, or Sell")
    suitability: dict = Field(
        ..., 
        description="Suitability scores for different investor types (growth, value, dividend)"
    )
    pros: List[str] = Field(default_factory=list, description="Investment pros")
    cons: List[str] = Field(default_factory=list, description="Investment cons")


class QualitativeAnalysis(BaseModel):
    """Qualitative fundamental analysis."""
    business_model: str = Field(..., description="Business model and revenue streams")
    management_quality: str = Field(..., description="Management and governance assessment")
    industry_prospects: str = Field(..., description="Industry trends and growth outlook")
    competitive_position: str = Field(..., description="Market position and competitive moat")


class QuantitativeAnalysis(BaseModel):
    """Quantitative fundamental analysis."""
    income_statement: dict = Field(..., description="Revenue, margins, profitability metrics")
    balance_sheet: dict = Field(..., description="Assets, liabilities, equity ratios")
    cash_flow: dict = Field(..., description="Operating CF, Free CF, cash ratios")


class AnalysisApproach(BaseModel):
    """Analysis methodology used."""
    methodology: str = Field(..., description="Top-Down or Bottom-Up")
    description: str = Field(..., description="Explanation of approach")
    key_factors: List[str] = Field(default_factory=list, description="Main factors considered")


class MarketAnalysis(BaseModel):
    """Complete market analysis response (Priority #1 endpoint)."""
    ticker: str
    name: str
    sector: str
    
    # Price Data
    price: RealTimePrice
    
    # Technical Analysis
    technicals: TechnicalIndicators
    
    # Trend Analysis
    trend: TrendAnalysis
    
    # Volume Analysis
    volume: VolumeAnalysis
    
    # Broker Summary
    broker_summary: BrokerSummary
    
    # Trading Signal
    signal: TradingSignal
    
    # Fundamental Analysis (Optional - for enhanced analysis)
    fundamentals: Optional[FundamentalData] = None
    verdict: Optional[InvestmentVerdict] = None
    qualitative: Optional[QualitativeAnalysis] = None
    quantitative: Optional[QuantitativeAnalysis] = None
    approach: Optional[AnalysisApproach] = None
    
    # Metadata
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    data_source: str = Field(default="mock", description="Data source: mock or live")


class VisualLevel(BaseModel):
    """Support/Resistance level for chart visualization."""
    price: str
    y_pos: float = Field(..., ge=0, le=1, description="Normalized Y position (0-1)")
    label: str


class ChartVisionAnalysis(BaseModel):
    """AI vision analysis of uploaded chart."""
    trend: str = Field(..., description="Identified trend")
    candlestick_patterns: List[str] = Field(default_factory=list)
    support_levels: List[VisualLevel] = Field(default_factory=list)
    resistance_levels: List[VisualLevel] = Field(default_factory=list)
    entry_suggestion: str
    stop_loss: str
    take_profit: str
    overall_strategy: str
    confidence: float = Field(..., ge=0, le=100)


class AIAnalysisResult(BaseModel):
    """Full AI analysis result."""
    ticker: str
    current_price: float
    signal: SignalType
    confidence: float
    summary: str
    reasoning: List[str]
    support_level: float
    resistance_level: float
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class PredictionResult(BaseModel):
    """Price/trend/volume prediction result."""
    ticker: str
    prediction_type: str = Field(..., description="price, trend, or volume")
    timeframe: str = Field(..., description="Prediction timeframe")
    current_value: float
    predicted_value: float
    confidence: float = Field(..., ge=0, le=100)
    direction: TrendDirection
    analysis: str
    generated_at: datetime = Field(default_factory=datetime.utcnow)
