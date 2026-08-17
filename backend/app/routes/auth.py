from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_authenticated_user
from app.models.user import User
from app.schemas.auth import LoginRequest, PasswordChangeRequest, TokenResponse
from app.schemas.user import UserRead
from app.services.auth import authenticate_user
from app.services.security import create_access_token, hash_password, verify_password


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(access_token=create_access_token(user.id), user=UserRead.model_validate(user))


@router.get("/me", response_model=UserRead)
def read_current_user(current_user: User = Depends(get_authenticated_user)) -> User:
    return current_user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(_: User = Depends(get_authenticated_user)) -> None:
    """Validate the session before the client discards its stateless access token."""
    return None


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(payload: PasswordChangeRequest, current_user: User = Depends(get_authenticated_user), db: Session = Depends(get_db)) -> None:
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if verify_password(payload.new_password, current_user.password_hash):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="New password must be different")
    current_user.password_hash = hash_password(payload.new_password)
    current_user.must_change_password = False
    db.commit()
