import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from saas_forge_backend.api.middleware import HmacMiddleware
from saas_forge_backend.api.routes import health
from saas_forge_backend.db.engine import get_engine
from saas_forge_backend.db.schema_check import SchemaDriftError, assert_schema_agreement

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await assert_schema_agreement(get_engine())
    except SchemaDriftError as exc:
        log.error("Schema drift detected: %s", exc)
        # Do not crash dev startup; /readyz will report unhealthy until fixed.
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(HmacMiddleware)
    app.include_router(health.router)

    @app.post("/agents/stream")
    async def agents_stream_stub(request: Request) -> JSONResponse:
        return JSONResponse({"detail": "not_implemented"}, status_code=501)

    return app


app = create_app()
