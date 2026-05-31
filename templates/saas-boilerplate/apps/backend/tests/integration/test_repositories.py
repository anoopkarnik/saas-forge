import os

import cuid2
import pytest
import pytest_asyncio

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run",
)


@pytest_asyncio.fixture()
async def session():
    from saas_forge_backend.db.engine import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as s:
        async with s.begin():
            yield s
            await s.rollback()


@pytest.mark.asyncio
async def test_job_lifecycle_writes(session):
    from saas_forge_backend.db.models import AiJobStatus
    from saas_forge_backend.db.repositories import jobs

    # Requires an existing user; integration test seeds one minimally via raw SQL.
    from sqlalchemy import text
    user_id = cuid2.cuid()
    await session.execute(
        text(
            'INSERT INTO user_schema."User" (id, name, email, "emailVerified", role, banned, '
            '"creditsUsed","creditsTotal","createdAt","updatedAt") '
            "VALUES (:id, 'test', :email, false, 'user', false, 0, 20, now(), now())"
        ),
        {"id": user_id, "email": f"{user_id}@example.com"},
    )

    job_id = cuid2.cuid()
    await jobs.insert_pending(
        session,
        job_id=job_id,
        user_id=user_id,
        org_id=None,
        agent_id="noop",
        input_payload={"hello": "world"},
    )
    await jobs.mark_running(session, job_id)
    await jobs.append_event(session, job_id=job_id, seq=0, type="step", payload={"node": "start"})
    await jobs.mark_terminal(session, job_id, status=AiJobStatus.SUCCEEDED, result={"answer": 42})

    row = await jobs.get(session, job_id)
    assert row is not None
    assert row.status == AiJobStatus.SUCCEEDED
    assert row.result == {"answer": 42}
