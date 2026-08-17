"""create laboratory tests table

Revision ID: 20260817_03
Revises: 20260817_02
Create Date: 2026-08-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260817_03"
down_revision: Union[str, Sequence[str], None] = "20260817_02"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

status_enum = postgresql.ENUM("ACTIVE", "INACTIVE", name="laboratory_test_status", create_type=False)


def upgrade() -> None:
    status_enum.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "laboratory_tests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("test_code", sa.String(length=32), nullable=False),
        sa.Column("test_name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sample_type", sa.String(length=80), nullable=False),
        sa.Column("price", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("status", status_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_laboratory_tests_sample_type"), "laboratory_tests", ["sample_type"], unique=False)
    op.create_index(op.f("ix_laboratory_tests_status"), "laboratory_tests", ["status"], unique=False)
    op.create_index(op.f("ix_laboratory_tests_test_code"), "laboratory_tests", ["test_code"], unique=True)
    op.create_index(op.f("ix_laboratory_tests_test_name"), "laboratory_tests", ["test_name"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_laboratory_tests_test_name"), table_name="laboratory_tests")
    op.drop_index(op.f("ix_laboratory_tests_test_code"), table_name="laboratory_tests")
    op.drop_index(op.f("ix_laboratory_tests_status"), table_name="laboratory_tests")
    op.drop_index(op.f("ix_laboratory_tests_sample_type"), table_name="laboratory_tests")
    op.drop_table("laboratory_tests")
    status_enum.drop(op.get_bind(), checkfirst=True)
