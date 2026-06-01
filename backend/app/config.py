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
    PUBLIC_APP_URL: str = "http://localhost:5173"
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:5173"
    TRUSTED_HOSTS: str = "localhost,127.0.0.1,0.0.0.0"
    STRICT_ORIGIN_CHECK: bool = True
    GLOBAL_API_RATE_LIMIT_PER_MINUTE: int = 300
    
    # Future: IDX API Configuration
    IDX_API_KEY: str = ""
    IDX_API_BASE_URL: str = ""
    
    # Fundamental Analysis Configuration
    USE_REAL_FUNDAMENTALS: bool = False
    FUNDAMENTAL_DATA_SOURCE: Literal["mock", "gemini", "idx_api"] = "mock"

    # Real Data Pipeline
    USE_REAL_PRICES: bool = False          # When True, read prices from DB/Yahoo instead of mock
    INTERNAL_API_SECRET: str = ""          # Shared secret guarding internal trigger endpoints

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
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30
    
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
    # XENDIT_WEBHOOK_TOKEN: Verification token from Dashboard → Webhooks
    XENDIT_SECRET_KEY: str = ""
    XENDIT_WEBHOOK_TOKEN: str = ""
    XENDIT_ENVIRONMENT: str = "TEST"  # "TEST" or "LIVE"
    XENDIT_SUCCESS_URL: str = "http://localhost:5173/payment/success"
    XENDIT_FAILURE_URL: str = "http://localhost:5173/payment/failed"

    def validate_production_ready(self) -> None:
        """Fail fast when production is configured with unsafe defaults."""
        if not self.is_production:
            return

        errors: list[str] = []

        def missing_or_placeholder(value: str, *extra_placeholders: str) -> bool:
            normalized = (value or "").strip().lower()
            placeholders = {
                "",
                "change-me",
                "change_me",
                "replace_me",
                "replace-with-real-value",
                "replace_with_live_secret",
                "replace_with_live_site_key",
                "replace_with_live_google_client_id",
                "replace_with_live_gemini_key",
                "replace_with_live_xendit_secret",
                "replace_with_live_webhook_token",
                "replace_with_64_hex_chars",
                *[item.lower() for item in extra_placeholders],
            }
            return (
                normalized in placeholders
                or normalized.startswith("replace_")
                or normalized.startswith("replace-with")
                or "your-domain" in normalized
            )

        def require(name: str, value: str, *extra_placeholders: str) -> None:
            if missing_or_placeholder(value, *extra_placeholders):
                errors.append(f"{name} must be set to a real production value.")

        require("JWT_SECRET_KEY", self.JWT_SECRET_KEY)
        require("MFA_ENCRYPTION_KEY", self.MFA_ENCRYPTION_KEY)
        if len(self.JWT_SECRET_KEY.strip()) < 32:
            errors.append("JWT_SECRET_KEY must be at least 32 characters.")
        if len(self.MFA_ENCRYPTION_KEY.strip()) != 64:
            errors.append("MFA_ENCRYPTION_KEY must be a 64-character hex string.")

        if not self.DATABASE_URL.startswith(("postgresql://", "postgresql+asyncpg://")):
            errors.append("DATABASE_URL must use PostgreSQL in production.")
        if self.DEBUG:
            errors.append("DEBUG must be false in production.")
        require("PUBLIC_APP_URL", self.PUBLIC_APP_URL)

        require("CLERK_PUBLISHABLE_KEY", self.CLERK_PUBLISHABLE_KEY)
        require("CLERK_SECRET_KEY", self.CLERK_SECRET_KEY)
        if not self.CLERK_PUBLISHABLE_KEY.startswith("pk_live_"):
            errors.append("CLERK_PUBLISHABLE_KEY must be a live Clerk publishable key.")
        if not self.CLERK_SECRET_KEY.startswith("sk_live_"):
            errors.append("CLERK_SECRET_KEY must be a live Clerk secret key.")
        if not self.CLERK_ISSUER and not self.CLERK_JWKS_URL:
            errors.append("CLERK_ISSUER or CLERK_JWKS_URL must be configured.")

        require("GOOGLE_OAUTH_CLIENT_ID", self.GOOGLE_OAUTH_CLIENT_ID)
        require("GEMINI_API_KEY", self.GEMINI_API_KEY)
        require("RECAPTCHA_SECRET_KEY", self.RECAPTCHA_SECRET_KEY, "6leixactaaaaagg-vfi1tnrwxmznfuojj4wifjwe")
        if not self.RECAPTCHA_ENABLED:
            errors.append("RECAPTCHA_ENABLED must be true in production.")

        if self.OTP_STORE_BACKEND != "redis":
            errors.append("OTP_STORE_BACKEND must be redis in production.")
        if self.RATE_LIMIT_BACKEND != "redis":
            errors.append("RATE_LIMIT_BACKEND must be redis in production.")
        require("REDIS_URL", self.REDIS_URL)

        require("XENDIT_SECRET_KEY", self.XENDIT_SECRET_KEY)
        require("XENDIT_WEBHOOK_TOKEN", self.XENDIT_WEBHOOK_TOKEN)
        if self.XENDIT_ENVIRONMENT.upper() != "LIVE":
            errors.append("XENDIT_ENVIRONMENT must be LIVE in production.")
        require("XENDIT_SUCCESS_URL", self.XENDIT_SUCCESS_URL)
        require("XENDIT_FAILURE_URL", self.XENDIT_FAILURE_URL)

        cors_origins = self.cors_origins_list
        if "*" in cors_origins:
            errors.append("CORS_ORIGINS must not include '*' in production.")
        if any("localhost" in origin or "127.0.0.1" in origin for origin in cors_origins):
            errors.append("CORS_ORIGINS must not include localhost in production.")
        if not self.trusted_hosts_list:
            errors.append("TRUSTED_HOSTS must list your production API host.")
        if any(host in {"*", "localhost", "127.0.0.1", "0.0.0.0"} for host in self.trusted_hosts_list):
            errors.append("TRUSTED_HOSTS must not include wildcard or localhost hosts in production.")
        if self.GLOBAL_API_RATE_LIMIT_PER_MINUTE < 60:
            errors.append("GLOBAL_API_RATE_LIMIT_PER_MINUTE should be at least 60 for production users.")
        if self.PASSWORD_RESET_EXPIRE_MINUTES < 10 or self.PASSWORD_RESET_EXPIRE_MINUTES > 60:
            errors.append("PASSWORD_RESET_EXPIRE_MINUTES must be between 10 and 60 in production.")

        if errors:
            formatted = "\n - ".join(errors)
            raise RuntimeError(f"Production configuration is not launch-ready:\n - {formatted}")

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
    def trusted_hosts_list(self) -> list[str]:
        """Parse trusted hosts into a list for Host header validation."""
        return [host.strip() for host in self.TRUSTED_HOSTS.split(",") if host.strip()]
        
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
    settings = Settings()
    settings.validate_production_ready()
    return settings
