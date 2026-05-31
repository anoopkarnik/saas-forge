import json

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


def _parse_sse(body: str) -> list[tuple[str, dict]]:
    events = []
    for chunk in body.split("\n\n"):
        if not chunk.strip():
            continue
        lines = chunk.splitlines()
        event_type = next(l.removeprefix("event: ") for l in lines if l.startswith("event: "))
        data = next(l.removeprefix("data: ") for l in lines if l.startswith("data: "))
        events.append((event_type, json.loads(data)))
    return events


def test_agents_stream_noop_emits_step_step_final_end():
    client = TestClient(create_app())
    payload = {"user_id": "u1", "org_id": None, "agent_id": "noop", "input": {"hello": "world"}}
    ts, sig = sign_payload("x" * 32, payload)
    resp = client.post(
        "/agents/stream",
        json=payload,
        headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig, "X-Saas-Forge-Req-Id": "r1"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    events = _parse_sse(resp.text)
    types = [t for t, _ in events]
    assert types == ["step", "step", "final", "end"]


def test_agents_stream_unknown_agent_returns_404():
    client = TestClient(create_app())
    payload = {"user_id": "u1", "org_id": None, "agent_id": "doesnotexist", "input": {}}
    ts, sig = sign_payload("x" * 32, payload)
    resp = client.post(
        "/agents/stream",
        json=payload,
        headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig, "X-Saas-Forge-Req-Id": "r2"},
    )
    assert resp.status_code == 404
