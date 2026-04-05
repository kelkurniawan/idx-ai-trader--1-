"""
Authentication Router

All auth endpoints: register, login, Google OAuth, MFA setup/verify, profile, logout.
All session tokens are managed via HTTP-only cookies (no localStorage for tokens).
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..config import get_settings
from ..database import get_db
from ..models.user import User
from ..schemas.auth import (
    RegisterRequest, LoginRequest, GoogleAuthRequest,
    MfaVerifyRequest, MfaSetupRequest, MfaDisableRequest,
    ProfileUpdateRequest,
    AuthResponse, UserResponse, MfaSetupResponse, MessageResponse,
)
from ..services.auth_service import (
    hash_password, verify_password,
    create_access_token, create_temp_mfa_token, decode_token,
    set_access_token_cookie, set_remember_me_cookie, clear_auth_cookies,
    create_remember_me_token, revoke_remember_me_tokens,
    get_current_user,
)
from ..services.mfa_service import (
    generate_totp_secret, get_totp_provisioning_uri, verify_totp,
    generate_otp, store_otp, retrieve_and_delete_otp,
    send_otp_email, send_otp_whatsapp,
)
from ..services.recaptcha_service import verify_recaptcha

settings = get_settings()
router = APIRouter()


def _user_to_response(user: User) -> UserResponse:
    """Convert User ORM model to response schema."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar=user.profile_picture_url,
        phone_number=user.phone_number,
        mfa_enabled=user.mfa_enabled,
        mfa_type=user.mfa_type,
        profile_complete=user.profile_complete,
        auth_provider=user.auth_provider,
    )


async def _handle_mfa_challenge(user: User, db: Session) -> AuthResponse:
    """
    Handle MFA challenge: generate temp token and send OTP if needed.
    Called when user has MFA enabled and password is verified.
    """
    temp_token = create_temp_mfa_token(user.id)
    
    # For OTP-based MFA, generate and send the code
    if user.mfa_type in ("email_otp", "whatsapp_otp"):
        code = generate_otp()
        store_otp(user.id, code)
        
        if user.mfa_type == "email_otp":
            await send_otp_email(user.email, code)
            return AuthResponse(
                mfa_required=True,
                temp_token=temp_token,
                message=f"OTP sent to {user.email}. Check your email (or console in dev mode).",
            )
        elif user.mfa_type == "whatsapp_otp":
            if user.phone_number:
                await send_otp_whatsapp(user.phone_number, code)
            return AuthResponse(
                mfa_required=True,
                temp_token=temp_token,
                message=f"OTP sent to WhatsApp {user.phone_number or '(not set)'}. Check your phone (or console in dev mode).",
            )
    
    # For TOTP, just return temp token (user generates code from their app)
    return AuthResponse(
        mfa_required=True,
        temp_token=temp_token,
        message="Enter the code from your authenticator app.",
    )


async def _complete_login(response: Response, user: User, db: AsyncSession, remember_me: bool = False) -> AuthResponse:
    """
    Complete login: set access token cookie, optionally set remember-me cookie.
    """
    access_token = create_access_token(user.id)
    set_access_token_cookie(response, access_token)
    
    if remember_me:
        raw_token = await create_remember_me_token(db, user.id)
        set_remember_me_cookie(response, raw_token)
    
    return AuthResponse(
        access_token=access_token,  # Also in response body for compatibility
        user=_user_to_response(user),
        message="Login successful.",
    )


# ===========================
# Registration
# ===========================

@router.post("/register", response_model=AuthResponse)
async def register(
    request: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user with email and password.
    
    - Validates reCAPTCHA token
    - Checks for existing email
    - Creates user with hashed password
    - Returns JWT via HTTP-only cookie
    """
    # Verify reCAPTCHA
    if not await verify_recaptcha(request.recaptcha_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reCAPTCHA verification failed. Please try again.",
        )
    
    # Check existing user
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )
    
    # Create user
    user = User(
        email=request.email,
        name=request.name,
        password_hash=hash_password(request.password),
        auth_provider="local",
        profile_complete=False,  # Will need to complete profile setup
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Activate 30-day free Pro trial for new users
    try:
        from ..services.plan_service import activate_trial
        await activate_trial(user.id, db)
        await db.refresh(user)  # Refresh to get updated plan fields
    except Exception as e:
        print(f"⚠️ Failed to activate trial for {user.id}: {e}")
    
    # Issue token
    return await _complete_login(response, user, db)


# ===========================
# Login
# ===========================

@router.post("/login", response_model=AuthResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password.
    
    Flow:
    1. Validate reCAPTCHA
    2. Find user by email
    3. Verify password
    4. If MFA enabled → return temp_token + send OTP
    5. If no MFA → issue JWT cookie
    """
    # Verify reCAPTCHA
    if not await verify_recaptcha(request.recaptcha_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reCAPTCHA verification failed.",
        )
    
    # Find user
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    
    # Verify password
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )
    
    # Check MFA
    if user.mfa_enabled:
        return await _handle_mfa_challenge(user, db)
    
    # No MFA → complete login
    return await _complete_login(response, user, db, remember_me=request.remember_me)


