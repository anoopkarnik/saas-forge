import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from saas_forge_backend.api.middleware import HmacMiddleware
from saas_forge_backend.api.routes import agents, health, jobs
from saas_forge_backend.db.engine import get_engine
from saas_forge_backend.db.schema_check import SchemaDriftError, assert_schema_agreement
from saas_forge_backend.observability import metrics as metrics_route

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from saas_forge_backend.observability.logging import configure_logging
    configure_logging()
    try:
        await assert_schema_agreement(get_engine())
    except SchemaDriftError as exc:
        log.error("Schema drift detected — /readyz will report unhealthy: %s", exc)
    except Exception as exc:  # noqa: BLE001
        # Most commonly: Postgres unreachable in dev (no docker compose up), or
        # DNS/SSL hiccup in prod. The app still boots so /healthz and the HMAC
        # smoke path work; /readyz will return 503 with details.
        log.warning(
            "Startup schema check skipped (db_unreachable): %s. The service is up but "
            "the DB-backed routes will fail until Postgres is reachable.",
            exc,
        )
    yield


def create_app() -> FastAPI:
    from saas_forge_backend.observability.otel import configure_otel

    app = FastAPI(title="saas-forge-backend", version="0.1.0", lifespan=lifespan)
    configure_otel(app)
    app.add_middleware(HmacMiddleware)
    app.include_router(health.router)
    app.include_router(jobs.router)
    app.include_router(agents.router)
    app.include_router(metrics_route.router)
    return app


app = create_app()
