from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: str | None
    role: UserRole
    is_active: bool
    must_change_password: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, min_length=7, max_length=32)
    role: UserRole


class UserStatusUpdate(BaseModel):
    is_active: bool


class UserList(BaseModel):
    items: list[UserRead]
    total: int
    page: int
    page_size: int


class UserCreated(BaseModel):
    user: UserRead
    temporary_password: str
