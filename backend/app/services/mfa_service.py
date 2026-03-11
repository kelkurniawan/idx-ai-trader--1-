"""
Multi-Factor Authentication (MFA) Service

Handles TOTP (Google Authenticator) and OTP (Email / WhatsApp) generation & verification.

OTP Storage:
- Development: In-memory Python dict (single-server only)
- Production: Redis (set OTP_STORE_BACKEND=redis and REDIS_URL in .env)
"""

import os
import base64
import hashlib
import json
import random
import secrets
import string
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List

import bcrypt
import pyotp
import httpx

from ..config import get_settings

settings = get_settings()


# ===========================
# In-Memory OTP Store (Dev)
# ===========================

# Structure: { "user_id": { "code": "123456", "expires_at": datetime } }
_otp_memory_store: dict[str, dict] = {}


# ===========================
# Redis OTP Store (Prod)
# ===========================
# When OTP_STORE_BACKEND="redis", we use Redis for distributed OTP storage.
# Install redis-py: pip install redis
# Set REDIS_URL in your .env (e.g., redis://localhost:6379/0)

_redis_client = None

def _get_redis():
    """Lazy-initialize Redis client. Only called when OTP_STORE_BACKEND=redis."""
    global _redis_client
    if _redis_client is None:
        try:
            import redis
            _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
            print("✅ Redis connected for OTP storage")
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            print("   Falling back to in-memory OTP store")
            return None
    return _redis_client


# ===========================
# OTP Store Interface
# ===========================

def store_otp(user_id: str, code: str) -> None:
    """Store an OTP code with expiration."""
    expire_seconds = settings.OTP_EXPIRE_MINUTES * 60
    
    if settings.OTP_STORE_BACKEND == "redis":
        r = _get_redis()
        if r:
            key = f"otp:{user_id}"
            r.setex(key, expire_seconds, code)
            return
    
    # Fallback: in-memory store
    _otp_memory_store[user_id] = {
        "code": code,
        "expires_at": datetime.utcnow() + timedelta(seconds=expire_seconds),
    }


def retrieve_and_delete_otp(user_id: str) -> Optional[str]:
    """Retrieve and consume an OTP (one-time use). Returns None if expired or not found."""
    if settings.OTP_STORE_BACKEND == "redis":
        r = _get_redis()
        if r:
            key = f"otp:{user_id}"
            code = r.get(key)
            if code:
                r.delete(key)  # Consume the OTP
            return code
    
    # Fallback: in-memory store
    entry = _otp_memory_store.pop(user_id, None)
    if not entry:
        return None
    if datetime.utcnow() > entry["expires_at"]:
        return None
    return entry["code"]


# ===========================
# TOTP (Google Authenticator)
# ===========================

def generate_totp_secret() -> str:
    """Generate a new TOTP secret (base32 encoded)."""
    return pyotp.random_base32()


def get_totp_provisioning_uri(secret: str, email: str) -> str:
    """
    Generate the otpauth:// URI for QR code scanning.
    
    Users scan this QR code with Google Authenticator, Authy, etc.
    """
    totp = pyotp.TOTP(secret)
    return totp.provisioning_uri(name=email, issuer_name="IDX AI Trader")


def verify_totp(secret: str, code: str) -> bool:
    """
    Verify a TOTP code against the secret.
    
    Allows a window of ±1 time step (30 seconds) to account for clock drift.
    """
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


# ===========================
# OTP Generation
# ===========================

def generate_otp() -> str:
    """Generate a random numeric OTP code."""
    return "".join(random.choices(string.digits, k=settings.OTP_LENGTH))


# ===========================
# Email OTP Delivery
# ===========================

