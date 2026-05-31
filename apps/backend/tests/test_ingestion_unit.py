from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from saas_forge_backend.rag.ingestion import UnsupportedSource, ingest


@pytest.mark.asyncio
async def test_ingest_text_source(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    embedder = MagicMock()
    embedder.aembed_documents = AsyncMock(return_value=[[0.1] * 4, [0.2] * 4])
    store = MagicMock()
    store.aadd_texts = AsyncMock()

    with patch("saas_forge_backend.rag.ingestion.get_vector_store", return_value=store):
        result = await ingest(
            source={"type": "text", "content": "hello world. " * 50},
            chunking={"chunk_size": 200, "overlap": 20},
            collection_id="c1",
            document_id="d1",
            embedder=embedder,
        )
    assert result.chunk_count >= 1
    embedder.aembed_documents.assert_awaited()
    store.aadd_texts.assert_awaited()


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
