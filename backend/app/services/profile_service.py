"""
Profile Service

Core CRUD for user profile: read, update, soft-delete,
password change, and email-change with OTP verification.
"""

import hashlib
import json
import random
import string
from datetime import datetime
from typing import Optional

import bcrypt
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.user import User, RememberMeToken
from ..models.profile import UserSession
from ..schemas.profile import ProfileUpdateRequest
from ..services.otp_service import store_profile_otp, retrieve_profile_otp
from ..services.auth_service import hash_password, verify_password
from ..config import get_settings

settings = get_settings()


# ────────────────────────────────────────────────────────────────
# Read
# ────────────────────────────────────────────────────────────────

def get_profile(user: User) -> User:
    """Return the user object (router will serialize via ProfileResponse)."""
    return user


# ────────────────────────────────────────────────────────────────
# Update
# ────────────────────────────────────────────────────────────────

async def update_profile(user: User, data: ProfileUpdateRequest, db: AsyncSession) -> User:
    """Update mutable profile fields. Returns refreshed user."""
    if data.display_name is not None:
        user.name = data.display_name
    if data.avatar_url is not None:
        user.profile_picture_url = data.avatar_url
    if data.phone is not None:
        user.phone_number = data.phone
    if data.bio is not None:
        user.bio = data.bio

    user.profile_complete = True
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


# ────────────────────────────────────────────────────────────────
# Soft-delete
# ────────────────────────────────────────────────────────────────

async def delete_account(user: User, password: str, db: AsyncSession) -> None:
    """
    Soft-delete the account:
    1. Verify password
    2. Set deleted_at timestamp
    3. Revoke all sessions and remember-me tokens
    """
    if user.auth_provider == "local":
        if not user.password_hash or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password.",
            )

    user.deleted_at = datetime.utcnow()
    user.updated_at = datetime.utcnow()

    # Revoke sessions
    from sqlalchemy import delete
    await db.execute(delete(RememberMeToken).where(RememberMeToken.user_id == user.id))
    await db.execute(delete(UserSession).where(UserSession.user_id == user.id))

    await db.commit()


# ────────────────────────────────────────────────────────────────
# Password
# ────────────────────────────────────────────────────────────────

async def change_password(
    user: User,
    current_password: str,
    new_password: str,
    db: AsyncSession,
) -> None:
    """
    Verify current password, hash new one, revoke all other sessions.
    Google-only accounts (no password_hash) cannot use this endpoint.
    """
    if user.auth_provider != "local" or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password change is only available for accounts with email/password login.",
        )

    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    user.password_hash = hash_password(new_password)
    user.updated_at = datetime.utcnow()

    # Revoke all remember-me tokens & sessions on password change
    from sqlalchemy import delete
    await db.execute(delete(RememberMeToken).where(RememberMeToken.user_id == user.id))
    await db.execute(delete(UserSession).where(UserSession.user_id == user.id))

    await db.commit()


# ────────────────────────────────────────────────────────────────
# Email change — two-step: initiate → verify OTP
# ────────────────────────────────────────────────────────────────

def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def initiate_email_change(
    user: User,
    new_email: str,
    current_password: str,
    db: AsyncSession,
) -> None:
    """
    Step 1: verify password, check new email uniqueness, send OTP.
    OTP is scoped to 'email_change' purpose.
    """
    if user.auth_provider == "local":
        if not user.password_hash or not verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password.",
            )

    # Check email uniqueness
    stmt = select(User).where(User.email == new_email)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email address is already in use.",
        )

    otp = _generate_otp()
    store_profile_otp(user.id, "email_change", otp)

    # Store the pending new email in the OTP store using a companion key
    store_profile_otp(user.id, "email_change_new", new_email)

    # Send OTP
    from ..services.mfa_service import send_otp_email
    await send_otp_email(new_email, otp)


async def complete_email_change(user: User, otp: str, db: AsyncSession) -> User:
    """
    Step 2: validate OTP and update email.
    """
    stored_otp = retrieve_profile_otp(user.id, "email_change")
    new_email = retrieve_profile_otp(user.id, "email_change_new")

    if not stored_otp or stored_otp != otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please request a new one.",
        )
    if not new_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email change session expired. Please start again.",
        )

    user.email = new_email
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


# ────────────────────────────────────────────────────────────────
# Theme
# ────────────────────────────────────────────────────────────────

async def update_theme(user: User, theme: str, db: AsyncSession) -> User:
    user.theme_preference = theme
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


# ────────────────────────────────────────────────────────────────
# Sessions
# ────────────────────────────────────────────────────────────────

async def register_session(
    user_id: str,
    access_token: str,
    user_agent: Optional[str],
    ip_address: Optional[str],
    expires_at: datetime,
    db: AsyncSession,
) -> UserSession:
    """Create a UserSession record for server-side tracking."""
    token_hash = hashlib.sha256(access_token.encode()).hexdigest()

    # Upsert — same token shouldn't be double-registered
    stmt = select(UserSession).where(UserSession.token_hash == token_hash)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    
    if existing:
        return existing

    session = UserSession(
        user_id=user_id,
        token_hash=token_hash,
        user_agent=user_agent,
        ip_address=ip_address,
        expires_at=expires_at,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_sessions(user_id: str, db: AsyncSession) -> list[UserSession]:
    """Return all active (non-expired) sessions for the user."""
    now = datetime.utcnow()
    stmt = (
        select(UserSession)
        .where(
            UserSession.user_id == user_id,
            UserSession.expires_at > now,
        )
        .order_by(UserSession.created_at.desc())
    )
    result = await db.execute(stmt)
    return result.scalars().all()


async def revoke_session(session_id: str, user_id: str, db: AsyncSession) -> None:
    """Revoke a single session (must belong to the requesting user)."""
    stmt = select(UserSession).where(
        UserSession.id == session_id,
        UserSession.user_id == user_id,
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found.",
        )
    await db.delete(session)
    await db.commit()


async def revoke_all_other_sessions(current_token_hash: str, user_id: str, db: AsyncSession) -> None:
    """Revoke all sessions except the one identified by current_token_hash."""
    from sqlalchemy import delete
    stmt = delete(UserSession).where(
        UserSession.user_id == user_id,
        UserSession.token_hash != current_token_hash,
    )
    await db.execute(stmt)
    await db.commit()


# ────────────────────────────────────────────────────────────────
# Plan (delegates to centralized plan_service)
# ────────────────────────────────────────────────────────────────

def get_plan_info(user: User) -> dict:
    from ..services.plan_service import get_plan_features
    plan = user.plan or "FREE"
    return {
        "plan": plan,
        "plan_expires_at": user.plan_expires_at,
        "features": get_plan_features(plan),
    }

