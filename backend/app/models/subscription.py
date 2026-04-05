"""
Subscription & Payment History Models

SQLAlchemy models for tracking subscriptions, billing cycles,
and Xendit payment history.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, Text
from sqlalchemy.orm import relationship

from ..database import Base


def _gen_uuid() -> str:
    return str(uuid.uuid4())


class Subscription(Base):
    """
    Tracks a user's subscription period.

    Each payment creates a new Subscription record. The most recent ACTIVE
    subscription determines the user's current plan.
    """
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    plan = Column(String(20), nullable=False)              # "PRO" | "EXPERT"
    billing_cycle = Column(String(20), nullable=False)     # "MONTHLY" | "QUARTERLY" | "ANNUAL"
    status = Column(String(20), nullable=False, default="PENDING")
    # Status values: "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED" | "CANCELLED" | "PENDING"

    is_trial = Column(Boolean, default=False, nullable=False)
    amount_idr = Column(Integer, nullable=False, default=0)  # 0 for trial

    # Period tracking
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    grace_until = Column(DateTime, nullable=True)          # expires_at + 3 days

    # Xendit reference
    xendit_invoice_id = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="subscriptions")
    payments = relationship("PaymentHistory", back_populates="subscription")

    def __repr__(self) -> str:
        return f"<Subscription {self.id[:8]} user={self.user_id[:8]} plan={self.plan} status={self.status}>"


class PaymentHistory(Base):
    """
    Tracks every payment attempt (successful or not).

    Created when a Xendit invoice is generated, updated when the webhook
    callback arrives with the payment result.
    """
    __tablename__ = "payment_history"

    id = Column(String(36), primary_key=True, default=_gen_uuid)
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subscription_id = Column(
        String(36),
        ForeignKey("subscriptions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Xendit references
    xendit_invoice_id = Column(String(255), unique=True, nullable=False)
    xendit_invoice_url = Column(String(500), nullable=True)

    # Plan details at time of payment
    plan = Column(String(20), nullable=False)              # "PRO" | "EXPERT"
    billing_cycle = Column(String(20), nullable=False)     # "MONTHLY" | "QUARTERLY" | "ANNUAL"
    amount_idr = Column(Integer, nullable=False)

    # Payment status
    status = Column(String(20), nullable=False, default="PENDING")
    # Status values: "PENDING" | "PAID" | "EXPIRED" | "FAILED"

    # Payment details (filled by webhook)
    payment_method = Column(String(50), nullable=True)     # "QRIS" | "BCA_VA" | "OVO" etc.
    payment_channel = Column(String(50), nullable=True)    # More specific channel info
    paid_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="payments")
    subscription = relationship("Subscription", back_populates="payments")

    def __repr__(self) -> str:
        return f"<PaymentHistory {self.id[:8]} invoice={self.xendit_invoice_id} status={self.status}>"
