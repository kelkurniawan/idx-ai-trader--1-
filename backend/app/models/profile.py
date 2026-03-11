"""
Profile-related SQLAlchemy models.

NotificationPreference — per-user notification settings (1:1 with User)
UserSession            — server-side session records for revocation support
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from ..database import Base


def _gen_uuid() -> str:
    return str(uuid.uuid4())


class NotificationPreference(Base):
    """User notification preferences (one row per user)."""
    __tablename__ = "notification_preferences"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Alert types
    price_alerts = Column(Boolean, default=True, nullable=False)
    news_alerts = Column(Boolean, default=True, nullable=False)
    portfolio_digest = Column(Boolean, default=True, nullable=False)
    market_open = Column(Boolean, default=False, nullable=False)
    market_close = Column(Boolean, default=False, nullable=False)

    # Delivery channels
    email_enabled = Column(Boolean, default=True, nullable=False)
    push_enabled = Column(Boolean, default=False, nullable=False)  # stub for future FCM

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User", back_populates="notification_preferences")


class UserSession(Base):
    """
    Server-side session record.

    Enables explicit session listing and single-session revocation.
    The refresh token is stored hashed; the raw value lives in the client cookie.
    """
    __tablename__ = "user_sessions"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # SHA-256 hash of the access token — used to identify a session without
    # exposing the raw token.
    token_hash = Column(String(64), nullable=False, unique=True)
    user_agent = Column(String(500), nullable=True)
    ip_address = Column(String(64), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

    # Relationship
    user = relationship("User", back_populates="user_sessions")
