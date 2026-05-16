"""current schema baseline

Revision ID: current_schema_baseline
Revises:
Create Date: 2026-05-17 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "current_schema_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("auth_provider", sa.String(length=20), nullable=False),
        sa.Column("google_id", sa.String(length=255), nullable=True),
        sa.Column("clerk_user_id", sa.String(length=255), nullable=True),
        sa.Column("profile_picture_url", sa.String(length=500), nullable=True),
        sa.Column("phone_number", sa.String(length=30), nullable=True),
        sa.Column("profile_complete", sa.Boolean(), nullable=False),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False),
        sa.Column("mfa_type", sa.String(length=20), nullable=True),
        sa.Column("mfa_secret", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("plan", sa.String(length=20), nullable=False),
        sa.Column("plan_expires_at", sa.DateTime(), nullable=True),
        sa.Column("plan_grace_until", sa.DateTime(), nullable=True),
        sa.Column("has_used_trial", sa.Boolean(), nullable=False),
        sa.Column("subscription_cycle", sa.String(length=20), nullable=True),
        sa.Column("theme_preference", sa.String(length=20), nullable=False),
        sa.Column("is_admin", sa.Boolean(), nullable=False),
        sa.Column("xendit_customer_id", sa.String(length=255), nullable=True),
        sa.Column("xendit_payment_method_id", sa.String(length=255), nullable=True),
        sa.Column("mfa_backup_codes", sa.Text(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.UniqueConstraint("google_id"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True)
    op.create_index("ix_users_deleted_at", "users", ["deleted_at"], unique=False)
    op.create_index("ix_users_plan", "users", ["plan"], unique=False)

    op.create_table(
        "remember_me_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_remember_me_tokens_user_id", "remember_me_tokens", ["user_id"], unique=False)
    op.create_index("ix_remember_me_tokens_expires_at", "remember_me_tokens", ["expires_at"], unique=False)

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"], unique=False)
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)
    op.create_index("ix_password_reset_tokens_expires_at", "password_reset_tokens", ["expires_at"], unique=False)

    op.create_table(
        "notification_preferences",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("price_alerts", sa.Boolean(), nullable=False),
        sa.Column("news_alerts", sa.Boolean(), nullable=False),
        sa.Column("portfolio_digest", sa.Boolean(), nullable=False),
        sa.Column("market_open", sa.Boolean(), nullable=False),
        sa.Column("market_close", sa.Boolean(), nullable=False),
        sa.Column("email_enabled", sa.Boolean(), nullable=False),
        sa.Column("push_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_notification_preferences_user_id", "notification_preferences", ["user_id"], unique=False)

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"], unique=False)
    op.create_index("ix_user_sessions_expires_at", "user_sessions", ["expires_at"], unique=False)

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("plan", sa.String(length=20), nullable=False),
        sa.Column("billing_cycle", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("is_trial", sa.Boolean(), nullable=False),
        sa.Column("amount_idr", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("grace_until", sa.DateTime(), nullable=True),
        sa.Column("xendit_invoice_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"], unique=False)
    op.create_index("ix_subscriptions_user_status_expires", "subscriptions", ["user_id", "status", "expires_at"], unique=False)
    op.create_index("ix_subscriptions_xendit_invoice_id", "subscriptions", ["xendit_invoice_id"], unique=False)

    op.create_table(
        "payment_history",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("subscription_id", sa.String(length=36), nullable=True),
        sa.Column("xendit_invoice_id", sa.String(length=255), nullable=False),
        sa.Column("xendit_invoice_url", sa.String(length=500), nullable=True),
        sa.Column("plan", sa.String(length=20), nullable=False),
        sa.Column("billing_cycle", sa.String(length=20), nullable=False),
        sa.Column("amount_idr", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("payment_method", sa.String(length=50), nullable=True),
        sa.Column("payment_channel", sa.String(length=50), nullable=True),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("xendit_invoice_id"),
    )
    op.create_index("ix_payment_history_user_id", "payment_history", ["user_id"], unique=False)
    op.create_index("ix_payment_history_subscription_id", "payment_history", ["subscription_id"], unique=False)
    op.create_index("ix_payment_history_status_created", "payment_history", ["status", "created_at"], unique=False)

    op.create_table(
        "portfolio_holdings",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("ticker", sa.String(length=10), nullable=False),
        sa.Column("avg_buy_price", sa.Integer(), nullable=False),
        sa.Column("current_price", sa.Integer(), nullable=False),
        sa.Column("lot", sa.Integer(), nullable=False),
        sa.Column("cost_basis", sa.Integer(), nullable=False),
        sa.Column("market_value", sa.Integer(), nullable=False),
        sa.Column("unrealized_pnl", sa.Integer(), nullable=False),
        sa.Column("unrealized_pct", sa.Numeric(precision=8, scale=4), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("lot > 0", name="ck_holding_lot_positive"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "ticker", name="uq_user_ticker"),
    )
    op.create_index("ix_portfolio_holdings_user_id", "portfolio_holdings", ["user_id"], unique=False)
    op.create_index("ix_portfolio_holdings_user_market_value", "portfolio_holdings", ["user_id", "market_value"], unique=False)

    op.create_table(
        "trade_journal",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("ticker", sa.String(length=10), nullable=False),
        sa.Column("trade_type", sa.String(length=4), nullable=False),
        sa.Column("entry_price", sa.Integer(), nullable=False),
        sa.Column("exit_price", sa.Integer(), nullable=True),
        sa.Column("lot", sa.Integer(), nullable=False),
        sa.Column("strategy", sa.String(length=20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("realized_pnl", sa.Integer(), nullable=True),
        sa.Column("realized_pct", sa.Numeric(precision=8, scale=4), nullable=True),
        sa.Column("status", sa.String(length=6), server_default="OPEN", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("lot > 0", name="ck_trade_lot_positive"),
        sa.CheckConstraint("trade_type IN ('BUY', 'SELL')", name="ck_trade_type"),
        sa.CheckConstraint("status IN ('OPEN', 'CLOSED')", name="ck_trade_status"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trade_journal_user_id", "trade_journal", ["user_id"], unique=False)
    op.create_index("ix_trade_journal_user_date", "trade_journal", ["user_id", "trade_date"], unique=False)
    op.create_index("ix_trade_journal_user_status", "trade_journal", ["user_id", "status"], unique=False)

    op.create_table(
        "broker_cash",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("cash_balance", sa.BigInteger(), server_default="0", nullable=False),
        sa.Column("last_updated", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_broker_cash_user_id", "broker_cash", ["user_id"], unique=False)

    op.create_table(
        "stocks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("sector", sa.String(length=100), nullable=True),
        sa.Column("subsector", sa.String(length=100), nullable=True),
        sa.Column("market_cap", sa.Float(), nullable=True),
        sa.Column("listed_shares", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("ticker"),
    )
    op.create_index("ix_stocks_id", "stocks", ["id"], unique=False)
    op.create_index("ix_stocks_ticker", "stocks", ["ticker"], unique=False)
    op.create_index("ix_stocks_sector", "stocks", ["sector"], unique=False)

    op.create_table(
        "stock_prices",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=10), nullable=False),
        sa.Column("date", sa.DateTime(), nullable=False),
        sa.Column("open", sa.Float(), nullable=True),
        sa.Column("high", sa.Float(), nullable=True),
        sa.Column("low", sa.Float(), nullable=True),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("volume", sa.Float(), nullable=True),
        sa.Column("value", sa.Float(), nullable=True),
        sa.Column("frequency", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_stock_prices_id", "stock_prices", ["id"], unique=False)
    op.create_index("ix_stock_prices_ticker", "stock_prices", ["ticker"], unique=False)
    op.create_index("idx_ticker_date", "stock_prices", ["ticker", "date"], unique=True)

    op.create_table(
        "watchlist",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=10), nullable=False),
        sa.Column("target_price", sa.Float(), nullable=True),
        sa.Column("stop_loss", sa.Float(), nullable=True),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.Column("added_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_watchlist_id", "watchlist", ["id"], unique=False)
    op.create_index("ix_watchlist_ticker", "watchlist", ["ticker"], unique=False)

    op.create_table(
        "analysis_cache",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=10), nullable=False),
        sa.Column("analysis_type", sa.String(length=50), nullable=False),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("signal", sa.String(length=20), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_analysis_cache_id", "analysis_cache", ["id"], unique=False)
    op.create_index("ix_analysis_cache_ticker", "analysis_cache", ["ticker"], unique=False)
    op.create_index("ix_analysis_cache_ticker_type_expires", "analysis_cache", ["ticker", "analysis_type", "expires_at"], unique=False)


def downgrade() -> None:
    op.drop_table("analysis_cache")
    op.drop_table("watchlist")
    op.drop_table("stock_prices")
    op.drop_table("stocks")
    op.drop_table("broker_cash")
    op.drop_table("trade_journal")
    op.drop_table("portfolio_holdings")
    op.drop_table("payment_history")
    op.drop_table("subscriptions")
    op.drop_table("user_sessions")
    op.drop_table("notification_preferences")
    op.drop_table("password_reset_tokens")
    op.drop_table("remember_me_tokens")
    op.drop_table("users")
