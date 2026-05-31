import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from saas_forge_backend.api.middleware import HmacMiddleware
from saas_forge_backend.api.routes import health, jobs
from saas_forge_backend.db.engine import get_engine
from saas_forge_backend.db.schema_check import SchemaDriftError, assert_schema_agreement

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await assert_schema_agreement(get_engine())
    except SchemaDriftError as exc:
        log.error("Schema drift detected: %s", exc)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(HmacMiddleware)
    app.include_router(health.router)
    app.include_router(jobs.router)
    return app


app = create_app()
