from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import require_roles
from app.models.laboratory_test import LaboratoryTest, TestStatus
from app.models.user import User, UserRole
from app.schemas.laboratory_test import (
    LaboratoryTestCreate,
    LaboratoryTestList,
    LaboratoryTestRead,
    LaboratoryTestStatusUpdate,
    LaboratoryTestUpdate,
)
from app.services.laboratory_tests import create_laboratory_test, list_laboratory_tests, update_laboratory_test


router = APIRouter(prefix="/tests", tags=["laboratory tests"])
catalog_reader = require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.TECHNICIAN)
catalog_admin = require_roles(UserRole.ADMIN)
CatalogReader = Annotated[User, Depends(catalog_reader)]
CatalogAdmin = Annotated[User, Depends(catalog_admin)]


def get_test_or_404(test_id: int, db: Session) -> LaboratoryTest:
    laboratory_test = db.get(LaboratoryTest, test_id)
    if laboratory_test is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Laboratory test not found")
    return laboratory_test


@router.get("", response_model=LaboratoryTestList)
def read_tests(
    _: CatalogReader,
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, max_length=160),
    sample_type: str | None = Query(default=None, max_length=80),
    test_status: TestStatus | None = Query(default=None, alias="status"),
    sort_by: Literal["created_at", "test_code", "test_name", "price"] = "created_at",
    sort_order: Literal["asc", "desc"] = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> LaboratoryTestList:
    items, total = list_laboratory_tests(db, search=search, sample_type=sample_type, test_status=test_status, sort_by=sort_by, sort_order=sort_order, page=page, page_size=page_size)
    return LaboratoryTestList(items=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=LaboratoryTestRead, status_code=status.HTTP_201_CREATED)
def add_test(payload: LaboratoryTestCreate, _: CatalogAdmin, db: Session = Depends(get_db)) -> LaboratoryTest:
    try:
        return create_laboratory_test(db, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Test code already exists") from exc


@router.get("/{test_id}", response_model=LaboratoryTestRead)
def read_test(test_id: int, _: CatalogReader, db: Session = Depends(get_db)) -> LaboratoryTest:
    return get_test_or_404(test_id, db)


@router.put("/{test_id}", response_model=LaboratoryTestRead)
def edit_test(test_id: int, payload: LaboratoryTestUpdate, _: CatalogAdmin, db: Session = Depends(get_db)) -> LaboratoryTest:
    try:
        return update_laboratory_test(db, get_test_or_404(test_id, db), payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Test code already exists") from exc


@router.patch("/{test_id}/status", response_model=LaboratoryTestRead)
def change_test_status(test_id: int, payload: LaboratoryTestStatusUpdate, _: CatalogAdmin, db: Session = Depends(get_db)) -> LaboratoryTest:
    laboratory_test = get_test_or_404(test_id, db)
    laboratory_test.status = payload.status
    db.commit()
    db.refresh(laboratory_test)
    return laboratory_test