# ===========================
# Google OAuth
# ===========================

@router.post("/google", response_model=AuthResponse)
async def google_auth(
    request: GoogleAuthRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Login/Register via Google OAuth.
    
    Dev mode:  Accepts any token, creates mock Google user.
    Prod mode: Verifies Google ID token server-side using google-auth library.
    
    Production Setup:
    1. Create OAuth 2.0 Client ID at https://console.cloud.google.com/apis/credentials
    2. Set GOOGLE_OAUTH_CLIENT_ID in .env
    3. Frontend sends the Google ID token (from Google Sign-In button)
    4. Backend verifies the token with Google and extracts user info
    """
    # Verify reCAPTCHA
    if not await verify_recaptcha(request.recaptcha_token):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="reCAPTCHA verification failed.",
        )
    
    # Extract Google user info
    if settings.use_mock_google:
        # === DEV MODE: Mock Google login ===
        print("\n" + "=" * 50)
        print("🔑 GOOGLE OAUTH (DEV MODE - Mock)")
        print(f"   Token: {request.google_id_token[:20]}...")
        print("   Using mock Google user data")
        print("=" * 50 + "\n")
        
        google_user_info = {
            "sub": "google-mock-" + request.google_id_token[:10],
            "email": "mockuser@gmail.com",
            "name": "Google Dev User",
            "picture": "https://ui-avatars.com/api/?name=Google+User&background=4285F4&color=fff",
        }
    else:
        # === PROD MODE: Verify with Google ===
        # Docs: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            
            idinfo = id_token.verify_oauth2_token(
                request.google_id_token,
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
            
            google_user_info = {
                "sub": idinfo["sub"],
                "email": idinfo["email"],
                "name": idinfo.get("name", idinfo["email"].split("@")[0]),
                "picture": idinfo.get("picture", ""),
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Google token verification failed: {str(e)}",
            )
    
    # Find or create user
    stmt = select(User).where(User.google_id == google_user_info["sub"])
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        # Check if email exists with local auth (link accounts)
        email_stmt = select(User).where(User.email == google_user_info["email"])
        email_result = await db.execute(email_stmt)
        user = email_result.scalar_one_or_none()
        if user:
            # Link Google to existing account
            user.google_id = google_user_info["sub"]
            user.auth_provider = "google"
            if not user.profile_picture_url and google_user_info.get("picture"):
                user.profile_picture_url = google_user_info["picture"]
            await db.commit()
        else:
            # Create new user
            user = User(
                email=google_user_info["email"],
                name=google_user_info["name"],
                auth_provider="google",
                google_id=google_user_info["sub"],
                profile_picture_url=google_user_info.get("picture"),
                profile_complete=False,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            
            # Activate 30-day free Pro trial for new Google users
            try:
                from ..services.plan_service import activate_trial
                await activate_trial(user.id, db)
                await db.refresh(user)
            except Exception as e:
                print(f"⚠️ Failed to activate trial for Google user {user.id}: {e}")
    
    # Check MFA
    if user.mfa_enabled:
        return await _handle_mfa_challenge(user, db)
    
    return await _complete_login(response, user, db)


# ===========================
# MFA Verify (during login)
# ===========================

@router.post("/mfa/verify", response_model=AuthResponse)
async def mfa_verify(
    request: MfaVerifyRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify MFA code during login.
    
    Called after password verification when MFA is enabled.
    Accepts the temp_token (from login response) and OTP/TOTP code.
    """
    # Decode temp token
    payload = decode_token(request.temp_token, expected_type="mfa_challenge")
    user_id = payload.get("sub")
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA token.",
        )
    
    # Verify code based on MFA type
    if user.mfa_type == "totp":
        if not user.mfa_secret or not verify_totp(user.mfa_secret, request.otp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authenticator code. Please try again.",
            )
    elif user.mfa_type in ("email_otp", "whatsapp_otp"):
        stored_code = retrieve_and_delete_otp(user.id)
        if not stored_code or stored_code != request.otp_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired OTP code. Please request a new one.",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unknown MFA type.",
        )
    
    # MFA passed → complete login
    return await _complete_login(response, user, db)


