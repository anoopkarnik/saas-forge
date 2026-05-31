from __future__ import annotations

import logging
from datetime import datetime, timezone

from saas_forge_backend.db.engine import get_sessionmaker
from saas_forge_backend.db.models import AiJobStatus
from saas_forge_backend.db.repositories import jobs as jobs_repo
from saas_forge_backend.jobs import redis_status
from saas_forge_backend.jobs.queue import enqueue_run_agent_job

log = logging.getLogger(__name__)

PENDING_AGE_SECONDS = 60
ENQUEUE_TIMEOUT_SECONDS = 5 * 60
STALE_HEARTBEAT_SECONDS = 5 * 60


async def sweep_pending(ctx: dict) -> None:
    sm = get_sessionmaker()
    async with sm() as s, s.begin():
        rows = await jobs_repo.list_pending_older_than(s, seconds=PENDING_AGE_SECONDS)

    for row in rows:
        age = (datetime.now(timezone.utc) - row.createdAt).total_seconds()
        if age > ENQUEUE_TIMEOUT_SECONDS:
            async with sm() as s, s.begin():
                await jobs_repo.mark_terminal(
                    s, row.id,
                    status=AiJobStatus.FAILED,
                    error_code="ENQUEUE_TIMEOUT",
                    error_message=f"pending for {int(age)}s without pickup",
                )
            await redis_status.write_terminal(row.id, status="FAILED", error_code="ENQUEUE_TIMEOUT")
            log.warning("Reaper failed stale PENDING job %s after %ds", row.id, int(age))
        else:
            try:
                await enqueue_run_agent_job(row.id)
                log.info("Reaper re-enqueued PENDING job %s", row.id)
            except Exception:  # noqa: BLE001
                log.exception("Reaper failed to re-enqueue %s", row.id)


async def sweep_stale_running(ctx: dict) -> None:
    sm = get_sessionmaker()
    async with sm() as s, s.begin():
        rows = await jobs_repo.list_stale_running(s, heartbeat_max_age_seconds=STALE_HEARTBEAT_SECONDS)
        for row in rows:
            await jobs_repo.mark_terminal(
                s, row.id,
                status=AiJobStatus.FAILED,
                error_code="STALE_HEARTBEAT",
                error_message="no heartbeat for 5+ minutes",
            )
            await redis_status.write_terminal(row.id, status="FAILED", error_code="STALE_HEARTBEAT")
            log.warning("Reaper failed stale RUNNING job %s", row.id)
