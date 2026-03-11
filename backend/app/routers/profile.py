"""
Profile Router

All /api/profile/* endpoints.
Auth guard: get_current_user from services.auth_service (existing dependency).
Response envelope: flat JSON matching existing API patterns.
"""

import hashlib
import random
import string
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..database import get_db
from ..models.user import User
from ..services.auth_service import get_current_user, verify_password
from ..services.profile_service import (
    get_plan_info,
    update_profile,
    delete_account,
    change_password,
    initiate_email_change,
    complete_email_change,
    update_theme,
    list_sessions,
    revoke_session,
    revoke_all_other_sessions,
)
from ..services.notification_service import get_or_create_prefs, update_prefs
from ..services.mfa_service import (
    generate_totp_secret,
    get_totp_provisioning_uri,
    verify_totp,
    encrypt_totp_secret,
    decrypt_totp_secret,
    generate_backup_codes,
    generate_otp,
    send_otp_email,
)
from ..services.otp_service import store_profile_otp, retrieve_profile_otp
from ..services.sms_service import send_otp_sms
from ..schemas.profile import (
    ProfileUpdateRequest,
    ProfileResponse,
    ChangePasswordRequest,
    ChangeEmailRequest,
    VerifyEmailOTPRequest,
    MFAStatusResponse,
    TOTPSetupResponse,
    TOTPVerifyRequest,
    TOTPVerifyResponse,
    RemoveTOTPRequest,
    SetupSMSOTPRequest,
    VerifyOTPRequest,
    NotificationPreferenceResponse,
    NotificationPreferenceUpdate,
    ThemeUpdateRequest,
    SessionResponse,
    PlanResponse,
    PlanFeaturesResponse,
    DeleteAccountRequest,
    MessageResponse,
)

settings = get_settings()
router = APIRouter()

# ────────────────────────────────────────────────────────────────
# Simple rate-limiting counter (per user_id, in-memory)
# Resets on process restart — suitable for lightweight protection.
# Swap for Redis-backed counter in production for multi-process deployments.
# ────────────────────────────────────────────────────────────────
from collections import defaultdict
import time as _time

_rate_counters: dict[str, list[float]] = defaultdict(list)
MFA_RATE_LIMIT = 5
MFA_RATE_WINDOW = 15 * 60  # 15 minutes


def _check_mfa_rate_limit(user_id: str) -> None:
    """Raise 429 if user has made ≥5 MFA verify attempts in the last 15 minutes."""
    now = _time.time()
    window_start = now - MFA_RATE_WINDOW
    attempts = _rate_counters[user_id]
    # Prune old entries
    _rate_counters[user_id] = [t for t in attempts if t > window_start]
    if len(_rate_counters[user_id]) >= MFA_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many MFA attempts. Please wait 15 minutes.",
        )
    _rate_counters[user_id].append(now)


def _current_token_hash(request: Request) -> str:
    """Hash the current access token to identify the active session."""
    from ..services.auth_service import ACCESS_TOKEN_COOKIE
    token = request.cookies.get(ACCESS_TOKEN_COOKIE, "")
    if not token:
        creds = request.headers.get("Authorization", "").replace("Bearer ", "")
        token = creds
    return hashlib.sha256(token.encode()).hexdigest()


def _user_to_profile_response(user: User) -> ProfileResponse:
    return ProfileResponse(
        id=user.id,
        email=user.email,
        display_name=user.name,
        avatar_url=user.profile_picture_url,
        phone=user.phone_number,
        bio=user.bio,
        plan=user.plan or "FREE",
        plan_expires_at=user.plan_expires_at,
        theme_preference=user.theme_preference or "dark",
        mfa_enabled=user.mfa_enabled,
        mfa_type=user.mfa_type,
        auth_provider=user.auth_provider,
        profile_complete=user.profile_complete,
        created_at=user.created_at,
    )


# ────────────────────────────────────────────────────────────────
# ACCOUNT
# ────────────────────────────────────────────────────────────────

@router.get("", response_model=ProfileResponse, summary="Get profile")
async def get_profile(user: User = Depends(get_current_user)) -> ProfileResponse:
    """Return full profile (excludes mfa_secret and password_hash)."""
    return _user_to_profile_response(user)


