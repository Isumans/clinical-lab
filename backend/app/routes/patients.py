from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import require_roles
from app.models.patient import Gender, Patient
from app.models.user import User, UserRole
from app.schemas.patient import PatientCreate, PatientList, PatientRead, PatientUpdate
from app.services.patients import create_patient, list_patients, update_patient


router = APIRouter(prefix="/patients", tags=["patients"])
patient_staff = require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
PatientStaff = Annotated[User, Depends(patient_staff)]


def get_patient_or_404(patient_id: int, db: Session) -> Patient:
    patient = db.get(Patient, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient


@router.get("", response_model=PatientList)
def read_patients(
    _: PatientStaff,
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, max_length=160),
    gender: Gender | None = None,
    born_from: date | None = None,
    born_to: date | None = None,
    sort_by: Literal["created_at", "full_name", "date_of_birth"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PatientList:
    if born_from and born_to and born_from > born_to:
        raise HTTPException(status_code=422, detail="Start date must be before end date")
    patients, total = list_patients(
        db,
        search=search,
        gender=gender,
        born_from=born_from,
        born_to=born_to,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )
    return PatientList(items=patients, total=total, page=page, page_size=page_size)


@router.post("", response_model=PatientRead, status_code=status.HTTP_201_CREATED)
def add_patient(payload: PatientCreate, _: PatientStaff, db: Session = Depends(get_db)) -> Patient:
    return create_patient(db, payload)


@router.get("/{patient_id}", response_model=PatientRead)
def read_patient(patient_id: int, _: PatientStaff, db: Session = Depends(get_db)) -> Patient:
    return get_patient_or_404(patient_id, db)


@router.put("/{patient_id}", response_model=PatientRead)
def edit_patient(
    patient_id: int,
    payload: PatientUpdate,
    _: PatientStaff,
    db: Session = Depends(get_db),
) -> Patient:
    return update_patient(db, get_patient_or_404(patient_id, db), payload)
