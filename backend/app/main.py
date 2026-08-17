from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routes.auth import router as auth_router
from app.routes.appointments import router as appointments_router
from app.routes.dashboard import router as dashboard_router
from app.routes.health import router as health_router
from app.routes.laboratory_tests import router as laboratory_tests_router
from app.routes.laboratory_workflow import router as laboratory_workflow_router
from app.routes.patients import router as patients_router
from app.routes.users import router as users_router


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.include_router(auth_router)
    application.include_router(appointments_router)
    application.include_router(dashboard_router)
    application.include_router(laboratory_tests_router)
    application.include_router(laboratory_workflow_router)
    application.include_router(patients_router)
    application.include_router(users_router)
    application.include_router(health_router)
    return application


app = create_app()
