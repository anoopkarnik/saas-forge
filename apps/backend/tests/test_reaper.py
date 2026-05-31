from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_sweep_pending_re_enqueues_recent_rows(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    row = MagicMock()
    row.id = "j1"
    row.createdAt = datetime.now(timezone.utc) - timedelta(seconds=90)

    with patch("saas_forge_backend.jobs.reaper.get_sessionmaker") as gsm, \
         patch("saas_forge_backend.jobs.reaper.jobs_repo") as repo, \
         patch("saas_forge_backend.jobs.reaper.enqueue_run_agent_job", AsyncMock()) as enq, \
         patch("saas_forge_backend.jobs.reaper.redis_status") as rs:
        sm = MagicMock()
        sm.return_value.__aenter__.return_value = sm
        sm.begin.return_value.__aenter__.return_value = None
        gsm.return_value = sm
        repo.list_pending_older_than = AsyncMock(return_value=[row])
        from saas_forge_backend.jobs.reaper import sweep_pending
        await sweep_pending({})
    enq.assert_awaited_once_with("j1")


@pytest.mark.asyncio
async def test_sweep_pending_marks_failed_after_timeout(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    row = MagicMock()
    row.id = "j2"
    row.createdAt = datetime.now(timezone.utc) - timedelta(seconds=400)

    with patch("saas_forge_backend.jobs.reaper.get_sessionmaker") as gsm, \
         patch("saas_forge_backend.jobs.reaper.jobs_repo") as repo, \
         patch("saas_forge_backend.jobs.reaper.enqueue_run_agent_job", AsyncMock()), \
         patch("saas_forge_backend.jobs.reaper.redis_status") as rs:
        sm = MagicMock()
        sm.return_value.__aenter__.return_value = sm
        sm.begin.return_value.__aenter__.return_value = None
        gsm.return_value = sm
        repo.list_pending_older_than = AsyncMock(return_value=[row])
        repo.mark_terminal = AsyncMock()
        rs.write_terminal = AsyncMock()
        from saas_forge_backend.jobs.reaper import sweep_pending
        await sweep_pending({})
    repo.mark_terminal.assert_awaited_once()
    rs.write_terminal.assert_awaited_once()
