from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from saas_forge_backend.rag.ingestion import UnsupportedSource, ingest


@pytest.mark.asyncio
async def test_ingest_text_source(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    embedder = MagicMock()
    store = MagicMock()
    store.aadd_texts = AsyncMock()

    # Mock the async sessionmaker so we don't need a real DB.
    session = MagicMock()
    session.__aenter__ = AsyncMock(return_value=session)
    session.__aexit__ = AsyncMock(return_value=None)
    txn = MagicMock()
    txn.__aenter__ = AsyncMock(return_value=None)
    txn.__aexit__ = AsyncMock(return_value=None)
    session.begin = MagicMock(return_value=txn)

    sessionmaker = MagicMock(return_value=session)

    bulk_insert_mock = AsyncMock()

    with patch("saas_forge_backend.rag.ingestion.get_vector_store", return_value=store), \
         patch("saas_forge_backend.rag.ingestion.get_sessionmaker", return_value=sessionmaker), \
         patch("saas_forge_backend.rag.ingestion.chunks_repo.bulk_insert", bulk_insert_mock):
        result = await ingest(
            source={"type": "text", "content": "hello world. " * 50},
            chunking={"chunk_size": 200, "overlap": 20},
            collection_id="c1",
            document_id="d1",
            embedder=embedder,
        )
    assert result.chunk_count >= 1
    bulk_insert_mock.assert_awaited()  # Chunks persisted to Postgres (C1 fix)
    store.aadd_texts.assert_awaited()  # Chunks upserted to vector store


@pytest.mark.asyncio
async def test_ingest_rejects_unknown_source():
    embedder = MagicMock()
    with pytest.raises(UnsupportedSource):
        await ingest(
            source={"type": "magic"},
            chunking=None,
            collection_id="c1",
            document_id="d1",
            embedder=embedder,
        )
