from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import require_roles
from app.models.appointment import Appointment, AppointmentStatus
from app.models.user import User, UserRole
from app.schemas.appointment import AppointmentCreate, AppointmentList, AppointmentRead
from app.services.appointments import create_appointment, list_appointments


router = APIRouter(prefix="/appointments", tags=["appointments"])
AppointmentReader = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.TECHNICIAN))]
AppointmentWriter = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST))]


@router.get("", response_model=AppointmentList)
def read_appointments(_: AppointmentReader, db: Session = Depends(get_db), search: str | None = Query(default=None, max_length=160), appointment_status: AppointmentStatus | None = Query(default=None, alias="status"), date_from: date | None = None, date_to: date | None = None, sort_order: Literal["asc", "desc"] = "desc", page: int = Query(default=1, ge=1), page_size: int = Query(default=20, ge=1, le=100)) -> AppointmentList:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="Start date must be before end date")
    items, total = list_appointments(db, search=search, appointment_status=appointment_status, date_from=date_from, date_to=date_to, sort_order=sort_order, page=page, page_size=page_size)
    return AppointmentList(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def add_appointment(payload: AppointmentCreate, _: AppointmentWriter, db: Session = Depends(get_db)) -> Appointment:
    return create_appointment(db, payload)


@router.get("/{appointment_id}", response_model=AppointmentRead)
def read_appointment(appointment_id: int, _: AppointmentReader, db: Session = Depends(get_db)) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")
    return appointment
