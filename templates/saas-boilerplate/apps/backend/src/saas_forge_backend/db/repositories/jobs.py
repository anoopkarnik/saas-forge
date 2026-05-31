from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from saas_forge_backend.db.models import AiJobEvent, AiJobRun, AiJobStatus


async def get(session: AsyncSession, job_id: str) -> AiJobRun | None:
    return await session.get(AiJobRun, job_id)


async def insert_pending(
    session: AsyncSession,
    *,
    job_id: str,
    user_id: str,
    org_id: str | None,
    agent_id: str,
    input_payload: dict[str, Any],
) -> AiJobRun:
    row = AiJobRun(
        id=job_id,
        userId=user_id,
        orgId=org_id,
        agentId=agent_id,
        status=AiJobStatus.PENDING,
        input=input_payload,
    )
    session.add(row)
    await session.flush()
    return row


async def mark_running(session: AsyncSession, job_id: str) -> None:
    await session.execute(
        update(AiJobRun)
        .where(AiJobRun.id == job_id)
        .values(
            status=AiJobStatus.RUNNING,
            startedAt=datetime.now(timezone.utc),
            lastHeartbeatAt=datetime.now(timezone.utc),
        )
    )


async def heartbeat(session: AsyncSession, job_id: str) -> None:
    await session.execute(
        update(AiJobRun)
        .where(AiJobRun.id == job_id)
        .values(lastHeartbeatAt=datetime.now(timezone.utc))
    )


async def mark_terminal(
    session: AsyncSession,
    job_id: str,
    *,
    status: AiJobStatus,
    result: dict[str, Any] | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> None:
    await session.execute(
        update(AiJobRun)
        .where(AiJobRun.id == job_id)
        .values(
            status=status,
            result=result,
            errorCode=error_code,
            errorMessage=error_message,
            finishedAt=datetime.now(timezone.utc),
        )
    )


async def append_event(
    session: AsyncSession,
    *,
    job_id: str,
    seq: int,
    type: str,
    payload: dict[str, Any],
) -> None:
    session.add(AiJobEvent(jobId=job_id, seq=seq, type=type, payload=payload))


async def list_pending_older_than(
    session: AsyncSession,
    *,
    seconds: int,
    limit: int = 100,
) -> list[AiJobRun]:
    from sqlalchemy import text as _t
    stmt = (
        select(AiJobRun)
        .where(AiJobRun.status == AiJobStatus.PENDING)
        .where(_t(f"\"createdAt\" < now() - interval '{int(seconds)} seconds'"))
        .order_by(AiJobRun.createdAt.asc())
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())


async def list_stale_running(
    session: AsyncSession,
    *,
    heartbeat_max_age_seconds: int,
    limit: int = 100,
) -> list[AiJobRun]:
    from sqlalchemy import text as _t
    stmt = (
        select(AiJobRun)
        .where(AiJobRun.status == AiJobStatus.RUNNING)
        .where(_t(f"\"lastHeartbeatAt\" < now() - interval '{int(heartbeat_max_age_seconds)} seconds'"))
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())
