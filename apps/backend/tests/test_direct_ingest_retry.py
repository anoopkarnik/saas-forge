from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from saas_forge_backend.db.models import AiDocumentStatus, AiJobStatus
from saas_forge_backend.rag import direct_ingest
from saas_forge_backend.rag.ingestion import IngestionCancelled, IngestionResult


class FakeSession:
    execute = AsyncMock()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    def begin(self):
        return self


@pytest.fixture()
def db_mocks(monkeypatch):
    monkeypatch.setattr(direct_ingest, "get_sessionmaker", lambda: FakeSession)
    collection = SimpleNamespace(id="c1", userId="u1", orgId=None, embedder="test")
    monkeypatch.setattr(direct_ingest.collections_repo, "get", AsyncMock(return_value=collection))
    job = SimpleNamespace(status=AiJobStatus.RUNNING)
    monkeypatch.setattr(direct_ingest.jobs_repo, "get", AsyncMock(return_value=job))
    monkeypatch.setattr(direct_ingest.jobs_repo, "get_for_update", AsyncMock(return_value=job))
    monkeypatch.setattr(direct_ingest.jobs_repo, "heartbeat", AsyncMock(return_value=True))
    monkeypatch.setattr(direct_ingest, "resolve_embedder", MagicMock(return_value=object()))
    monkeypatch.setattr(direct_ingest.docs_repo, "mark_ready", AsyncMock())
    monkeypatch.setattr(direct_ingest.docs_repo, "mark_failed", AsyncMock())
    monkeypatch.setattr(direct_ingest.docs_repo, "mark_ingesting", AsyncMock())
    monkeypatch.setattr(direct_ingest.docs_repo, "create", AsyncMock())
    monkeypatch.setattr(direct_ingest.chunks_repo, "delete_for_document", AsyncMock())
    monkeypatch.setattr(direct_ingest.chunks_repo, "list_for_document", AsyncMock(return_value=[]))
    store = SimpleNamespace(adelete=AsyncMock())
    monkeypatch.setattr(direct_ingest, "get_vector_store", MagicMock(return_value=store))
    ingest = AsyncMock(return_value=IngestionResult(chunk_count=2, byte_size=10))
    monkeypatch.setattr(direct_ingest, "ingest", ingest)
    return SimpleNamespace(store=store, ingest=ingest)


PAYLOAD = {"collection_id": "c1", "source": {"type": "text", "content": "hello"}}


@pytest.mark.asyncio
async def test_repeated_ready_ingestion_returns_existing_document(db_mocks, monkeypatch):
    direct_ingest.jobs_repo.get.return_value.status = AiJobStatus.SUCCEEDED  # type: ignore[attr-defined]
    document = SimpleNamespace(
        status=AiDocumentStatus.READY, userId="u1", orgId=None,
        collectionId="c1", chunkCount=2, byteSize=10,
    )
    monkeypatch.setattr(direct_ingest.docs_repo, "get", AsyncMock(return_value=document))
    assert await direct_ingest.run_ingestion("j1", "u1", None, PAYLOAD) == {
        "document_id": "j1", "chunk_count": 2, "byte_size": 10,
    }
    db_mocks.ingest.assert_not_awaited()
    db_mocks.store.adelete.assert_not_awaited()


@pytest.mark.asyncio
async def test_retry_cleans_partial_chunks_and_vectors(db_mocks, monkeypatch):
    document = SimpleNamespace(
        status=AiDocumentStatus.FAILED, userId="u1", orgId=None,
        collectionId="c1", chunkCount=0, byteSize=None,
    )
    monkeypatch.setattr(direct_ingest.docs_repo, "get", AsyncMock(return_value=document))
    monkeypatch.setattr(
        direct_ingest.chunks_repo, "list_for_document",
        AsyncMock(return_value=[SimpleNamespace(seq=0), SimpleNamespace(seq=1)]),
    )
    result = await direct_ingest.run_ingestion("j1", "u1", None, PAYLOAD)
    assert result["document_id"] == "j1"
    db_mocks.store.adelete.assert_awaited_once_with(ids=["j1:0", "j1:1"])
    assert direct_ingest.chunks_repo.delete_for_document.await_count == 1  # type: ignore[attr-defined]
    assert direct_ingest.docs_repo.create.await_count == 0  # type: ignore[attr-defined]


@pytest.mark.asyncio
async def test_cancellation_cleans_partial_ingestion(db_mocks, monkeypatch):
    monkeypatch.setattr(direct_ingest.docs_repo, "get", AsyncMock(return_value=None))
    monkeypatch.setattr(
        direct_ingest.chunks_repo, "list_for_document",
        AsyncMock(return_value=[SimpleNamespace(seq=0)]),
    )
    db_mocks.ingest.side_effect = IngestionCancelled("AI ingestion cancelled")
    with pytest.raises(IngestionCancelled):
        await direct_ingest.run_ingestion("j1", "u1", None, PAYLOAD)
    db_mocks.store.adelete.assert_awaited_once_with(ids=["j1:0"])
    assert direct_ingest.docs_repo.mark_failed.await_count == 1  # type: ignore[attr-defined]
