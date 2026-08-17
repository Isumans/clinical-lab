import secrets

from fastapi import HTTPException, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.schemas.user import UserCreate
from app.services.auth import get_user_by_email
from app.services.security import hash_password


def list_users(db: Session, *, search: str | None, role: UserRole | None, is_active: bool | None, page: int, page_size: int) -> tuple[list[User], int]:
    filters = []
    if search and (term := search.strip()):
        pattern = f"%{term}%"
        filters.append(or_(User.name.ilike(pattern), User.email.ilike(pattern), cast(User.id, String).ilike(pattern)))
    if role is not None:
        filters.append(User.role == role)
    if is_active is not None:
        filters.append(User.is_active == is_active)
    total = db.scalar(select(func.count(User.id)).where(*filters)) or 0
    statement = select(User).where(*filters).order_by(User.created_at.desc(), User.id.desc()).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(statement).all()), total


def create_user(db: Session, payload: UserCreate) -> tuple[User, str]:
    email = str(payload.email).strip().lower()
    if get_user_by_email(db, email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with that email already exists")
    temporary_password = f"Ls!{secrets.token_urlsafe(12)}"
    user = User(name=payload.name.strip(), email=email, phone=payload.phone.strip() if payload.phone else None, password_hash=hash_password(temporary_password), role=payload.role, must_change_password=True)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, temporary_password
