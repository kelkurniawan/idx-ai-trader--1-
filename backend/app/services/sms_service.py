"""
SMS Service

Sends OTP codes via SMS using Twilio.
Falls back to console logging if Twilio env vars are not configured.
"""

from ..config import get_settings

settings = get_settings()


async def send_otp_sms(phone_number: str, code: str) -> bool:
    """
    Send an OTP via SMS.

    Dev mode (TWILIO_ACCOUNT_SID not set): prints to console.
    Prod mode: sends via Twilio REST API.
    """
    use_mock = not bool(settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN)

    if use_mock:
        print("\n" + "=" * 50)
        print("📱 SMS OTP (DEV MODE — Console Output)")
        print(f"   To: {phone_number}")
        print(f"   Code: {code}")
        print(f"   Expires in: 10 minutes")
        print("=" * 50 + "\n")
        return True

    # Production: Twilio REST API
    try:
        from twilio.rest import Client  # type: ignore[import]
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=f"Your sahamgue verification code is {code}. Valid for 10 minutes.",
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number,
        )
        return True
    except Exception as e:
        print(f"❌ Twilio SMS failed: {e}")
        # Console fallback in case of transient error
        print(f"   SMS Code for {phone_number}: {code}")
        return False
