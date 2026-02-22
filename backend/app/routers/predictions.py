"""
Predictions Router

Endpoints for AI-powered predictions.
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException

from ..schemas.stock import TrendDirection
from ..schemas.analysis import PredictionResult
from ..services.market_data import market_data_service
from ..services.technicals import technical_service
from ..services.ai_analysis import ai_analysis_service
from ..config import get_settings

router = APIRouter()
settings = get_settings()


@router.get("/{ticker}/price", response_model=PredictionResult)
async def predict_price(ticker: str, timeframe: str = "1W"):
    """
    Predict future price target.
    
    - **ticker**: Stock ticker
    - **timeframe**: Prediction timeframe (1D, 1W, 1M)
    """
    ticker = ticker.upper()
    
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    # Get current data
    realtime = market_data_service.get_realtime_price(ticker)
    history = market_data_service.generate_mock_history(ticker, days=200)
    prices = [d.price for d in history]
    
    current_price = realtime.current if realtime else prices[-1]
    technicals = technical_service.calculate_all(prices)
    
    # Predict based on trend
    trend_score = 0
    if technicals.trend_short == TrendDirection.BULLISH:
        trend_score += 1
    elif technicals.trend_short == TrendDirection.BEARISH:
        trend_score -= 1
    
    if technicals.trend_medium == TrendDirection.BULLISH:
        trend_score += 1.5
    elif technicals.trend_medium == TrendDirection.BEARISH:
        trend_score -= 1.5
    
    # Calculate predicted price
    timeframe_multiplier = {"1D": 0.5, "1W": 1, "1M": 2}.get(timeframe, 1)
    change_percent = trend_score * 0.02 * timeframe_multiplier
    predicted_price = current_price * (1 + change_percent)
    
    # Determine direction
    if predicted_price > current_price * 1.01:
        direction = TrendDirection.BULLISH
    elif predicted_price < current_price * 0.99:
        direction = TrendDirection.BEARISH
    else:
        direction = TrendDirection.NEUTRAL
    
    # Calculate confidence
    confidence = 50 + abs(trend_score) * 10
    confidence = min(confidence, 80)  # Cap at 80% for predictions
    
    return PredictionResult(
        ticker=ticker,
        prediction_type="price",
        timeframe=timeframe,
        current_value=current_price,
        predicted_value=round(predicted_price, 2),
        confidence=confidence,
        direction=direction,
        analysis=f"Based on technical analysis, {ticker} is expected to {'rise' if direction == TrendDirection.BULLISH else 'fall' if direction == TrendDirection.BEARISH else 'stay flat'} over the next {timeframe}.",
        generated_at=datetime.now(),
    )


@router.get("/{ticker}/trend", response_model=PredictionResult)
async def predict_trend(ticker: str, timeframe: str = "1W"):
    """
    Predict future trend direction.
    
    - **ticker**: Stock ticker
    - **timeframe**: Prediction timeframe (1D, 1W, 1M)
    """
    ticker = ticker.upper()
    
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    history = market_data_service.generate_mock_history(ticker, days=200)
    prices = [d.price for d in history]
    
    technicals = technical_service.calculate_all(prices)
    trend_analysis = technical_service.analyze_trend(prices)
    
    # Predict future trend
    if trend_analysis.strength > 70:
        predicted_trend = trend_analysis.short_term
        confidence = 75
    elif trend_analysis.strength > 50:
        predicted_trend = trend_analysis.medium_term
        confidence = 60
    else:
        predicted_trend = TrendDirection.NEUTRAL
        confidence = 45
    
    return PredictionResult(
        ticker=ticker,
        prediction_type="trend",
        timeframe=timeframe,
        current_value=trend_analysis.strength,
        predicted_value=trend_analysis.strength * 1.1 if predicted_trend == TrendDirection.BULLISH else trend_analysis.strength * 0.9,
        confidence=confidence,
        direction=predicted_trend,
        analysis=f"Trend prediction for {ticker}: {predicted_trend.value} with {confidence}% confidence. {trend_analysis.description}",
        generated_at=datetime.now(),
    )


@router.get("/{ticker}/volume", response_model=PredictionResult)
async def predict_volume(ticker: str, timeframe: str = "1D"):
    """
    Predict future volume activity.
    
    - **ticker**: Stock ticker
    - **timeframe**: Prediction timeframe (1D, 1W)
    """
    ticker = ticker.upper()
    
    profile = market_data_service.get_stock_profile(ticker)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    realtime = market_data_service.get_realtime_price(ticker)
    history = market_data_service.generate_mock_history(ticker, days=30)
    volumes = [d.volume for d in history]
    
    current_volume = realtime.volume if realtime else volumes[-1]
    avg_volume = sum(volumes[-20:]) / 20 if len(volumes) >= 20 else sum(volumes) / len(volumes)
    
    # Predict based on recent volume trend
    recent_avg = sum(volumes[-5:]) / 5 if len(volumes) >= 5 else avg_volume
    volume_trend = (recent_avg - avg_volume) / avg_volume
    
    predicted_volume = avg_volume * (1 + volume_trend * 0.5)
    
    if predicted_volume > avg_volume * 1.3:
        direction = TrendDirection.BULLISH  # High volume expected
        analysis = "Higher than average volume expected, indicating increased market interest."
    elif predicted_volume < avg_volume * 0.7:
        direction = TrendDirection.BEARISH  # Low volume expected
        analysis = "Lower than average volume expected, indicating reduced trading activity."
    else:
        direction = TrendDirection.NEUTRAL
        analysis = "Normal volume levels expected."
    
    return PredictionResult(
        ticker=ticker,
        prediction_type="volume",
        timeframe=timeframe,
        current_value=current_volume,
        predicted_value=round(predicted_volume, 0),
        confidence=55,  # Volume predictions are less certain
        direction=direction,
        analysis=analysis,
        generated_at=datetime.now(),
    )
