from fastapi import APIRouter, Response
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy import text

from saas_forge_backend.config import get_settings
from saas_forge_backend.db.engine import get_engine

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}


@router.get("/readyz")
async def readyz(response: Response) -> dict[str, str | bool]:
    settings = get_settings()
    db_ok = False
    redis_ok = False

    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    try:
        redis = AsyncRedis.from_url(settings.redis_url)
        await redis.ping()
        await redis.aclose()
        redis_ok = True
    except Exception:
        redis_ok = False

    ok = db_ok and redis_ok
    if not ok:
        response.status_code = 503
    return {"ok": ok, "db": db_ok, "redis": redis_ok}
