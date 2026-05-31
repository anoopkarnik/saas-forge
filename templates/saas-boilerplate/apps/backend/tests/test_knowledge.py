from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.documents import Document


@pytest.mark.asyncio
async def test_retrieve_returns_chunks_and_applies_threshold(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    docs_with_scores = [
        (Document(page_content="hello", metadata={"document_id": "d1", "chunk_id": "c1"}), 0.91),
        (Document(page_content="weak", metadata={"document_id": "d2", "chunk_id": "c2"}), 0.3),
    ]
    fake_store = MagicMock()
    fake_store.asimilarity_search_with_score = AsyncMock(return_value=docs_with_scores)

    with patch("saas_forge_backend.rag.knowledge.get_vector_store", return_value=fake_store):
        from saas_forge_backend.rag.knowledge import KnowledgeSource

        embedder = MagicMock()
        ks = KnowledgeSource(collection_id="c1", embedder=embedder, top_k=2, score_threshold=0.5)
        chunks = await ks.retrieve("query")

    assert len(chunks) == 1
    assert chunks[0].text == "hello"
    assert chunks[0].as_citation()["doc_id"] == "d1"
