import os
from collections.abc import Generator

os.environ.setdefault("LABSYNC_JWT_SECRET_KEY", "tests-only-secret-key-that-is-never-used-outside-pytest")
os.environ.setdefault("LABSYNC_DATABASE_URL", "sqlite+pysqlite:///:memory:")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app


test_engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    Base.metadata.create_all(bind=test_engine)
    with TestingSessionLocal() as session:
        yield session
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def client(db: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
