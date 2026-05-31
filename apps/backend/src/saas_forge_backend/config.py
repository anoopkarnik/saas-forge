from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core
    backend_database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge"
    redis_url: str = "redis://localhost:6379/0"
    backend_hmac_secret: str
    backend_hmac_secret_next: str | None = None

    # RAG
    rag_vector_store: str = "pgvector"
    rag_embedder: str = "openai:text-embedding-3-small"

    # LLM provider creds (optional at boot; required when used)
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    openrouter_api_key: str | None = None
    ollama_base_url: str | None = None

    # Qdrant (optional)
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None

    # Observability
    log_level: str = "INFO"
    log_format: str = "pretty"
    metrics_enabled: bool = False
    otel_exporter_otlp_endpoint: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
