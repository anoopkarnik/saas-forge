from fastapi import APIRouter, Response

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}


@router.get("/readyz")
async def readyz(response: Response) -> dict[str, str]:
    # Phase 1: shallow readiness; deeper DB/Redis pings added in Task 2.4.
    return {"status": "ready"}
