from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.services.security import hash_password


def auth_headers(client: TestClient, db: Session, role: UserRole) -> dict[str, str]:
    email = f"catalog-{role.value.lower()}@example.com"
    password = "SecureTestPassword123"
    db.add(User(name=role.value.title(), email=email, password_hash=hash_password(password), role=role))
    db.commit()
    response = client.post("/auth/login", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def laboratory_test_payload(code: str = "FBC") -> dict[str, object]:
    return {
        "test_code": code,
        "test_name": "Full Blood Count",
        "description": "Measures major blood cell groups.",
        "sample_type": "Whole Blood",
        "price": "1500.00",
        "status": "ACTIVE",
    }


def test_admin_can_create_search_view_update_and_deactivate_test(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.ADMIN)
    created = client.post("/tests", json=laboratory_test_payload("fbc"), headers=headers)
    assert created.status_code == status.HTTP_201_CREATED
    assert created.json()["test_code"] == "FBC"
    test_id = created.json()["id"]

    listed = client.get("/tests?search=Full Blood", headers=headers)
    assert listed.status_code == status.HTTP_200_OK
    assert listed.json()["total"] == 1

    detail = client.get(f"/tests/{test_id}", headers=headers)
    assert detail.status_code == status.HTTP_200_OK

    payload = laboratory_test_payload("FBC")
    payload["price"] = "1650.00"
    updated = client.put(f"/tests/{test_id}", json=payload, headers=headers)
    assert updated.status_code == status.HTTP_200_OK
    assert updated.json()["price"] == "1650.00"

    deactivated = client.patch(f"/tests/{test_id}/status", json={"status": "INACTIVE"}, headers=headers)
    assert deactivated.status_code == status.HTTP_200_OK
    assert deactivated.json()["status"] == "INACTIVE"


def test_duplicate_test_code_is_rejected(client: TestClient, db: Session) -> None:
    headers = auth_headers(client, db, UserRole.ADMIN)
    assert client.post("/tests", json=laboratory_test_payload(), headers=headers).status_code == 201

    response = client.post("/tests", json=laboratory_test_payload("fbc"), headers=headers)

    assert response.status_code == status.HTTP_409_CONFLICT


def test_receptionist_can_read_but_cannot_create_tests(client: TestClient, db: Session) -> None:
    admin_headers = auth_headers(client, db, UserRole.ADMIN)
    client.post("/tests", json=laboratory_test_payload(), headers=admin_headers)
    receptionist_headers = auth_headers(client, db, UserRole.RECEPTIONIST)

    assert client.get("/tests", headers=receptionist_headers).status_code == status.HTTP_200_OK
    assert client.post("/tests", json=laboratory_test_payload("LFT"), headers=receptionist_headers).status_code == status.HTTP_403_FORBIDDEN


def test_technician_can_read_but_cannot_edit_tests(client: TestClient, db: Session) -> None:
    admin_headers = auth_headers(client, db, UserRole.ADMIN)
    test_id = client.post("/tests", json=laboratory_test_payload(), headers=admin_headers).json()["id"]
    technician_headers = auth_headers(client, db, UserRole.TECHNICIAN)

    assert client.get(f"/tests/{test_id}", headers=technician_headers).status_code == status.HTTP_200_OK
    assert client.put(f"/tests/{test_id}", json=laboratory_test_payload(), headers=technician_headers).status_code == status.HTTP_403_FORBIDDEN
