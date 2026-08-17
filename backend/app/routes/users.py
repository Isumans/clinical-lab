from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import require_roles
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserCreated, UserList, UserRead, UserStatusUpdate
from app.services.users import create_user, list_users


router = APIRouter(prefix="/users", tags=["users"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN))]


@router.get("", response_model=UserList)
def read_users(_: AdminUser, db: Session = Depends(get_db), search: str | None = Query(default=None, max_length=160), role: UserRole | None = None, is_active: bool | None = None, page: int = Query(default=1, ge=1), page_size: int = Query(default=20, ge=1, le=100)) -> UserList:
    items, total = list_users(db, search=search, role=role, is_active=is_active, page=page, page_size=page_size)
    return UserList(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=UserCreated, status_code=status.HTTP_201_CREATED)
def add_user(payload: UserCreate, _: AdminUser, db: Session = Depends(get_db)) -> UserCreated:
    user, temporary_password = create_user(db, payload)
    return UserCreated(user=UserRead.model_validate(user), temporary_password=temporary_password)


@router.patch("/{user_id}/status", response_model=UserRead)
def update_user_status(user_id: int, payload: UserStatusUpdate, admin: AdminUser, db: Session = Depends(get_db)) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You cannot deactivate your own account")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return user
