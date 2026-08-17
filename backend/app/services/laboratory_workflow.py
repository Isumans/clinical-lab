from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.appointment import AppointmentStatus, AppointmentTest, AppointmentTestStatus
from app.models.user import User
from app.schemas.appointment import AppointmentTestAuthorization, AppointmentTestResultCreate


def get_ordered_test(db: Session, ordered_test_id: int) -> AppointmentTest:
    ordered_test = db.get(AppointmentTest, ordered_test_id)
    if ordered_test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment test not found")
    return ordered_test


def mark_sample_collected(db: Session, ordered_test_id: int) -> AppointmentTest:
    ordered_test = get_ordered_test(db, ordered_test_id)
    if ordered_test.status != AppointmentTestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only pending tests can be marked as sample collected")
    ordered_test.status = AppointmentTestStatus.IN_PROGRESS
    ordered_test.appointment.status = AppointmentStatus.SAMPLE_COLLECTED
    db.commit()
    db.refresh(ordered_test)
    return ordered_test


def save_result(db: Session, ordered_test_id: int, payload: AppointmentTestResultCreate) -> AppointmentTest:
    ordered_test = get_ordered_test(db, ordered_test_id)
    if ordered_test.status not in {AppointmentTestStatus.IN_PROGRESS, AppointmentTestStatus.RECHECK_REQUIRED}:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Results can only be entered for tests in progress or requiring recheck")
    ordered_test.result_value = payload.result_value.strip()
    ordered_test.result_unit = payload.result_unit.strip() if payload.result_unit else None
    ordered_test.reference_range = payload.reference_range.strip() if payload.reference_range else None
    ordered_test.result_notes = payload.result_notes.strip() if payload.result_notes else None
    ordered_test.recheck_notes = None
    ordered_test.status = AppointmentTestStatus.COMPLETED
    ordered_test.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(ordered_test)
    return ordered_test


def review_result(db: Session, ordered_test_id: int, payload: AppointmentTestAuthorization, user: User) -> AppointmentTest:
    ordered_test = get_ordered_test(db, ordered_test_id)
    if ordered_test.status != AppointmentTestStatus.COMPLETED:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only completed results can be reviewed")
    if payload.authorize:
        ordered_test.status = AppointmentTestStatus.AUTHORIZED
        ordered_test.authorized_at = datetime.now(timezone.utc)
        ordered_test.authorized_by_id = user.id
        ordered_test.recheck_notes = None
        if all(item.id == ordered_test.id or item.status == AppointmentTestStatus.AUTHORIZED for item in ordered_test.appointment.ordered_tests):
            ordered_test.appointment.status = AppointmentStatus.COMPLETED
    else:
        ordered_test.status = AppointmentTestStatus.RECHECK_REQUIRED
        ordered_test.recheck_notes = payload.notes.strip() if payload.notes else None
        ordered_test.authorized_at = None
        ordered_test.authorized_by_id = None
    db.commit()
    db.refresh(ordered_test)
    return ordered_test
