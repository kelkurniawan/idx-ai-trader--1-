"""
Analysis Cache Models

Store cached analysis results to reduce API calls.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON

from ..database import Base


class AnalysisCache(Base):
    """Cached AI analysis results."""
    __tablename__ = "analysis_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(10), index=True, nullable=False)
    analysis_type = Column(String(50), nullable=False)  # 'full', 'technicals', 'signals'
    
    # Cached data (JSON)
    data = Column(JSON)
    
    # Signal summary
    signal = Column(String(20))  # STRONG_BUY, BUY, NEUTRAL, SELL, STRONG_SELL
    confidence = Column(Float)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
    
    def is_expired(self) -> bool:
        """Check if cache is expired."""
        if not self.expires_at:
            return True
        return datetime.utcnow() > self.expires_at
