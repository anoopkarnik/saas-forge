from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from saas_forge_backend.config import get_settings

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class UnsupportedProvider(Exception):
    pass


class MissingProviderCredentials(Exception):
    pass


def parse_provider_model(value: str) -> tuple[str, str]:
    if ":" not in value:
        raise ValueError(f"expected 'provider:model', got: {value!r}")
    provider, _, model = value.partition(":")
    provider = provider.strip().lower()
    model = model.strip()
    if not provider or not model:
        raise ValueError(f"empty provider or model in: {value!r}")
    return provider, model


def resolve_chat_model(value: str, *, temperature: float = 0.2) -> BaseChatModel:
    provider, model = parse_provider_model(value)
    settings = get_settings()

    if provider == "openai":
        if not settings.openai_api_key:
            raise MissingProviderCredentials("OPENAI_API_KEY not set")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, temperature=temperature, api_key=settings.openai_api_key)

    if provider == "openrouter":
        if not settings.openrouter_api_key:
            raise MissingProviderCredentials("OPENROUTER_API_KEY not set")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.openrouter_api_key,
            base_url=OPENROUTER_BASE_URL,
        )

    if provider == "anthropic":
        if not settings.anthropic_api_key:
            raise MissingProviderCredentials("ANTHROPIC_API_KEY not set")
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model, temperature=temperature, api_key=settings.anthropic_api_key)

    if provider == "ollama":
        if not settings.ollama_base_url:
            raise MissingProviderCredentials("OLLAMA_BASE_URL not set")
        from langchain_ollama import ChatOllama
        return ChatOllama(model=model, temperature=temperature, base_url=settings.ollama_base_url)

    raise UnsupportedProvider(f"unknown provider: {provider}")
