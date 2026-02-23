"""
reCAPTCHA Verification Service

Validates reCAPTCHA v2 tokens to prevent bot abuse on login/registration.

Dev mode:  Uses Google's official test keys — always passes.
Prod mode: Validates against Google's reCAPTCHA API with real keys.

Setup for Production:
1. Go to https://www.google.com/recaptcha/admin
2. Register your domain for reCAPTCHA v2 (checkbox or invisible)
3. Copy the Site Key (frontend) and Secret Key (backend)
4. Set RECAPTCHA_SECRET_KEY and RECAPTCHA_SITE_KEY in your .env
"""

import httpx

from ..config import get_settings

settings = get_settings()

# Google reCAPTCHA verification endpoint
RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"


async def verify_recaptcha(token: str) -> bool:
    """
    Verify a reCAPTCHA response token.
    
    Args:
        token: The g-recaptcha-response token from the frontend
    
    Returns:
        True if verification passes, False otherwise
    
    Behavior:
        - If RECAPTCHA_ENABLED is False, always returns True (disabled)
        - If using Google's test secret key, always returns True (dev mode)
        - Otherwise, validates with Google's API (production)
    """
    # Skip if reCAPTCHA is disabled entirely
    if not settings.RECAPTCHA_ENABLED:
        return True
    
    # Skip if no token provided and we're in dev mode
    if not token and settings.is_development:
        return True
    
    # Empty token in production is a failure
    if not token:
        return False
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                RECAPTCHA_VERIFY_URL,
                data={
                    "secret": settings.RECAPTCHA_SECRET_KEY,
                    "response": token,
                },
                timeout=5.0,
            )
            result = response.json()
            
            success = result.get("success", False)
            
            if not success and settings.is_development:
                # Log validation errors in dev for debugging
                errors = result.get("error-codes", [])
                print(f"⚠️  reCAPTCHA validation failed (dev): {errors}")
            
            return success
            
    except Exception as e:
        # In development, don't block on reCAPTCHA failures
        if settings.is_development:
            print(f"⚠️  reCAPTCHA verification error (dev, allowing): {e}")
            return True
        
        print(f"❌ reCAPTCHA verification error: {e}")
        return False
