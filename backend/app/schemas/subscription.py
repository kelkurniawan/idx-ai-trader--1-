"""
Subscription Pydantic Schemas

Request and response models for /api/subscription/* endpoints.
"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ────────────────────────────────────────────────────────────────
# Request Schemas
# ────────────────────────────────────────────────────────────────

class SubscribeRequest(BaseModel):
    """Create a new subscription invoice."""
    plan: Literal["PRO", "EXPERT"]
    billing_cycle: Literal["MONTHLY", "QUARTERLY", "ANNUAL"] = "MONTHLY"


# ────────────────────────────────────────────────────────────────
# Response Schemas
# ────────────────────────────────────────────────────────────────

class InvoiceResponse(BaseModel):
    """Response after creating a Xendit invoice."""
    invoice_id: str
    invoice_url: str
    plan: str
    billing_cycle: str
    amount_idr: int
    expires_at: str  # ISO datetime string — invoice payment deadline


class PlanPriceDetail(BaseModel):
    """Price for a specific billing cycle."""
    billing_cycle: str        # "MONTHLY" | "QUARTERLY" | "ANNUAL"
    label: str                # "1 Bulan" | "3 Bulan" | "1 Tahun"
    price_idr: int
    price_per_month: int      # Effective monthly price
    discount_pct: int         # 0, 15, or 25
    duration_days: int


class PlanDetail(BaseModel):
    """Full plan info with pricing and features."""
    name: str                 # "FREE" | "PRO" | "EXPERT"
    display_name: str         # "Free" | "Pro" | "Expert"
    prices: List[PlanPriceDetail]
    features: dict            # Feature gate dict


class PlansListResponse(BaseModel):
    """All available plans with pricing."""
    plans: List[PlanDetail]


class SubscriptionStatusResponse(BaseModel):
    """Current subscription status for the user."""
    plan: str
    status: str               # "FREE" | "TRIAL" | "ACTIVE" | "GRACE" | "EXPIRED"
    billing_cycle: Optional[str] = None
    is_trial: bool = False
    trial_ends_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    grace_until: Optional[datetime] = None
    days_remaining: Optional[int] = None
    features: dict


class PaymentHistoryItem(BaseModel):
    """Single payment record."""
    id: str
    plan: str
    billing_cycle: str
    amount_idr: int
    status: str
    payment_method: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaymentHistoryResponse(BaseModel):
    """List of payment records."""
    payments: List[PaymentHistoryItem]


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    success: bool = True
