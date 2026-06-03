from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from saas_forge_backend.db.models import AiDocument, AiDocumentStatus


async def create(
    session: AsyncSession,
    *,
    document_id: str,
    collection_id: str,
    user_id: str,
    org_id: str | None,
    source_type: str,
    source_uri: str | None,
    title: str,
    byte_size: int | None = None,
) -> AiDocument:
    row = AiDocument(
        id=document_id,
        collectionId=collection_id,
        userId=user_id,
        orgId=org_id,
        sourceType=source_type,
        sourceUri=source_uri,
        title=title,
        status=AiDocumentStatus.INGESTING,
        byteSize=byte_size,
    )
    session.add(row)
    await session.flush()
    return row


async def mark_ready(session: AsyncSession, *, document_id: str, chunk_count: int) -> None:
    await session.execute(
        update(AiDocument)
        .where(AiDocument.id == document_id)
        .values(
            status=AiDocumentStatus.READY,
            chunkCount=chunk_count,
            indexedAt=datetime.now(timezone.utc),
        )
    )


async def mark_failed(session: AsyncSession, *, document_id: str, error: str) -> None:
    await session.execute(
        update(AiDocument)
        .where(AiDocument.id == document_id)
        .values(status=AiDocumentStatus.FAILED, errorMessage=error)
    )


async def get(session: AsyncSession, document_id: str) -> AiDocument | None:
    return await session.get(AiDocument, document_id)
