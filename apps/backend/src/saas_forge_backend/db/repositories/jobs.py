from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from saas_forge_backend.db.models import AiJobRun, AiJobStatus


async def get(session: AsyncSession, job_id: str) -> AiJobRun | None:
    """Read web-owned job state for stream cancellation."""
    return await session.get(AiJobRun, job_id)


async def get_for_update(session: AsyncSession, job_id: str) -> AiJobRun | None:
    result = await session.execute(select(AiJobRun).where(AiJobRun.id == job_id).with_for_update())
    return result.scalar_one_or_none()


async def heartbeat(session: AsyncSession, job_id: str) -> bool:
    result = await session.execute(
        update(AiJobRun)
        .where(AiJobRun.id == job_id, AiJobRun.status == AiJobStatus.RUNNING)
        .values(lastHeartbeatAt=datetime.now(UTC))
        .returning(AiJobRun.id)
    )
    return result.scalar_one_or_none() is not None
