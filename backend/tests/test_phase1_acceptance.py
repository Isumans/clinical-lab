from datetime import date, timedelta

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.services.security import hash_password


def test_complete_phase1_role_workflow(client: TestClient, db: Session) -> None:
    admin_password = "AcceptanceAdminPassword123"
    admin = User(name="Acceptance Admin", email="acceptance.admin@example.com", password_hash=hash_password(admin_password), role=UserRole.ADMIN)
    db.add(admin)
    db.commit()
    admin_token = client.post("/auth/login", json={"email": admin.email, "password": admin_password}).json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    staff_headers: dict[str, dict[str, str]] = {}
    for role in (UserRole.RECEPTIONIST, UserRole.TECHNICIAN):
        email = f"acceptance.{role.value.lower()}@example.com"
        created = client.post("/users", headers=admin_headers, json={"name": f"Acceptance {role.value.title()}", "email": email, "phone": "0771234567", "role": role.value})
        assert created.status_code == status.HTTP_201_CREATED
        temporary_password = created.json()["temporary_password"]
        login = client.post("/auth/login", json={"email": email, "password": temporary_password})
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        assert client.get("/dashboard/summary", headers=headers).status_code == status.HTTP_403_FORBIDDEN
        permanent_password = f"Acceptance{role.value.title()}Password456"
        assert client.post("/auth/change-password", headers=headers, json={"current_password": temporary_password, "new_password": permanent_password}).status_code == status.HTTP_204_NO_CONTENT
        staff_headers[role.value] = headers

    test_response = client.post("/tests", headers=admin_headers, json={"test_code": "ACC-FBC", "test_name": "Acceptance Full Blood Count", "description": "Phase 1 acceptance test", "sample_type": "Blood", "price": "1500.00", "status": "ACTIVE"})
    assert test_response.status_code == status.HTTP_201_CREATED
    laboratory_test_id = test_response.json()["id"]

    receptionist_headers = staff_headers[UserRole.RECEPTIONIST.value]
    patient_response = client.post("/patients", headers=receptionist_headers, json={"full_name": "Acceptance Patient", "date_of_birth": "1995-06-15", "gender": "OTHER", "phone": "0712345678", "email": "acceptance.patient@example.com", "address": "Colombo"})
    assert patient_response.status_code == status.HTTP_201_CREATED
    patient_id = patient_response.json()["id"]

    appointment_response = client.post("/appointments", headers=receptionist_headers, json={"patient_id": patient_id, "appointment_date": (date.today() + timedelta(days=1)).isoformat(), "appointment_time": "09:30:00", "test_ids": [laboratory_test_id]})
    assert appointment_response.status_code == status.HTTP_201_CREATED
    appointment = appointment_response.json()
    ordered_test_id = appointment["ordered_tests"][0]["id"]

    technician_headers = staff_headers[UserRole.TECHNICIAN.value]
    assert client.post("/patients", headers=technician_headers, json={}).status_code == status.HTTP_403_FORBIDDEN
    assert client.patch(f"/appointment-tests/{ordered_test_id}/status", headers=technician_headers, json={"status": "IN_PROGRESS"}).json()["status"] == "IN_PROGRESS"
    completed = client.post(f"/appointment-tests/{ordered_test_id}/result", headers=technician_headers, json={"result_value": "13.5", "result_unit": "g/dL", "reference_range": "12.0-16.0", "result_notes": "Sample quality acceptable"})
    assert completed.json()["status"] == "COMPLETED"
    authorized = client.post(f"/appointment-tests/{ordered_test_id}/authorize", headers=technician_headers, json={"authorize": True, "notes": "Verified"})
    assert authorized.json()["status"] == "AUTHORIZED"

    report = client.get(f"/reports/{appointment['id']}", headers=receptionist_headers)
    assert report.status_code == status.HTTP_200_OK
    assert report.json()["ordered_tests"][0]["result_value"] == "13.5"
    assert report.json()["ordered_tests"][0]["status"] == "AUTHORIZED"
    assert client.get("/dashboard/summary", headers=admin_headers).status_code == status.HTTP_200_OK
