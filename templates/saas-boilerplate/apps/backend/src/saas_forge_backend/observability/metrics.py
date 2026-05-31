from __future__ import annotations

from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from saas_forge_backend.config import get_settings

router = APIRouter()


JOB_COUNTER = Counter(
    "ai_jobs_total", "Total jobs by terminal status", ["status", "agent_id"],
)
JOB_DURATION = Histogram(
    "ai_job_duration_seconds", "Job duration seconds by agent", ["agent_id"],
)
LLM_LATENCY = Histogram(
    "ai_llm_latency_seconds", "LLM call latency", ["provider", "model"],
)


@router.get("/metrics")
async def metrics() -> Response:
    if not get_settings().metrics_enabled:
        return Response(status_code=404)
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
