import pytest

from backend.app.config import Settings
from backend.app.routers import ai
from backend.app.services.auth_service import get_current_user


def production_settings(**overrides):
    values = {
        "ENVIRONMENT": "production",
        "DEBUG": False,
        "DATABASE_URL": "postgresql+asyncpg://postgres:strong-password@postgres:5432/sahamgue",
        "JWT_SECRET_KEY": "a" * 64,
        "MFA_ENCRYPTION_KEY": "b" * 64,
        "CLERK_PUBLISHABLE_KEY": "pk_live_example",
        "CLERK_SECRET_KEY": "sk_live_example",
        "CLERK_ISSUER": "https://example.clerk.accounts.dev",
        "GOOGLE_OAUTH_CLIENT_ID": "google-client-id.apps.googleusercontent.com",
        "GEMINI_API_KEY": "gemini-live-key",
        "RECAPTCHA_SECRET_KEY": "recaptcha-live-secret",
        "RECAPTCHA_ENABLED": True,
        "OTP_STORE_BACKEND": "redis",
        "RATE_LIMIT_BACKEND": "redis",
        "REDIS_URL": "redis://redis:6379/0",
        "XENDIT_SECRET_KEY": "xnd_live_secret",
        "XENDIT_WEBHOOK_TOKEN": "xendit-live-webhook-token",
        "XENDIT_ENVIRONMENT": "LIVE",
        "XENDIT_SUCCESS_URL": "https://sahamgue.example/payment/success",
        "XENDIT_FAILURE_URL": "https://sahamgue.example/payment/failed",
        "CORS_ORIGINS": "https://sahamgue.example",
        "TRUSTED_HOSTS": "sahamgue.example",
    }
    values.update(overrides)
    return Settings(**values)


def test_production_config_accepts_launch_ready_values():
    production_settings().validate_production_ready()


@pytest.mark.parametrize(
    ("field", "value", "message"),
    [
        ("DATABASE_URL", "sqlite:///./idx_trader.db", "PostgreSQL"),
        ("CLERK_PUBLISHABLE_KEY", "pk_test_replace_me", "live Clerk"),
        ("RECAPTCHA_SECRET_KEY", "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe", "RECAPTCHA_SECRET_KEY"),
        ("OTP_STORE_BACKEND", "memory", "OTP_STORE_BACKEND"),
        ("RATE_LIMIT_BACKEND", "memory", "RATE_LIMIT_BACKEND"),
        ("XENDIT_ENVIRONMENT", "TEST", "XENDIT_ENVIRONMENT"),
        ("CORS_ORIGINS", "http://localhost:5173", "localhost"),
        ("TRUSTED_HOSTS", "localhost", "TRUSTED_HOSTS"),
    ],
)
def test_production_config_rejects_unsafe_values(field, value, message):
    settings = production_settings(**{field: value})
    with pytest.raises(RuntimeError, match=message):
        settings.validate_production_ready()


def test_ai_routes_require_current_user_dependency():
    protected_paths = {
        "/chart-vision",
        "/realtime-price/{ticker}",
        "/stock-news/{ticker}",
        "/analyze-stock",
    }

    routes_by_path = {
        route.path: route
        for route in ai.router.routes
        if getattr(route, "path", None) in protected_paths
    }

    assert set(routes_by_path) == protected_paths
    for route in routes_by_path.values():
        dependency_calls = {dependency.call for dependency in route.dependant.dependencies}
        assert get_current_user in dependency_calls
