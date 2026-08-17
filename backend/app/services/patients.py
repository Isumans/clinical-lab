from datetime import date

from sqlalchemy import String, asc, cast, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.patient import Gender, Patient
from app.schemas.patient import PatientCreate, PatientUpdate


def list_patients(
    db: Session,
    *,
    search: str | None,
    gender: Gender | None,
    born_from: date | None,
    born_to: date | None,
    sort_by: str,
    sort_order: str,
    page: int,
    page_size: int,
) -> tuple[list[Patient], int]:
    filters = []
    if search and (term := search.strip()):
        pattern = f"%{term}%"
        filters.append(
            or_(
                Patient.full_name.ilike(pattern),
                Patient.email.ilike(pattern),
                Patient.phone.ilike(pattern),
                cast(Patient.id, String).ilike(pattern),
            )
        )
    if gender is not None:
        filters.append(Patient.gender == gender)
    if born_from is not None:
        filters.append(Patient.date_of_birth >= born_from)
    if born_to is not None:
        filters.append(Patient.date_of_birth <= born_to)

    sort_columns = {
        "created_at": Patient.created_at,
        "full_name": Patient.full_name,
        "date_of_birth": Patient.date_of_birth,
    }
    sort_column = sort_columns[sort_by]
    ordering = desc(sort_column) if sort_order == "desc" else asc(sort_column)

    total = db.scalar(select(func.count(Patient.id)).where(*filters)) or 0
    statement = (
        select(Patient)
        .where(*filters)
        .order_by(ordering, Patient.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(db.scalars(statement).all()), total


def create_patient(db: Session, payload: PatientCreate) -> Patient:
    patient = Patient(**payload.model_dump())
    if patient.email:
        patient.email = patient.email.lower()
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


def update_patient(db: Session, patient: Patient, payload: PatientUpdate) -> Patient:
    values = payload.model_dump()
    if values["email"]:
        values["email"] = values["email"].lower()
    for field, value in values.items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient
