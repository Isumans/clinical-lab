from datetime import date, timedelta

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.laboratory_test import LaboratoryTest, TestStatus
from app.models.patient import Gender, Patient
from app.models.user import User, UserRole
from app.services.security import hash_password


def auth_headers(client: TestClient, db: Session, role: UserRole) -> dict[str, str]:
    email = f"appointment-{role.value.lower()}@example.com"
    password = "SecureTestPassword123"
    db.add(User(name=role.value.title(), email=email, password_hash=hash_password(password), role=role))
    db.commit()
    token = client.post("/auth/login", json={"email": email, "password": password}).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def appointment_dependencies(db: Session, test_status: TestStatus = TestStatus.ACTIVE) -> tuple[Patient, LaboratoryTest]:
    patient = Patient(full_name="Appointment Patient", date_of_birth=date(1995, 4, 12), gender=Gender.OTHER, phone="0771234567", email="appointment.patient@example.com", address="20 Main Street")
    laboratory_test = LaboratoryTest(test_code="APP-T1", test_name="Appointment Test", description=None, sample_type="Serum", price="1200.00", status=test_status)
    db.add_all([patient, laboratory_test])
    db.commit()
    db.refresh(patient)
    db.refresh(laboratory_test)
    return patient, laboratory_test


def appointment_payload(patient_id: int, test_id: int) -> dict[str, object]:
    return {"patient_id": patient_id, "appointment_date": (date.today() + timedelta(days=1)).isoformat(), "appointment_time": "09:30:00", "test_ids": [test_id]}


def test_receptionist_can_create_list_and_view_appointment(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.RECEPTIONIST)
    patient, laboratory_test = appointment_dependencies(db)

    created = client.post("/appointments", json=appointment_payload(patient.id, laboratory_test.id), headers=headers)
    assert created.status_code == status.HTTP_201_CREATED
    body = created.json()
    assert body["status"] == "SCHEDULED"
    assert body["patient"]["full_name"] == "Appointment Patient"
    assert body["ordered_tests"][0]["status"] == "PENDING"
    assert body["ordered_tests"][0]["laboratory_test"]["test_code"] == "APP-T1"

    listed = client.get("/appointments?search=Appointment Patient", headers=headers)
    assert listed.status_code == status.HTTP_200_OK
    assert listed.json()["total"] == 1
    assert client.get(f"/appointments/{body['id']}", headers=headers).status_code == status.HTTP_200_OK


def test_inactive_test_cannot_be_ordered(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.ADMIN)
    patient, laboratory_test = appointment_dependencies(db, TestStatus.INACTIVE)

    response = client.post("/appointments", json=appointment_payload(patient.id, laboratory_test.id), headers=headers)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert response.json()["detail"] == "Inactive laboratory tests cannot be ordered"


def test_technician_can_read_but_cannot_create_appointments(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.TECHNICIAN)
    patient, laboratory_test = appointment_dependencies(db)

    assert client.get("/appointments", headers=headers).status_code == status.HTTP_200_OK
    assert client.post("/appointments", json=appointment_payload(patient.id, laboratory_test.id), headers=headers).status_code == status.HTTP_403_FORBIDDEN


def test_past_appointment_is_rejected(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.RECEPTIONIST)
    patient, laboratory_test = appointment_dependencies(db)
    payload = appointment_payload(patient.id, laboratory_test.id)
    payload["appointment_date"] = (date.today() - timedelta(days=1)).isoformat()

    response = client.post("/appointments", json=payload, headers=headers)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_technician_can_complete_and_authorize_result_workflow(client: TestClient, db: Session) -> None:
    receptionist_headers = auth_headers(client, db, UserRole.RECEPTIONIST)
    technician_headers = auth_headers(client, db, UserRole.TECHNICIAN)
    patient, laboratory_test = appointment_dependencies(db)
    appointment = client.post("/appointments", json=appointment_payload(patient.id, laboratory_test.id), headers=receptionist_headers).json()
    ordered_test_id = appointment["ordered_tests"][0]["id"]

    assert client.post(f"/appointment-tests/{ordered_test_id}/result", json={"result_value": "110"}, headers=technician_headers).status_code == status.HTTP_409_CONFLICT

    collected = client.patch(f"/appointment-tests/{ordered_test_id}/status", json={"status": "IN_PROGRESS"}, headers=technician_headers)
    assert collected.status_code == status.HTTP_200_OK
    assert collected.json()["status"] == "IN_PROGRESS"

    entered = client.post(f"/appointment-tests/{ordered_test_id}/result", json={"result_value": "110", "result_unit": "mg", "reference_range": "100-120", "result_notes": "Within range"}, headers=technician_headers)
    assert entered.status_code == status.HTTP_200_OK
    assert entered.json()["status"] == "COMPLETED"
    assert entered.json()["completed_at"] is not None

    authorized = client.post(f"/appointment-tests/{ordered_test_id}/authorize", json={"authorize": True}, headers=technician_headers)
    assert authorized.status_code == status.HTTP_200_OK
    assert authorized.json()["status"] == "AUTHORIZED"
    assert authorized.json()["authorized_at"] is not None
    assert client.post(f"/appointment-tests/{ordered_test_id}/authorize", json={"authorize": True}, headers=technician_headers).status_code == status.HTTP_409_CONFLICT

    report = client.get(f"/reports/{appointment['id']}", headers=receptionist_headers)
    assert report.status_code == status.HTTP_200_OK
    assert report.json()["ordered_tests"][0]["result_value"] == "110"


def test_completed_result_can_be_flagged_and_reentered(client: TestClient, db: Session) -> None:
    receptionist_headers = auth_headers(client, db, UserRole.RECEPTIONIST)
    technician_headers = auth_headers(client, db, UserRole.TECHNICIAN)
    patient, laboratory_test = appointment_dependencies(db)
    appointment = client.post("/appointments", json=appointment_payload(patient.id, laboratory_test.id), headers=receptionist_headers).json()
    ordered_test_id = appointment["ordered_tests"][0]["id"]
    client.patch(f"/appointment-tests/{ordered_test_id}/status", json={"status": "IN_PROGRESS"}, headers=technician_headers)
    client.post(f"/appointment-tests/{ordered_test_id}/result", json={"result_value": "999"}, headers=technician_headers)

    missing_notes = client.post(f"/appointment-tests/{ordered_test_id}/authorize", json={"authorize": False}, headers=technician_headers)
    assert missing_notes.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    flagged = client.post(f"/appointment-tests/{ordered_test_id}/authorize", json={"authorize": False, "notes": "Repeat the measurement"}, headers=technician_headers)
    assert flagged.status_code == status.HTTP_200_OK
    assert flagged.json()["status"] == "RECHECK_REQUIRED"

    corrected = client.post(f"/appointment-tests/{ordered_test_id}/result", json={"result_value": "115"}, headers=technician_headers)
    assert corrected.status_code == status.HTTP_200_OK
    assert corrected.json()["status"] == "COMPLETED"


def test_receptionist_cannot_change_laboratory_workflow(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.RECEPTIONIST)
    patient, laboratory_test = appointment_dependencies(db)
    appointment = client.post("/appointments", json=appointment_payload(patient.id, laboratory_test.id), headers=headers).json()
    ordered_test_id = appointment["ordered_tests"][0]["id"]

    assert client.patch(f"/appointment-tests/{ordered_test_id}/status", json={"status": "IN_PROGRESS"}, headers=headers).status_code == status.HTTP_403_FORBIDDEN
