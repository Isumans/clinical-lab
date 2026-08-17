from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import String, asc, cast, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentStatus, AppointmentTest
from app.models.laboratory_test import LaboratoryTest, TestStatus
from app.models.patient import Patient
from app.schemas.appointment import AppointmentCreate


def list_appointments(db: Session, *, search: str | None, appointment_status: AppointmentStatus | None, date_from: date | None, date_to: date | None, sort_order: str, page: int, page_size: int) -> tuple[list[Appointment], int]:
    filters = []
    if search and (term := search.strip()):
        pattern = f"%{term}%"
        filters.append(or_(Patient.full_name.ilike(pattern), cast(Appointment.id, String).ilike(pattern)))
    if appointment_status is not None:
        filters.append(Appointment.status == appointment_status)
    if date_from is not None:
        filters.append(Appointment.appointment_date >= date_from)
    if date_to is not None:
        filters.append(Appointment.appointment_date <= date_to)
    ordering = desc(Appointment.appointment_date) if sort_order == "desc" else asc(Appointment.appointment_date)
    total = db.scalar(select(func.count(Appointment.id)).join(Appointment.patient).where(*filters)) or 0
    statement = select(Appointment).join(Appointment.patient).where(*filters).order_by(ordering, Appointment.appointment_time, Appointment.id).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(statement).unique().all()), total


def create_appointment(db: Session, payload: AppointmentCreate) -> Appointment:
    if db.get(Patient, payload.patient_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    tests = list(db.scalars(select(LaboratoryTest).where(LaboratoryTest.id.in_(payload.test_ids))).all())
    if len(tests) != len(payload.test_ids):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="One or more laboratory tests do not exist")
    if any(test.status != TestStatus.ACTIVE for test in tests):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Inactive laboratory tests cannot be ordered")
    appointment = Appointment(patient_id=payload.patient_id, appointment_date=payload.appointment_date, appointment_time=payload.appointment_time, status=AppointmentStatus.SCHEDULED)
    appointment.ordered_tests = [AppointmentTest(test_id=test_id) for test_id in payload.test_ids]
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment
