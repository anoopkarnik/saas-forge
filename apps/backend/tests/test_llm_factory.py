import pytest

from saas_forge_backend.llm.factory import (
    UnsupportedProvider,
    parse_provider_model,
    resolve_chat_model,
)


def test_parse_provider_model_basic():
    assert parse_provider_model("openai:gpt-4o-mini") == ("openai", "gpt-4o-mini")
    assert parse_provider_model("anthropic:claude-3-5-sonnet-20241022") == (
        "anthropic", "claude-3-5-sonnet-20241022",
    )
    assert parse_provider_model("ollama:llama3.1") == ("ollama", "llama3.1")
    assert parse_provider_model("openrouter:meta-llama/llama-3.1-70b") == (
        "openrouter", "meta-llama/llama-3.1-70b",
    )


def test_parse_provider_model_rejects_bad_format():
    with pytest.raises(ValueError):
        parse_provider_model("nope")
    with pytest.raises(ValueError):
        parse_provider_model("openai:")


def test_unsupported_provider_raises(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    with pytest.raises(UnsupportedProvider):
        resolve_chat_model("googleflavor:foo")


def test_resolve_openai(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    model = resolve_chat_model("openai:gpt-4o-mini")
    # Just verify the class came from langchain_openai.
    assert type(model).__module__.startswith("langchain_openai")


def test_resolve_openrouter_uses_openai_with_base_url(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    model = resolve_chat_model("openrouter:meta-llama/llama-3.1-70b")
    assert type(model).__module__.startswith("langchain_openai")
    # Spot-check that base_url got swapped.
    assert "openrouter.ai" in str(getattr(model, "openai_api_base", "")) or \
           "openrouter.ai" in str(getattr(model, "base_url", ""))
