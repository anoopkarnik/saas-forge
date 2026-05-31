from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from saas_forge_backend.api.middleware import HmacMiddleware
from saas_forge_backend.api.routes import health


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0")
    app.add_middleware(HmacMiddleware)
    app.include_router(health.router)

    @app.post("/agents/stream")
    async def agents_stream_stub(request: Request) -> JSONResponse:
        # Real handler arrives in Milestone 4.
        return JSONResponse({"detail": "not_implemented"}, status_code=501)

    return app


app = create_app()
