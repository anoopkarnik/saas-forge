from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from saas_forge_backend.config import get_settings


def make_engine() -> AsyncEngine:
    settings = get_settings()
    return create_async_engine(
        settings.backend_database_url,
        pool_size=10,
        max_overflow=10,
        pool_pre_ping=True,
        echo=False,
    )


_engine: AsyncEngine | None = None
_sessionmaker: async_sessionmaker[AsyncSession] | None = None


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        _engine = make_engine()
    return _engine


def get_sessionmaker() -> async_sessionmaker[AsyncSession]:
    global _sessionmaker
    if _sessionmaker is None:
        _sessionmaker = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _sessionmaker


async def session_scope() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency / ARQ helper for a request-scoped session."""
    sm = get_sessionmaker()
    async with sm() as session:
        yield session
