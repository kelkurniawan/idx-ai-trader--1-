"""add clerk user id

Revision ID: add_clerk_user_id
Revises: d8cb14310a69
Create Date: 2026-04-09 19:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "add_clerk_user_id"
down_revision = "d8cb14310a69"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("clerk_user_id", sa.String(length=255), nullable=True))
    op.create_index(op.f("ix_users_clerk_user_id"), "users", ["clerk_user_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_clerk_user_id"), table_name="users")
    op.drop_column("users", "clerk_user_id")
