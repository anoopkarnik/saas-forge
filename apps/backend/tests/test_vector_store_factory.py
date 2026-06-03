from unittest.mock import MagicMock, patch

import pytest


def test_pgvector_selected_by_default(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("BACKEND_DATABASE_URL", "postgresql+asyncpg://u:p@h/db")
    monkeypatch.setenv("RAG_VECTOR_STORE", "pgvector")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    from saas_forge_backend.rag import vector_store as vs

    embedder = MagicMock()
    # PGVector eagerly connects on instantiation; patch the class to avoid a real connection.
    FakePGVector = type("PGVector", (), {})
    fake_store = FakePGVector()
    with patch("langchain_postgres.PGVector", return_value=fake_store) as mock_pgv:
        store = vs.get_vector_store("test-collection", embedder)
        mock_pgv.assert_called_once()
    assert type(store).__name__ == "PGVector"


def test_qdrant_raises_without_url(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("RAG_VECTOR_STORE", "qdrant")
    monkeypatch.delenv("QDRANT_URL", raising=False)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    from saas_forge_backend.rag.vector_store import UnsupportedVectorStore, get_vector_store

    with pytest.raises(UnsupportedVectorStore):
        get_vector_store("c1", MagicMock())


def test_unknown_backend_raises(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("RAG_VECTOR_STORE", "weaviate")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    from saas_forge_backend.rag.vector_store import UnsupportedVectorStore, get_vector_store

    with pytest.raises(UnsupportedVectorStore):
        get_vector_store("c1", MagicMock())
