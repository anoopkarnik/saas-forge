from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_rag_chat_emits_citations_then_tokens_then_final(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    from saas_forge_backend.rag.knowledge import RetrievedChunk

    fake_chunks = [
        RetrievedChunk(text="Paris is the capital of France.",
                       metadata={"document_id": "d1", "chunk_id": "c1"}, score=0.9),
    ]
    fake_ks = MagicMock()
    fake_ks.retrieve = AsyncMock(return_value=fake_chunks)

    class FakeLLM:
        async def astream(self, _messages):
            for t in ["Pa", "ris", "."]:
                m = MagicMock()
                m.content = t
                yield m

    with patch("saas_forge_backend.agents.rag_chat.KnowledgeSource", return_value=fake_ks), \
         patch("saas_forge_backend.agents.rag_chat.resolve_chat_model", return_value=FakeLLM()), \
         patch("saas_forge_backend.agents.rag_chat.resolve_embedder", return_value=MagicMock()):

        from saas_forge_backend.agents.rag_chat import run

        events = []
        async for ev in run(
            {"query": "capital of France?", "collection_id": "c1", "llm": "openai:gpt-4o-mini"},
            ctx={},
        ):
            events.append(ev)

    types = [e.type for e in events]
    assert "citation" in types
    assert types[-1] == "final"
    assert events[-1].payload["output"]["answer"] == "Paris."
