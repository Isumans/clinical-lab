from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.orm import Session

from app.models.laboratory_test import LaboratoryTest, TestStatus
from app.schemas.laboratory_test import LaboratoryTestCreate, LaboratoryTestUpdate


def list_laboratory_tests(
    db: Session,
    *,
    search: str | None,
    sample_type: str | None,
    test_status: TestStatus | None,
    sort_by: str,
    sort_order: str,
    page: int,
    page_size: int,
) -> tuple[list[LaboratoryTest], int]:
    filters = []
    if search and (term := search.strip()):
        pattern = f"%{term}%"
        filters.append(or_(LaboratoryTest.test_code.ilike(pattern), LaboratoryTest.test_name.ilike(pattern)))
    if sample_type and (sample := sample_type.strip()):
        filters.append(LaboratoryTest.sample_type.ilike(sample))
    if test_status is not None:
        filters.append(LaboratoryTest.status == test_status)

    sort_columns = {
        "created_at": LaboratoryTest.created_at,
        "test_code": LaboratoryTest.test_code,
        "test_name": LaboratoryTest.test_name,
        "price": LaboratoryTest.price,
    }
    column = sort_columns[sort_by]
    ordering = desc(column) if sort_order == "desc" else asc(column)
    total = db.scalar(select(func.count(LaboratoryTest.id)).where(*filters)) or 0
    statement = select(LaboratoryTest).where(*filters).order_by(ordering, LaboratoryTest.id.asc()).offset((page - 1) * page_size).limit(page_size)
    return list(db.scalars(statement).all()), total


def create_laboratory_test(db: Session, payload: LaboratoryTestCreate) -> LaboratoryTest:
    laboratory_test = LaboratoryTest(**payload.model_dump())
    db.add(laboratory_test)
    db.commit()
    db.refresh(laboratory_test)
    return laboratory_test


def update_laboratory_test(db: Session, laboratory_test: LaboratoryTest, payload: LaboratoryTestUpdate) -> LaboratoryTest:
    for field, value in payload.model_dump().items():
        setattr(laboratory_test, field, value)
    db.commit()
    db.refresh(laboratory_test)
    return laboratory_test
