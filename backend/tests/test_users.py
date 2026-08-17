from fastapi import status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.services.security import hash_password


PASSWORD = "SecureAdminPassword123"


def headers_for(client: TestClient, db: Session, role: UserRole, email: str) -> tuple[User, dict[str, str]]:
    user = User(name=role.value.title(), email=email, password_hash=hash_password(PASSWORD), role=role)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = client.post("/auth/login", json={"email": email, "password": PASSWORD}).json()["access_token"]
    return user, {"Authorization": f"Bearer {token}"}


def test_admin_creates_user_and_temporary_password_must_be_changed(client: TestClient, db: Session) -> None:
    _, admin_headers = headers_for(client, db, UserRole.ADMIN, "team-admin@example.com")
    created = client.post("/users", headers=admin_headers, json={"name": "New Technician", "email": "NEW.TECH@example.com", "phone": "0771234567", "role": "TECHNICIAN"})
    assert created.status_code == status.HTTP_201_CREATED
    body = created.json()
    assert body["user"]["email"] == "new.tech@example.com"
    assert body["user"]["must_change_password"] is True
    assert len(body["temporary_password"]) >= 12

    login = client.post("/auth/login", json={"email": "new.tech@example.com", "password": body["temporary_password"]})
    assert login.status_code == status.HTTP_200_OK
    temporary_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    assert client.get("/dashboard/summary", headers=temporary_headers).status_code == status.HTTP_403_FORBIDDEN

    changed = client.post("/auth/change-password", headers=temporary_headers, json={"current_password": body["temporary_password"], "new_password": "PermanentSecurePassword456"})
    assert changed.status_code == status.HTTP_204_NO_CONTENT
    assert client.get("/dashboard/summary", headers=temporary_headers).status_code == status.HTTP_200_OK


def test_team_management_is_admin_only_and_emails_are_unique(client: TestClient, db: Session) -> None:
    _, admin_headers = headers_for(client, db, UserRole.ADMIN, "unique-admin@example.com")
    _, technician_headers = headers_for(client, db, UserRole.TECHNICIAN, "existing-tech@example.com")
    payload = {"name": "Duplicate", "email": "existing-tech@example.com", "role": "RECEPTIONIST"}
    assert client.get("/users", headers=technician_headers).status_code == status.HTTP_403_FORBIDDEN
    duplicate = client.post("/users", headers=admin_headers, json=payload)
    assert duplicate.status_code == status.HTTP_409_CONFLICT


def test_admin_can_deactivate_another_user_but_not_self(client: TestClient, db: Session) -> None:
    admin, admin_headers = headers_for(client, db, UserRole.ADMIN, "status-admin@example.com")
    technician, _ = headers_for(client, db, UserRole.TECHNICIAN, "status-tech@example.com")
    deactivated = client.patch(f"/users/{technician.id}/status", headers=admin_headers, json={"is_active": False})
    assert deactivated.status_code == status.HTTP_200_OK
    assert deactivated.json()["is_active"] is False
    own = client.patch(f"/users/{admin.id}/status", headers=admin_headers, json={"is_active": False})
    assert own.status_code == status.HTTP_409_CONFLICT
