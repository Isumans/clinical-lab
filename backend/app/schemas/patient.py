from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.patient import Gender


class PatientBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    date_of_birth: date
    gender: Gender
    phone: str = Field(min_length=7, max_length=32, pattern=r"^[0-9+()\-\s]+$")
    email: EmailStr | None = None
    address: str = Field(min_length=3, max_length=500)

    @field_validator("full_name", "phone", "address")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_cannot_be_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return value


class PatientCreate(PatientBase):
    pass


class PatientUpdate(PatientBase):
    pass


class PatientRead(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PatientList(BaseModel):
    items: list[PatientRead]
    total: int
    page: int
    page_size: int
