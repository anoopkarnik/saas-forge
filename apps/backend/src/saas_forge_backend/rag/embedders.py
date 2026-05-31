from __future__ import annotations

from langchain_core.embeddings import Embeddings

from saas_forge_backend.config import get_settings


class UnsupportedEmbedder(Exception):
    pass


# Default dimensions per known model. Returned by `dimensions_for`.
_KNOWN_DIMS: dict[str, int] = {
    "openai:text-embedding-3-small": 1536,
    "openai:text-embedding-3-large": 3072,
}


def parse_embedder(value: str) -> tuple[str, str]:
    if ":" not in value:
        raise ValueError(f"expected 'provider:model', got: {value!r}")
    provider, _, model = value.partition(":")
    provider = provider.strip().lower()
    model = model.strip()
    if not provider or not model:
        raise ValueError(f"empty provider or model: {value!r}")
    return provider, model


def dimensions_for(value: str, *, ollama_default: int = 768) -> int:
    if value in _KNOWN_DIMS:
        return _KNOWN_DIMS[value]
    provider, _ = parse_embedder(value)
    if provider == "ollama":
        return ollama_default
    raise UnsupportedEmbedder(f"unknown embedder dims: {value}")


def resolve_embedder(value: str) -> Embeddings:
    provider, model = parse_embedder(value)
    settings = get_settings()

    if provider == "openai":
        if not settings.openai_api_key:
            raise UnsupportedEmbedder("OPENAI_API_KEY not set")
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(model=model, api_key=settings.openai_api_key)

    if provider == "ollama":
        if not settings.ollama_base_url:
            raise UnsupportedEmbedder("OLLAMA_BASE_URL not set")
        from langchain_ollama import OllamaEmbeddings
        return OllamaEmbeddings(model=model, base_url=settings.ollama_base_url)

    raise UnsupportedEmbedder(f"unknown embedder provider: {provider}")
