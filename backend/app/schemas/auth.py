"""
Authentication Schemas

Pydantic models for request/response validation in auth endpoints.
"""

from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field


# ===========================
# Request Schemas
# ===========================

class RegisterRequest(BaseModel):
    """User registration request."""
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    recaptcha_token: str = ""  # Empty string skips check if RECAPTCHA_ENABLED=False


class LoginRequest(BaseModel):
    """User login request."""
    email: EmailStr
    password: str
    recaptcha_token: str = ""
    remember_me: bool = False


class GoogleAuthRequest(BaseModel):
    """Google OAuth login/register request."""
    google_id_token: str  # ID token from Google Sign-In on frontend
    recaptcha_token: str = ""


class MfaVerifyRequest(BaseModel):
    """MFA verification request (during login)."""
    temp_token: str   # Short-lived token issued after password check
    otp_code: str = Field(..., min_length=6, max_length=6)  # 6-digit code


class MfaSetupRequest(BaseModel):
    """Enable MFA for current user."""
    mfa_type: Literal["totp", "email_otp", "whatsapp_otp"]


class MfaDisableRequest(BaseModel):
    """Disable MFA — requires current password or TOTP for security."""
    otp_code: str = Field(..., min_length=6, max_length=6)


class ProfileUpdateRequest(BaseModel):
    """Update user profile."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=30)
    profile_picture_url: Optional[str] = None


# ===========================
# Response Schemas
# ===========================

class UserResponse(BaseModel):
    """User data returned to frontend."""
    id: str
    email: str
    name: str
    avatar: Optional[str] = None                # profile_picture_url mapped to 'avatar'
    phone_number: Optional[str] = None
    mfa_enabled: bool = False
    mfa_type: Optional[str] = None
    profile_complete: bool = False
    auth_provider: str = "local"
    is_admin: bool = False

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    """
    Response for login/register.
    
    If mfa_required=True, the access_token is null and a temp_token is provided.
    Frontend should show the MFA challenge screen and call /mfa/verify with the temp_token.
    """
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserResponse] = None
    mfa_required: bool = False
    temp_token: Optional[str] = None  # Only when mfa_required=True
    message: str = ""


class MfaSetupResponse(BaseModel):
    """Response when TOTP MFA is set up — includes QR code data."""
    mfa_type: str
    # TOTP fields (only present for mfa_type="totp")
    secret: Optional[str] = None         # Base32 secret for manual entry
    qr_code_uri: Optional[str] = None    # otpauth:// URI for QR scanning
    message: str = ""


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True
