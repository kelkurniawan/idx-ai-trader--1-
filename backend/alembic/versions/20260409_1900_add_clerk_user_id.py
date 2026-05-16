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


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(index["name"] == index_name for index in inspector.get_indexes(table_name))


def upgrade() -> None:
    if not _has_column("users", "clerk_user_id"):
        op.add_column("users", sa.Column("clerk_user_id", sa.String(length=255), nullable=True))
    if not _has_index("users", "ix_users_clerk_user_id"):
        op.create_index(op.f("ix_users_clerk_user_id"), "users", ["clerk_user_id"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_clerk_user_id"), table_name="users")
    op.drop_column("users", "clerk_user_id")