async def send_otp_email(email: str, code: str) -> bool:
    """
    Send OTP via email.
    
    Dev mode: Prints OTP to console (no SMTP needed).
    Prod mode: Sends via configured SMTP server.
    """
    if settings.use_mock_email:
        # === DEV MODE: Console Log ===
        print("\n" + "=" * 50)
        print("📧 EMAIL OTP (DEV MODE - Console Output)")
        print(f"   To: {email}")
        print(f"   Code: {code}")
        print(f"   Expires in: {settings.OTP_EXPIRE_MINUTES} minutes")
        print("=" * 50 + "\n")
        return True
    
    # === PROD MODE: Real SMTP ===
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Your IDX AI Trader Login Code: {code}"
        msg["From"] = settings.SMTP_FROM
        msg["To"] = email
        
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #10b981;">IDX AI Trader</h2>
            <p>Your login verification code is:</p>
            <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e293b;">{code}</span>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">
                This code expires in {settings.OTP_EXPIRE_MINUTES} minutes. 
                Do not share this code with anyone.
            </p>
        </div>
        """
        msg.attach(MIMEText(html_body, "html"))
        
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        
        return True
    except Exception as e:
        print(f"❌ Email send failed: {e}")
        return False


# ===========================
# WhatsApp OTP Delivery
# ===========================

async def send_otp_whatsapp(phone_number: str, code: str) -> bool:
    """
    Send OTP via WhatsApp.
    
    Dev mode: Prints OTP to console (no WhatsApp API needed).
    Prod mode: Sends via Meta Graph API (WhatsApp Business).
    
    Production Setup:
    1. Register at https://developers.facebook.com
    2. Create a WhatsApp Business app
    3. Get a permanent access token
    4. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env
    5. Create a message template for OTP codes in Meta Business Suite
    """
    if settings.use_mock_whatsapp:
        # === DEV MODE: Console Log ===
        print("\n" + "=" * 50)
        print("📱 WHATSAPP OTP (DEV MODE - Console Output)")
        print(f"   To: {phone_number}")
        print(f"   Code: {code}")
        print(f"   Expires in: {settings.OTP_EXPIRE_MINUTES} minutes")
        print("=" * 50 + "\n")
        return True
    
    # === PROD MODE: Meta Graph API ===
    # Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
    try:
        url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {settings.WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": phone_number,
            "type": "template",
            "template": {
                "name": "otp_verification",  # Must be pre-approved in Meta Business Suite
                "language": {"code": "id"},   # Indonesian locale
                "components": [
                    {
                        "type": "body",
                        "parameters": [
                            {"type": "text", "text": code}
                        ]
                    }
                ]
            }
        }
        
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
        
        return True
    except Exception as e:
        print(f"❌ WhatsApp send failed: {e}")
        return False


# ===========================
# AES-256-CBC Secret Encryption
# ===========================
# TOTP secrets are encrypted at rest using AES-256-CBC.
# Key comes from MFA_ENCRYPTION_KEY env var (32-byte hex string).

def _get_encryption_key() -> bytes:
    """Return 32-byte AES key from env. Raises if not set in production."""
    raw = getattr(settings, "MFA_ENCRYPTION_KEY", "")
    if raw:
        key_bytes = bytes.fromhex(raw)
        if len(key_bytes) == 32:
            return key_bytes
    # Dev fallback — deterministic but NOT secure
    if settings.is_development:
        return hashlib.sha256(b"dev-insecure-key-CHANGE-IN-PROD").digest()
    raise RuntimeError("MFA_ENCRYPTION_KEY must be a 32-byte hex string in production")


def encrypt_totp_secret(plaintext: str) -> str:
    """Encrypt a TOTP secret using AES-256-CBC. Returns base64-encoded ciphertext."""
    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import padding
    except ImportError:
        # cryptography not installed — store plain (dev only)
        print("⚠️  cryptography library not installed; storing TOTP secret unencrypted (dev mode)")
        return plaintext

    key = _get_encryption_key()
    iv = os.urandom(16)
    padder = padding.PKCS7(128).padder()
    padded = padder.update(plaintext.encode()) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(padded) + encryptor.finalize()

    # Encode as "iv:ciphertext" in base64
    payload = base64.b64encode(iv + ciphertext).decode()
    return f"enc:{payload}"


def decrypt_totp_secret(stored: str) -> str:
    """Decrypt an AES-256-CBC encrypted TOTP secret. Returns plaintext."""
    if not stored.startswith("enc:"):
        # Legacy plain-text secret (or dev mode without cryptography)
        return stored

    try:
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import padding
    except ImportError:
        return stored.removeprefix("enc:")

    key = _get_encryption_key()
    raw = base64.b64decode(stored[4:])
    iv, ciphertext = raw[:16], raw[16:]

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded = decryptor.update(ciphertext) + decryptor.finalize()

    unpadder = padding.PKCS7(128).unpadder()
    return (unpadder.update(padded) + unpadder.finalize()).decode()


# ===========================
# Backup Codes
# ===========================

BACKUP_CODE_COUNT = 8
BACKUP_CODE_LENGTH = 8


def generate_backup_codes() -> tuple[List[str], str]:
    """
    Generate 8 one-time backup codes.

    Returns:
        (plaintext_codes, json_of_bcrypt_hashes)
        — plaintext codes are shown ONCE to the user and never stored raw.
    """
    plaintext_codes: List[str] = []
    hashed_codes: List[str] = []

    for _ in range(BACKUP_CODE_COUNT):
        code = secrets.token_urlsafe(BACKUP_CODE_LENGTH)[:BACKUP_CODE_LENGTH].upper()
        plaintext_codes.append(code)
        hashed = bcrypt.hashpw(code.encode(), bcrypt.gensalt()).decode()
        hashed_codes.append(hashed)

    return plaintext_codes, json.dumps(hashed_codes)


def verify_backup_code(user_backup_codes_json: Optional[str], input_code: str) -> Optional[str]:
    """
    Check if inputCode matches any hashed backup code.

    Returns the updated JSON (with used code removed) on success, None on failure.
    """
    if not user_backup_codes_json:
        return None

    try:
        hashed_codes: List[str] = json.loads(user_backup_codes_json)
    except (json.JSONDecodeError, TypeError):
        return None

    remaining = []
    matched = False
    for hc in hashed_codes:
        if not matched and bcrypt.checkpw(input_code.upper().encode(), hc.encode()):
            matched = True  # consume this code
        else:
            remaining.append(hc)

    if not matched:
        return None

    return json.dumps(remaining)
