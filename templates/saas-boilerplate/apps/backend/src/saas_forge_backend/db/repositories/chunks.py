from __future__ import annotations

from typing import Iterable, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saas_forge_backend.db.models import AiDocumentChunk


async def bulk_insert(
    session: AsyncSession,
    *,
    document_id: str,
    collection_id: str,
    rows: Iterable[tuple[int, str, dict]],  # (seq, text, metadata)
) -> list[AiDocumentChunk]:
    import cuid2
    instances = []
    for seq, txt, meta in rows:
        instances.append(
            AiDocumentChunk(
                id=cuid2.cuid(),
                documentId=document_id,
                collectionId=collection_id,
                seq=seq,
                text=txt,
                chunk_metadata=meta,
            )
        )
    session.add_all(instances)
    await session.flush()
    return instances


async def attach_embeddings(
    session: AsyncSession,
    *,
    chunk_ids: Sequence[str],
    embeddings: Sequence[list[float]],
) -> None:
    if len(chunk_ids) != len(embeddings):
        raise ValueError("chunk_ids and embeddings must align")
    from sqlalchemy import bindparam, update
    stmt = (
        update(AiDocumentChunk)
        .where(AiDocumentChunk.id == bindparam("cid"))
        .values(embedding=bindparam("emb"))
    )
    await session.execute(
        stmt,
        [{"cid": c, "emb": e} for c, e in zip(chunk_ids, embeddings, strict=True)],
    )


async def list_for_document(session: AsyncSession, document_id: str) -> list[AiDocumentChunk]:
    stmt = (
        select(AiDocumentChunk)
        .where(AiDocumentChunk.documentId == document_id)
        .order_by(AiDocumentChunk.seq.asc())
    )
    return list((await session.execute(stmt)).scalars().all())
