"""Clerk token verification and local-user linkage helpers."""

from __future__ import annotations

import base64
from datetime import datetime
from typing import Any

import jwt
from fastapi import HTTPException, Request, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..models.user import User

settings = get_settings()
_jwks_client = None


def _derive_clerk_issuer_from_publishable_key() -> str:
    publishable_key = settings.CLERK_PUBLISHABLE_KEY.strip()
    if not publishable_key:
        return ""

    try:
        encoded = publishable_key.split("_", 2)[-1]
        padding = "=" * (-len(encoded) % 4)
        decoded = base64.urlsafe_b64decode(f"{encoded}{padding}").decode("utf-8")
        host = decoded.rstrip("$").strip()
        if not host:
            return ""
        if host.startswith("http://") or host.startswith("https://"):
            return host.rstrip("/")
        return f"https://{host}"
    except Exception:
        return ""


def _extract_bearer_token(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


def _get_jwks_client():
    global _jwks_client
    if _jwks_client is not None:
        return _jwks_client
    jwks_url = settings.CLERK_JWKS_URL.strip()
    issuer = settings.CLERK_ISSUER.rstrip("/") or _derive_clerk_issuer_from_publishable_key()
    if not jwks_url:
        if issuer:
            jwks_url = f"{issuer}/.well-known/jwks.json"
    if not jwks_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Clerk is not configured on the backend.",
        )
    _jwks_client = jwt.PyJWKClient(jwks_url)
    return _jwks_client


def verify_clerk_token_from_request(request: Request) -> dict[str, Any] | None:
    token = _extract_bearer_token(request)
    if not token:
        return None
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
        decode_kwargs: dict[str, Any] = {
            "algorithms": ["RS256"],
            "options": {"verify_aud": False},
        }
        issuer = settings.CLERK_ISSUER.rstrip("/") or _derive_clerk_issuer_from_publishable_key()
        if issuer:
            decode_kwargs["issuer"] = issuer
        payload = jwt.decode(token, signing_key.key, **decode_kwargs)
        if not payload.get("sub"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Clerk token payload.",
            )
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Clerk session token: {exc}",
        ) from exc


async def get_local_user_for_clerk_subject(db: AsyncSession, clerk_subject: str) -> User | None:
    stmt = select(User).where(User.clerk_user_id == clerk_subject)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def sync_clerk_user(
    *,
    db: AsyncSession,
    clerk_subject: str,
    email: str,
    name: str,
    avatar_url: str | None = None,
) -> User:
    stmt = select(User).where(or_(User.clerk_user_id == clerk_subject, User.email == email))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    is_new_user = False

    if user:
        user.clerk_user_id = clerk_subject
        user.email = email
        if name:
            user.name = name
        if avatar_url:
            user.profile_picture_url = avatar_url
        user.auth_provider = "clerk"
        user.updated_at = datetime.utcnow()
    else:
        user = User(
            email=email,
            name=name,
            auth_provider="clerk",
            clerk_user_id=clerk_subject,
            profile_picture_url=avatar_url,
            profile_complete=False,
        )
        db.add(user)
        is_new_user = True

    await db.commit()
    await db.refresh(user)

    if is_new_user:
        try:
            from ..services.plan_service import activate_trial

            await activate_trial(user.id, db)
            await db.refresh(user)
        except Exception as exc:
            print(f"Failed to auto-activate trial for Clerk user {user.id}: {exc}")

    return user
