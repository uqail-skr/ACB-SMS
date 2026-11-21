"""add usernames to users

Revision ID: 20261120120000
Revises: 35db5d9bb045
Create Date: 2026-11-20 12:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261120120000"
down_revision: Union[str, None] = "35db5d9bb045"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=254), nullable=True))
    op.execute(sa.text("UPDATE users SET username = email WHERE username IS NULL"))
    op.alter_column("users", "username", existing_type=sa.String(length=254), nullable=False)
    op.create_unique_constraint("uq_users_username", "users", ["username"])


def downgrade() -> None:
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_column("users", "username")
