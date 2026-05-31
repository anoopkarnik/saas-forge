from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage

from saas_forge_backend.agents.registry import AgentEvent
from saas_forge_backend.llm.factory import resolve_chat_model
from saas_forge_backend.rag.embedders import resolve_embedder
from saas_forge_backend.rag.knowledge import KnowledgeSource


SYSTEM_PROMPT = (
    "You are a helpful assistant. Use only the provided context to answer. "
    "If the context is insufficient, say so plainly. Cite chunk numbers as [n]."
)


def _format_context(chunks: list[Document]) -> str:
    return "\n\n".join(f"[{i}] {c.page_content}" for i, c in enumerate(chunks))


async def run(input_payload: dict[str, Any], ctx: dict[str, Any]) -> AsyncIterator[AgentEvent]:
    """
    Input shape:
      {
        "query": str,
        "collection_id": str,
        "embedder": "openai:text-embedding-3-small",     # optional, defaults to settings
        "llm": "openai:gpt-4o-mini",                     # required
        "top_k": 6                                       # optional
      }
    """
    query = str(input_payload["query"])
    collection_id = str(input_payload["collection_id"])
    embedder_name = str(input_payload.get("embedder", ""))
    llm_name = str(input_payload["llm"])
    top_k = int(input_payload.get("top_k", 6))

    yield AgentEvent(type="step", payload={"node": "retrieve", "status": "start"})

    embedder = resolve_embedder(embedder_name) if embedder_name else resolve_embedder(
        # Falls back to settings.rag_embedder
        __import__("saas_forge_backend.config", fromlist=["get_settings"]).get_settings().rag_embedder
    )
    knowledge = KnowledgeSource(collection_id=collection_id, embedder=embedder, top_k=top_k)
    chunks = await knowledge.retrieve(query)

    for chunk in chunks:
        yield AgentEvent(type="citation", payload=chunk.as_citation())

    yield AgentEvent(type="step", payload={"node": "retrieve", "status": "end"})
    yield AgentEvent(type="step", payload={"node": "answer", "status": "start"})

    llm = resolve_chat_model(llm_name)
    context_block = _format_context([Document(page_content=c.text, metadata=c.metadata) for c in chunks])
    messages = [
        SystemMessage(SYSTEM_PROMPT),
        HumanMessage(f"Context:\n{context_block}\n\nQuestion: {query}"),
    ]
    answer_parts: list[str] = []
    async for chunk in llm.astream(messages):
        token = chunk.content or ""
        if token:
            answer_parts.append(str(token))
            yield AgentEvent(type="token", payload={"delta": str(token)})

    yield AgentEvent(type="step", payload={"node": "answer", "status": "end"})
    yield AgentEvent(type="final", payload={"output": {"answer": "".join(answer_parts)}})
