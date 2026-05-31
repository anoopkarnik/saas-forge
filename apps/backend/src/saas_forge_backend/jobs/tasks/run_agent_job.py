from __future__ import annotations

import logging
from typing import Any

from saas_forge_backend.agents.registry import REGISTRY, register_default_agents
from saas_forge_backend.db.engine import get_sessionmaker
from saas_forge_backend.db.models import AiJobStatus
from saas_forge_backend.db.repositories import jobs as jobs_repo
from saas_forge_backend.jobs import redis_status
from saas_forge_backend.jobs.event_emitter import EventEmitter

log = logging.getLogger(__name__)


class JobCancelled(Exception):
    pass


async def run_agent_job(ctx: dict[str, Any], job_id: str) -> dict[str, Any]:
    register_default_agents()
    sm = get_sessionmaker()

    # Pickup: skip if already cancelled or non-pending.
    async with sm() as s, s.begin():
        row = await jobs_repo.get(s, job_id)
        if row is None:
            log.warning("run_agent_job: missing row %s", job_id)
            return {"skipped": True}
        if row.status == AiJobStatus.CANCELLED:
            return {"skipped": True, "reason": "cancelled_before_pickup"}
        await jobs_repo.mark_running(s, job_id)

    await redis_status.write_running(job_id, agent_id=row.agentId)
    emitter = EventEmitter(job_id=job_id)
    final_payload: dict[str, Any] | None = None

    try:
        agent_fn = REGISTRY.get(row.agentId)
        agent_iter = agent_fn(row.input, ctx)
        async for event in agent_iter:
            if await redis_status.is_cancel_requested(job_id):
                raise JobCancelled()
            async with sm() as s, s.begin():
                await emitter.emit(s, type=event.type, payload=event.payload)
                await jobs_repo.heartbeat(s, job_id)
            if event.type == "final":
                final_payload = event.payload

        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(
                s, job_id, status=AiJobStatus.SUCCEEDED, result=final_payload or {}
            )
        await redis_status.write_terminal(job_id, status="SUCCEEDED")
        return {"ok": True}

    except JobCancelled:
        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(s, job_id, status=AiJobStatus.CANCELLED)
        await redis_status.write_terminal(job_id, status="CANCELLED")
        return {"cancelled": True}

    except LookupError as exc:
        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(
                s, job_id,
                status=AiJobStatus.FAILED,
                error_code="UNKNOWN_AGENT",
                error_message=str(exc),
            )
        await redis_status.write_terminal(job_id, status="FAILED", error_code="UNKNOWN_AGENT")
        raise

    except Exception as exc:  # noqa: BLE001
        log.exception("Job %s failed", job_id)
        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(
                s, job_id,
                status=AiJobStatus.FAILED,
                error_code="AGENT_ERROR",
                error_message=str(exc),
            )
        await redis_status.write_terminal(job_id, status="FAILED", error_code="AGENT_ERROR")
        raise
