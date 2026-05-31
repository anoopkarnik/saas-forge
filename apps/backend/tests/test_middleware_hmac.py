import os

import pytest
from fastapi.testclient import TestClient

from saas_forge_backend.config import get_settings
from saas_forge_backend.main import create_app
from saas_forge_backend.security.hmac import sign_payload


@pytest.fixture(autouse=True)
def _set_secret(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "test-secret-32-bytes-padding-xxxxx")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _client():
    return TestClient(create_app())


def test_unsigned_request_to_signed_route_returns_401():
    client = _client()
    resp = client.post("/agents/stream", json={"user_id": "u1"})
    assert resp.status_code == 401


def test_signed_request_passes_signature_check():
    client = _client()
    payload = {"user_id": "u1", "agent_id": "noop", "input": {}}
    ts, sig = sign_payload("test-secret-32-bytes-padding-xxxxx", payload)
    resp = client.post(
        "/agents/stream",
        json=payload,
        headers={
            "X-Saas-Forge-Ts": ts,
            "X-Saas-Forge-Sig": sig,
            "X-Saas-Forge-Req-Id": "req-1",
        },
    )
    # Phase-1 stub: signed route accepts and returns 501 (no agent yet)
    assert resp.status_code == 501


def test_healthz_does_not_require_signature():
    client = _client()
    assert _client().get("/healthz").status_code == 200
    assert _client().get("/readyz").status_code in (200, 503)
