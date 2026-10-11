from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from saas_forge_backend.rag.direct_ingest import run_ingestion
from saas_forge_backend.rag.ingestion import IngestionCancelled, UnsupportedSource

router = APIRouter()


class IngestRequest(BaseModel):
    job_id: str = Field(min_length=1)
    user_id: str = Field(min_length=1)
    org_id: str | None = None
    input: dict[str, Any]


@router.post("/rag/ingest")
async def ingest_document(request: Request) -> dict[str, int | str]:
    body = IngestRequest.model_validate(request.state.verified_payload)
    try:
        return await run_ingestion(body.job_id, body.user_id, body.org_id, body.input)
    except UnsupportedSource as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except IngestionCancelled as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
