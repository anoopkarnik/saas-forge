import pytest

from saas_forge_backend.rag.embedders import (
    UnsupportedEmbedder,
    dimensions_for,
    parse_embedder,
    resolve_embedder,
)


def test_parse_basic():
    assert parse_embedder("openai:text-embedding-3-small") == ("openai", "text-embedding-3-small")
    assert parse_embedder("ollama:nomic-embed-text") == ("ollama", "nomic-embed-text")


def test_dimensions_known():
    assert dimensions_for("openai:text-embedding-3-small") == 1536
    assert dimensions_for("openai:text-embedding-3-large") == 3072
    assert dimensions_for("ollama:nomic-embed-text") == 768


def test_dimensions_unknown():
    with pytest.raises(UnsupportedEmbedder):
        dimensions_for("googleflavor:foo")


def test_resolve_openai(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    emb = resolve_embedder("openai:text-embedding-3-small")
    assert type(emb).__module__.startswith("langchain_openai")
