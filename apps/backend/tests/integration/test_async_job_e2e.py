import asyncio
import os

import cuid2
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run against compose services",
)


@pytest.mark.asyncio
async def test_noop_job_runs_end_to_end():
    """Insert a PENDING row, enqueue, wait for terminal state via DB poll."""
    from sqlalchemy import text

    from saas_forge_backend.db.engine import get_sessionmaker
    from saas_forge_backend.db.models import AiJobStatus
    from saas_forge_backend.db.repositories import jobs as jobs_repo
    from saas_forge_backend.jobs.queue import enqueue_run_agent_job

    sm = get_sessionmaker()

    user_id = cuid2.cuid()
    async with sm() as s, s.begin():
        await s.execute(
            text(
                'INSERT INTO user_schema."User" (id, name, email, "emailVerified", role, banned, '
                '"creditsUsed","creditsTotal","createdAt","updatedAt") '
                "VALUES (:id, 'test', :email, false, 'user', false, 0, 20, now(), now())"
            ),
            {"id": user_id, "email": f"{user_id}@example.com"},
        )

    job_id = cuid2.cuid()
    async with sm() as s, s.begin():
        await jobs_repo.insert_pending(
            s, job_id=job_id, user_id=user_id, org_id=None,
            agent_id="noop", input_payload={"hello": "world"},
        )

    await enqueue_run_agent_job(job_id)

    # Poll for terminal state.
    deadline = asyncio.get_event_loop().time() + 30
    final = None
    while asyncio.get_event_loop().time() < deadline:
        async with sm() as s:
            row = await jobs_repo.get(s, job_id)
        if row and row.status in {
            AiJobStatus.SUCCEEDED, AiJobStatus.FAILED, AiJobStatus.CANCELLED
        }:
            final = row
            break
        await asyncio.sleep(0.5)

    assert final is not None, "job never reached terminal state"
    assert final.status == AiJobStatus.SUCCEEDED
    assert final.result == {"output": {"echo": {"hello": "world"}}}
