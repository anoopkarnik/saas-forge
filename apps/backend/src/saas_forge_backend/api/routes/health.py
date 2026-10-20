from fastapi import APIRouter, Response
from sqlalchemy import text

from saas_forge_backend.db.engine import get_engine

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}


@router.get("/readyz")
async def readyz(response: Response) -> dict[str, str | bool]:
    db_ok = False

    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    ok = db_ok
    if not ok:
        response.status_code = 503
    return {"ok": ok, "db": db_ok}
