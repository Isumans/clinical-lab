from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, DateTime, Enum as SqlEnum, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    RECEPTIONIST = "RECEPTIONIST"
    TECHNICIAN = "TECHNICIAN"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SqlEnum(UserRole, name="user_role"), index=True, nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true", nullable=False)
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
