from __future__ import annotations

import io
import logging
from dataclasses import dataclass
from typing import Any

import httpx
from langchain_core.documents import Document
from langchain_core.embeddings import Embeddings
from tenacity import retry, stop_after_attempt, wait_exponential

from saas_forge_backend.rag.splitters import ChunkingConfig, split_text
from saas_forge_backend.rag.vector_store import get_vector_store

log = logging.getLogger(__name__)

SUPPORTED_FILE_EXTENSIONS = {".txt", ".md", ".pdf"}


@dataclass(slots=True)
class IngestionResult:
    chunk_count: int
    byte_size: int


class UnsupportedSource(Exception):
    pass


async def _fetch_bytes(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


def _extract_text(content: bytes, filename: str | None) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join((p.extract_text() or "") for p in reader.pages)
    # txt / md / unknown extension defaults to utf-8 text
    return content.decode("utf-8", errors="replace")


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10), reraise=True)
async def _embed_batch(embedder: Embeddings, texts: list[str]) -> list[list[float]]:
    return await embedder.aembed_documents(texts)


async def ingest(
    *,
    source: dict[str, Any],
    chunking: dict | None,
    collection_id: str,
    document_id: str,
    embedder: Embeddings,
) -> IngestionResult:
    src_type = source.get("type")
    if src_type == "text":
        text = str(source.get("content", ""))
        byte_size = len(text.encode("utf-8"))
    elif src_type == "uploaded_file":
        url = str(source.get("url", ""))
        filename = source.get("filename")
        if not url:
            raise UnsupportedSource("uploaded_file requires 'url'")
        suffix = "." + (filename or url).rsplit(".", 1)[-1].lower() if "." in (filename or url) else ""
        if suffix not in SUPPORTED_FILE_EXTENSIONS:
            raise UnsupportedSource(f"unsupported file extension: {suffix}")
        content = await _fetch_bytes(url)
        text = _extract_text(content, filename)
        byte_size = len(content)
    else:
        raise UnsupportedSource(f"unknown source type: {src_type}")

    chunks = split_text(text, ChunkingConfig.from_input(chunking))
    if not chunks:
        return IngestionResult(chunk_count=0, byte_size=byte_size)

    embeddings = await _embed_batch(embedder, chunks)

    store = get_vector_store(collection_id, embedder)
    docs = [
        Document(
            page_content=t,
            metadata={"document_id": document_id, "collection_id": collection_id, "seq": i},
        )
        for i, t in enumerate(chunks)
    ]
    # `aadd_documents` calls the embedder again unless we pass IDs only.
    # For control, we go through `aadd_texts` with explicit embeddings.
    await store.aadd_texts(
        texts=chunks,
        metadatas=[d.metadata for d in docs],
        ids=[f"{document_id}:{i}" for i in range(len(chunks))],
    )
    return IngestionResult(chunk_count=len(chunks), byte_size=byte_size)
