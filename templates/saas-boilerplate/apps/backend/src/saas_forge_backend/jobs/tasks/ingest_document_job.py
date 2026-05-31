from __future__ import annotations

import logging
from typing import Any

import cuid2

from saas_forge_backend.db.engine import get_sessionmaker
from saas_forge_backend.db.models import AiJobStatus
from saas_forge_backend.db.repositories import (
    chunks as chunks_repo,
    collections as collections_repo,
    documents as docs_repo,
    jobs as jobs_repo,
)
from saas_forge_backend.jobs import redis_status
from saas_forge_backend.jobs.event_emitter import EventEmitter
from saas_forge_backend.rag.embedders import resolve_embedder
from saas_forge_backend.rag.ingestion import UnsupportedSource, ingest
from saas_forge_backend.rag.splitters import ChunkingConfig, split_text

log = logging.getLogger(__name__)


async def ingest_document_job(ctx: dict[str, Any], job_id: str) -> dict[str, Any]:
    sm = get_sessionmaker()
    async with sm() as s, s.begin():
        row = await jobs_repo.get(s, job_id)
        if row is None:
            return {"skipped": True}
        if row.status == AiJobStatus.CANCELLED:
            return {"skipped": True, "reason": "cancelled_before_pickup"}
        await jobs_repo.mark_running(s, job_id)

    await redis_status.write_running(job_id, agent_id=row.agentId)
    emitter = EventEmitter(job_id=job_id)
    input_payload = row.input or {}
    collection_id = str(input_payload["collection_id"])

    try:
        async with sm() as s:
            collection = await collections_repo.get(s, collection_id)
        if collection is None:
            raise UnsupportedSource(f"unknown collection: {collection_id}")
        embedder = resolve_embedder(collection.embedder)

        document_id = cuid2.cuid()
        title = str(input_payload.get("title") or input_payload.get("source", {}).get("filename") or document_id)
        async with sm() as s, s.begin():
            await docs_repo.create(
                s,
                document_id=document_id,
                collection_id=collection_id,
                user_id=row.userId,
                org_id=row.orgId,
                source_type=str(input_payload["source"]["type"]),
                source_uri=input_payload["source"].get("url"),
                title=title,
            )
            await emitter.emit(s, type="step", payload={"node": "load", "status": "start"})

        async with sm() as s, s.begin():
            await emitter.emit(s, type="step", payload={"node": "load", "status": "end"})
            await emitter.emit(s, type="step", payload={"node": "extract_split", "status": "start"})

        result = await ingest(
            source=input_payload["source"],
            chunking=input_payload.get("chunking"),
            collection_id=collection_id,
            document_id=document_id,
            embedder=embedder,
        )

        async with sm() as s, s.begin():
            await emitter.emit(s, type="step", payload={
                "node": "embed_upsert", "status": "end", "chunks": result.chunk_count,
            })
            await docs_repo.mark_ready(s, document_id=document_id, chunk_count=result.chunk_count)
            await jobs_repo.mark_terminal(
                s, job_id,
                status=AiJobStatus.SUCCEEDED,
                result={
                    "document_id": document_id,
                    "chunk_count": result.chunk_count,
                    "byte_size": result.byte_size,
                },
            )
        await redis_status.write_terminal(job_id, status="SUCCEEDED")
        return {"ok": True}

    except UnsupportedSource as exc:
        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(
                s, job_id,
                status=AiJobStatus.FAILED,
                error_code="UNSUPPORTED_SOURCE",
                error_message=str(exc),
            )
        await redis_status.write_terminal(job_id, status="FAILED", error_code="UNSUPPORTED_SOURCE")
        raise
    except Exception as exc:  # noqa: BLE001
        log.exception("ingest_document_job %s failed", job_id)
        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(
                s, job_id,
                status=AiJobStatus.FAILED,
                error_code="INGESTION_ERROR",
                error_message=str(exc),
            )
        await redis_status.write_terminal(job_id, status="FAILED", error_code="INGESTION_ERROR")
        raise
