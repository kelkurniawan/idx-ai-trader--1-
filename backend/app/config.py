"""
Application Configuration

Handles environment variables and application settings.
In development mode, AI calls are disabled and mock data is used.
"""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings

BACKEND_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Environment Mode
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    
    # AI Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_DEFAULT_MODEL: str = "gemini-2.0-flash"
    GEMINI_PRO_MODEL: str = "gemini-2.5-pro"
    
    # Database
    DATABASE_URL: str = "sqlite:///./idx_trader.db"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173"
    
    # Future: IDX API Configuration
    IDX_API_KEY: str = ""
    IDX_API_BASE_URL: str = ""
    
    # Fundamental Analysis Configuration
    USE_REAL_FUNDAMENTALS: bool = False
    FUNDAMENTAL_DATA_SOURCE: Literal["mock", "gemini", "idx_api"] = "mock"
    
    # ===========================
    # Authentication & Security
    # ===========================
    
    # JWT Configuration
    # REQUIRED in production — generate: python -c "import secrets; print(secrets.token_hex(32))"
    # App will crash immediately if this is missing from .env
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REMEMBER_ME_EXPIRE_DAYS: int = 30
    
    # reCAPTCHA v2 (Invisible)
    # Dev: Google's official test keys — always pass verification
    # Prod: Register at https://www.google.com/recaptcha/admin and replace with real keys
    RECAPTCHA_SECRET_KEY: str = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe"  # Google test secret
    RECAPTCHA_SITE_KEY: str = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"    # Google test site key
    RECAPTCHA_ENABLED: bool = True  # Set to False to skip reCAPTCHA entirely (debug)
    
    # Email / SMTP (for OTP delivery)
    # Dev: Leave empty — OTPs will be printed to console instead of emailed
    # Prod: Use SendGrid, Amazon SES, or any SMTP provider
    # Example for SendGrid: SMTP_HOST=smtp.sendgrid.net, SMTP_PORT=587, SMTP_USER=apikey, SMTP_PASSWORD=SG.xxx
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "noreply@idxtrader.dev"
    
    # OTP Configuration
    OTP_EXPIRE_MINUTES: int = 5   # How long an OTP code remains valid
    OTP_LENGTH: int = 6           # Number of digits in OTP
    
    # WhatsApp OTP (via Meta Graph API)
    # Dev: Leave empty — WhatsApp OTPs will be printed to console
    # Prod: Register at https://developers.facebook.com → WhatsApp Business API
    # WHATSAPP_PHONE_NUMBER_ID: Your WhatsApp Business phone number ID
    # WHATSAPP_ACCESS_TOKEN: Your permanent/long-lived access token from Meta
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_ACCESS_TOKEN: str = ""
    
    # Google OAuth (for "Continue with Google" login)
    # Dev: Leave empty — Google login will use mock mode (always accepts)
    # Prod: Create OAuth 2.0 Client ID at https://console.cloud.google.com/apis/credentials
    # Set the Client ID here and configure authorized redirect URIs in Google Console
    GOOGLE_OAUTH_CLIENT_ID: str = ""

    # Clerk Authentication
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_SECRET_KEY: str = ""
    CLERK_ISSUER: str = ""
    CLERK_JWKS_URL: str = ""
    
    # Profile picture uploads
    # Dev: Stored locally on disk
    # Prod: Consider migrating to cloud storage (S3, GCS, Azure Blob)
    UPLOAD_DIR: str = "./uploads/avatars"
    MAX_UPLOAD_SIZE_MB: int = 5
    
    # OTP Store Backend
    # Dev: "memory" — stores OTPs in a Python dict (single-server only)
    # Prod: "redis" — use Redis for distributed OTP storage
    OTP_STORE_BACKEND: Literal["memory", "redis"] = "memory"
    RATE_LIMIT_BACKEND: Literal["memory", "redis"] = "memory"
    # Redis Configuration (only used when OTP_STORE_BACKEND = "redis")
    # REDIS_URL: Full Redis connection URL
    # Example: redis://localhost:6379/0 or redis://:password@redis-host:6379/1
    REDIS_URL: str = "redis://localhost:6379/0"

    # Ops alerting
    OPS_ALERT_WEBHOOK_URL: str = ""
    OPS_ALERT_WEBHOOK_BEARER: str = ""

    # ===========================
    # MFA Encryption
    # ===========================
    # AES-256-CBC key for encrypting TOTP secrets at rest.
    # Generate: python -c "import secrets; print(secrets.token_hex(32))"
    # Leave empty in dev .env ("") — uses an insecure deterministic fallback.
    MFA_ENCRYPTION_KEY: str
    # Issuer name displayed in authenticator apps (e.g. "sahamgue")
    TOTP_ISSUER: str = "sahamgue"

    # ===========================
    # Twilio SMS (for SMS OTP MFA)
    # ===========================
    # Dev: Leave empty — SMS OTPs will be printed to console
    # Prod: Register at https://twilio.com and set the vars below
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""  # Your Twilio phone number, e.g. +12345678900

    # ===========================
    # Xendit Payment Gateway
    # ===========================
    # Dev: Leave empty — invoices will be mocked (no real Xendit calls)
    # Prod: Register at https://dashboard.xendit.co/ and set the vars below
    # XENDIT_SECRET_KEY: Your secret API key (test or live mode)

    # ===========================
    # MFA Encryption
    # ===========================
    # AES-256-CBC key for encrypting TOTP secrets at rest.
    # Generate: python -c "import secrets; print(secrets.token_hex(32))"
    # Leave empty in dev .env ("") — uses an insecure deterministic fallback.
    MFA_ENCRYPTION_KEY: str
    # Issuer name displayed in authenticator apps (e.g. "sahamgue")
    TOTP_ISSUER: str = "sahamgue"

    # ===========================
    # Twilio SMS (for SMS OTP MFA)
    # ===========================
    # Dev: Leave empty — SMS OTPs will be printed to console
    # Prod: Register at https://twilio.com and set the vars below
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""  # Your Twilio phone number, e.g. +12345678900

    # ===========================
    # Xendit Payment Gateway
    # ===========================
    # Dev: Leave empty — invoices will be mocked (no real Xendit calls)
    # Prod: Register at https://dashboard.xendit.co/ and set the vars below
    # XENDIT_SECRET_KEY: Your secret API key (test or live mode)
    # XENDIT_WEBHOOK_TOKEN: Verification token from Dashboard → Webhooks
    XENDIT_SECRET_KEY: str = ""
    XENDIT_WEBHOOK_TOKEN: str = ""
    XENDIT_ENVIRONMENT: str = "TEST"  # "TEST" or "LIVE"
    XENDIT_SUCCESS_URL: str = "http://localhost:5173/payment/success"
    XENDIT_FAILURE_URL: str = "http://localhost:5173/payment/failed"

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
        """Enable AI calls when API key exists (even in dev with free tier)."""
        return bool(self.GEMINI_API_KEY)
        
    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        
    @property
    def use_mock_google(self) -> bool:
        """Use mock Google OAuth when no client ID is configured."""
        return not bool(self.GOOGLE_OAUTH_CLIENT_ID)
        
    @property
    def use_mock_email(self) -> bool:
        """Print OTPs to console when no SMTP is configured."""
        return not bool(self.SMTP_HOST)
    
    @property
    def use_mock_whatsapp(self) -> bool:
        """Print WhatsApp OTPs to console when no WA API is configured."""
        return not bool(self.WHATSAPP_ACCESS_TOKEN)
    
    class Config:
        env_file = str(BACKEND_ENV_FILE)
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
