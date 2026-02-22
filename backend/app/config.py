"""
Application Configuration

Handles environment variables and application settings.
In development mode, AI calls are disabled and mock data is used.
"""

from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment Mode
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    
    # AI Configuration
    GEMINI_API_KEY: str = ""
    
    # Database
    DATABASE_URL: str = "sqlite:///./idx_trader.db"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # Future: IDX API Configuration
    IDX_API_KEY: str = ""
    IDX_API_BASE_URL: str = ""
    
    # Fundamental Analysis Configuration
    USE_REAL_FUNDAMENTALS: bool = False
    FUNDAMENTAL_DATA_SOURCE: Literal["mock", "gemini", "idx_api"] = "mock"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT == "production"
    
    @property
    def use_mock_data(self) -> bool:
        """Use mock data in development and staging."""
        return self.ENVIRONMENT in ("development", "staging")
    
    @property
    def enable_ai_calls(self) -> bool:
        """Only enable AI calls in production to save credits."""
        return self.ENVIRONMENT == "production" and bool(self.GEMINI_API_KEY)
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
