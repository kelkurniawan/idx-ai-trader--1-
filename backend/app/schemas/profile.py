"""
Profile Pydantic Schemas (v2)

Request and response models for all /api/profile/* endpoints.
"""

import re
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, field_validator


# ────────────────────────────────────────────────────────────────
# Shared helpers
# ────────────────────────────────────────────────────────────────

E164_PATTERN = re.compile(r"^\+[1-9]\d{1,14}$")


def _validate_phone(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    if not E164_PATTERN.match(v):
        raise ValueError("Phone must be in E.164 format, e.g. +6281234567890")
    return v


# ────────────────────────────────────────────────────────────────
# Profile — Account
# ────────────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=2, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return _validate_phone(v)


class ProfileResponse(BaseModel):
    id: str
    email: str
    display_name: str          # maps to user.name
    avatar_url: Optional[str]  # maps to user.profile_picture_url
    phone: Optional[str]       # maps to user.phone_number
    bio: Optional[str]
    plan: str
    plan_expires_at: Optional[datetime]
    theme_preference: str
    mfa_enabled: bool
    mfa_type: Optional[str]
    auth_provider: str
    profile_complete: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ────────────────────────────────────────────────────────────────
# Password & Email
# ────────────────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if info.data.get("new_password") and v != info.data["new_password"]:
            raise ValueError("Passwords do not match")
        return v


class ChangeEmailRequest(BaseModel):
    new_email: EmailStr
    current_password: str


class VerifyEmailOTPRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6)


# ────────────────────────────────────────────────────────────────
# MFA
# ────────────────────────────────────────────────────────────────

class MFAStatusResponse(BaseModel):
    mfa_enabled: bool
    mfa_type: Optional[str]
    backup_codes_available: bool


class TOTPSetupResponse(BaseModel):
    secret: str
    qr_code_data_url: str   # base64 PNG data URL


class TOTPVerifyRequest(BaseModel):
    token: str = Field(..., min_length=6, max_length=6)


class TOTPVerifyResponse(BaseModel):
    message: str
    backup_codes: List[str]  # shown ONCE, never retrievable again


class RemoveTOTPRequest(BaseModel):
    current_password: str


class SetupSMSOTPRequest(BaseModel):
    phone: Optional[str] = None  # uses profile phone if omitted

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return _validate_phone(v)


class VerifyOTPRequest(BaseModel):
    otp: str = Field(..., min_length=6, max_length=6)


# ────────────────────────────────────────────────────────────────
# Notifications
# ────────────────────────────────────────────────────────────────

class NotificationPreferenceResponse(BaseModel):
    id: str
    price_alerts: bool
    news_alerts: bool
    portfolio_digest: bool
    market_open: bool
    market_close: bool
    email_enabled: bool
    push_enabled: bool

    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    price_alerts: Optional[bool] = None
    news_alerts: Optional[bool] = None
    portfolio_digest: Optional[bool] = None
    market_open: Optional[bool] = None
    market_close: Optional[bool] = None
    email_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None


# ────────────────────────────────────────────────────────────────
# Theme
# ────────────────────────────────────────────────────────────────

class ThemeUpdateRequest(BaseModel):
    theme: str = Field(..., pattern="^(dark|light)$")


# ────────────────────────────────────────────────────────────────
# Sessions
# ────────────────────────────────────────────────────────────────

class SessionResponse(BaseModel):
    id: str
    user_agent: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    expires_at: datetime

    class Config:
        from_attributes = True


# ────────────────────────────────────────────────────────────────
# Plan
# ────────────────────────────────────────────────────────────────

class PlanFeaturesResponse(BaseModel):
    news_ai: bool
    watchlist_limit: Optional[int] = None       # None = unlimited
    alert_limit: Optional[int] = None
    ai_analysis_daily_limit: Optional[int] = None
    chart_vision: bool = False
    backtester: bool = False
    journal_limit: Optional[int] = None
    portfolio_limit: Optional[int] = None
    export_csv: bool = False
    learning_full: bool = False
    community_write: bool = False
    priority_support: bool = False
    verified_badge: bool = False
    advanced_analysis: bool = False


class PlanResponse(BaseModel):
    plan: str
    plan_expires_at: Optional[datetime]
    features: PlanFeaturesResponse


# ────────────────────────────────────────────────────────────────
# Soft-delete
# ────────────────────────────────────────────────────────────────

class DeleteAccountRequest(BaseModel):
    password: str


# ────────────────────────────────────────────────────────────────
# Generic
# ────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    success: bool = True
