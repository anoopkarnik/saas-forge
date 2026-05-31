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


def test_echo_llm_emits_step_tokens_step_final_end():
    client = TestClient(create_app())
    payload = {"user_id": "u1", "org_id": None, "agent_id": "echo_llm", "input": {"query": "hi"}}
    ts, sig = sign_payload("x" * 32, payload)
    resp = client.post(
        "/agents/stream",
        json=payload,
        headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig, "X-Saas-Forge-Req-Id": "r1"},
    )
    assert resp.status_code == 200
    chunks = [c for c in resp.text.split("\n\n") if c.strip()]
    types = [next(l for l in c.splitlines() if l.startswith("event: ")).removeprefix("event: ") for c in chunks]
    assert types[0] == "step"
    assert "token" in types
    assert types[-2:] == ["final", "end"]

    # Reassemble token deltas.
    deltas = []
    final_payload = None
    for c in chunks:
        lines = c.splitlines()
        etype = next(l for l in lines if l.startswith("event: ")).removeprefix("event: ")
        data = json.loads(next(l for l in lines if l.startswith("data: ")).removeprefix("data: "))
        if etype == "token":
            deltas.append(data["delta"])
        if etype == "final":
            final_payload = data
    assert "".join(deltas) == "ECHO: hi"
    assert final_payload == {"output": {"answer": "ECHO: hi"}}
