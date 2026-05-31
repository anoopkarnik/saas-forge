from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from langchain_core.embeddings import Embeddings

from saas_forge_backend.rag.vector_store import get_vector_store


@dataclass(slots=True)
class RetrievedChunk:
    text: str
    metadata: dict[str, Any]
    score: float

    def as_citation(self) -> dict[str, Any]:
        return {
            "doc_id": self.metadata.get("document_id"),
            "chunk_id": self.metadata.get("chunk_id"),
            "score": self.score,
            "snippet": self.text[:240],
        }


@dataclass(slots=True)
class KnowledgeSource:
    collection_id: str
    embedder: Embeddings
    top_k: int = 6
    score_threshold: float | None = None
    metadata_filter: dict[str, Any] | None = field(default=None)

    async def retrieve(self, query: str) -> list[RetrievedChunk]:
        store = get_vector_store(self.collection_id, self.embedder)
        results = await store.asimilarity_search_with_score(
            query,
            k=self.top_k,
            filter=self.metadata_filter,
        )
        chunks: list[RetrievedChunk] = []
        for doc, score in results:
            if self.score_threshold is not None and score < self.score_threshold:
                continue
            chunks.append(
                RetrievedChunk(text=doc.page_content, metadata=dict(doc.metadata), score=float(score)),
            )
        return chunks
