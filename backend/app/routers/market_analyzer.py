"""
Market Analyzer Router

Priority #1: Complete market analysis endpoints.
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
import base64

from ..schemas.stock import TechnicalIndicators, RealTimePrice, TimeFrame
from ..schemas.analysis import (
    MarketAnalysis,
    TrendAnalysis,
    VolumeAnalysis,
    BrokerSummary,
    TradingSignal,
    ChartVisionAnalysis,
)
from ..services.market_data import market_data_service
from ..services.technicals import technical_service
from ..services.broker_summary import broker_summary_service
from ..services.ai_analysis import ai_analysis_service
from ..services.signals import signal_generator_service
from ..services.fundamental_service import (
    generate_mock_fundamentals, 
    generate_investment_verdict,
    generate_qualitative_analysis,
    generate_quantitative_analysis,
    generate_analysis_approach,
    fetch_real_fundamentals_with_ai
)
from ..config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/{ticker}", response_model=MarketAnalysis)
async def get_complete_analysis(ticker: str):
    """
    **Complete Market Analysis** (Priority #1)
    
    Returns comprehensive analysis including:
    - Current price & change
    - Technical indicators (RSI, MACD, Bollinger, etc.)
    - Trend analysis (short/medium/long term)
    - Volume analysis
    - Broker summary & foreign flow
    - Trading signal with confidence
    
    This is the main endpoint for the Market Analyzer tab.
    """
    ticker = ticker.upper()
    
    # Get stock profile
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    # Get price data
    realtime = market_data_service.get_realtime_price(ticker)
    history = market_data_service.generate_mock_history(ticker, days=200)
    prices = [d.price for d in history]
    volumes = [d.volume for d in history]
    
    # Calculate technicals
    technicals = technical_service.calculate_all(prices)
    
    # Get trend analysis
    trend = technical_service.analyze_trend(prices)
    
    # Get volume analysis
    current_volume = realtime.volume if realtime else volumes[-1]
    avg_volume = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else sum(volumes) / len(volumes)
    volume_analysis = signal_generator_service.analyze_volume(current_volume, avg_volume)
    
    # Get broker summary
    broker_summary = broker_summary_service.get_broker_summary(ticker, realtime.current if realtime else prices[-1])
    
    # Get AI analysis
    ai_result = await ai_analysis_service.analyze_stock(ticker, realtime.current if realtime else prices[-1], technicals)
    
    # Generate trading signal
    signal = signal_generator_service.generate_signal(
        current_price=realtime.current if realtime else prices[-1],
        technicals=technicals,
        broker_summary=broker_summary,
        volume_analysis=volume_analysis,
        ai_result=ai_result,
    )
    
    # Generate fundamental analysis (if enabled)
    # Generate fundamental analysis
    fundamentals = None
    verdict = None
    qualitative = None
    quantitative = None
    approach = None

    if settings.USE_REAL_FUNDAMENTALS:
        # Try to fetch real data with AI
        ai_fundamentals = await fetch_real_fundamentals_with_ai(ticker)
        if ai_fundamentals:
            fundamentals = ai_fundamentals["fundamentals"]
            qualitative = ai_fundamentals["qualitative"]
            quantitative = ai_fundamentals["quantitative"]
            approach = ai_fundamentals["approach"]
    
    # Fallback to mock data if real data disabled or failed
    if not fundamentals:
        # Use mock data for development/staging
        fundamentals = generate_mock_fundamentals(ticker, profile.sector)
        qualitative = generate_qualitative_analysis(ticker, profile.sector)
        quantitative = generate_quantitative_analysis(ticker, fundamentals, profile.sector)
        approach = generate_analysis_approach(ticker, profile.sector)

    # Generate verdict based on available data
    verdict = generate_investment_verdict(
        ticker=ticker,
        fundamentals=fundamentals,
        signal=signal.action,
        confidence=signal.confidence,
        sector=profile.sector
    )
    
    return MarketAnalysis(
        ticker=ticker,
        name=profile.name,
        sector=profile.sector,
        price=realtime,
        technicals=technicals,
        trend=trend,
        volume=volume_analysis,
        broker_summary=broker_summary,
        signal=signal,
        fundamentals=fundamentals,
        verdict=verdict,
        qualitative=qualitative,
        quantitative=quantitative,
        approach=approach,
        last_updated=datetime.now(),
        data_source="mock" if settings.use_mock_data else "live",
    )


@router.get("/{ticker}/technicals", response_model=TechnicalIndicators)
async def get_technicals(ticker: str):
    """
    Get technical indicators only.
    
    Returns: RSI, MACD, EMA, SMA, Bollinger Bands, Support/Resistance, Trends
    """
    ticker = ticker.upper()
    
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    history = market_data_service.generate_mock_history(ticker, days=200)
    prices = [d.price for d in history]
    
    return technical_service.calculate_all(prices)


@router.get("/{ticker}/trend", response_model=TrendAnalysis)
async def get_trend_analysis(ticker: str):
    """
    Get trend analysis for a stock.
    
    Returns short, medium, and long-term trend directions with strength.
    """
    ticker = ticker.upper()
    
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    history = market_data_service.generate_mock_history(ticker, days=200)
    prices = [d.price for d in history]
    
    return technical_service.analyze_trend(prices)


@router.get("/{ticker}/volume", response_model=VolumeAnalysis)
async def get_volume_analysis(ticker: str):
    """
    Get volume analysis for a stock.
    
    Returns current volume, average, ratio, trend, and unusual activity detection.
    """
    ticker = ticker.upper()
    
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    realtime = market_data_service.get_realtime_price(ticker)
    history = market_data_service.generate_mock_history(ticker, days=30)
    volumes = [d.volume for d in history]
    
    current = realtime.volume if realtime else volumes[-1]
    average = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else sum(volumes) / len(volumes)
    
    return signal_generator_service.analyze_volume(current, average)


@router.get("/{ticker}/broker-summary", response_model=BrokerSummary)
async def get_broker_summary(ticker: str):
    """
    Get broker summary for a stock.
    
    Returns top buyers, top sellers, foreign flow, and smart money indicators.
    """
    ticker = ticker.upper()
    
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    realtime = market_data_service.get_realtime_price(ticker)
    return broker_summary_service.get_broker_summary(ticker, realtime.current if realtime else 1000)


@router.get("/{ticker}/signals", response_model=TradingSignal)
async def get_trading_signals(ticker: str):
    """
    Get trading signals for a stock.
    
    Returns action (BUY/SELL/HOLD), confidence, entry/exit points, and reasoning.
    """
    ticker = ticker.upper()
    
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    # Get all data
    realtime = market_data_service.get_realtime_price(ticker)
    history = market_data_service.generate_mock_history(ticker, days=200)
    prices = [d.price for d in history]
    volumes = [d.volume for d in history]
    
    current_price = realtime.current if realtime else prices[-1]
    
    # Calculate everything
    technicals = technical_service.calculate_all(prices)
    broker_summary = broker_summary_service.get_broker_summary(ticker, current_price)
    
    avg_volume = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else sum(volumes) / len(volumes)
    volume_analysis = signal_generator_service.analyze_volume(realtime.volume if realtime else volumes[-1], avg_volume)
    
    ai_result = await ai_analysis_service.analyze_stock(ticker, current_price, technicals)
    
    return signal_generator_service.generate_signal(
        current_price=current_price,
        technicals=technicals,
        broker_summary=broker_summary,
        volume_analysis=volume_analysis,
        ai_result=ai_result,
    )


@router.post("/chart", response_model=ChartVisionAnalysis)
async def analyze_chart(
    file: UploadFile = File(..., description="Chart image file"),
    trading_type: str = Form("SWING", description="SWING or SCALP"),
):
    """
    Analyze uploaded chart image using AI vision.
    
    Upload a stock chart image to get:
    - Trend identification
    - Candlestick patterns
    - Support/Resistance levels
    - Entry/Exit suggestions
    
    **Note**: In development mode, returns mock analysis.
    """
    # Read and encode image
    content = await file.read()
    base64_image = base64.b64encode(content).decode('utf-8')
    
    # Validate trading type
    if trading_type.upper() not in ["SWING", "SCALP"]:
        trading_type = "SWING"
    
    return await ai_analysis_service.analyze_chart_image(base64_image, trading_type.upper())
