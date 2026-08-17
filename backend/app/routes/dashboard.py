from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import require_roles
from app.models.appointment import Appointment, AppointmentTest, AppointmentTestStatus
from app.models.patient import Patient
from app.models.user import User, UserRole
from app.schemas.dashboard import DashboardSummary


router = APIRouter(prefix="/dashboard", tags=["dashboard"])
dashboard_user = require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.TECHNICIAN)
DashboardUser = Annotated[User, Depends(dashboard_user)]


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(_: DashboardUser, db: Session = Depends(get_db)) -> DashboardSummary:
    total_patients = db.scalar(select(func.count(Patient.id))) or 0
    todays_appointments = db.scalar(select(func.count(Appointment.id)).where(Appointment.appointment_date == date.today())) or 0
    pending_tests = db.scalar(select(func.count(AppointmentTest.id)).where(AppointmentTest.status.in_([AppointmentTestStatus.PENDING, AppointmentTestStatus.IN_PROGRESS, AppointmentTestStatus.RECHECK_REQUIRED]))) or 0
    completed_tests = db.scalar(select(func.count(AppointmentTest.id)).where(AppointmentTest.status.in_([AppointmentTestStatus.COMPLETED, AppointmentTestStatus.AUTHORIZED]))) or 0
    return DashboardSummary(
        total_patients=total_patients,
        todays_appointments=todays_appointments,
        pending_tests=pending_tests,
        completed_tests=completed_tests,
    )
