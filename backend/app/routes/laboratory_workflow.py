from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import require_roles
from app.models.appointment import Appointment, AppointmentTest, AppointmentTestStatus
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.appointment import (
    AppointmentList,
    AppointmentRead,
    AppointmentTestAuthorization,
    AppointmentTestRead,
    AppointmentTestResultCreate,
    AppointmentTestStatusUpdate,
)
from app.services.laboratory_workflow import mark_sample_collected, review_result, save_result


router = APIRouter(tags=["laboratory workflow"])
WorkflowReader = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.TECHNICIAN))]
WorkflowWriter = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.TECHNICIAN))]


@router.patch("/appointment-tests/{ordered_test_id}/status", response_model=AppointmentTestRead)
def update_test_status(ordered_test_id: int, payload: AppointmentTestStatusUpdate, _: WorkflowWriter, db: Session = Depends(get_db)) -> AppointmentTest:
    if payload.status != AppointmentTestStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Sample collection can only move a test to IN_PROGRESS")
    return mark_sample_collected(db, ordered_test_id)


@router.post("/appointment-tests/{ordered_test_id}/result", response_model=AppointmentTestRead)
def enter_test_result(ordered_test_id: int, payload: AppointmentTestResultCreate, _: WorkflowWriter, db: Session = Depends(get_db)) -> AppointmentTest:
    return save_result(db, ordered_test_id, payload)


@router.post("/appointment-tests/{ordered_test_id}/authorize", response_model=AppointmentTestRead)
def authorize_test_result(ordered_test_id: int, payload: AppointmentTestAuthorization, user: WorkflowWriter, db: Session = Depends(get_db)) -> AppointmentTest:
    return review_result(db, ordered_test_id, payload, user)


@router.get("/reports", response_model=AppointmentList)
def read_reports(_: WorkflowReader, db: Session = Depends(get_db), search: str | None = Query(default=None, max_length=160), test_status: AppointmentTestStatus | None = Query(default=None, alias="status"), page: int = Query(default=1, ge=1), page_size: int = Query(default=20, ge=1, le=100)) -> AppointmentList:
    report_statuses = [AppointmentTestStatus.IN_PROGRESS, AppointmentTestStatus.COMPLETED, AppointmentTestStatus.RECHECK_REQUIRED, AppointmentTestStatus.AUTHORIZED]
    filters = [Appointment.ordered_tests.any(AppointmentTest.status.in_(report_statuses))]
    if test_status is not None:
        filters.append(Appointment.ordered_tests.any(AppointmentTest.status == test_status))
    if search and (term := search.strip()):
        pattern = f"%{term}%"
        filters.append(or_(Patient.full_name.ilike(pattern), cast(Appointment.id, String).ilike(pattern)))
    total = db.scalar(select(func.count(Appointment.id)).join(Appointment.patient).where(*filters)) or 0
    statement = select(Appointment).join(Appointment.patient).where(*filters).order_by(Appointment.appointment_date.desc(), Appointment.id.desc()).offset((page - 1) * page_size).limit(page_size)
    items = list(db.scalars(statement).unique().all())
    return AppointmentList(items=items, total=total, page=page, page_size=page_size)


@router.get("/reports/{appointment_id}", response_model=AppointmentRead)
def read_report(appointment_id: int, _: WorkflowReader, db: Session = Depends(get_db)) -> Appointment:
    appointment = db.get(Appointment, appointment_id)
    report_statuses = {AppointmentTestStatus.IN_PROGRESS, AppointmentTestStatus.COMPLETED, AppointmentTestStatus.RECHECK_REQUIRED, AppointmentTestStatus.AUTHORIZED}
    if appointment is None or not any(item.status in report_statuses for item in appointment.ordered_tests):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")
    return appointment
