"""add foreign flow columns to stock_prices

Adds foreign_buy / foreign_sell / foreign_net, populated by the IDX EOD ingest
(IDX Stock Summary exposes ForeignBuy / ForeignSell per ticker). Yahoo rows
leave these NULL.

Revision ID: add_foreign_flow
Revises: add_clerk_user_id
Create Date: 2026-06-01 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "add_foreign_flow"
down_revision = "add_clerk_user_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("stock_prices", sa.Column("foreign_buy", sa.Float(), nullable=True))
    op.add_column("stock_prices", sa.Column("foreign_sell", sa.Float(), nullable=True))
    op.add_column("stock_prices", sa.Column("foreign_net", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("stock_prices", "foreign_net")
    op.drop_column("stock_prices", "foreign_sell")
    op.drop_column("stock_prices", "foreign_buy")
