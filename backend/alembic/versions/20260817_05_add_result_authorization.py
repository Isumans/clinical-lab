"""add result authorization workflow

Revision ID: 20260817_05
Revises: 20260817_04
Create Date: 2026-08-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260817_05"
down_revision: Union[str, Sequence[str], None] = "20260817_04"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE appointment_test_status ADD VALUE IF NOT EXISTS 'RECHECK_REQUIRED'")
    op.execute("ALTER TYPE appointment_test_status ADD VALUE IF NOT EXISTS 'AUTHORIZED'")
    op.add_column("appointment_tests", sa.Column("authorized_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointment_tests", sa.Column("authorized_by_id", sa.Integer(), nullable=True))
    op.add_column("appointment_tests", sa.Column("recheck_notes", sa.Text(), nullable=True))
    op.create_foreign_key("fk_appointment_tests_authorized_by", "appointment_tests", "users", ["authorized_by_id"], ["id"], ondelete="SET NULL")
    op.create_index(op.f("ix_appointment_tests_authorized_by_id"), "appointment_tests", ["authorized_by_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_appointment_tests_authorized_by_id"), table_name="appointment_tests")
    op.drop_constraint("fk_appointment_tests_authorized_by", "appointment_tests", type_="foreignkey")
    op.drop_column("appointment_tests", "recheck_notes")
    op.drop_column("appointment_tests", "authorized_by_id")
    op.drop_column("appointment_tests", "authorized_at")
