from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.dependencies.auth import require_roles
from app.models.user import User, UserRole
from app.services.security import hash_password


PASSWORD = "SecureTestPassword123"


def create_user(db: Session, role: UserRole = UserRole.ADMIN) -> User:
    user = User(
        name="Test User",
        email="staff@example.com",
        password_hash=hash_password(PASSWORD),
        role=role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def test_login_and_read_current_user(client: TestClient, db: Session) -> None:
    user = create_user(db)

    response = client.post(
        "/auth/login",
        json={"email": "STAFF@example.com", "password": PASSWORD},
    )

    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["id"] == user.id
    assert body["user"]["role"] == "ADMIN"

    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me_response.status_code == status.HTTP_200_OK
    assert me_response.json()["email"] == "staff@example.com"


def test_login_rejects_invalid_password(client: TestClient, db: Session) -> None:
    create_user(db)

    response = client.post(
        "/auth/login",
        json={"email": "staff@example.com", "password": "incorrect"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.json()["detail"] == "Incorrect email or password"


def test_current_user_requires_token(client: TestClient) -> None:
    response = client.get("/auth/me")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_logout_requires_valid_token(client: TestClient, db: Session) -> None:
    create_user(db)
    login_response = client.post(
        "/auth/login",
        json={"email": "staff@example.com", "password": PASSWORD},
    )

    response = client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {login_response.json()['access_token']}"},
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT


def test_role_dependency_rejects_wrong_role() -> None:
    technician = User(
        name="Technician",
        email="technician@example.com",
        password_hash="not-used",
        role=UserRole.TECHNICIAN,
    )
    admin_only = require_roles(UserRole.ADMIN)

    try:
        admin_only(current_user=technician)
    except HTTPException as exc:
        assert exc.status_code == status.HTTP_403_FORBIDDEN
    else:
        raise AssertionError("Technician unexpectedly passed an admin-only role check")


def test_role_dependency_accepts_allowed_role() -> None:
    receptionist = User(
        name="Receptionist",
        email="reception@example.com",
        password_hash="not-used",
        role=UserRole.RECEPTIONIST,
    )

    result = require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST)(current_user=receptionist)

    assert result is receptionist
