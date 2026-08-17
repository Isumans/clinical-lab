"""create patients table

Revision ID: 20260817_02
Revises: 20260817_01
Create Date: 2026-08-17
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260817_02"
down_revision: Union[str, Sequence[str], None] = "20260817_01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

gender_enum = postgresql.ENUM(
    "MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY", name="patient_gender", create_type=False
)


def upgrade() -> None:
    gender_enum.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", gender_enum, nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("address", sa.String(length=500), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_patients_date_of_birth"), "patients", ["date_of_birth"], unique=False)
    op.create_index(op.f("ix_patients_email"), "patients", ["email"], unique=False)
    op.create_index(op.f("ix_patients_full_name"), "patients", ["full_name"], unique=False)
    op.create_index(op.f("ix_patients_gender"), "patients", ["gender"], unique=False)
    op.create_index(op.f("ix_patients_phone"), "patients", ["phone"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_patients_phone"), table_name="patients")
    op.drop_index(op.f("ix_patients_gender"), table_name="patients")
    op.drop_index(op.f("ix_patients_full_name"), table_name="patients")
    op.drop_index(op.f("ix_patients_email"), table_name="patients")
    op.drop_index(op.f("ix_patients_date_of_birth"), table_name="patients")
    op.drop_table("patients")
    gender_enum.drop(op.get_bind(), checkfirst=True)
