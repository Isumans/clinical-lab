"""add team management fields

Revision ID: 20260817_06
Revises: 20260817_05
Create Date: 2026-08-17
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260817_06"
down_revision: Union[str, Sequence[str], None] = "20260817_05"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), server_default=sa.text("false"), nullable=False))


def downgrade() -> None:
    op.drop_column("users", "must_change_password")
    op.drop_column("users", "phone")
