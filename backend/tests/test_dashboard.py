from datetime import date, time

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.appointment import Appointment, AppointmentTest, AppointmentTestStatus
from app.models.laboratory_test import LaboratoryTest, TestStatus
from app.models.patient import Gender, Patient
from app.models.user import User, UserRole
from app.services.security import hash_password


def auth_headers(client: TestClient, db: Session, role: UserRole) -> dict[str, str]:
    email = f"dashboard-{role.value.lower()}@example.com"
    password = "SecureDashboardPassword123"
    db.add(User(name=f"{role.value.title()} User", email=email, password_hash=hash_password(password), role=role))
    db.commit()
    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def seed_dashboard_data(db: Session) -> None:
    patient = Patient(full_name="Dashboard Patient", date_of_birth=date(1990, 2, 3), gender=Gender.FEMALE, phone="0770001122", email=None, address="Colombo")
    tests = [LaboratoryTest(test_code=f"DASH-{index}", test_name=f"Dashboard Test {index}", sample_type="Serum", price="100.00", status=TestStatus.ACTIVE) for index in range(5)]
    db.add_all([patient, *tests])
    db.flush()
    appointment = Appointment(patient_id=patient.id, appointment_date=date.today(), appointment_time=time(9, 0))
    appointment.ordered_tests = [AppointmentTest(test_id=laboratory_test.id, status=test_status) for laboratory_test, test_status in zip(tests, [AppointmentTestStatus.PENDING, AppointmentTestStatus.IN_PROGRESS, AppointmentTestStatus.RECHECK_REQUIRED, AppointmentTestStatus.COMPLETED, AppointmentTestStatus.AUTHORIZED], strict=True)]
    db.add(appointment)
    db.commit()


def test_dashboard_returns_live_workflow_metrics_for_every_role(client: TestClient, db: Session) -> None:
    seed_dashboard_data(db)
    for role in UserRole:
        response = client.get("/dashboard/summary", headers=auth_headers(client, db, role))
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"total_patients": 1, "todays_appointments": 1, "pending_tests": 3, "completed_tests": 2}


def test_dashboard_requires_authentication(client: TestClient) -> None:
    response = client.get("/dashboard/summary")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
