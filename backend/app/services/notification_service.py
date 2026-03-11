"""
Notification Service

Get-or-create and update NotificationPreference for a user.
"""

from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..models.user import User
from ..models.profile import NotificationPreference
from ..schemas.profile import NotificationPreferenceUpdate


async def get_or_create_prefs(user: User, db: AsyncSession) -> NotificationPreference:
    """Return existing NotificationPreference or create with defaults."""
    stmt = select(NotificationPreference).where(NotificationPreference.user_id == user.id)
    result = await db.execute(stmt)
    prefs = result.scalar_one_or_none()
    
    if prefs:
        return prefs

    prefs = NotificationPreference(user_id=user.id)
    db.add(prefs)
    await db.commit()
    await db.refresh(prefs)
    return prefs


async def update_prefs(
    user: User,
    data: NotificationPreferenceUpdate,
    db: AsyncSession,
) -> NotificationPreference:
    """Update only the fields that were explicitly provided in the request."""
    prefs = await get_or_create_prefs(user, db)

    update_data = data.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)

    prefs.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(prefs)
    return prefs
