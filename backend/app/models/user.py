"""
User & Authentication Models

SQLAlchemy models for user accounts, MFA, and persistent sessions.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from ..database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    """User account with profile and MFA support."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=True)  # Null for Google-only users

    # Auth provider: "local" for email/password, "google" for Google OAuth
    auth_provider = Column(String(20), default="local", nullable=False)
    google_id = Column(String(255), unique=True, nullable=True)

    # Profile fields
    profile_picture_url = Column(String(500), nullable=True)
    phone_number = Column(String(30), nullable=True)
    profile_complete = Column(Boolean, default=False, nullable=False)

    # MFA fields
    mfa_enabled = Column(Boolean, default=False, nullable=False)
    mfa_type = Column(String(20), nullable=True)  # "totp" | "email_otp" | "whatsapp_otp"
    mfa_secret = Column(String(255), nullable=True)  # TOTP base32 secret

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Profile extensions (added for profile feature) ──────────────────────
    bio = Column(Text, nullable=True)
    plan = Column(String(20), default="FREE", nullable=False)
    plan_expires_at = Column(DateTime, nullable=True)
    plan_grace_until = Column(DateTime, nullable=True)  # expires_at + 3 days
    has_used_trial = Column(Boolean, default=False, nullable=False)  # One-time Pro trial
    subscription_cycle = Column(String(20), nullable=True)  # MONTHLY | QUARTERLY | ANNUAL
    theme_preference = Column(String(20), default="dark", nullable=False)
    # Stored as JSON string: list of bcrypt-hashed backup codes
    mfa_backup_codes = Column(Text, nullable=True)
    # Soft-delete timestamp
    deleted_at = Column(DateTime, nullable=True)

    # Relationships
    remember_me_tokens = relationship("RememberMeToken", back_populates="user", cascade="all, delete-orphan")
    notification_preferences = relationship("NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    user_sessions = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")


class RememberMeToken(Base):
    """
    Persistent 'Remember Me' tokens.
    
    Stored as hashed values — the raw token is sent as an HTTP-only cookie.
    Each user can have multiple tokens (different devices/browsers).
    """
    __tablename__ = "remember_me_tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(255), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="remember_me_tokens")
