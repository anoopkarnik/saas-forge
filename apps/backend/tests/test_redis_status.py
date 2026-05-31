import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run against real redis",
)


@pytest.mark.asyncio
async def test_redis_status_lifecycle(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    from saas_forge_backend.jobs import redis_status as s

    job_id = "test-job-1"
    await s.write_running(job_id, agent_id="noop")
    await s.write_event(job_id, seq=0, type="step", payload={"node": "start"})
    snap = await s.read(job_id)
    assert snap["status"] == "RUNNING"
    assert snap["latest_event_type"] == "step"
    await s.set_cancel_requested(job_id)
    assert await s.is_cancel_requested(job_id) is True
    await s.write_terminal(job_id, status="SUCCEEDED")
    snap2 = await s.read(job_id)
    assert snap2["status"] == "SUCCEEDED"
