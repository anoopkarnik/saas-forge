from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from saas_forge_backend.api.schemas.jobs import EnqueueJobRequest, EnqueueJobResponse
from saas_forge_backend.jobs.queue import enqueue_ingest_document_job, enqueue_run_agent_job

router = APIRouter(prefix="/jobs")


@router.post("", response_model=EnqueueJobResponse, status_code=202)
async def enqueue_job(request: Request) -> EnqueueJobResponse:
    body = EnqueueJobRequest.model_validate(getattr(request.state, "verified_payload", {}))
    try:
        await enqueue_run_agent_job(body.job_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"enqueue_failed: {exc}") from exc
    return EnqueueJobResponse(job_id=body.job_id, enqueued=True)


@router.post("/ingest", response_model=EnqueueJobResponse, status_code=202)
async def enqueue_ingest(request: Request) -> EnqueueJobResponse:
    body = EnqueueJobRequest.model_validate(getattr(request.state, "verified_payload", {}))
    try:
        await enqueue_ingest_document_job(body.job_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"enqueue_failed: {exc}") from exc
    return EnqueueJobResponse(job_id=body.job_id, enqueued=True)
