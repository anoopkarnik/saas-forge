from __future__ import annotations

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncEngine

from saas_forge_backend.db.models import Base


class SchemaDriftError(RuntimeError):
    pass


EXPECTED_TABLES = {t.name for t in Base.metadata.tables.values()}


async def assert_schema_agreement(engine: AsyncEngine) -> None:
    """Raises SchemaDriftError if expected tables / vector column are missing."""
    async with engine.connect() as conn:
        # Tables in ai_schema.
        present = await conn.run_sync(
            lambda sync_conn: set(inspect(sync_conn).get_table_names(schema="ai_schema"))
        )
        missing = EXPECTED_TABLES - present
        if missing:
            raise SchemaDriftError(f"Missing tables in ai_schema: {sorted(missing)}")

        # Vector extension + column.
        result = await conn.execute(text("SELECT extname FROM pg_extension WHERE extname='vector'"))
        if result.first() is None:
            raise SchemaDriftError("pgvector extension not installed (run migration tail)")

        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema='ai_schema' "
                "AND table_name='AiDocumentChunk' AND column_name='embedding'"
            )
        )
        if result.first() is None:
            raise SchemaDriftError("AiDocumentChunk.embedding column missing")
