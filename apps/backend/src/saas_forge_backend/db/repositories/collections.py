from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from saas_forge_backend.db.models import AiCollection


async def get(session: AsyncSession, collection_id: str) -> AiCollection | None:
    return await session.get(AiCollection, collection_id)


async def get_by_name(
    session: AsyncSession, *, user_id: str, org_id: str | None, name: str
) -> AiCollection | None:
    stmt = select(AiCollection).where(
        AiCollection.userId == user_id,
        AiCollection.orgId == org_id,
        AiCollection.name == name,
    )
    return (await session.execute(stmt)).scalar_one_or_none()


async def create(
    session: AsyncSession,
    *,
    collection_id: str,
    user_id: str,
    org_id: str | None,
    name: str,
    embedder: str,
    embedding_dims: int,
    description: str | None = None,
) -> AiCollection:
    row = AiCollection(
        id=collection_id,
        userId=user_id,
        orgId=org_id,
        name=name,
        description=description,
        embedder=embedder,
        embeddingDims=embedding_dims,
    )
    session.add(row)
    await session.flush()
    return row
