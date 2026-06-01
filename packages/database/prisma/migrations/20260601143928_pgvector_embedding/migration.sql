-- Adds the pgvector extension and the `embedding` column on AiDocumentChunk.
-- Prisma cannot express the vector(N) column type natively; this file is a
-- companion to the preceding 20260601142139_ai_events_tables migration which
-- created AiDocumentChunk with all the Prisma-expressible columns.
--
-- Dimension is 1536 (matches RAG_EMBEDDER=openai:text-embedding-3-small,
-- the Phase-1 default). pgvector's HNSW index has a hard 2000-dim ceiling,
-- so vector(3072) — which would fit text-embedding-3-large — cannot be
-- indexed with HNSW. Users wanting 3-large need a follow-up migration that
-- widens the column AND switches to ivfflat (slower at scale) OR partitions
-- by dim per collection. See:
-- docs/superpowers/notes/2026-05-31-ai-backend-migration.md

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "ai_schema"."AiDocumentChunk"
  ADD COLUMN "embedding" vector(1536);

CREATE INDEX "AiDocumentChunk_embedding_idx"
  ON "ai_schema"."AiDocumentChunk"
  USING hnsw ("embedding" vector_cosine_ops);
