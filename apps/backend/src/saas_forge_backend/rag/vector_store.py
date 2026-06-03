from __future__ import annotations

from langchain_core.embeddings import Embeddings
from langchain_core.vectorstores import VectorStore

from saas_forge_backend.config import get_settings


class UnsupportedVectorStore(Exception):
    pass


def _to_sync_pg_url(asyncpg_url: str) -> str:
    """`langchain_postgres.PGVector` uses sync psycopg under the hood."""
    return asyncpg_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)


def get_vector_store(collection_id: str, embedder: Embeddings) -> VectorStore:
    settings = get_settings()
    backend = settings.rag_vector_store

    if backend == "pgvector":
        from langchain_postgres import PGVector
        return PGVector(
            embeddings=embedder,
            collection_name=collection_id,
            connection=_to_sync_pg_url(settings.backend_database_url),
            use_jsonb=True,
        )

    if backend == "qdrant":
        if not settings.qdrant_url:
            raise UnsupportedVectorStore("QDRANT_URL not set")
        from langchain_qdrant import QdrantVectorStore
        return QdrantVectorStore.from_existing_collection(
            collection_name=collection_id,
            embedding=embedder,
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )

    raise UnsupportedVectorStore(f"unknown RAG_VECTOR_STORE: {backend}")
