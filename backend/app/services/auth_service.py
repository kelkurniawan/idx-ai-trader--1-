"""
Authentication Service

Core authentication logic: password hashing, JWT tokens, HTTP-only cookie management,
and the FastAPI dependency for extracting the current user from requests.
"""

import uuid
import hashlib
from datetime import datetime, timedelta
from typing import Optional

import jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models.user import User, RememberMeToken

settings = get_settings()

# Bearer token extraction for Authorization header
security = HTTPBearer(auto_error=False)

# Cookie names
ACCESS_TOKEN_COOKIE = "idx_access_token"
REMEMBER_ME_COOKIE = "idx_remember_me"


# ===========================
# Password Utilities
# ===========================

def hash_password(plain_password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ===========================
# JWT Token Utilities
# ===========================

def create_access_token(user_id: str, expires_minutes: Optional[int] = None) -> str:
    """
    Create a short-lived JWT access token.
    
    Args:
        user_id: The user's ID to encode in the token
        expires_minutes: Override for expiration (defaults to config)
    
    Returns:
        Encoded JWT string
    """
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "access",
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_temp_mfa_token(user_id: str) -> str:
    """
    Create a short-lived token for MFA challenge.
    
    This token is issued after password verification but before MFA is confirmed.
    It expires in 5 minutes and cannot be used as a regular access token.
    """
    expire = datetime.utcnow() + timedelta(minutes=5)
    payload = {
        "sub": user_id,
        "exp": expire,
        "type": "mfa_challenge",
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, expected_type: str = "access") -> dict:
    """
    Decode and validate a JWT token.
    
    Args:
        token: The JWT token string
        expected_type: Expected token type ("access" or "mfa_challenge")
    
    Returns:
        Decoded payload dict
    
    Raises:
        HTTPException: If token is invalid, expired, or wrong type
    """
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        if payload.get("type") != expected_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected '{expected_type}'.",
            )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )


# ===========================
# HTTP-Only Cookie Management
# ===========================

def set_access_token_cookie(response: Response, token: str) -> None:
    """Set the access token as an HTTP-only cookie."""
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=token,
        httponly=True,
        secure=not settings.is_development,  # Secure=True in production (requires HTTPS)
        samesite="lax",
        max_age=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def set_remember_me_cookie(response: Response, token: str) -> None:
    """Set the remember-me token as a long-lived HTTP-only cookie."""
    response.set_cookie(
        key=REMEMBER_ME_COOKIE,
        value=token,
        httponly=True,
        secure=not settings.is_development,
        samesite="lax",
        max_age=settings.JWT_REMEMBER_ME_EXPIRE_DAYS * 24 * 60 * 60,
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear all auth cookies (for logout)."""
    response.delete_cookie(key=ACCESS_TOKEN_COOKIE, path="/")
    response.delete_cookie(key=REMEMBER_ME_COOKIE, path="/")


# ===========================
# Remember-Me Token Management
# ===========================

def _hash_remember_token(raw_token: str) -> str:
    """Hash a remember-me token for database storage."""
    return hashlib.sha256(raw_token.encode()).hexdigest()


def create_remember_me_token(db: Session, user_id: str) -> str:
    """
    Create a new remember-me token, store its hash in DB, return the raw token.
    
    The raw token is sent as a cookie; only the hash is stored server-side.
    """
    raw_token = str(uuid.uuid4()) + "-" + str(uuid.uuid4())
    token_hash = _hash_remember_token(raw_token)
    
    db_token = RememberMeToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(days=settings.JWT_REMEMBER_ME_EXPIRE_DAYS),
    )
    db.add(db_token)
    db.commit()
    
    return raw_token


def validate_remember_me_token(db: Session, raw_token: str) -> Optional[User]:
    """
    Validate a remember-me cookie token.
    
    Returns the User if valid, None if expired or not found.
    """
    token_hash = _hash_remember_token(raw_token)
    db_token = db.query(RememberMeToken).filter(
        RememberMeToken.token_hash == token_hash,
        RememberMeToken.expires_at > datetime.utcnow(),
    ).first()
    
    if not db_token:
        return None
    
    return db.query(User).filter(User.id == db_token.user_id).first()


def revoke_remember_me_tokens(db: Session, user_id: str) -> None:
    """Revoke all remember-me tokens for a user (e.g., on logout or password change)."""
    db.query(RememberMeToken).filter(RememberMeToken.user_id == user_id).delete()
    db.commit()


# ===========================
# FastAPI Dependencies
# ===========================

def _extract_token_from_request(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = None) -> Optional[str]:
    """
    Extract JWT token from request, checking in order:
    1. Authorization: Bearer header
    2. HTTP-only access_token cookie
    """
    # Check Authorization header first
    if credentials and credentials.credentials:
        return credentials.credentials
    
    # Fall back to cookie
    return request.cookies.get(ACCESS_TOKEN_COOKIE)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency: extract and validate the current user from the request.
    
    Checks Authorization header first, then falls back to HTTP-only cookie.
    
    Usage:
        @router.get("/me")
        async def get_me(user: User = Depends(get_current_user)):
            return user
    """
    token = _extract_token_from_request(request, credentials)
    
    if not token:
        # Try remember-me cookie as last resort
        remember_token = request.cookies.get(REMEMBER_ME_COOKIE)
        if remember_token:
            user = validate_remember_me_token(db, remember_token)
            if user:
                return user
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token, expected_type="access")
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )
    
    return user
