import asyncio
import os
from unittest.mock import MagicMock, patch

import cuid2
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run against compose services",
)


@pytest.mark.asyncio
async def test_rag_pgvector_full_round_trip():
    """Ingest a short text into pgvector, then run rag_chat (mocked LLM) over it."""
    from sqlalchemy import text

    from saas_forge_backend.db.engine import get_sessionmaker
    from saas_forge_backend.db.models import AiJobStatus
    from saas_forge_backend.db.repositories import (
        collections as collections_repo,
        jobs as jobs_repo,
    )
    from saas_forge_backend.jobs.queue import enqueue_ingest_document_job

    sm = get_sessionmaker()
    user_id = cuid2.cuid()
    collection_id = cuid2.cuid()
    async with sm() as s, s.begin():
        await s.execute(
            text(
                'INSERT INTO user_schema."User" (id, name, email, "emailVerified", role, banned, '
                '"creditsUsed","creditsTotal","createdAt","updatedAt") '
                "VALUES (:id, 'test', :email, false, 'user', false, 0, 20, now(), now())"
            ),
            {"id": user_id, "email": f"{user_id}@example.com"},
        )
        await collections_repo.create(
            s,
            collection_id=collection_id,
            user_id=user_id,
            org_id=None,
            name=f"test-{collection_id}",
            embedder="openai:text-embedding-3-small",
            embedding_dims=1536,
        )

    # Insert a PENDING ingest job. Embedding requires a real OpenAI key; in CI we
    # use a fake embedder via env. For local runs, set OPENAI_API_KEY.
    if not os.getenv("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not set; pgvector e2e needs real embeddings")

    job_id = cuid2.cuid()
    async with sm() as s, s.begin():
        await jobs_repo.insert_pending(
            s, job_id=job_id, user_id=user_id, org_id=None,
            agent_id="rag_ingest",
            input_payload={
                "collection_id": collection_id,
                "title": "Capitals",
                "source": {"type": "text", "content": "Paris is the capital of France. Tokyo is the capital of Japan."},
            },
        )
    await enqueue_ingest_document_job(job_id)

    # Poll for completion.
    deadline = asyncio.get_event_loop().time() + 60
    final = None
    while asyncio.get_event_loop().time() < deadline:
        async with sm() as s:
            row = await jobs_repo.get(s, job_id)
        if row.status in {AiJobStatus.SUCCEEDED, AiJobStatus.FAILED}:
            final = row
            break
        await asyncio.sleep(0.5)
    assert final is not None and final.status == AiJobStatus.SUCCEEDED
    assert final.result["chunk_count"] >= 1

    # Now run rag_chat with a mocked LLM (we only verify retrieval works).
    from langchain_core.messages import AIMessageChunk

    class FakeLLM:
        async def astream(self, _messages):
            for t in ["The", " capital", " is", " Paris."]:
                yield AIMessageChunk(content=t)

    from saas_forge_backend.agents.rag_chat import run as rag_chat

    with patch("saas_forge_backend.agents.rag_chat.resolve_chat_model", return_value=FakeLLM()):
        events = []
        async for ev in rag_chat(
            {
                "query": "What is the capital of France?",
                "collection_id": collection_id,
                "llm": "openai:gpt-4o-mini",
                "top_k": 4,
            },
            ctx={},
        ):
            events.append(ev)

    citations = [e for e in events if e.type == "citation"]
    assert citations, "expected at least one citation event from pgvector retrieval"
    final_event = next(e for e in events if e.type == "final")
    assert "Paris" in final_event.payload["output"]["answer"]
