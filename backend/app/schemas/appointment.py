from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.appointment import AppointmentStatus, AppointmentTestStatus
from app.models.patient import Gender


class AppointmentCreate(BaseModel):
    patient_id: int = Field(gt=0)
    appointment_date: date
    appointment_time: time
    test_ids: list[int] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def validate_schedule(self) -> "AppointmentCreate":
        if datetime.combine(self.appointment_date, self.appointment_time) < datetime.now():
            raise ValueError("Appointment date and time cannot be in the past")
        if len(self.test_ids) != len(set(self.test_ids)):
            raise ValueError("Each laboratory test can only be selected once")
        return self


class AppointmentPatientRead(BaseModel):
    id: int
    full_name: str
    date_of_birth: date
    gender: Gender
    phone: str
    email: str | None
    model_config = ConfigDict(from_attributes=True)


class OrderedLaboratoryTestRead(BaseModel):
    id: int
    test_code: str
    test_name: str
    sample_type: str
    price: Decimal
    model_config = ConfigDict(from_attributes=True)


class AppointmentTestRead(BaseModel):
    id: int
    status: AppointmentTestStatus
    result_value: str | None
    result_unit: str | None
    reference_range: str | None
    result_notes: str | None
    completed_at: datetime | None
    authorized_at: datetime | None
    authorized_by_id: int | None
    recheck_notes: str | None
    laboratory_test: OrderedLaboratoryTestRead
    model_config = ConfigDict(from_attributes=True)


class AppointmentRead(BaseModel):
    id: int
    patient_id: int
    appointment_date: date
    appointment_time: time
    status: AppointmentStatus
    created_at: datetime
    patient: AppointmentPatientRead
    ordered_tests: list[AppointmentTestRead]
    model_config = ConfigDict(from_attributes=True)


class AppointmentList(BaseModel):
    items: list[AppointmentRead]
    total: int
    page: int
    page_size: int


class AppointmentTestStatusUpdate(BaseModel):
    status: AppointmentTestStatus


class AppointmentTestResultCreate(BaseModel):
    result_value: str = Field(min_length=1, max_length=255)
    result_unit: str | None = Field(default=None, max_length=80)
    reference_range: str | None = Field(default=None, max_length=255)
    result_notes: str | None = Field(default=None, max_length=4000)


class AppointmentTestAuthorization(BaseModel):
    authorize: bool
    notes: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def require_recheck_notes(self) -> "AppointmentTestAuthorization":
        if not self.authorize and not (self.notes and self.notes.strip()):
            raise ValueError("Recheck notes are required when flagging a result")
        return self
