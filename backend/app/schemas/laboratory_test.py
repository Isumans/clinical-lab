from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.laboratory_test import TestStatus


class LaboratoryTestBase(BaseModel):
    test_code: str = Field(min_length=2, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")
    test_name: str = Field(min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    sample_type: str = Field(min_length=2, max_length=80)
    price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    status: TestStatus = TestStatus.ACTIVE

    @field_validator("test_code")
    @classmethod
    def normalize_code(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("test_name", "sample_type")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("description")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


class LaboratoryTestCreate(LaboratoryTestBase):
    pass


class LaboratoryTestUpdate(LaboratoryTestBase):
    pass


class LaboratoryTestStatusUpdate(BaseModel):
    status: TestStatus


class LaboratoryTestRead(LaboratoryTestBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LaboratoryTestList(BaseModel):
    items: list[LaboratoryTestRead]
    total: int
    page: int
    page_size: int
