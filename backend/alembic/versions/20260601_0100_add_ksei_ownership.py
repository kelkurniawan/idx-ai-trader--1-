"""add KSEI foreign-ownership snapshot columns to stocks

Populated monthly from the KSEI Balance Position file (web.ksei.co.id) by the
KSEI ownership ingest. Latest snapshot only (a time series would warrant its own
table).

Revision ID: add_ksei_ownership
Revises: add_foreign_flow
Create Date: 2026-06-01 01:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "add_ksei_ownership"
down_revision = "add_foreign_flow"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("stocks", sa.Column("foreign_ownership_pct", sa.Float(), nullable=True))
    op.add_column("stocks", sa.Column("local_ownership_pct", sa.Float(), nullable=True))
    op.add_column("stocks", sa.Column("ownership_as_of", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("stocks", "ownership_as_of")
    op.drop_column("stocks", "local_ownership_pct")
    op.drop_column("stocks", "foreign_ownership_pct")
