from datetime import date, timedelta

from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.services.security import hash_password


def auth_headers(client: TestClient, db: Session, role: UserRole) -> dict[str, str]:
    email = f"{role.value.lower()}@example.com"
    password = "SecureTestPassword123"
    db.add(
        User(
            name=role.value.title(),
            email=email,
            password_hash=hash_password(password),
            role=role,
        )
    )
    db.commit()
    response = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def patient_payload(name: str = "Nadeesha Fernando") -> dict[str, str]:
    return {
        "full_name": name,
        "date_of_birth": "2000-09-21",
        "gender": "FEMALE",
        "phone": "+94 77 987 6543",
        "email": "nadeesha@example.com",
        "address": "12 Lake Road, Colombo",
    }


def test_admin_can_create_list_view_and_update_patient(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.ADMIN)

    created = client.post("/patients", json=patient_payload(), headers=headers)
    assert created.status_code == status.HTTP_201_CREATED
    patient_id = created.json()["id"]

    listed = client.get("/patients?search=Nadeesha", headers=headers)
    assert listed.status_code == status.HTTP_200_OK
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["id"] == patient_id

    detail = client.get(f"/patients/{patient_id}", headers=headers)
    assert detail.status_code == status.HTTP_200_OK

    updated_payload = patient_payload("Nadeesha Silva")
    updated_payload["email"] = "Nadeesha.Silva@example.com"
    updated = client.put(f"/patients/{patient_id}", json=updated_payload, headers=headers)
    assert updated.status_code == status.HTTP_200_OK
    assert updated.json()["full_name"] == "Nadeesha Silva"
    assert updated.json()["email"] == "nadeesha.silva@example.com"


def test_receptionist_can_manage_patients(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.RECEPTIONIST)

    response = client.post("/patients", json=patient_payload(), headers=headers)

    assert response.status_code == status.HTTP_201_CREATED


def test_technician_cannot_access_patients(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.TECHNICIAN)

    response = client.get("/patients", headers=headers)

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_patient_validation_rejects_future_birth_date(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.ADMIN)
    payload = patient_payload()
    payload["date_of_birth"] = (date.today() + timedelta(days=1)).isoformat()

    response = client.post("/patients", json=payload, headers=headers)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_missing_patient_returns_not_found(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.ADMIN)

    response = client.get("/patients/9999", headers=headers)

    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_dashboard_summary_counts_patients(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.ADMIN)
    client.post("/patients", json=patient_payload(), headers=headers)

    response = client.get("/dashboard/summary", headers=headers)

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {
        "total_patients": 1,
        "todays_appointments": 0,
        "pending_tests": 0,
        "completed_tests": 0,
    }