@router.put("", response_model=ProfileResponse, summary="Update profile")
async def update_profile_endpoint(
    data: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    """Update display_name, avatar_url, phone, and/or bio."""
    updated = await update_profile(user, data, db)
    return _user_to_profile_response(updated)


@router.delete("", response_model=MessageResponse, summary="Delete account (soft)")
async def delete_account_endpoint(
    data: DeleteAccountRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Soft-delete account. Requires current password for local auth accounts."""
    await delete_account(user, data.password, db)
    return MessageResponse(message="Account deleted successfully.", success=True)


# ────────────────────────────────────────────────────────────────
# PASSWORD
# ────────────────────────────────────────────────────────────────

@router.put("/password", response_model=MessageResponse, summary="Change password")
async def change_password_endpoint(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Change password. Revokes all other sessions on success."""
    await change_password(user, data.current_password, data.new_password, db)
    return MessageResponse(message="Password changed successfully. All other sessions have been revoked.", success=True)


# ────────────────────────────────────────────────────────────────
# EMAIL CHANGE (2-step)
# ────────────────────────────────────────────────────────────────

@router.post("/email/change", response_model=MessageResponse, summary="Initiate email change")
async def initiate_email_change_endpoint(
    data: ChangeEmailRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Step 1: verify password, send 6-digit OTP to new email address."""
    await initiate_email_change(user, str(data.new_email), data.current_password, db)
    return MessageResponse(
        message=f"Verification code sent to {data.new_email}. Enter it within 10 minutes.",
        success=True,
    )


@router.post("/email/verify", response_model=ProfileResponse, summary="Verify email change OTP")
async def verify_email_change_endpoint(
    data: VerifyEmailOTPRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    """Step 2: validate OTP and update email."""
    updated = await complete_email_change(user, data.otp, db)
    return _user_to_profile_response(updated)


# ────────────────────────────────────────────────────────────────
# MFA — Status
# ────────────────────────────────────────────────────────────────

@router.get("/mfa", response_model=MFAStatusResponse, summary="Get MFA status")
async def get_mfa_status(user: User = Depends(get_current_user)) -> MFAStatusResponse:
    """Return current MFA method and backup-code availability (not the codes)."""
    has_backup = bool(user.mfa_backup_codes)
    return MFAStatusResponse(
        mfa_enabled=user.mfa_enabled,
        mfa_type=user.mfa_type,
        backup_codes_available=has_backup,
    )


# ────────────────────────────────────────────────────────────────
# MFA — TOTP (Google Authenticator)
# ────────────────────────────────────────────────────────────────

@router.post("/mfa/totp/setup", response_model=TOTPSetupResponse, summary="Set up TOTP")
async def setup_totp(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TOTPSetupResponse:
    """
    Generate a new TOTP secret, store it encrypted, and return a QR-code data URL.
    The method is NOT active until /mfa/totp/verify is called.
    """
    import io
    import base64

    secret = generate_totp_secret()
    issuer = getattr(settings, "TOTP_ISSUER", "sahamgue")
    provisioning_uri = get_totp_provisioning_uri(secret, user.email)

    # Override issuer name in URI
    if "IDX AI Trader" in provisioning_uri:
        provisioning_uri = provisioning_uri.replace("IDX AI Trader", issuer)

    # Generate QR code PNG → base64 data URL
    try:
        import qrcode  # type: ignore[import]
        qr = qrcode.QRCode(box_size=6, border=2)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        qr_b64 = base64.b64encode(buf.getvalue()).decode()
        qr_data_url = f"data:image/png;base64,{qr_b64}"
    except ImportError:
        # qrcode not installed — return the raw URI
        qr_data_url = f"data:text/plain;base64,{base64.b64encode(provisioning_uri.encode()).decode()}"

    # Store encrypted secret temporarily (pending verification)
    user.mfa_secret = encrypt_totp_secret(secret)
    await db.commit()

    return TOTPSetupResponse(secret=secret, qr_code_data_url=qr_data_url)


@router.post("/mfa/totp/verify", response_model=TOTPVerifyResponse, summary="Verify & activate TOTP")
async def verify_totp_endpoint(
    data: TOTPVerifyRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TOTPVerifyResponse:
    """
    Verify the TOTP token.
    On success: mark TOTP active, generate 8 backup codes (shown ONCE).
    """
    _check_mfa_rate_limit(user.id)

    if not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No TOTP setup in progress. Call /mfa/totp/setup first.",
        )

    plain_secret = decrypt_totp_secret(user.mfa_secret)
    if not verify_totp(plain_secret, data.token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code. Try again.",
        )

    # Activate
    user.mfa_enabled = True
    user.mfa_type = "totp"

    # Generate backup codes — stored hashed, returned once
    plaintext_codes, hashed_json = generate_backup_codes()
    user.mfa_backup_codes = hashed_json

    await db.commit()

    return TOTPVerifyResponse(
        message="TOTP authenticator activated. Save these backup codes — they will not be shown again.",
        backup_codes=plaintext_codes,
    )


@router.delete("/mfa/totp", response_model=MessageResponse, summary="Remove TOTP")
async def remove_totp(
    data: RemoveTOTPRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Remove TOTP MFA. Requires current password."""
    if user.auth_provider == "local":
        if not user.password_hash or not verify_password(data.current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password.",
            )

    user.mfa_enabled = False
    user.mfa_type = None
    user.mfa_secret = None
    user.mfa_backup_codes = None
    await db.commit()

    return MessageResponse(message="TOTP authenticator removed.", success=True)


# ────────────────────────────────────────────────────────────────
# MFA — Email OTP
# ────────────────────────────────────────────────────────────────

@router.post("/mfa/email/setup", response_model=MessageResponse, summary="Set up email OTP MFA")
async def setup_email_otp(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Send a verification OTP to user's current email to enable email-OTP MFA."""
    code = generate_otp()
    store_profile_otp(user.id, "mfa_email", code)
    await send_otp_email(user.email, code)
    return MessageResponse(
        message=f"Verification code sent to {user.email}. Enter it to activate email OTP.",
        success=True,
    )


@router.post("/mfa/email/verify", response_model=MFAStatusResponse, summary="Verify email OTP MFA setup")
async def verify_email_otp_mfa(
    data: VerifyOTPRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MFAStatusResponse:
    """Verify email OTP and activate email-OTP MFA method."""
    _check_mfa_rate_limit(user.id)

    stored = retrieve_profile_otp(user.id, "mfa_email")
    if not stored or stored != data.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    user.mfa_enabled = True
    user.mfa_type = "email_otp"
    user.mfa_secret = None
    await db.commit()

    return MFAStatusResponse(
        mfa_enabled=True,
        mfa_type="email_otp",
        backup_codes_available=False,
    )


# ────────────────────────────────────────────────────────────────
# MFA — SMS OTP
# ────────────────────────────────────────────────────────────────

@router.post("/mfa/sms/setup", response_model=MessageResponse, summary="Set up SMS OTP MFA")
async def setup_sms_otp(
    data: SetupSMSOTPRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Send a verification OTP via SMS to enable SMS-OTP MFA."""
    phone = data.phone or user.phone_number
    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No phone number provided. Set your phone number in your profile first.",
        )

    # Update phone if a new one was provided
    if data.phone and data.phone != user.phone_number:
        user.phone_number = data.phone
        await db.commit()

    code = generate_otp()
    store_profile_otp(user.id, "mfa_sms", code)
    await send_otp_sms(phone, code)

    return MessageResponse(
        message=f"Verification code sent to {phone}. Enter it to activate SMS OTP.",
        success=True,
    )


@router.post("/mfa/sms/verify", response_model=MFAStatusResponse, summary="Verify SMS OTP MFA setup")
async def verify_sms_otp_mfa(
    data: VerifyOTPRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MFAStatusResponse:
    """Verify SMS OTP and activate SMS-OTP MFA method."""
    _check_mfa_rate_limit(user.id)

    stored = retrieve_profile_otp(user.id, "mfa_sms")
    if not stored or stored != data.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    user.mfa_enabled = True
    user.mfa_type = "whatsapp_otp"  # reuse existing type field value
    user.mfa_secret = None
    await db.commit()

    return MFAStatusResponse(
        mfa_enabled=True,
        mfa_type="whatsapp_otp",
        backup_codes_available=False,
    )


# ────────────────────────────────────────────────────────────────
# NOTIFICATIONS
# ────────────────────────────────────────────────────────────────

@router.get("/notifications", response_model=NotificationPreferenceResponse, summary="Get notification preferences")
async def get_notifications(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPreferenceResponse:
    prefs = await get_or_create_prefs(user, db)
    return NotificationPreferenceResponse.model_validate(prefs)


@router.put("/notifications", response_model=NotificationPreferenceResponse, summary="Update notification preferences")
async def update_notifications(
    data: NotificationPreferenceUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPreferenceResponse:
    prefs = await update_prefs(user, data, db)
    return NotificationPreferenceResponse.model_validate(prefs)


# ────────────────────────────────────────────────────────────────
# THEME
# ────────────────────────────────────────────────────────────────

@router.put("/theme", response_model=ProfileResponse, summary="Update theme preference")
async def update_theme_endpoint(
    data: ThemeUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ProfileResponse:
    updated = await update_theme(user, data.theme, db)
    return _user_to_profile_response(updated)


# ────────────────────────────────────────────────────────────────
# SESSIONS
# ────────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=List[SessionResponse], summary="List active sessions")
async def list_sessions_endpoint(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[SessionResponse]:
    sessions = await list_sessions(user.id, db)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.delete("/sessions/{session_id}", response_model=MessageResponse, summary="Revoke a session")
async def revoke_session_endpoint(
    session_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await revoke_session(session_id, user.id, db)
    return MessageResponse(message="Session revoked.", success=True)


@router.delete("/sessions", response_model=MessageResponse, summary="Revoke all other sessions")
async def revoke_all_sessions_endpoint(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    current_hash = _current_token_hash(request)
    await revoke_all_other_sessions(current_hash, user.id, db)
    return MessageResponse(message="All other sessions revoked.", success=True)


# ────────────────────────────────────────────────────────────────
# PLAN
# ────────────────────────────────────────────────────────────────

@router.get("/plan", response_model=PlanResponse, summary="Get current plan and features")
async def get_plan(user: User = Depends(get_current_user)) -> PlanResponse:
    info = get_plan_info(user)
    features = info["features"]
    return PlanResponse(
        plan=info["plan"],
        plan_expires_at=info["plan_expires_at"],
        features=PlanFeaturesResponse(
            news_ai=features["news_ai"],
            watchlist_limit=features["watchlist_limit"],
            alert_limit=features.get("alert_limit"),
        ),
    )
