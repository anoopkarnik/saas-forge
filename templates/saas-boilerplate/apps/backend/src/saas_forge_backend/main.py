from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0")

    @app.get("/healthz")
    async def healthz() -> dict[str, bool]:
        return {"ok": True}

    return app


app = create_app()
