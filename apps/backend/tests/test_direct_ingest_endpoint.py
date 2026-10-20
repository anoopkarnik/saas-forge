from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from saas_forge_backend.config import get_settings
from saas_forge_backend.main import create_app
from saas_forge_backend.rag.ingestion import IngestionCancelled
from saas_forge_backend.security.hmac import sign_payload


def test_signed_ingest_runs_directly(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    get_settings.cache_clear()
    payload = {
        "job_id": "j1",
        "user_id": "u1",
        "org_id": None,
        "input": {"collection_id": "c1", "source": {"type": "text", "content": "hello"}},
    }
    ts, sig = sign_payload("x" * 32, payload)
    result = {"document_id": "j1", "chunk_count": 1, "byte_size": 5}
    with patch("saas_forge_backend.api.routes.ingest.run_ingestion", new_callable=AsyncMock) as run:
        run.return_value = result
        response = TestClient(create_app()).post(
            "/rag/ingest", json=payload,
            headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig},
        )
    assert response.status_code == 200
    assert response.json() == result
    run.assert_awaited_once_with("j1", "u1", None, payload["input"])


def test_ingest_rejects_unsigned_requests(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    get_settings.cache_clear()
    response = TestClient(create_app()).post("/rag/ingest", json={})
    assert response.status_code == 401


def test_ingest_cancellation_returns_conflict(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    get_settings.cache_clear()
    payload = {
        "job_id": "j1", "user_id": "u1", "org_id": None,
        "input": {"collection_id": "c1", "source": {"type": "text", "content": "hello"}},
    }
    ts, sig = sign_payload("x" * 32, payload)
    with patch("saas_forge_backend.api.routes.ingest.run_ingestion", new_callable=AsyncMock) as run:
        run.side_effect = IngestionCancelled("AI ingestion cancelled")
        response = TestClient(create_app()).post(
            "/rag/ingest", json=payload,
            headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig},
        )
    assert response.status_code == 409
