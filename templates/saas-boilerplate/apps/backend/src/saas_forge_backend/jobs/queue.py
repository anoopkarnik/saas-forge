from __future__ import annotations

from arq import create_pool

from saas_forge_backend.config import get_settings
from saas_forge_backend.jobs.worker import _redis_settings


async def enqueue_run_agent_job(job_id: str) -> None:
    """Enqueue an existing AiJobRun row by id. Idempotent via _job_id."""
    pool = await create_pool(_redis_settings())
    try:
        await pool.enqueue_job("run_agent_job", job_id, _job_id=job_id)
    finally:
        await pool.aclose()


async def enqueue_ingest_document_job(job_id: str) -> None:
    pool = await create_pool(_redis_settings())
    try:
        await pool.enqueue_job("ingest_document_job", job_id, _job_id=job_id)
    finally:
        await pool.aclose()
