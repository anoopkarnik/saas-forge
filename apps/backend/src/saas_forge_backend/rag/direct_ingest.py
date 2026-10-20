from __future__ import annotations

import asyncio
from contextlib import suppress
from hashlib import blake2b
from typing import Any

from sqlalchemy import text

from saas_forge_backend.db.engine import get_sessionmaker
from saas_forge_backend.db.models import AiDocumentStatus, AiJobStatus
from saas_forge_backend.db.repositories import chunks as chunks_repo
from saas_forge_backend.db.repositories import collections as collections_repo
from saas_forge_backend.db.repositories import documents as docs_repo
from saas_forge_backend.db.repositories import jobs as jobs_repo
from saas_forge_backend.rag.embedders import resolve_embedder
from saas_forge_backend.rag.ingestion import IngestionCancelled, UnsupportedSource, ingest
from saas_forge_backend.rag.vector_store import get_vector_store


async def run_ingestion(
    job_id: str, user_id: str, org_id: str | None, input_payload: dict[str, Any]
) -> dict[str, int | str]:
    """Run one ingestion directly, using the job id as the stable document id."""
    sm = get_sessionmaker()
    # A web timeout can leave the first Python request running while Inngest
    # retries. Serialize attempts for this document, then re-read its status.
    lock_key = int.from_bytes(blake2b(job_id.encode(), digest_size=8).digest(), "big", signed=True)
    async with sm() as lock_session, lock_session.begin():
        await lock_session.execute(
            text("SELECT pg_advisory_xact_lock(:lock_key)"),
            {"lock_key": lock_key},
        )
        heartbeat = asyncio.create_task(_heartbeat_while_running(job_id))
        try:
            return await _run_ingestion_locked(job_id, user_id, org_id, input_payload)
        finally:
            heartbeat.cancel()
            with suppress(asyncio.CancelledError):
                await heartbeat


async def _run_ingestion_locked(
    job_id: str, user_id: str, org_id: str | None, input_payload: dict[str, Any]
) -> dict[str, int | str]:
    collection_id = str(input_payload.get("collection_id", ""))
    source = input_payload.get("source")
    if not collection_id or not isinstance(source, dict) or not source.get("type"):
        raise UnsupportedSource("collection_id and source are required")

    sm = get_sessionmaker()
    async with sm() as session:
        collection = await collections_repo.get(session, collection_id)
        document = await docs_repo.get(session, job_id)
    if collection is None or collection.userId != user_id or collection.orgId != org_id:
        raise UnsupportedSource("unknown collection")
    if document is not None and (
        document.userId != user_id
        or document.orgId != org_id
        or document.collectionId != collection_id
    ):
        raise UnsupportedSource("document does not belong to collection")
    if document is not None and document.status == AiDocumentStatus.READY:
        return {
            "document_id": job_id,
            "chunk_count": document.chunkCount,
            "byte_size": document.byteSize or 0,
        }
    if await _should_stop(job_id):
        raise IngestionCancelled("AI ingestion cancelled")

    embedder = resolve_embedder(collection.embedder)
    if document is not None:
        await _clean_partial(job_id, collection_id, embedder)
        async with sm() as session, session.begin():
            await docs_repo.mark_ingesting(session, document_id=job_id)
    else:
        title = str(input_payload.get("title") or source.get("filename") or job_id)
        async with sm() as session, session.begin():
            await docs_repo.create(
                session,
                document_id=job_id,
                collection_id=collection_id,
                user_id=user_id,
                org_id=org_id,
                source_type=str(source["type"]),
                source_uri=source.get("url"),
                title=title,
            )

    try:
        result = await ingest(
            source=source,
            chunking=input_payload.get("chunking"),
            collection_id=collection_id,
            document_id=job_id,
            embedder=embedder,
            should_cancel=lambda: _should_stop(job_id),
        )
        if await _should_stop(job_id):
            raise IngestionCancelled("AI ingestion cancelled")
        async with sm() as session, session.begin():
            job = await jobs_repo.get_for_update(session, job_id)
            if job is None or job.status != AiJobStatus.RUNNING:
                raise IngestionCancelled("AI ingestion cancelled")
            await docs_repo.mark_ready(
                session, document_id=job_id,
                chunk_count=result.chunk_count, byte_size=result.byte_size,
            )
        return {
            "document_id": job_id,
            "chunk_count": result.chunk_count,
            "byte_size": result.byte_size,
        }
    except IngestionCancelled:
        await _clean_partial(job_id, collection_id, embedder)
        async with sm() as session, session.begin():
            await docs_repo.mark_failed(session, document_id=job_id, error="AI ingestion cancelled")
        raise
    except Exception as exc:
        async with sm() as session, session.begin():
            await docs_repo.mark_failed(session, document_id=job_id, error=str(exc))
        raise


async def _should_stop(job_id: str) -> bool:
    async with get_sessionmaker()() as session:
        job = await jobs_repo.get(session, job_id)
    return job is None or job.status != AiJobStatus.RUNNING


async def _heartbeat_while_running(job_id: str) -> None:
    sm = get_sessionmaker()
    while True:
        async with sm() as session, session.begin():
            active = await jobs_repo.heartbeat(session, job_id)
        if not active:
            return
        await asyncio.sleep(30)


async def _clean_partial(job_id: str, collection_id: str, embedder: Any) -> None:
    sm = get_sessionmaker()
    async with sm() as session:
        chunks = await chunks_repo.list_for_document(session, job_id)
    if chunks:
        store = get_vector_store(collection_id, embedder)
        await store.adelete(ids=[f"{job_id}:{chunk.seq}" for chunk in chunks])
        async with sm() as session, session.begin():
            await chunks_repo.delete_for_document(session, job_id)
