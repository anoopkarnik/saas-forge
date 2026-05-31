from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from saas_forge_backend.config import get_settings
from saas_forge_backend.main import create_app
from saas_forge_backend.security.hmac import sign_payload


@pytest.fixture(autouse=True)
def _secret(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_enqueue_returns_202(monkeypatch):
    with patch("saas_forge_backend.api.routes.jobs.enqueue_run_agent_job", AsyncMock()) as m:
        client = TestClient(create_app())
        payload = {
            "job_id": "j1",
            "user_id": "u1",
            "org_id": None,
            "agent_id": "noop",
            "input": {"x": 1},
        }
        ts, sig = sign_payload("x" * 32, payload)
        resp = client.post(
            "/jobs",
            json=payload,
            headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig, "X-Saas-Forge-Req-Id": "r1"},
        )
    assert resp.status_code == 202
    assert resp.json() == {"job_id": "j1", "enqueued": True}
    m.assert_awaited_once_with("j1")
