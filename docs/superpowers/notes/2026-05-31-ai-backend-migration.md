# AI Backend Migration Instructions

When you are ready to apply the new schema added in Task 2.1, run:

```bash
pnpm migrate
# Suggested migration name: ai_jobs_and_rag
```

Prisma will generate a migration file under `packages/database/prisma/migrations/<timestamp>_ai_jobs_and_rag/migration.sql`.

## REQUIRED hand-edit (pgvector tail)

Prisma cannot express `vector(N)` columns. Open the generated `migration.sql` and append the following at the END of the file:

```sql
-- pgvector extension + embedding column for AiDocumentChunk
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE "ai_schema"."AiDocumentChunk" ADD COLUMN "embedding" vector(3072);
CREATE INDEX "AiDocumentChunk_embedding_idx"
  ON "ai_schema"."AiDocumentChunk"
  USING hnsw ("embedding" vector_cosine_ops);
```

Then re-apply:

```bash
pnpm --dir packages/database exec prisma migrate deploy --schema prisma
```

## Why hand-edited?

Prisma has no first-class `vector` column type. The `Unsupported("vector(N)")` syntax exists but is opaque (no client codegen). Since the backend uses SQLAlchemy for these tables and Prisma never queries the `embedding` column, raw SQL in the migration is the cleanest path.

If a future Prisma release adds native vector support, this can be migrated to a generated column.
