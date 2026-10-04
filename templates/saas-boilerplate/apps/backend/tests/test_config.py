import pytest
from pydantic import ValidationError

from saas_forge_backend.config import Settings

STRONG_SECRET = "s" * 40


@pytest.fixture(autouse=True)
def _ignore_local_env_file(monkeypatch, tmp_path):
    # Settings reads .env from the working directory; keep apps/backend/.env out.
    monkeypatch.chdir(tmp_path)


def _production_settings(**overrides):
    values = {
        "app_env": "production",
        "backend_database_url": "postgresql+asyncpg://u:p@db:5432/app",
        "redis_url": "redis://redis:6379/0",
        "backend_hmac_secret": STRONG_SECRET,
        **overrides,
    }
    return Settings(**values)


def test_development_accepts_placeholder_secret():
    settings = Settings(backend_hmac_secret="dev-only-change-me-32bytes-hex0000")
    assert settings.app_env == "development"


def test_production_accepts_strong_configuration():
    assert _production_settings().app_env == "production"


@pytest.mark.parametrize("secret", ["dev-only-change-me-32bytes-hex0000", "x"])
def test_production_rejects_weak_hmac_secret(secret):
    with pytest.raises(ValidationError, match="BACKEND_HMAC_SECRET"):
        _production_settings(backend_hmac_secret=secret)


def test_production_rejects_weak_rotation_secret():
    with pytest.raises(ValidationError, match="BACKEND_HMAC_SECRET_NEXT"):
        _production_settings(backend_hmac_secret_next="short")


def test_production_ignores_empty_rotation_secret():
    assert _production_settings(backend_hmac_secret_next="").backend_hmac_secret_next == ""


def test_production_requires_explicit_service_urls(monkeypatch):
    monkeypatch.delenv("BACKEND_DATABASE_URL", raising=False)
    monkeypatch.delenv("REDIS_URL", raising=False)
    with pytest.raises(ValidationError) as exc:
        Settings(app_env="production", backend_hmac_secret=STRONG_SECRET)
    assert "BACKEND_DATABASE_URL" in str(exc.value)
    assert "REDIS_URL" in str(exc.value)


def test_production_requires_qdrant_url_when_selected():
    with pytest.raises(ValidationError, match="QDRANT_URL"):
        _production_settings(rag_vector_store="qdrant")
