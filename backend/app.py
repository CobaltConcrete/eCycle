"""Native FastAPI entry point. All existing React API paths are preserved."""

import os
from contextlib import asynccontextmanager

import requests
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from auth import current_user
from config import Config
from controllers import (
    auth_controller,
    checklist_controller,
    comment_controller,
    forum_controller,
    history_controller,
    map_controller,
    report_controller,
    shop_controller,
    user_controller,
)
from database import engine


@asynccontextmanager
async def lifespan(app):
    yield
    engine.dispose()


def create_app():
    app = FastAPI(
        title="eCycle API",
        version="0.3.0",
        lifespan=lifespan,
        description="Repair and recycling discovery. Supabase Auth with server-enforced ownership and roles.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=Config.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Content-Type", "Authorization"],
    )
    app.include_router(auth_controller.router, tags=["authentication"])
    for controller in (
        user_controller,
        checklist_controller,
        map_controller,
        shop_controller,
        forum_controller,
        comment_controller,
        history_controller,
        report_controller,
    ):
        app.include_router(
            controller.router,
            dependencies=[Depends(current_user)],
            tags=[controller.__name__.split(".")[-1].replace("_controller", "")],
        )

    @app.get("/health", tags=["operations"])
    def health() -> dict[str, str]:
        # Liveness only: no implicit connection or schema creation on startup.
        return {"status": "ok", "service": "ecycle-api"}

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # Pydantic errors can contain passwords/input values; omit those fields.
        details = [
            {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]}
            for e in exc.errors()
        ]
        return JSONResponse(
            {"error": "Invalid request", "detail": details}, status_code=422
        )

    @app.exception_handler(IntegrityError)
    async def conflict(request: Request, exc: IntegrityError):
        return JSONResponse(
            {"error": "Request conflicts with existing or related data"},
            status_code=409,
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, exc: SQLAlchemyError):
        return JSONResponse(
            {"error": "Database operation unavailable"}, status_code=503
        )

    @app.exception_handler(requests.RequestException)
    async def provider_error(request: Request, exc: requests.RequestException):
        return JSONResponse(
            {"error": "External service unavailable; please try again"}, status_code=502
        )

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", "5000")))
