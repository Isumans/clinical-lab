from datetime import date, datetime, time
from enum import Enum

from sqlalchemy import Date, DateTime, Enum as SqlEnum, ForeignKey, String, Text, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AppointmentStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    CHECKED_IN = "CHECKED_IN"
    SAMPLE_COLLECTED = "SAMPLE_COLLECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class AppointmentTestStatus(str, Enum):
    PENDING = "PENDING"
    SAMPLE_COLLECTED = "SAMPLE_COLLECTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    RECHECK_REQUIRED = "RECHECK_REQUIRED"
    AUTHORIZED = "AUTHORIZED"
    CANCELLED = "CANCELLED"


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="RESTRICT"), index=True, nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    appointment_time: Mapped[time] = mapped_column(Time, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(SqlEnum(AppointmentStatus, name="appointment_status"), index=True, nullable=False, default=AppointmentStatus.SCHEDULED)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    patient = relationship("Patient", lazy="selectin")
    ordered_tests: Mapped[list["AppointmentTest"]] = relationship(back_populates="appointment", cascade="all, delete-orphan", lazy="selectin")


class AppointmentTest(Base):
    __tablename__ = "appointment_tests"
    __table_args__ = (UniqueConstraint("appointment_id", "test_id", name="uq_appointment_test"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), index=True, nullable=False)
    test_id: Mapped[int] = mapped_column(ForeignKey("laboratory_tests.id", ondelete="RESTRICT"), index=True, nullable=False)
    status: Mapped[AppointmentTestStatus] = mapped_column(SqlEnum(AppointmentTestStatus, name="appointment_test_status"), index=True, nullable=False, default=AppointmentTestStatus.PENDING)
    result_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result_unit: Mapped[str | None] = mapped_column(String(80), nullable=True)
    reference_range: Mapped[str | None] = mapped_column(String(255), nullable=True)
    result_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    authorized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    authorized_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    recheck_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    appointment: Mapped[Appointment] = relationship(back_populates="ordered_tests")
    laboratory_test = relationship("LaboratoryTest", lazy="selectin")
    authorized_by = relationship("User", lazy="selectin")
