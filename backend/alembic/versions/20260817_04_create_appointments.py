"""create appointments and ordered tests

Revision ID: 20260817_04
Revises: 20260817_03
Create Date: 2026-08-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260817_04"
down_revision: Union[str, Sequence[str], None] = "20260817_03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

appointment_status = postgresql.ENUM("SCHEDULED", "CHECKED_IN", "SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", name="appointment_status", create_type=False)
test_status = postgresql.ENUM("PENDING", "SAMPLE_COLLECTED", "IN_PROGRESS", "COMPLETED", "CANCELLED", name="appointment_test_status", create_type=False)


def upgrade() -> None:
    appointment_status.create(op.get_bind(), checkfirst=True)
    test_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("appointment_date", sa.Date(), nullable=False),
        sa.Column("appointment_time", sa.Time(), nullable=False),
        sa.Column("status", appointment_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_appointments_appointment_date"), "appointments", ["appointment_date"], unique=False)
    op.create_index(op.f("ix_appointments_patient_id"), "appointments", ["patient_id"], unique=False)
    op.create_index(op.f("ix_appointments_status"), "appointments", ["status"], unique=False)
    op.create_table(
        "appointment_tests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("appointment_id", sa.Integer(), nullable=False),
        sa.Column("test_id", sa.Integer(), nullable=False),
        sa.Column("status", test_status, nullable=False),
        sa.Column("result_value", sa.String(length=255), nullable=True),
        sa.Column("result_unit", sa.String(length=80), nullable=True),
        sa.Column("reference_range", sa.String(length=255), nullable=True),
        sa.Column("result_notes", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["test_id"], ["laboratory_tests.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("appointment_id", "test_id", name="uq_appointment_test"),
    )
    op.create_index(op.f("ix_appointment_tests_appointment_id"), "appointment_tests", ["appointment_id"], unique=False)
    op.create_index(op.f("ix_appointment_tests_status"), "appointment_tests", ["status"], unique=False)
    op.create_index(op.f("ix_appointment_tests_test_id"), "appointment_tests", ["test_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_appointment_tests_test_id"), table_name="appointment_tests")
    op.drop_index(op.f("ix_appointment_tests_status"), table_name="appointment_tests")
    op.drop_index(op.f("ix_appointment_tests_appointment_id"), table_name="appointment_tests")
    op.drop_table("appointment_tests")
    op.drop_index(op.f("ix_appointments_status"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_patient_id"), table_name="appointments")
    op.drop_index(op.f("ix_appointments_appointment_date"), table_name="appointments")
    op.drop_table("appointments")
    test_status.drop(op.get_bind(), checkfirst=True)
    appointment_status.drop(op.get_bind(), checkfirst=True)
