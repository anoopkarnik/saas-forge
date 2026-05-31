from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from saas_forge_backend.db.repositories import jobs as jobs_repo
from saas_forge_backend.jobs import redis_status


class EventEmitter:
    """Emits agent events to both Postgres (ledger) and Redis (live status)."""

    def __init__(self, *, job_id: str) -> None:
        self.job_id = job_id
        self.seq = 0

    async def emit(self, session: AsyncSession, *, type: str, payload: dict[str, Any]) -> None:
        await jobs_repo.append_event(
            session, job_id=self.job_id, seq=self.seq, type=type, payload=payload
        )
        await redis_status.write_event(self.job_id, seq=self.seq, type=type, payload=payload)
        self.seq += 1
