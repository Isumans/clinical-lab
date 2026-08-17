from datetime import date, datetime
from enum import Enum

from sqlalchemy import Date, DateTime, Enum as SqlEnum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Gender(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    gender: Mapped[Gender] = mapped_column(SqlEnum(Gender, name="patient_gender"), index=True, nullable=False)
    phone: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    email: Mapped[str | None] = mapped_column(String(320), index=True, nullable=True)
    address: Mapped[str] = mapped_column(String(500), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
