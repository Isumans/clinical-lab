from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TestStatus(str, Enum):
    __test__ = False
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class LaboratoryTest(Base):
    __tablename__ = "laboratory_tests"

    id: Mapped[int] = mapped_column(primary_key=True)
    test_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    test_name: Mapped[str] = mapped_column(String(160), index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sample_type: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[TestStatus] = mapped_column(
        SqlEnum(TestStatus, name="laboratory_test_status"), index=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
