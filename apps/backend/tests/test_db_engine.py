from saas_forge_backend.db import models
from saas_forge_backend.db.engine import get_engine, get_sessionmaker


def test_models_import():
    # Smoke: tables registered on metadata.
    table_names = {t.name for t in models.Base.metadata.tables.values()}
    assert {"AiJobRun", "AiJobEvent", "AiCollection", "AiDocument", "AiDocumentChunk"} <= table_names


def test_engine_is_singleton(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("BACKEND_DATABASE_URL", "postgresql+asyncpg://u:p@h/db")
    from saas_forge_backend.config import get_settings

    get_settings.cache_clear()
    e1 = get_engine()
    e2 = get_engine()
    assert e1 is e2
    sm1 = get_sessionmaker()
    sm2 = get_sessionmaker()
    assert sm1 is sm2
