from functools import lru_cache
from typing import Literal, Self

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Values shipped in .env.example files and docker-compose.yml for local
# development. They are public, so production must never run with them.
DEV_PLACEHOLDER_SECRETS = {"dev-only-change-me-32bytes-hex0000"}
MIN_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # production fails fast at boot on weak secrets or implicit service URLs
    app_env: Literal["development", "production"] = "development"

    # Core
    backend_database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge"
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

    @model_validator(mode="after")
    def _check_production(self) -> Self:
        if self.app_env != "production":
            return self

        problems: list[str] = []
        secrets = {
            "BACKEND_HMAC_SECRET": self.backend_hmac_secret,
            "BACKEND_HMAC_SECRET_NEXT": self.backend_hmac_secret_next,
        }
        for name, value in secrets.items():
            if not value:
                continue  # BACKEND_HMAC_SECRET itself is a required field
            if value in DEV_PLACEHOLDER_SECRETS:
                problems.append(f"{name} is a public development placeholder")
            elif len(value) < MIN_SECRET_LENGTH:
                problems.append(f"{name} must be at least {MIN_SECRET_LENGTH} characters")

        # The defaults point at localhost and only make sense for local dev.
        for field in ("backend_database_url",):
            if field not in self.model_fields_set:
                problems.append(f"{field.upper()} must be set explicitly")

        if self.rag_vector_store == "qdrant" and not self.qdrant_url:
            problems.append("QDRANT_URL is required when RAG_VECTOR_STORE=qdrant")

        if problems:
            raise ValueError("Invalid production configuration: " + "; ".join(problems))
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
