from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User
from app.services.security import verify_password


def get_user_by_email(db: Session, email: str) -> User | None:
    normalized_email = email.strip().lower()
    statement = select(User).where(func.lower(User.email) == normalized_email)
    return db.scalar(statement)


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(db, email)
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        return None
    return user