# ===========================
# MFA Setup (authenticated)
# ===========================

@router.post("/mfa/setup", response_model=MfaSetupResponse)
async def mfa_setup(
    request: MfaSetupRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Enable MFA for the current user.
    
    - TOTP: Returns secret + QR code URI for Google Authenticator
    - Email OTP: Just marks the preference (OTP sent at login time)
    - WhatsApp OTP: Requires phone_number to be set on profile
    """
    if user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is already enabled. Disable it first to change type.",
        )
    
    if request.mfa_type == "totp":
        # Generate TOTP secret
        secret = generate_totp_secret()
        qr_uri = get_totp_provisioning_uri(secret, user.email)
        
        # Save to user (not activated until verified)
        user.mfa_secret = secret
        user.mfa_type = "totp"
        user.mfa_enabled = True
        await db.commit()
        
        return MfaSetupResponse(
            mfa_type="totp",
            secret=secret,
            qr_code_uri=qr_uri,
            message="Scan the QR code with Google Authenticator or enter the secret manually.",
        )
    
    elif request.mfa_type == "email_otp":
        user.mfa_type = "email_otp"
        user.mfa_enabled = True
        user.mfa_secret = None  # Not needed for email OTP
        await db.commit()
        
        return MfaSetupResponse(
            mfa_type="email_otp",
            message=f"Email OTP enabled. Codes will be sent to {user.email} at each login.",
        )
    
    elif request.mfa_type == "whatsapp_otp":
        if not user.phone_number:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please set your phone number in profile settings first.",
            )
        
        user.mfa_type = "whatsapp_otp"
        user.mfa_enabled = True
        user.mfa_secret = None
        await db.commit()
        
        return MfaSetupResponse(
            mfa_type="whatsapp_otp",
            message=f"WhatsApp OTP enabled. Codes will be sent to {user.phone_number} at each login.",
        )
    
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Invalid MFA type.",
    )


# ===========================
# MFA Disable (authenticated)
# ===========================

@router.post("/mfa/disable", response_model=MessageResponse)
async def mfa_disable(
    request: MfaDisableRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Disable MFA for the current user.
    
    Requires a valid OTP/TOTP code for security verification.
    """
    if not user.mfa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled.",
        )
    
    # Verify code before disabling
    if user.mfa_type == "totp":
        if not user.mfa_secret or not verify_totp(user.mfa_secret, request.otp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authenticator code.",
            )
    # For OTP types, we trust the user is authenticated (they have a valid session)
    
    user.mfa_enabled = False
    user.mfa_type = None
    user.mfa_secret = None
    await db.commit()
    
    return MessageResponse(message="MFA has been disabled.", success=True)


# ===========================
# Get Current User
# ===========================

@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return _user_to_response(user)


# ===========================
# Update Profile
# ===========================

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user profile.
    
    Any non-null field in the request will be updated.
    Automatically marks profile_complete=True after first update.
    """
    if request.name is not None:
        user.name = request.name
    if request.phone_number is not None:
        user.phone_number = request.phone_number
    if request.profile_picture_url is not None:
        user.profile_picture_url = request.profile_picture_url
    
    # Mark profile as complete
    user.profile_complete = True
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(user)
    
    return _user_to_response(user)


# ===========================
# Logout
# ===========================

@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: Optional[User] = Depends(get_current_user),
):
    """
    Logout: clear all auth cookies and revoke remember-me tokens.
    """
    if user:
        await revoke_remember_me_tokens(db, user.id)
    
    clear_auth_cookies(response)
    
    return MessageResponse(message="Logged out successfully.", success=True)


# ===========================
# Check Auth Status (for frontend)
# ===========================

@router.get("/status")
async def auth_status(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Check if the user is currently authenticated.
    
    Used by frontend on page load to restore session from cookies.
    Returns user data if authenticated, or 401 if not.
    """
    from ..services.auth_service import (
        _extract_token_from_request, validate_remember_me_token,
        ACCESS_TOKEN_COOKIE, REMEMBER_ME_COOKIE,
    )
    
    # Try access token cookie
    access_token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if access_token:
        try:
            payload = decode_token(access_token, expected_type="access")
            user_id = payload.get("sub")
            stmt = select(User).where(User.id == user_id)
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()
            if user:
                return {"authenticated": True, "user": _user_to_response(user)}
        except Exception:
            pass
    
    # Try remember-me cookie
    remember_token = request.cookies.get(REMEMBER_ME_COOKIE)
    if remember_token:
        user = await validate_remember_me_token(db, remember_token)
        if user:
            return {"authenticated": True, "user": _user_to_response(user)}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
    )
