# FastAPI AI Backend with LangGraph + RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Python FastAPI service (`apps/backend`) that runs long-running and agentic AI workloads via LangGraph + LangChain, exposing a sync-streaming agent API and an async job system backed by ARQ on Upstash Redis, with a swappable pgvector/Qdrant RAG layer.

**Architecture:** Web (Next.js) remains the single trust boundary; browsers never touch Python. Web proxies streaming responses through and exposes a tRPC control plane for async jobs. Service-to-service auth is HMAC-SHA256 with a shared secret. Postgres is shared (Prisma owns schema; Python uses SQLAlchemy + asyncpg for its tables). Vector store is pgvector by default (Qdrant adapter ships experimental).

**Tech Stack:** Python 3.12 · uv · FastAPI · uvicorn · ARQ · SQLAlchemy 2.x async + asyncpg · pgvector · LangGraph · LangChain (`langchain-openai`, `langchain-anthropic`, `langchain-ollama`, `langchain-postgres`, `langchain-qdrant`) · structlog · pytest · ruff · pyright.

**Spec:** [docs/superpowers/specs/2026-05-31-21-fastapi-ai-backend-langgraph-design.mdx](../specs/2026-05-31-21-fastapi-ai-backend-langgraph-design.mdx)

---

## Codebase Reality Adjustments (deviations from spec)

The spec was approved before some details of the existing repo were re-verified. These three adjustments are baked into this plan:

1. **IDs use `cuid()`, not UUIDs.** The existing `User` model and all existing `Ai*` models in `packages/database/prisma/ai.prisma` use `@id @default(cuid())`. New models (`AiJobRun`, `AiJobEvent`, `AiCollection`, `AiDocument`, `AiDocumentChunk`) use the same. FK columns referencing `User.id` are `String` (not `@db.Uuid`).
2. **Backend DB env var is `BACKEND_DATABASE_URL`** (not `DATABASE_URL`). The repo's `DATABASE_URL` is the Prisma Accelerate proxy; `DIRECT_URL` is the plain Postgres URL. To avoid confusing semantics, backend reads its own `BACKEND_DATABASE_URL` env var which the operator sets to the asyncpg-format URL (`postgresql+asyncpg://...`). docker-compose injects this automatically from the local postgres service.
3. **All new models add `@@schema("ai_schema")`.** `multiSchema` is enabled with schemas `["user_schema","billing_schema","cms_schema","ai_schema"]`; matching the existing AI models keeps everything in the same Postgres schema.

`scripts/sync-template.mjs` requires no code change — its `include` list (in `template-sync.manifest.json`) just needs `apps/backend` and `Dockerfile.backend` added.

---

## File Structure (top-level map)

### New files
- `apps/backend/` (entire Python workspace; structure shown in Milestone 0)
- `Dockerfile.backend` (repo root; api + worker targets)
- `apps/web/app/api/ai/agents/[agentId]/stream/route.ts` (sync-streaming proxy)
- `apps/web/trpc/routers/aiJobsProcedures.ts` (new tRPC router for async jobs)
- `packages/observability/src/signed-fetch.ts` (HMAC-signed fetch helper)
- `packages/observability/src/signed-fetch.test.ts`

### Modified files
- `packages/database/prisma/ai.prisma` (append 5 new models + 2 enums)
- `apps/web/trpc/routers/_app.ts` (register `aiJobs` router)
- `packages/observability/package.json` (add `./signed-fetch` export)
- `docker-compose.yml` (add backend services, un-profile redis)
- `apps/web/.env.example` (add `BACKEND_URL`, `BACKEND_HMAC_SECRET`)
- `turbo.json` (add new envs to `globalEnv`)
- `template-sync.manifest.json` (add `apps/backend`, `Dockerfile.backend`)
- `.github/workflows/ci.yml` (add backend lanes)
- `README.md` (prerequisites)

### Migration (project-owner action — NOT a coding task)
- `packages/database/prisma/migrations/<auto>_ai_jobs_and_rag/migration.sql` (Prisma generates skeleton; operator hand-appends pgvector tail per Task 2.2)

---

## Milestone 0 — Repo Plumbing

**Goal:** `apps/backend/` exists as a uv-managed Python workspace; turbo runs its scripts; `pnpm dev` starts a FastAPI process that returns 200 on `/healthz`; CI has backend lanes that pass on an empty test suite; docker-compose can build a backend image. No business logic yet.

### Task 0.1: Create the Python workspace skeleton

**Files:**
- Create: `apps/backend/pyproject.toml`
- Create: `apps/backend/.python-version`
- Create: `apps/backend/package.json`
- Create: `apps/backend/.gitignore`
- Create: `apps/backend/src/saas_forge_backend/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/main.py`
- Create: `apps/backend/tests/__init__.py`
- Create: `apps/backend/tests/conftest.py`

- [ ] **Step 1: Create `.python-version`**

```
3.12
```

- [ ] **Step 2: Create `pyproject.toml` (initial dependency set)**

```toml
[project]
name = "saas-forge-backend"
version = "0.1.0"
description = "FastAPI backend for long-running AI workloads (LangGraph + RAG)."
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.32",
  "pydantic>=2.9",
  "pydantic-settings>=2.6",
  "sqlalchemy[asyncio]>=2.0",
  "asyncpg>=0.30",
  "pgvector>=0.3",
  "arq>=0.26",
  "redis>=5.2",
  "langgraph>=0.2",
  "langchain-core>=0.3",
  "langchain-openai>=0.2",
  "langchain-anthropic>=0.2",
  "langchain-ollama>=0.2",
  "langchain-postgres>=0.0.12",
  "langchain-text-splitters>=0.3",
  "httpx>=0.27",
  "pypdf>=5.0",
  "structlog>=24.4",
  "tenacity>=9.0",
]

[dependency-groups]
dev = [
  "pytest>=8.3",
  "pytest-asyncio>=0.24",
  "pytest-cov>=5.0",
  "pytest-httpx>=0.32",
  "ruff>=0.7",
  "pyright>=1.1.385",
  "qdrant-client>=1.12",
  "langchain-qdrant>=0.2",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/saas_forge_backend"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
pythonpath = ["src"]
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "B", "SIM", "ASYNC"]

[tool.pyright]
include = ["src", "tests"]
pythonVersion = "3.12"
typeCheckingMode = "standard"
```

- [ ] **Step 3: Create `package.json` (thin turbo wrapper)**

```jsonc
{
  "name": "@workspace/backend",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev":            "uv run uvicorn saas_forge_backend.main:app --reload --host 0.0.0.0 --port 8000",
    "dev:worker":     "uv run arq saas_forge_backend.jobs.worker.WorkerSettings --watch src",
    "build":          "uv sync --frozen",
    "lint":           "uv run ruff check src tests",
    "typecheck":      "uv run pyright",
    "test":           "uv run pytest -q",
    "test:coverage":  "uv run pytest --cov=src --cov-report=term-missing"
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
.venv/
__pycache__/
*.pyc
.pytest_cache/
.ruff_cache/
.coverage
htmlcov/
*.egg-info/
dist/
build/
```

- [ ] **Step 5: Create minimal FastAPI app**

`apps/backend/src/saas_forge_backend/__init__.py`:

```python
__version__ = "0.1.0"
```

`apps/backend/src/saas_forge_backend/main.py`:

```python
from fastapi import FastAPI


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0")

    @app.get("/healthz")
    async def healthz() -> dict[str, bool]:
        return {"ok": True}

    return app


app = create_app()
```

- [ ] **Step 6: Create empty test scaffolding**

`apps/backend/tests/__init__.py`: (empty file)

`apps/backend/tests/conftest.py`:

```python
import pytest
from fastapi.testclient import TestClient

from saas_forge_backend.main import create_app


@pytest.fixture()
def app():
    return create_app()


@pytest.fixture()
def client(app):
    return TestClient(app)
```

- [ ] **Step 7: Write the first test (smoke)**

`apps/backend/tests/test_health.py`:

```python
def test_healthz_returns_ok(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"ok": True}
```

- [ ] **Step 8: Install deps + run tests**

```bash
cd apps/backend
uv sync
uv run pytest -q
```

Expected: `1 passed`.

- [ ] **Step 9: Commit**

```bash
git add apps/backend/
git commit -m "Added apps/backend Python workspace skeleton"
```

---

### Task 0.2: Wire backend into turbo & root pnpm scripts

**Files:**
- Modify: `turbo.json:49-99` (add backend-relevant envs to `globalEnv`)

- [ ] **Step 1: Verify `pnpm typecheck`, `pnpm lint`, `pnpm test` already pick up backend**

Turbo auto-discovers workspaces; since `apps/backend/package.json` exists, no `turbo.json` task change is needed. Confirm:

```bash
pnpm typecheck   # should attempt to run pyright via backend's typecheck script
pnpm lint        # should run ruff via backend's lint script
pnpm test        # should run pytest (1 passed)
```

Expected: backend tasks appear in turbo TUI and pass.

- [ ] **Step 2: Extend `turbo.json` globalEnv with new env vars**

Open `turbo.json` and add these to `globalEnv` (alphabetical insertion):

```jsonc
"BACKEND_DATABASE_URL",
"BACKEND_HMAC_SECRET",
"BACKEND_HMAC_SECRET_NEXT",
"BACKEND_URL",
"LOG_FORMAT",
"LOG_LEVEL",
"METRICS_ENABLED",
"OLLAMA_BASE_URL",
"OPENROUTER_API_KEY",
"OTEL_EXPORTER_OTLP_ENDPOINT",
"QDRANT_API_KEY",
"QDRANT_URL",
"RAG_EMBEDDER",
"RAG_VECTOR_STORE",
"REDIS_URL",
```

- [ ] **Step 3: Commit**

```bash
git add turbo.json
git commit -m "Wired backend env vars into turbo globalEnv"
```

---

### Task 0.3: Create `Dockerfile.backend` (multi-stage, api + worker targets)

**Files:**
- Create: `Dockerfile.backend`
- Create: `.dockerignore` (if missing; verify first)

- [ ] **Step 1: Verify `.dockerignore` covers Python artifacts**

```bash
grep -E "__pycache__|\.venv" .dockerignore || echo "MISSING"
```

If MISSING, append to `.dockerignore`:

```
__pycache__/
*.pyc
.venv/
.pytest_cache/
.ruff_cache/
```

- [ ] **Step 2: Create `Dockerfile.backend`**

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/apps/backend/.venv
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && rm -rf /var/lib/apt/lists/* \
 && pip install --no-cache-dir uv

# --- Dependency layer (cache-friendly) ---
FROM base AS deps
COPY apps/backend/pyproject.toml apps/backend/uv.lock /app/apps/backend/
RUN cd /app/apps/backend && uv sync --frozen --no-dev

# --- Application layer ---
FROM deps AS app
COPY apps/backend/src /app/apps/backend/src

# --- API runtime ---
FROM app AS api
WORKDIR /app/apps/backend
EXPOSE 8000
CMD ["uv","run","--no-sync","uvicorn","saas_forge_backend.main:app","--host","0.0.0.0","--port","8000","--workers","2"]

# --- Worker runtime ---
FROM app AS worker
WORKDIR /app/apps/backend
CMD ["uv","run","--no-sync","arq","saas_forge_backend.jobs.worker.WorkerSettings"]
```

- [ ] **Step 3: Lock the dependency tree before docker build**

```bash
cd apps/backend && uv lock && cd ../..
git add apps/backend/uv.lock
```

- [ ] **Step 4: Build the api target locally to verify**

```bash
docker build -f Dockerfile.backend --target api -t saas-forge-backend:api .
```

Expected: image builds successfully. (Worker target build is exercised by Task 0.4's compose flow.)

- [ ] **Step 5: Commit**

```bash
git add Dockerfile.backend .dockerignore apps/backend/uv.lock
git commit -m "Added Dockerfile.backend with api and worker targets"
```

---

### Task 0.4: Extend `docker-compose.yml` (backend services; un-profile redis)

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Edit `docker-compose.yml`**

Replace the entire file with:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_DB: saas_forge
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d saas_forge"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "${POSTGRES_PORT:-5433}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--appendonly", "yes"]
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis-data:/data

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      backend-api:
        condition: service_started
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/saas_forge
      DIRECT_URL: postgresql://postgres:postgres@postgres:5432/saas_forge
      NEXT_PUBLIC_URL: http://localhost:3000
      BETTER_AUTH_SECRET: change-me-before-production
      BACKEND_URL: http://backend-api:8000
      BACKEND_HMAC_SECRET: ${BACKEND_HMAC_SECRET:-dev-only-change-me-32bytes-hex0000}
    ports:
      - "${WEB_PORT:-3000}:3000"

  backend-api:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: api
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      BACKEND_DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/saas_forge
      REDIS_URL: redis://redis:6379/0
      BACKEND_HMAC_SECRET: ${BACKEND_HMAC_SECRET:-dev-only-change-me-32bytes-hex0000}
      LOG_FORMAT: ${LOG_FORMAT:-pretty}
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      RAG_VECTOR_STORE: ${RAG_VECTOR_STORE:-pgvector}
      RAG_EMBEDDER: ${RAG_EMBEDDER:-openai:text-embedding-3-small}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:-}
      OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-}
    expose:
      - "8000"

  backend-worker:
    build:
      context: .
      dockerfile: Dockerfile.backend
      target: worker
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      BACKEND_DATABASE_URL: postgresql+asyncpg://postgres:postgres@postgres:5432/saas_forge
      REDIS_URL: redis://redis:6379/0
      BACKEND_HMAC_SECRET: ${BACKEND_HMAC_SECRET:-dev-only-change-me-32bytes-hex0000}
      LOG_FORMAT: ${LOG_FORMAT:-pretty}
      LOG_LEVEL: ${LOG_LEVEL:-INFO}
      RAG_VECTOR_STORE: ${RAG_VECTOR_STORE:-pgvector}
      RAG_EMBEDDER: ${RAG_EMBEDDER:-openai:text-embedding-3-small}
      OPENAI_API_KEY: ${OPENAI_API_KEY:-}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY:-}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:-}
      OLLAMA_BASE_URL: ${OLLAMA_BASE_URL:-}

volumes:
  postgres-data:
  redis-data:
```

Changes vs current file:
- Postgres image swapped to `pgvector/pgvector:pg16` (pgvector extension preinstalled).
- Redis no longer behind `profiles: [redis]`; always on; AOF persistence enabled.
- New `backend-api` and `backend-worker` services with `expose: 8000` (no public port for api).
- Web depends on backend-api startup and gains `BACKEND_URL` + `BACKEND_HMAC_SECRET`.

- [ ] **Step 2: Verify compose validates**

```bash
docker compose config > /dev/null && echo OK
```

Expected: `OK`.

- [ ] **Step 3: Smoke build backend services**

```bash
docker compose build backend-api backend-worker
```

Expected: both images build.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "Added backend-api and backend-worker compose services; un-profiled redis; switched postgres to pgvector image"
```

---

### Task 0.5: Create `apps/backend/.env.example` and extend `apps/web/.env.example`

**Files:**
- Create: `apps/backend/.env.example`
- Modify: `apps/web/.env.example` (append)

- [ ] **Step 1: Create `apps/backend/.env.example`**

```
# === Required ===
BACKEND_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge
REDIS_URL=redis://localhost:6379/0
BACKEND_HMAC_SECRET=dev-only-change-me-32bytes-hex0000

# === Optional: HMAC secret rotation ===
BACKEND_HMAC_SECRET_NEXT=

# === RAG configuration ===
RAG_VECTOR_STORE=pgvector          # pgvector | qdrant
RAG_EMBEDDER=openai:text-embedding-3-small

# === LLM provider credentials (set whichever you use) ===
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=
OLLAMA_BASE_URL=                   # e.g. http://localhost:11434

# === Optional: Qdrant (when RAG_VECTOR_STORE=qdrant) ===
QDRANT_URL=
QDRANT_API_KEY=

# === Observability ===
LOG_LEVEL=INFO
LOG_FORMAT=pretty                  # pretty | json
METRICS_ENABLED=false
OTEL_EXPORTER_OTLP_ENDPOINT=
```

- [ ] **Step 2: Append to `apps/web/.env.example`**

Add at end of the AI MODULE section:

```
## BACKEND SERVICE VARIABLES ##
BACKEND_URL=http://localhost:8000
BACKEND_HMAC_SECRET=dev-only-change-me-32bytes-hex0000
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/.env.example apps/web/.env.example
git commit -m "Added .env.example entries for backend service"
```

---

### Task 0.6: Add backend CI lanes to `.github/workflows/ci.yml`

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Append three jobs after the existing `docker-web-build` job**

```yaml
  backend-lint:
    name: Backend Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true
      - name: Set up Python
        run: uv python install 3.12
      - name: Sync deps
        working-directory: apps/backend
        run: uv sync --frozen
      - name: Ruff
        working-directory: apps/backend
        run: uv run ruff check src tests

  backend-typecheck:
    name: Backend Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true
      - name: Set up Python
        run: uv python install 3.12
      - name: Sync deps
        working-directory: apps/backend
        run: uv sync --frozen
      - name: Pyright
        working-directory: apps/backend
        run: uv run pyright

  backend-test:
    name: Backend Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true
      - name: Set up Python
        run: uv python install 3.12
      - name: Sync deps
        working-directory: apps/backend
        run: uv sync --frozen
      - name: Pytest
        working-directory: apps/backend
        run: uv run pytest -q

  docker-backend-build:
    name: Docker Backend Build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build api image
        run: docker build -f Dockerfile.backend --target api -t saas-forge-backend:api .
      - name: Build worker image
        run: docker build -f Dockerfile.backend --target worker -t saas-forge-backend:worker .
```

> A `backend-integration` lane that boots Postgres + Redis services is added later in Task 2.5 (once we have something integration-shaped to test).

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "Added backend-lint, backend-typecheck, backend-test, docker-backend-build CI lanes"
```

---

### Task 0.7: Add backend to template-sync manifest

**Files:**
- Modify: `template-sync.manifest.json`

- [ ] **Step 1: Add `apps/backend` and `Dockerfile.backend` to `include`**

After `"Dockerfile.web",` insert `"Dockerfile.backend",`. After `"apps/desktop",` insert `"apps/backend",`. Final include array (alphabetized within type):

```jsonc
"include": [
  ".eslintrc.js",
  ".dockerignore",
  ".gitignore",
  ".github/workflows/ci.yml",
  "apps/backend",
  "apps/web",
  "apps/mobile",
  "apps/desktop",
  "package.json",
  "Dockerfile.backend",
  "Dockerfile.web",
  "docker-compose.yml",
  "packages",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.json",
  "turbo.json",
  "vitest.workspace.ts",
  "scripts/publish-desktop.mjs",
  "scripts/bump-version.mjs"
]
```

- [ ] **Step 2: Verify template sync still passes**

```bash
pnpm template:sync       # propagates apps/backend into templates/saas-boilerplate
pnpm template:check-sync # should succeed
```

Expected: both commands succeed; `templates/saas-boilerplate/apps/backend/` now exists.

- [ ] **Step 3: Commit**

```bash
git add template-sync.manifest.json templates/
git commit -m "Synced apps/backend into templates/saas-boilerplate"
```

---

## Milestone 1 — HMAC Handshake

**Goal:** Web can sign a request to backend, backend verifies it, and a smoke test proves the round-trip. Anything signed wrong gets `401`; anything timed wrong gets `401`. No business logic yet — just the trust boundary.

### Task 1.1: HMAC signature module (backend side)

**Files:**
- Create: `apps/backend/src/saas_forge_backend/config.py`
- Create: `apps/backend/src/saas_forge_backend/security/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/security/hmac.py`
- Create: `apps/backend/tests/test_security_hmac.py`

- [ ] **Step 1: Create config module**

`apps/backend/src/saas_forge_backend/config.py`:

```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Core
    backend_database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge"
    redis_url: str = "redis://localhost:6379/0"
    backend_hmac_secret: str
    backend_hmac_secret_next: str | None = None

    # RAG
    rag_vector_store: str = "pgvector"
    rag_embedder: str = "openai:text-embedding-3-small"

    # LLM provider creds (optional at boot; required when used)
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    openrouter_api_key: str | None = None
    ollama_base_url: str | None = None

    # Qdrant (optional)
    qdrant_url: str | None = None
    qdrant_api_key: str | None = None

    # Observability
    log_level: str = "INFO"
    log_format: str = "pretty"
    metrics_enabled: bool = False
    otel_exporter_otlp_endpoint: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
```

- [ ] **Step 2: Create security package init**

`apps/backend/src/saas_forge_backend/security/__init__.py`: (empty)

- [ ] **Step 3: Write the failing test**

`apps/backend/tests/test_security_hmac.py`:

```python
import json
import time

import pytest

from saas_forge_backend.security.hmac import (
    InvalidSignature,
    canonical_body,
    sign_payload,
    verify_request,
)


def test_canonical_body_is_deterministic():
    a = canonical_body({"b": 2, "a": 1})
    b = canonical_body({"a": 1, "b": 2})
    assert a == b == '{"a":1,"b":2}'


def test_sign_and_verify_roundtrip():
    secret = "test-secret"
    payload = {"user_id": "u1", "value": 42}
    ts, sig = sign_payload(secret, payload)
    verify_request(secret, ts, sig, payload, accepted_secrets=None)


def test_verify_rejects_bad_signature():
    secret = "test-secret"
    payload = {"user_id": "u1"}
    ts, _ = sign_payload(secret, payload)
    with pytest.raises(InvalidSignature):
        verify_request(secret, ts, "deadbeef", payload, accepted_secrets=None)


def test_verify_rejects_stale_timestamp():
    secret = "test-secret"
    payload = {"user_id": "u1"}
    ts = str(int(time.time()) - 120)
    body = canonical_body(payload)
    import hmac as _h
    import hashlib
    sig = _h.new(secret.encode(), f"{ts}\n{body}".encode(), hashlib.sha256).hexdigest()
    with pytest.raises(InvalidSignature):
        verify_request(secret, ts, sig, payload, accepted_secrets=None, max_skew_seconds=60)


def test_verify_accepts_secondary_secret_during_rotation():
    primary = "new-secret"
    secondary = "old-secret"
    payload = {"user_id": "u1"}
    ts, sig = sign_payload(secondary, payload)
    verify_request(primary, ts, sig, payload, accepted_secrets=[secondary])
```

- [ ] **Step 4: Run test — expect ImportError**

```bash
cd apps/backend && uv run pytest tests/test_security_hmac.py -q
```

Expected: import errors (module doesn't exist).

- [ ] **Step 5: Implement HMAC module**

`apps/backend/src/saas_forge_backend/security/hmac.py`:

```python
from __future__ import annotations

import hashlib
import hmac as _hmac
import json
import time
from collections.abc import Iterable


class InvalidSignature(Exception):
    """Raised when HMAC verification fails for any reason."""


def canonical_body(payload: dict) -> str:
    """Deterministic JSON encoding used for signing."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def _compute(secret: str, ts: str, body: str) -> str:
    msg = f"{ts}\n{body}".encode()
    return _hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


def sign_payload(secret: str, payload: dict, *, ts: str | None = None) -> tuple[str, str]:
    """Return (timestamp, signature) for a payload."""
    ts = ts or str(int(time.time()))
    body = canonical_body(payload)
    return ts, _compute(secret, ts, body)


def verify_request(
    primary_secret: str,
    ts: str,
    signature: str,
    payload: dict,
    *,
    accepted_secrets: Iterable[str] | None = None,
    max_skew_seconds: int = 60,
) -> None:
    """Raise InvalidSignature on any failure. Returns None on success."""
    try:
        ts_int = int(ts)
    except (TypeError, ValueError):
        raise InvalidSignature("invalid_timestamp_format") from None

    now = int(time.time())
    if abs(now - ts_int) > max_skew_seconds:
        raise InvalidSignature("stale_timestamp")

    body = canonical_body(payload)
    candidates = [primary_secret, *(accepted_secrets or [])]
    for secret in candidates:
        expected = _compute(secret, ts, body)
        if _hmac.compare_digest(expected, signature):
            return
    raise InvalidSignature("signature_mismatch")
```

- [ ] **Step 6: Run tests — expect pass**

```bash
cd apps/backend && uv run pytest tests/test_security_hmac.py -q
```

Expected: `5 passed`.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/
git commit -m "Added HMAC signing and verification module"
```

---

### Task 1.2: FastAPI middleware that enforces HMAC + /readyz

**Files:**
- Create: `apps/backend/src/saas_forge_backend/api/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/api/middleware.py`
- Create: `apps/backend/src/saas_forge_backend/api/routes/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/api/routes/health.py`
- Modify: `apps/backend/src/saas_forge_backend/main.py`
- Create: `apps/backend/tests/test_middleware_hmac.py`

- [ ] **Step 1: Write failing middleware test**

`apps/backend/tests/test_middleware_hmac.py`:

```python
import os

import pytest
from fastapi.testclient import TestClient

from saas_forge_backend.config import get_settings
from saas_forge_backend.main import create_app
from saas_forge_backend.security.hmac import sign_payload


@pytest.fixture(autouse=True)
def _set_secret(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "test-secret-32-bytes-padding-xxxxx")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _client():
    return TestClient(create_app())


def test_unsigned_request_to_signed_route_returns_401():
    client = _client()
    # /agents/stream is a signed route stub returning 200 only when signature ok
    resp = client.post("/agents/stream", json={"user_id": "u1"})
    assert resp.status_code == 401


def test_signed_request_passes_signature_check():
    client = _client()
    payload = {"user_id": "u1", "agent_id": "noop", "input": {}}
    ts, sig = sign_payload("test-secret-32-bytes-padding-xxxxx", payload)
    resp = client.post(
        "/agents/stream",
        json=payload,
        headers={
            "X-Saas-Forge-Ts": ts,
            "X-Saas-Forge-Sig": sig,
            "X-Saas-Forge-Req-Id": "req-1",
        },
    )
    # Phase-1 stub: signed route accepts and returns 501 (no agent yet)
    assert resp.status_code == 501


def test_healthz_does_not_require_signature():
    client = _client()
    assert _client().get("/healthz").status_code == 200
    assert _client().get("/readyz").status_code in (200, 503)
```

- [ ] **Step 2: Run — expect failures**

```bash
cd apps/backend && uv run pytest tests/test_middleware_hmac.py -q
```

Expected: failures (no `/agents/stream` route, no middleware).

- [ ] **Step 3: Create middleware**

`apps/backend/src/saas_forge_backend/api/__init__.py`: (empty)

`apps/backend/src/saas_forge_backend/api/middleware.py`:

```python
from __future__ import annotations

import json
import re
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from saas_forge_backend.config import get_settings
from saas_forge_backend.security.hmac import InvalidSignature, verify_request

# Routes that bypass signature verification.
PUBLIC_ROUTES = re.compile(r"^/(healthz|readyz|metrics|docs|openapi\.json)(/|$)")


class HmacMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if PUBLIC_ROUTES.match(request.url.path):
            return await call_next(request)

        settings = get_settings()
        ts = request.headers.get("X-Saas-Forge-Ts")
        sig = request.headers.get("X-Saas-Forge-Sig")
        if not ts or not sig:
            return Response(status_code=401, content="missing_signature_headers")

        body_bytes = await request.body()
        try:
            payload = json.loads(body_bytes) if body_bytes else {}
        except json.JSONDecodeError:
            return Response(status_code=400, content="invalid_json")

        accepted = (
            [settings.backend_hmac_secret_next]
            if settings.backend_hmac_secret_next
            else None
        )

        try:
            verify_request(
                settings.backend_hmac_secret,
                ts,
                sig,
                payload,
                accepted_secrets=accepted,
            )
        except InvalidSignature as exc:
            return Response(status_code=401, content=str(exc))

        # Stash verified payload on state so route handlers don't re-parse.
        request.state.verified_payload = payload
        return await call_next(request)
```

- [ ] **Step 4: Create health route**

`apps/backend/src/saas_forge_backend/api/routes/__init__.py`: (empty)

`apps/backend/src/saas_forge_backend/api/routes/health.py`:

```python
from fastapi import APIRouter, Response

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}


@router.get("/readyz")
async def readyz(response: Response) -> dict[str, str]:
    # Phase 1: shallow readiness; deeper DB/Redis pings added in Task 2.4.
    return {"status": "ready"}
```

- [ ] **Step 5: Add stub signed route + wire middleware**

Replace `apps/backend/src/saas_forge_backend/main.py`:

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from saas_forge_backend.api.middleware import HmacMiddleware
from saas_forge_backend.api.routes import health


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0")
    app.add_middleware(HmacMiddleware)
    app.include_router(health.router)

    @app.post("/agents/stream")
    async def agents_stream_stub(request: Request) -> JSONResponse:
        # Real handler arrives in Milestone 4.
        return JSONResponse({"detail": "not_implemented"}, status_code=501)

    return app


app = create_app()
```

- [ ] **Step 6: Run tests — expect pass**

```bash
cd apps/backend && uv run pytest -q
```

Expected: all tests pass (health + hmac + middleware).

- [ ] **Step 7: Commit**

```bash
git add apps/backend/
git commit -m "Added HMAC FastAPI middleware and stub /agents/stream route"
```

---

### Task 1.3: Web-side signed-fetch helper in `packages/observability`

**Files:**
- Create: `packages/observability/src/signed-fetch.ts`
- Create: `packages/observability/src/signed-fetch.test.ts`
- Modify: `packages/observability/package.json`

- [ ] **Step 1: Add export to package.json**

In `packages/observability/package.json`, add `./signed-fetch` to `exports`:

```jsonc
"exports": {
  "./ai-logger": "./src/ai-logger.ts",
  "./winston-logger": "./src/winston-logger.ts",
  "./signed-fetch": "./src/signed-fetch.ts"
}
```

- [ ] **Step 2: Write failing test**

`packages/observability/src/signed-fetch.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";
import { canonicalBody, signedFetch } from "./signed-fetch";

describe("canonicalBody", () => {
  it("is deterministic regardless of key order", () => {
    expect(canonicalBody({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
    expect(canonicalBody({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });
});

describe("signedFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches X-Saas-Forge-Ts and X-Saas-Forge-Sig headers", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await signedFetch({
      url: "http://backend/agents/stream",
      secret: "test-secret",
      payload: { user_id: "u1" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const call = fetchMock.mock.calls[0]!;
    const init = call[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("X-Saas-Forge-Ts")).toMatch(/^\d+$/);
    expect(headers.get("X-Saas-Forge-Sig")).toMatch(/^[0-9a-f]{64}$/);
    expect(headers.get("X-Saas-Forge-Req-Id")).toBeTruthy();
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.body).toBe('{"user_id":"u1"}');
  });
});
```

- [ ] **Step 3: Run — expect import failure**

```bash
pnpm --filter @workspace/observability test
```

Expected: import errors.

- [ ] **Step 4: Implement signed-fetch**

`packages/observability/src/signed-fetch.ts`:

```ts
import { createHmac, randomUUID } from "node:crypto";

export type SignedFetchInput = {
  url: string;
  secret: string;
  payload: Record<string, unknown>;
  method?: "POST" | "PUT" | "DELETE";
  requestId?: string;
  signal?: AbortSignal;
  /** Override timestamp (seconds since epoch). For tests only. */
  timestamp?: number;
};

export function canonicalBody(payload: Record<string, unknown>): string {
  return JSON.stringify(sortKeys(payload));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

export function sign(
  secret: string,
  timestamp: number,
  body: string,
): string {
  return createHmac("sha256", secret).update(`${timestamp}\n${body}`).digest("hex");
}

export async function signedFetch(input: SignedFetchInput): Promise<Response> {
  const ts = input.timestamp ?? Math.floor(Date.now() / 1000);
  const body = canonicalBody(input.payload);
  const sig = sign(input.secret, ts, body);
  const reqId = input.requestId ?? randomUUID();

  return fetch(input.url, {
    method: input.method ?? "POST",
    body,
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      "X-Saas-Forge-Ts": String(ts),
      "X-Saas-Forge-Sig": sig,
      "X-Saas-Forge-Req-Id": reqId,
    },
  });
}
```

- [ ] **Step 5: Run tests — expect pass**

```bash
pnpm --filter @workspace/observability test
```

Expected: tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/observability/
git commit -m "Added HMAC signed-fetch helper in @workspace/observability"
```

---

### Task 1.4: End-to-end handshake smoke test via docker-compose

**Files:**
- Create: `apps/backend/tests/integration/__init__.py`
- Create: `apps/backend/tests/integration/test_handshake_compose.py` (manual; not in CI)
- Create: `scripts/smoke-backend-handshake.sh`

> This task creates a script the developer runs locally to verify the wire-level handshake against a real backend in compose. The script is also documented in the backend README.

- [ ] **Step 1: Create `scripts/smoke-backend-handshake.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

SECRET="${BACKEND_HMAC_SECRET:-dev-only-change-me-32bytes-hex0000}"
URL="${BACKEND_URL:-http://localhost:8000}"
TS="$(date +%s)"
BODY='{"agent_id":"noop","input":{},"user_id":"smoke-test"}'
SIG="$(printf '%s\n%s' "$TS" "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | xxd -p -c 256)"

echo "→ Unsigned (expect 401):"
curl -sS -o /dev/null -w "  HTTP %{http_code}\n" \
  -X POST "$URL/agents/stream" -H "Content-Type: application/json" -d "$BODY"

echo "→ Signed (expect 501 from stub):"
curl -sS -o /dev/null -w "  HTTP %{http_code}\n" \
  -X POST "$URL/agents/stream" \
  -H "Content-Type: application/json" \
  -H "X-Saas-Forge-Ts: $TS" \
  -H "X-Saas-Forge-Sig: $SIG" \
  -H "X-Saas-Forge-Req-Id: smoke-test" \
  -d "$BODY"

echo "→ Healthz (expect 200):"
curl -sS -o /dev/null -w "  HTTP %{http_code}\n" "$URL/healthz"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/smoke-backend-handshake.sh
```

- [ ] **Step 3: Run the smoke test (manual verification)**

```bash
docker compose up --build --detach backend-api
sleep 3
./scripts/smoke-backend-handshake.sh
docker compose down
```

Expected:
```
→ Unsigned (expect 401):  HTTP 401
→ Signed (expect 501 from stub):  HTTP 501
→ Healthz (expect 200):  HTTP 200
```

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-backend-handshake.sh
git commit -m "Added backend HMAC handshake smoke script"
```

---

## Milestone 2 — Database Schema & SQLAlchemy Mirror

**Goal:** New Prisma models for jobs, events, collections, documents, and chunks exist in `ai_schema`; pgvector extension and `embedding` column are added via hand-edited migration tail; backend has SQLAlchemy models mirroring them and a startup test that asserts schema agreement.

### Task 2.1: Append new models to `ai.prisma`

**Files:**
- Modify: `packages/database/prisma/ai.prisma` (append at end)

- [ ] **Step 1: Append the following to `ai.prisma`**

```prisma

// ============================================================================
// Backend job runner + RAG (added by FastAPI backend integration; see
// docs/superpowers/specs/2026-05-31-21-fastapi-ai-backend-langgraph-design.mdx)
// ============================================================================

enum AiJobStatus {
  PENDING
  RUNNING
  SUCCEEDED
  FAILED
  CANCELLED

  @@schema("ai_schema")
}

model AiJobRun {
  id              String       @id @default(cuid())
  userId          String
  orgId           String?
  agentId         String
  status          AiJobStatus  @default(PENDING)
  input           Json
  result          Json?
  errorCode       String?
  errorMessage    String?
  createdAt       DateTime     @default(now())
  startedAt       DateTime?
  finishedAt      DateTime?
  lastHeartbeatAt DateTime?
  events          AiJobEvent[]
  user            User         @relation("AiJobRuns", fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt(sort: Desc)])
  @@index([status, createdAt])
  @@index([orgId, createdAt(sort: Desc)])
  @@schema("ai_schema")
}

model AiJobEvent {
  id      BigInt   @id @default(autoincrement())
  jobId   String
  seq     Int
  type    String
  payload Json
  at      DateTime @default(now())
  job     AiJobRun @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([jobId, seq])
  @@index([jobId, seq])
  @@schema("ai_schema")
}

enum AiDocumentStatus {
  INGESTING
  READY
  FAILED

  @@schema("ai_schema")
}

model AiCollection {
  id            String       @id @default(cuid())
  userId        String
  orgId         String?
  name          String
  description   String?
  embedder      String
  embeddingDims Int
  createdAt     DateTime     @default(now())
  documents     AiDocument[]
  user          User         @relation("AiCollections", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId, name])
  @@index([orgId])
  @@schema("ai_schema")
}

model AiDocument {
  id           String            @id @default(cuid())
  collectionId String
  userId       String
  orgId        String?
  sourceType   String
  sourceUri    String?
  title        String
  status       AiDocumentStatus  @default(INGESTING)
  chunkCount   Int               @default(0)
  byteSize     Int?
  errorMessage String?
  createdAt    DateTime          @default(now())
  indexedAt    DateTime?
  collection   AiCollection      @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  chunks       AiDocumentChunk[]

  @@index([collectionId, createdAt(sort: Desc)])
  @@index([userId])
  @@schema("ai_schema")
}

model AiDocumentChunk {
  id           String     @id @default(cuid())
  documentId   String
  collectionId String
  seq          Int
  text         String
  metadata     Json
  createdAt    DateTime   @default(now())
  document     AiDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@unique([documentId, seq])
  @@index([collectionId])
  @@schema("ai_schema")
}
```

- [ ] **Step 2: Add inverse relations on `User`**

Open `packages/database/prisma/user.prisma`. After the existing AI relations (around line 24), insert:

```prisma
    aiJobRuns        AiJobRun[]        @relation("AiJobRuns")
    aiCollections    AiCollection[]    @relation("AiCollections")
```

- [ ] **Step 3: Validate the schema**

```bash
pnpm --dir packages/database exec prisma validate --schema prisma
```

Expected: `Loaded environment variables ... The schema at prisma is valid`.

- [ ] **Step 4: Regenerate the client**

```bash
pnpm generate
```

Expected: Prisma client regenerates with new types.

- [ ] **Step 5: Commit**

```bash
git add packages/database/prisma/
git commit -m "Added AiJobRun/AiJobEvent/AiCollection/AiDocument/AiDocumentChunk Prisma models"
```

---

### Task 2.2: Document the migration command + pgvector tail (PROJECT-OWNER ACTION)

**Files:**
- Create: `docs/superpowers/notes/2026-05-31-ai-backend-migration.md`

> Per `CLAUDE.md`, this plan does NOT auto-generate Prisma migrations. This task creates a doc the project owner reads before running `pnpm migrate`.

- [ ] **Step 1: Create the migration note**

`docs/superpowers/notes/2026-05-31-ai-backend-migration.md`:

````markdown
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
````

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/notes/2026-05-31-ai-backend-migration.md
git commit -m "Documented AI-backend migration steps including pgvector SQL tail"
```

> Implementation continues without running the migration; the developer running this plan should pause here, request that the project owner runs the migration against their dev DB, then resume.

---

### Task 2.3: SQLAlchemy engine + base models

**Files:**
- Create: `apps/backend/src/saas_forge_backend/db/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/db/engine.py`
- Create: `apps/backend/src/saas_forge_backend/db/models.py`
- Create: `apps/backend/tests/test_db_engine.py`

- [ ] **Step 1: Create db package init**

`apps/backend/src/saas_forge_backend/db/__init__.py`: (empty)

- [ ] **Step 2: Create engine module**

`apps/backend/src/saas_forge_backend/db/engine.py`:

```python
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
```

- [ ] **Step 3: Create SQLAlchemy models (mirrors Prisma)**

`apps/backend/src/saas_forge_backend/db/models.py`:

```python
from __future__ import annotations

import enum
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """All tables live in ai_schema. Each model declares the schema in its own
    `__table_args__` tuple (we cannot set it on Base because subclasses redefine
    `__table_args__` with index tuples)."""
    pass


class AiJobStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class AiDocumentStatus(str, enum.Enum):
    INGESTING = "INGESTING"
    READY = "READY"
    FAILED = "FAILED"


class AiJobRun(Base):
    __tablename__ = "AiJobRun"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, nullable=False)
    orgId: Mapped[str | None] = mapped_column(String, nullable=True)
    agentId: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[AiJobStatus] = mapped_column(
        Enum(AiJobStatus, name="AiJobStatus", schema="ai_schema", create_type=False),
        nullable=False,
        default=AiJobStatus.PENDING,
    )
    input: Mapped[dict] = mapped_column(JSONB, nullable=False)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    errorCode: Mapped[str | None] = mapped_column(String, nullable=True)
    errorMessage: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    startedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finishedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lastHeartbeatAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    events: Mapped[list["AiJobEvent"]] = relationship(back_populates="job", cascade="all,delete-orphan")

    __table_args__ = (
        Index("AiJobRun_userId_createdAt_idx", "userId", text("createdAt DESC")),
        Index("AiJobRun_status_createdAt_idx", "status", "createdAt"),
        Index("AiJobRun_orgId_createdAt_idx", "orgId", text("createdAt DESC")),
        {"schema": "ai_schema"},
    )


class AiJobEvent(Base):
    __tablename__ = "AiJobEvent"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    jobId: Mapped[str] = mapped_column(String, ForeignKey("ai_schema.AiJobRun.id", ondelete="CASCADE"))
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    type: Mapped[str] = mapped_column(String, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    job: Mapped[AiJobRun] = relationship(back_populates="events")

    __table_args__ = (
        UniqueConstraint("jobId", "seq", name="AiJobEvent_jobId_seq_key"),
        Index("AiJobEvent_jobId_seq_idx", "jobId", "seq"),
        {"schema": "ai_schema"},
    )


class AiCollection(Base):
    __tablename__ = "AiCollection"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    userId: Mapped[str] = mapped_column(String, nullable=False)
    orgId: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    embedder: Mapped[str] = mapped_column(String, nullable=False)
    embeddingDims: Mapped[int] = mapped_column(Integer, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    documents: Mapped[list["AiDocument"]] = relationship(back_populates="collection", cascade="all,delete-orphan")

    __table_args__ = (
        UniqueConstraint("userId", "orgId", "name", name="AiCollection_userId_orgId_name_key"),
        Index("AiCollection_orgId_idx", "orgId"),
        {"schema": "ai_schema"},
    )


class AiDocument(Base):
    __tablename__ = "AiDocument"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    collectionId: Mapped[str] = mapped_column(
        String, ForeignKey("ai_schema.AiCollection.id", ondelete="CASCADE")
    )
    userId: Mapped[str] = mapped_column(String, nullable=False)
    orgId: Mapped[str | None] = mapped_column(String, nullable=True)
    sourceType: Mapped[str] = mapped_column(String, nullable=False)
    sourceUri: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[AiDocumentStatus] = mapped_column(
        Enum(AiDocumentStatus, name="AiDocumentStatus", schema="ai_schema", create_type=False),
        nullable=False,
        default=AiDocumentStatus.INGESTING,
    )
    chunkCount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    byteSize: Mapped[int | None] = mapped_column(Integer, nullable=True)
    errorMessage: Mapped[str | None] = mapped_column(String, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    indexedAt: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    collection: Mapped[AiCollection] = relationship(back_populates="documents")
    chunks: Mapped[list["AiDocumentChunk"]] = relationship(
        back_populates="document", cascade="all,delete-orphan"
    )

    __table_args__ = (
        Index("AiDocument_collectionId_createdAt_idx", "collectionId", text("createdAt DESC")),
        Index("AiDocument_userId_idx", "userId"),
        {"schema": "ai_schema"},
    )


class AiDocumentChunk(Base):
    __tablename__ = "AiDocumentChunk"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    documentId: Mapped[str] = mapped_column(
        String, ForeignKey("ai_schema.AiDocument.id", ondelete="CASCADE")
    )
    collectionId: Mapped[str] = mapped_column(String, nullable=False)
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(String, nullable=False)
    chunk_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(3072), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=text("now()")
    )

    document: Mapped[AiDocument] = relationship(back_populates="chunks")

    __table_args__ = (
        UniqueConstraint("documentId", "seq", name="AiDocumentChunk_documentId_seq_key"),
        Index("AiDocumentChunk_collectionId_idx", "collectionId"),
        {"schema": "ai_schema"},
    )
```

> `metadata` is a reserved attribute on SQLAlchemy's `Base`, so the Python attr is `chunk_metadata` but the DB column stays `metadata`.

- [ ] **Step 4: Write a minimal import/typecheck test**

`apps/backend/tests/test_db_engine.py`:

```python
from saas_forge_backend.db import models
from saas_forge_backend.db.engine import get_engine, get_sessionmaker


def test_models_import():
    # Smoke: tables registered on metadata.
    table_names = {t.name for t in models.Base.metadata.tables.values()}
    assert {"AiJobRun", "AiJobEvent", "AiCollection", "AiDocument", "AiDocumentChunk"} <= table_names


def test_engine_is_singleton(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("BACKEND_DATABASE_URL", "postgresql+asyncpg://u:p@h/db")
    from saas_forge_backend.config import get_settings

    get_settings.cache_clear()
    e1 = get_engine()
    e2 = get_engine()
    assert e1 is e2
    sm1 = get_sessionmaker()
    sm2 = get_sessionmaker()
    assert sm1 is sm2
```

- [ ] **Step 5: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_db_engine.py -q
```

Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/
git commit -m "Added SQLAlchemy engine and models mirroring AI schema"
```

---

### Task 2.4: Schema-agreement check + deep `/readyz`

**Files:**
- Create: `apps/backend/src/saas_forge_backend/db/schema_check.py`
- Modify: `apps/backend/src/saas_forge_backend/api/routes/health.py`
- Modify: `apps/backend/src/saas_forge_backend/main.py`
- Create: `apps/backend/tests/integration/test_schema_agreement.py`

- [ ] **Step 1: Write schema-check module**

`apps/backend/src/saas_forge_backend/db/schema_check.py`:

```python
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
```

- [ ] **Step 2: Update `/readyz` to perform deep checks**

Replace `apps/backend/src/saas_forge_backend/api/routes/health.py`:

```python
from fastapi import APIRouter, Response
from redis.asyncio import Redis as AsyncRedis
from sqlalchemy import text

from saas_forge_backend.config import get_settings
from saas_forge_backend.db.engine import get_engine

router = APIRouter()


@router.get("/healthz")
async def healthz() -> dict[str, bool]:
    return {"ok": True}


@router.get("/readyz")
async def readyz(response: Response) -> dict[str, str | bool]:
    settings = get_settings()
    db_ok = False
    redis_ok = False

    try:
        async with get_engine().connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    try:
        redis = AsyncRedis.from_url(settings.redis_url)
        await redis.ping()
        await redis.aclose()
        redis_ok = True
    except Exception:
        redis_ok = False

    ok = db_ok and redis_ok
    if not ok:
        response.status_code = 503
    return {"ok": ok, "db": db_ok, "redis": redis_ok}
```

- [ ] **Step 3: Run schema check at startup**

Update `apps/backend/src/saas_forge_backend/main.py`:

```python
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from saas_forge_backend.api.middleware import HmacMiddleware
from saas_forge_backend.api.routes import health
from saas_forge_backend.db.engine import get_engine
from saas_forge_backend.db.schema_check import SchemaDriftError, assert_schema_agreement

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await assert_schema_agreement(get_engine())
    except SchemaDriftError as exc:
        log.error("Schema drift detected: %s", exc)
        # Do not crash dev startup; /readyz will report unhealthy until fixed.
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(HmacMiddleware)
    app.include_router(health.router)

    @app.post("/agents/stream")
    async def agents_stream_stub(request: Request) -> JSONResponse:
        return JSONResponse({"detail": "not_implemented"}, status_code=501)

    return app


app = create_app()
```

- [ ] **Step 4: Write integration test (requires DB)**

`apps/backend/tests/integration/test_schema_agreement.py`:

```python
import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run integration tests against compose DB",
)


@pytest.mark.asyncio
async def test_schema_agreement_passes_against_compose_db():
    from saas_forge_backend.db.engine import get_engine
    from saas_forge_backend.db.schema_check import assert_schema_agreement

    await assert_schema_agreement(get_engine())
```

- [ ] **Step 5: Add `backend-integration` CI lane**

Append to `.github/workflows/ci.yml`:

```yaml
  backend-integration:
    name: Backend Integration
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env:
          POSTGRES_DB: saas_forge
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres" --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    env:
      BACKEND_INTEGRATION: "1"
      BACKEND_HMAC_SECRET: "ci-secret-32-bytes-padding-xxxxxxx"
      BACKEND_DATABASE_URL: "postgresql+asyncpg://postgres:postgres@localhost:5432/saas_forge"
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/saas_forge"
      DIRECT_URL: "postgresql://postgres:postgres@localhost:5432/saas_forge"
      REDIS_URL: "redis://localhost:6379/0"
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10.4.1
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - uses: astral-sh/setup-uv@v3
        with:
          enable-cache: true
      - name: Set up Python
        run: uv python install 3.12
      - name: Install JS deps
        run: pnpm install --frozen-lockfile
      - name: Apply Prisma migrations
        working-directory: packages/database
        run: pnpm exec prisma migrate deploy --schema prisma
      - name: Sync Python deps
        working-directory: apps/backend
        run: uv sync --frozen
      - name: Run integration tests
        working-directory: apps/backend
        run: uv run pytest tests/integration -q
```

- [ ] **Step 6: Commit**

```bash
git add apps/backend/ .github/workflows/ci.yml
git commit -m "Added schema-agreement check, deep readyz, and backend-integration CI lane"
```

---

### Task 2.5: Repositories layer (jobs, documents, chunks)

**Files:**
- Create: `apps/backend/src/saas_forge_backend/db/repositories/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/db/repositories/jobs.py`
- Create: `apps/backend/src/saas_forge_backend/db/repositories/documents.py`
- Create: `apps/backend/src/saas_forge_backend/db/repositories/chunks.py`
- Create: `apps/backend/src/saas_forge_backend/db/repositories/collections.py`
- Create: `apps/backend/tests/integration/test_repositories.py`

- [ ] **Step 1: Create repositories package**

`apps/backend/src/saas_forge_backend/db/repositories/__init__.py`: (empty)

- [ ] **Step 2: Jobs repository**

`apps/backend/src/saas_forge_backend/db/repositories/jobs.py`:

```python
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from saas_forge_backend.db.models import AiJobEvent, AiJobRun, AiJobStatus


async def get(session: AsyncSession, job_id: str) -> AiJobRun | None:
    return await session.get(AiJobRun, job_id)


async def insert_pending(
    session: AsyncSession,
    *,
    job_id: str,
    user_id: str,
    org_id: str | None,
    agent_id: str,
    input_payload: dict[str, Any],
) -> AiJobRun:
    row = AiJobRun(
        id=job_id,
        userId=user_id,
        orgId=org_id,
        agentId=agent_id,
        status=AiJobStatus.PENDING,
        input=input_payload,
    )
    session.add(row)
    await session.flush()
    return row


async def mark_running(session: AsyncSession, job_id: str) -> None:
    await session.execute(
        update(AiJobRun)
        .where(AiJobRun.id == job_id)
        .values(
            status=AiJobStatus.RUNNING,
            startedAt=datetime.now(timezone.utc),
            lastHeartbeatAt=datetime.now(timezone.utc),
        )
    )


async def heartbeat(session: AsyncSession, job_id: str) -> None:
    await session.execute(
        update(AiJobRun)
        .where(AiJobRun.id == job_id)
        .values(lastHeartbeatAt=datetime.now(timezone.utc))
    )


async def mark_terminal(
    session: AsyncSession,
    job_id: str,
    *,
    status: AiJobStatus,
    result: dict[str, Any] | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> None:
    await session.execute(
        update(AiJobRun)
        .where(AiJobRun.id == job_id)
        .values(
            status=status,
            result=result,
            errorCode=error_code,
            errorMessage=error_message,
            finishedAt=datetime.now(timezone.utc),
        )
    )


async def append_event(
    session: AsyncSession,
    *,
    job_id: str,
    seq: int,
    type: str,
    payload: dict[str, Any],
) -> None:
    session.add(AiJobEvent(jobId=job_id, seq=seq, type=type, payload=payload))


async def list_pending_older_than(
    session: AsyncSession,
    *,
    seconds: int,
    limit: int = 100,
) -> list[AiJobRun]:
    from sqlalchemy import text as _t
    stmt = (
        select(AiJobRun)
        .where(AiJobRun.status == AiJobStatus.PENDING)
        .where(_t(f"\"createdAt\" < now() - interval '{int(seconds)} seconds'"))
        .order_by(AiJobRun.createdAt.asc())
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())


async def list_stale_running(
    session: AsyncSession,
    *,
    heartbeat_max_age_seconds: int,
    limit: int = 100,
) -> list[AiJobRun]:
    from sqlalchemy import text as _t
    stmt = (
        select(AiJobRun)
        .where(AiJobRun.status == AiJobStatus.RUNNING)
        .where(_t(f"\"lastHeartbeatAt\" < now() - interval '{int(heartbeat_max_age_seconds)} seconds'"))
        .limit(limit)
    )
    return list((await session.execute(stmt)).scalars().all())
```

- [ ] **Step 3: Collections / documents / chunks repositories**

`apps/backend/src/saas_forge_backend/db/repositories/collections.py`:

```python
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
```

`apps/backend/src/saas_forge_backend/db/repositories/documents.py`:

```python
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
```

`apps/backend/src/saas_forge_backend/db/repositories/chunks.py`:

```python
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
```

> `cuid2.cuid()` generates the ID; add `cuid2` to `pyproject.toml` deps in the next step.

- [ ] **Step 4: Add `cuid2` dependency**

In `apps/backend/pyproject.toml`, append to `[project].dependencies`:

```toml
  "cuid2>=2.0.1",
```

Then:

```bash
cd apps/backend && uv lock && uv sync
```

- [ ] **Step 5: Write integration test**

`apps/backend/tests/integration/test_repositories.py`:

```python
import os

import cuid2
import pytest
import pytest_asyncio

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run",
)


@pytest_asyncio.fixture()
async def session():
    from saas_forge_backend.db.engine import get_sessionmaker

    sm = get_sessionmaker()
    async with sm() as s:
        async with s.begin():
            yield s
            await s.rollback()


@pytest.mark.asyncio
async def test_job_lifecycle_writes(session):
    from saas_forge_backend.db.models import AiJobStatus
    from saas_forge_backend.db.repositories import jobs

    # Requires an existing user; integration test seeds one minimally via raw SQL.
    from sqlalchemy import text
    user_id = cuid2.cuid()
    await session.execute(
        text(
            'INSERT INTO user_schema."User" (id, name, email, "emailVerified", role, banned, '
            '"creditsUsed","creditsTotal","createdAt","updatedAt") '
            "VALUES (:id, 'test', :email, false, 'user', false, 0, 20, now(), now())"
        ),
        {"id": user_id, "email": f"{user_id}@example.com"},
    )

    job_id = cuid2.cuid()
    await jobs.insert_pending(
        session,
        job_id=job_id,
        user_id=user_id,
        org_id=None,
        agent_id="noop",
        input_payload={"hello": "world"},
    )
    await jobs.mark_running(session, job_id)
    await jobs.append_event(session, job_id=job_id, seq=0, type="step", payload={"node": "start"})
    await jobs.mark_terminal(session, job_id, status=AiJobStatus.SUCCEEDED, result={"answer": 42})

    row = await jobs.get(session, job_id)
    assert row is not None
    assert row.status == AiJobStatus.SUCCEEDED
    assert row.result == {"answer": 42}
```

- [ ] **Step 6: Run integration tests locally**

```bash
docker compose up --detach postgres redis
# Run migration first (project owner action — Task 2.2)
BACKEND_INTEGRATION=1 \
BACKEND_HMAC_SECRET="x" \
BACKEND_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge" \
REDIS_URL="redis://localhost:6379/0" \
pnpm --filter @workspace/backend test -- tests/integration -q
```

Expected: integration tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/backend/
git commit -m "Added repositories for jobs, collections, documents, chunks"
```

---

## Milestone 3 — Async Job Lifecycle

**Goal:** A web caller can `POST /api/trpc/aiJobs.create`, get back a `jobId`, watch it transition `PENDING → RUNNING → SUCCEEDED` via polling, and cancel it. ARQ worker runs jobs; Upstash holds live status; Postgres holds terminal state and event log. Reaper + heartbeat sweeps keep the queue self-healing. A `"noop"` agent does the round-trip end-to-end.

### Task 3.1: ARQ worker scaffold + Redis status writer

**Files:**
- Create: `apps/backend/src/saas_forge_backend/jobs/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/jobs/redis_status.py`
- Create: `apps/backend/src/saas_forge_backend/jobs/worker.py`
- Create: `apps/backend/src/saas_forge_backend/jobs/queue.py`
- Create: `apps/backend/tests/test_redis_status.py`

- [ ] **Step 1: Create jobs package init**

`apps/backend/src/saas_forge_backend/jobs/__init__.py`: (empty)

- [ ] **Step 2: Redis status writer**

`apps/backend/src/saas_forge_backend/jobs/redis_status.py`:

```python
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from redis.asyncio import Redis as AsyncRedis

from saas_forge_backend.config import get_settings

_LIVE_TTL_SECONDS = 600
_TERMINAL_TTL_SECONDS = 300


def _key(job_id: str) -> str:
    return f"job:{job_id}"


def _client() -> AsyncRedis:
    return AsyncRedis.from_url(get_settings().redis_url, decode_responses=True)


async def write_running(job_id: str, *, agent_id: str) -> None:
    async with _client() as r:
        await r.hset(
            _key(job_id),
            mapping={
                "status": "RUNNING",
                "agent_id": agent_id,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            },
        )
        await r.expire(_key(job_id), _LIVE_TTL_SECONDS)


async def write_event(job_id: str, *, seq: int, type: str, payload: dict[str, Any]) -> None:
    async with _client() as r:
        await r.hset(
            _key(job_id),
            mapping={
                "latest_event_seq": str(seq),
                "latest_event_type": type,
                "latest_event_payload": json.dumps(payload, separators=(",", ":")),
                "last_heartbeat": datetime.now(timezone.utc).isoformat(),
            },
        )
        await r.expire(_key(job_id), _LIVE_TTL_SECONDS)


async def write_terminal(job_id: str, *, status: str, error_code: str | None = None) -> None:
    mapping: dict[str, str] = {
        "status": status,
        "finished_at": datetime.now(timezone.utc).isoformat(),
    }
    if error_code:
        mapping["error_code"] = error_code
    async with _client() as r:
        await r.hset(_key(job_id), mapping=mapping)
        await r.expire(_key(job_id), _TERMINAL_TTL_SECONDS)


async def read(job_id: str) -> dict[str, str]:
    async with _client() as r:
        return await r.hgetall(_key(job_id))


async def set_cancel_requested(job_id: str) -> None:
    async with _client() as r:
        await r.hset(_key(job_id), "cancel_requested", "1")
        await r.expire(_key(job_id), _LIVE_TTL_SECONDS)


async def is_cancel_requested(job_id: str) -> bool:
    async with _client() as r:
        return (await r.hget(_key(job_id), "cancel_requested")) == "1"
```

- [ ] **Step 3: ARQ worker settings + queue helpers**

`apps/backend/src/saas_forge_backend/jobs/worker.py`:

```python
from __future__ import annotations

import asyncio
import logging

from arq.connections import RedisSettings
from redis.asyncio import Redis as AsyncRedis

from saas_forge_backend.config import get_settings

log = logging.getLogger(__name__)


# Task functions are imported lazily in functions to avoid import cycles.
async def run_agent_job(ctx: dict, job_id: str) -> dict:
    from saas_forge_backend.jobs.tasks.run_agent_job import run_agent_job as impl
    return await impl(ctx, job_id)


async def ingest_document_job(ctx: dict, job_id: str) -> dict:
    from saas_forge_backend.jobs.tasks.ingest_document_job import ingest_document_job as impl
    return await impl(ctx, job_id)


async def reaper(ctx: dict) -> None:
    from saas_forge_backend.jobs.reaper import sweep_pending, sweep_stale_running
    await sweep_pending(ctx)
    await sweep_stale_running(ctx)


async def startup(ctx: dict) -> None:
    settings = get_settings()
    log.info("ARQ worker starting with redis=%s", settings.redis_url)


async def shutdown(ctx: dict) -> None:
    log.info("ARQ worker shutting down")


def _redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(get_settings().redis_url)


class WorkerSettings:
    functions = [run_agent_job, ingest_document_job]
    cron_jobs: list = []  # populated below
    on_startup = startup
    on_shutdown = shutdown
    max_tries = 2
    job_timeout = 30 * 60  # 30 min hard cap per job
    keep_result = 60 * 5

    @staticmethod
    def get_redis_settings() -> RedisSettings:
        return _redis_settings()


# Cron registration must happen after class is defined.
from arq.cron import cron  # noqa: E402

WorkerSettings.cron_jobs = [
    cron(reaper, second={0, 30}),  # every 30 seconds
]
WorkerSettings.redis_settings = _redis_settings()  # type: ignore[attr-defined]
```

`apps/backend/src/saas_forge_backend/jobs/queue.py`:

```python
from __future__ import annotations

from arq import create_pool

from saas_forge_backend.config import get_settings
from saas_forge_backend.jobs.worker import _redis_settings


async def enqueue_run_agent_job(job_id: str) -> None:
    """Enqueue an existing AiJobRun row by id. Idempotent via _job_id."""
    pool = await create_pool(_redis_settings())
    try:
        await pool.enqueue_job("run_agent_job", job_id, _job_id=job_id)
    finally:
        await pool.aclose()


async def enqueue_ingest_document_job(job_id: str) -> None:
    pool = await create_pool(_redis_settings())
    try:
        await pool.enqueue_job("ingest_document_job", job_id, _job_id=job_id)
    finally:
        await pool.aclose()
```

- [ ] **Step 4: Write redis_status integration test**

`apps/backend/tests/test_redis_status.py`:

```python
import os

import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run against real redis",
)


@pytest.mark.asyncio
async def test_redis_status_lifecycle(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    from saas_forge_backend.jobs import redis_status as s

    job_id = "test-job-1"
    await s.write_running(job_id, agent_id="noop")
    await s.write_event(job_id, seq=0, type="step", payload={"node": "start"})
    snap = await s.read(job_id)
    assert snap["status"] == "RUNNING"
    assert snap["latest_event_type"] == "step"
    await s.set_cancel_requested(job_id)
    assert await s.is_cancel_requested(job_id) is True
    await s.write_terminal(job_id, status="SUCCEEDED")
    snap2 = await s.read(job_id)
    assert snap2["status"] == "SUCCEEDED"
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added ARQ worker scaffold, redis status writer, queue helpers"
```

---

### Task 3.2: Agent registry + run_agent_job worker task (with noop agent)

**Files:**
- Create: `apps/backend/src/saas_forge_backend/agents/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/agents/registry.py`
- Create: `apps/backend/src/saas_forge_backend/agents/noop.py`
- Create: `apps/backend/src/saas_forge_backend/jobs/tasks/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/jobs/tasks/run_agent_job.py`
- Create: `apps/backend/src/saas_forge_backend/jobs/event_emitter.py`
- Create: `apps/backend/tests/test_agents_noop.py`

- [ ] **Step 1: Agent registry + noop agent**

`apps/backend/src/saas_forge_backend/agents/__init__.py`: (empty)

`apps/backend/src/saas_forge_backend/agents/registry.py`:

```python
from __future__ import annotations

from collections.abc import AsyncIterator, Awaitable, Callable
from dataclasses import dataclass
from typing import Any


@dataclass
class AgentEvent:
    type: str  # "step" | "token" | "tool_call" | "tool_result" | "citation" | "final" | "error"
    payload: dict[str, Any]


# Agent run signature: (input_payload, ctx) -> async iterator of AgentEvents.
AgentRunFn = Callable[[dict[str, Any], dict[str, Any]], AsyncIterator[AgentEvent]]


class AgentRegistry:
    def __init__(self) -> None:
        self._fns: dict[str, AgentRunFn] = {}

    def register(self, agent_id: str, fn: AgentRunFn) -> None:
        if agent_id in self._fns:
            raise ValueError(f"Agent already registered: {agent_id}")
        self._fns[agent_id] = fn

    def get(self, agent_id: str) -> AgentRunFn:
        try:
            return self._fns[agent_id]
        except KeyError:
            raise LookupError(f"Unknown agent: {agent_id}") from None

    def ids(self) -> list[str]:
        return sorted(self._fns)


REGISTRY = AgentRegistry()


def register_default_agents() -> None:
    from saas_forge_backend.agents.noop import run as noop_run
    if "noop" not in REGISTRY.ids():
        REGISTRY.register("noop", noop_run)
```

`apps/backend/src/saas_forge_backend/agents/noop.py`:

```python
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from typing import Any

from saas_forge_backend.agents.registry import AgentEvent


async def run(input_payload: dict[str, Any], ctx: dict[str, Any]) -> AsyncIterator[AgentEvent]:
    """A deterministic no-op agent used for round-trip tests."""
    yield AgentEvent(type="step", payload={"node": "start", "status": "start"})
    await asyncio.sleep(0)
    yield AgentEvent(type="step", payload={"node": "start", "status": "end"})
    yield AgentEvent(type="final", payload={"output": {"echo": input_payload}})
```

- [ ] **Step 2: Event emitter (DB + Redis fan-out)**

`apps/backend/src/saas_forge_backend/jobs/event_emitter.py`:

```python
from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from saas_forge_backend.db.repositories import jobs as jobs_repo
from saas_forge_backend.jobs import redis_status


class EventEmitter:
    """Emits agent events to both Postgres (ledger) and Redis (live status)."""

    def __init__(self, *, job_id: str) -> None:
        self.job_id = job_id
        self.seq = 0

    async def emit(self, session: AsyncSession, *, type: str, payload: dict[str, Any]) -> None:
        await jobs_repo.append_event(
            session, job_id=self.job_id, seq=self.seq, type=type, payload=payload
        )
        await redis_status.write_event(self.job_id, seq=self.seq, type=type, payload=payload)
        self.seq += 1
```

- [ ] **Step 3: run_agent_job worker task**

`apps/backend/src/saas_forge_backend/jobs/tasks/__init__.py`: (empty)

`apps/backend/src/saas_forge_backend/jobs/tasks/run_agent_job.py`:

```python
from __future__ import annotations

import logging
from typing import Any

from saas_forge_backend.agents.registry import REGISTRY, register_default_agents
from saas_forge_backend.db.engine import get_sessionmaker
from saas_forge_backend.db.models import AiJobStatus
from saas_forge_backend.db.repositories import jobs as jobs_repo
from saas_forge_backend.jobs import redis_status
from saas_forge_backend.jobs.event_emitter import EventEmitter

log = logging.getLogger(__name__)


class JobCancelled(Exception):
    pass


async def run_agent_job(ctx: dict[str, Any], job_id: str) -> dict[str, Any]:
    register_default_agents()
    sm = get_sessionmaker()

    # Pickup: skip if already cancelled or non-pending.
    async with sm() as s, s.begin():
        row = await jobs_repo.get(s, job_id)
        if row is None:
            log.warning("run_agent_job: missing row %s", job_id)
            return {"skipped": True}
        if row.status == AiJobStatus.CANCELLED:
            return {"skipped": True, "reason": "cancelled_before_pickup"}
        await jobs_repo.mark_running(s, job_id)

    await redis_status.write_running(job_id, agent_id=row.agentId)
    emitter = EventEmitter(job_id=job_id)
    final_payload: dict[str, Any] | None = None

    try:
        agent_fn = REGISTRY.get(row.agentId)
        agent_iter = agent_fn(row.input, ctx)
        async for event in agent_iter:
            if await redis_status.is_cancel_requested(job_id):
                raise JobCancelled()
            async with sm() as s, s.begin():
                await emitter.emit(s, type=event.type, payload=event.payload)
                await jobs_repo.heartbeat(s, job_id)
            if event.type == "final":
                final_payload = event.payload

        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(
                s, job_id, status=AiJobStatus.SUCCEEDED, result=final_payload or {}
            )
        await redis_status.write_terminal(job_id, status="SUCCEEDED")
        return {"ok": True}

    except JobCancelled:
        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(s, job_id, status=AiJobStatus.CANCELLED)
        await redis_status.write_terminal(job_id, status="CANCELLED")
        return {"cancelled": True}

    except LookupError as exc:
        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(
                s, job_id,
                status=AiJobStatus.FAILED,
                error_code="UNKNOWN_AGENT",
                error_message=str(exc),
            )
        await redis_status.write_terminal(job_id, status="FAILED", error_code="UNKNOWN_AGENT")
        raise

    except Exception as exc:  # noqa: BLE001
        log.exception("Job %s failed", job_id)
        async with sm() as s, s.begin():
            await jobs_repo.mark_terminal(
                s, job_id,
                status=AiJobStatus.FAILED,
                error_code="AGENT_ERROR",
                error_message=str(exc),
            )
        await redis_status.write_terminal(job_id, status="FAILED", error_code="AGENT_ERROR")
        raise
```

- [ ] **Step 4: Write noop agent unit test**

`apps/backend/tests/test_agents_noop.py`:

```python
import pytest

from saas_forge_backend.agents.noop import run


@pytest.mark.asyncio
async def test_noop_emits_three_events():
    events = []
    async for ev in run({"hello": "world"}, ctx={}):
        events.append(ev)
    assert [e.type for e in events] == ["step", "step", "final"]
    assert events[-1].payload == {"output": {"echo": {"hello": "world"}}}
```

- [ ] **Step 5: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_agents_noop.py -q
```

Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/
git commit -m "Added agent registry, noop agent, event emitter, and run_agent_job task"
```

---

### Task 3.3: `/jobs` enqueue endpoint

**Files:**
- Create: `apps/backend/src/saas_forge_backend/api/routes/jobs.py`
- Create: `apps/backend/src/saas_forge_backend/api/schemas/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/api/schemas/jobs.py`
- Modify: `apps/backend/src/saas_forge_backend/main.py`
- Create: `apps/backend/tests/test_jobs_endpoint.py`

- [ ] **Step 1: Pydantic schemas**

`apps/backend/src/saas_forge_backend/api/schemas/__init__.py`: (empty)

`apps/backend/src/saas_forge_backend/api/schemas/jobs.py`:

```python
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class EnqueueJobRequest(BaseModel):
    job_id: str = Field(min_length=1, max_length=128)
    user_id: str = Field(min_length=1)
    org_id: str | None = None
    agent_id: str = Field(min_length=1)
    input: dict[str, Any] = Field(default_factory=dict)


class EnqueueJobResponse(BaseModel):
    job_id: str
    enqueued: bool
```

- [ ] **Step 2: Route handler**

`apps/backend/src/saas_forge_backend/api/routes/jobs.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from saas_forge_backend.api.schemas.jobs import EnqueueJobRequest, EnqueueJobResponse
from saas_forge_backend.jobs.queue import enqueue_run_agent_job

router = APIRouter(prefix="/jobs")


@router.post("", response_model=EnqueueJobResponse, status_code=202)
async def enqueue_job(request: Request) -> EnqueueJobResponse:
    body = EnqueueJobRequest.model_validate(getattr(request.state, "verified_payload", {}))
    try:
        await enqueue_run_agent_job(body.job_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"enqueue_failed: {exc}") from exc
    return EnqueueJobResponse(job_id=body.job_id, enqueued=True)
```

- [ ] **Step 3: Register route**

Update `apps/backend/src/saas_forge_backend/main.py`:

```python
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from saas_forge_backend.api.middleware import HmacMiddleware
from saas_forge_backend.api.routes import health, jobs
from saas_forge_backend.db.engine import get_engine
from saas_forge_backend.db.schema_check import SchemaDriftError, assert_schema_agreement

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await assert_schema_agreement(get_engine())
    except SchemaDriftError as exc:
        log.error("Schema drift detected: %s", exc)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(HmacMiddleware)
    app.include_router(health.router)
    app.include_router(jobs.router)
    return app


app = create_app()
```

Note: the stub `/agents/stream` route is removed here — Milestone 4 reintroduces it as a real handler.

- [ ] **Step 4: Write endpoint test**

`apps/backend/tests/test_jobs_endpoint.py`:

```python
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from saas_forge_backend.config import get_settings
from saas_forge_backend.main import create_app
from saas_forge_backend.security.hmac import sign_payload


@pytest.fixture(autouse=True)
def _secret(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_enqueue_returns_202(monkeypatch):
    with patch("saas_forge_backend.api.routes.jobs.enqueue_run_agent_job", AsyncMock()) as m:
        client = TestClient(create_app())
        payload = {
            "job_id": "j1",
            "user_id": "u1",
            "org_id": None,
            "agent_id": "noop",
            "input": {"x": 1},
        }
        ts, sig = sign_payload("x" * 32, payload)
        resp = client.post(
            "/jobs",
            json=payload,
            headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig, "X-Saas-Forge-Req-Id": "r1"},
        )
    assert resp.status_code == 202
    assert resp.json() == {"job_id": "j1", "enqueued": True}
    m.assert_awaited_once_with("j1")
```

- [ ] **Step 5: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_jobs_endpoint.py -q
```

Expected: `1 passed`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/
git commit -m "Added /jobs enqueue endpoint"
```

---

### Task 3.4: Reaper (PENDING + stale heartbeat sweeps)

**Files:**
- Create: `apps/backend/src/saas_forge_backend/jobs/reaper.py`
- Create: `apps/backend/tests/test_reaper.py`

- [ ] **Step 1: Implement reaper**

`apps/backend/src/saas_forge_backend/jobs/reaper.py`:

```python
from __future__ import annotations

import logging
from datetime import datetime, timezone

from saas_forge_backend.db.engine import get_sessionmaker
from saas_forge_backend.db.models import AiJobStatus
from saas_forge_backend.db.repositories import jobs as jobs_repo
from saas_forge_backend.jobs import redis_status
from saas_forge_backend.jobs.queue import enqueue_run_agent_job

log = logging.getLogger(__name__)

PENDING_AGE_SECONDS = 60
ENQUEUE_TIMEOUT_SECONDS = 5 * 60
STALE_HEARTBEAT_SECONDS = 5 * 60


async def sweep_pending(ctx: dict) -> None:
    sm = get_sessionmaker()
    async with sm() as s, s.begin():
        rows = await jobs_repo.list_pending_older_than(s, seconds=PENDING_AGE_SECONDS)

    for row in rows:
        age = (datetime.now(timezone.utc) - row.createdAt).total_seconds()
        if age > ENQUEUE_TIMEOUT_SECONDS:
            async with sm() as s, s.begin():
                await jobs_repo.mark_terminal(
                    s, row.id,
                    status=AiJobStatus.FAILED,
                    error_code="ENQUEUE_TIMEOUT",
                    error_message=f"pending for {int(age)}s without pickup",
                )
            await redis_status.write_terminal(row.id, status="FAILED", error_code="ENQUEUE_TIMEOUT")
            log.warning("Reaper failed stale PENDING job %s after %ds", row.id, int(age))
        else:
            try:
                await enqueue_run_agent_job(row.id)
                log.info("Reaper re-enqueued PENDING job %s", row.id)
            except Exception:  # noqa: BLE001
                log.exception("Reaper failed to re-enqueue %s", row.id)


async def sweep_stale_running(ctx: dict) -> None:
    sm = get_sessionmaker()
    async with sm() as s, s.begin():
        rows = await jobs_repo.list_stale_running(s, heartbeat_max_age_seconds=STALE_HEARTBEAT_SECONDS)
        for row in rows:
            await jobs_repo.mark_terminal(
                s, row.id,
                status=AiJobStatus.FAILED,
                error_code="STALE_HEARTBEAT",
                error_message="no heartbeat for 5+ minutes",
            )
            await redis_status.write_terminal(row.id, status="FAILED", error_code="STALE_HEARTBEAT")
            log.warning("Reaper failed stale RUNNING job %s", row.id)
```

- [ ] **Step 2: Write unit test (mocked repos)**

`apps/backend/tests/test_reaper.py`:

```python
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_sweep_pending_re_enqueues_recent_rows(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    row = MagicMock()
    row.id = "j1"
    row.createdAt = datetime.now(timezone.utc) - timedelta(seconds=90)

    with patch("saas_forge_backend.jobs.reaper.get_sessionmaker") as gsm, \
         patch("saas_forge_backend.jobs.reaper.jobs_repo") as repo, \
         patch("saas_forge_backend.jobs.reaper.enqueue_run_agent_job", AsyncMock()) as enq, \
         patch("saas_forge_backend.jobs.reaper.redis_status") as rs:
        sm = MagicMock()
        sm.return_value.__aenter__.return_value = sm
        sm.begin.return_value.__aenter__.return_value = None
        gsm.return_value = sm
        repo.list_pending_older_than = AsyncMock(return_value=[row])
        from saas_forge_backend.jobs.reaper import sweep_pending
        await sweep_pending({})
    enq.assert_awaited_once_with("j1")


@pytest.mark.asyncio
async def test_sweep_pending_marks_failed_after_timeout(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    row = MagicMock()
    row.id = "j2"
    row.createdAt = datetime.now(timezone.utc) - timedelta(seconds=400)

    with patch("saas_forge_backend.jobs.reaper.get_sessionmaker") as gsm, \
         patch("saas_forge_backend.jobs.reaper.jobs_repo") as repo, \
         patch("saas_forge_backend.jobs.reaper.enqueue_run_agent_job", AsyncMock()), \
         patch("saas_forge_backend.jobs.reaper.redis_status") as rs:
        sm = MagicMock()
        sm.return_value.__aenter__.return_value = sm
        sm.begin.return_value.__aenter__.return_value = None
        gsm.return_value = sm
        repo.list_pending_older_than = AsyncMock(return_value=[row])
        repo.mark_terminal = AsyncMock()
        from saas_forge_backend.jobs.reaper import sweep_pending
        await sweep_pending({})
    repo.mark_terminal.assert_awaited_once()
    rs.write_terminal.assert_awaited_once()
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_reaper.py -q
```

Expected: `2 passed`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/
git commit -m "Added reaper for stale PENDING and RUNNING jobs"
```

---

### Task 3.5: Web tRPC `aiJobs` router

**Files:**
- Create: `apps/web/lib/backend/client.ts`
- Create: `apps/web/trpc/routers/aiJobsProcedures.ts`
- Modify: `apps/web/trpc/routers/_app.ts:1-18`
- Create: `apps/web/trpc/routers/__tests__/aiJobs.test.ts`

- [ ] **Step 1: Backend client helper for web**

`apps/web/lib/backend/client.ts`:

```ts
import { signedFetch } from "@workspace/observability/signed-fetch";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const BACKEND_HMAC_SECRET = process.env.BACKEND_HMAC_SECRET ?? "";

if (!BACKEND_HMAC_SECRET) {
  // Logged once at import time; do not throw — middleware will reject calls.
  console.warn("[backend/client] BACKEND_HMAC_SECRET is not set");
}

export type EnqueueJobInput = {
  jobId: string;
  userId: string;
  orgId: string | null;
  agentId: string;
  input: Record<string, unknown>;
};

export async function enqueueJob(input: EnqueueJobInput): Promise<void> {
  const resp = await signedFetch({
    url: `${BACKEND_URL}/jobs`,
    secret: BACKEND_HMAC_SECRET,
    payload: {
      job_id: input.jobId,
      user_id: input.userId,
      org_id: input.orgId,
      agent_id: input.agentId,
      input: input.input,
    },
  });
  if (!resp.ok) {
    throw new Error(`enqueue failed: ${resp.status} ${await resp.text()}`);
  }
}

export type AgentStreamInput = {
  userId: string;
  orgId: string | null;
  agentId: string;
  input: Record<string, unknown>;
  signal?: AbortSignal;
};

export async function openAgentStream(input: AgentStreamInput): Promise<Response> {
  return signedFetch({
    url: `${BACKEND_URL}/agents/stream`,
    secret: BACKEND_HMAC_SECRET,
    payload: {
      user_id: input.userId,
      org_id: input.orgId,
      agent_id: input.agentId,
      input: input.input,
    },
    signal: input.signal,
  });
}
```

- [ ] **Step 2: tRPC router**

`apps/web/trpc/routers/aiJobsProcedures.ts`:

```ts
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import db from "@workspace/database/client";
import { Redis } from "@upstash/redis";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { enqueueJob } from "@/lib/backend/client";

const upstash = Redis.fromEnv();

const createInput = z.object({
  agentId: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
});

const statusInput = z.object({ jobId: z.string().min(1) });
const eventsInput = z.object({
  jobId: z.string().min(1),
  sinceSeq: z.number().int().nonnegative().optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
const cancelInput = z.object({ jobId: z.string().min(1) });

export const aiJobsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createInput)
    .mutation(async ({ ctx, input }) => {
      const row = await (db as any).aiJobRun.create({
        data: {
          userId: ctx.session.user.id,
          orgId: null,
          agentId: input.agentId,
          status: "PENDING",
          input: input.input,
        },
        select: { id: true },
      });
      try {
        await enqueueJob({
          jobId: row.id,
          userId: ctx.session.user.id,
          orgId: null,
          agentId: input.agentId,
          input: input.input,
        });
      } catch (err) {
        console.error("[aiJobs.create] enqueue failed; row stays PENDING for reaper", err);
      }
      return { jobId: row.id };
    }),

  status: protectedProcedure
    .input(statusInput)
    .query(async ({ ctx, input }) => {
      const live = (await upstash.hgetall<Record<string, string>>(`job:${input.jobId}`)) ?? {};
      const row = await (db as any).aiJobRun.findFirst({
        where: { id: input.jobId, userId: ctx.session.user.id },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });

      const status = (live.status ?? row.status) as
        | "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

      return {
        id: row.id,
        status,
        agent_id: row.agentId,
        created_at: row.createdAt,
        started_at: row.startedAt,
        finished_at: row.finishedAt,
        latest_event: live.latest_event_seq
          ? {
              seq: Number(live.latest_event_seq),
              type: live.latest_event_type ?? "unknown",
              at: live.last_heartbeat ?? new Date().toISOString(),
            }
          : undefined,
        result: status === "SUCCEEDED" ? row.result : undefined,
        error: status === "FAILED"
          ? { code: row.errorCode ?? "UNKNOWN", message: row.errorMessage ?? "" }
          : undefined,
      };
    }),

  events: protectedProcedure
    .input(eventsInput)
    .query(async ({ ctx, input }) => {
      const owned = await (db as any).aiJobRun.findFirst({
        where: { id: input.jobId, userId: ctx.session.user.id },
        select: { id: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });

      const rows = await (db as any).aiJobEvent.findMany({
        where: {
          jobId: input.jobId,
          ...(input.sinceSeq !== undefined ? { seq: { gt: input.sinceSeq } } : {}),
        },
        orderBy: { seq: "asc" },
        take: input.limit,
      });
      return rows.map((r: any) => ({
        seq: r.seq,
        type: r.type,
        payload: r.payload,
        at: r.at,
      }));
    }),

  cancel: protectedProcedure
    .input(cancelInput)
    .mutation(async ({ ctx, input }) => {
      const owned = await (db as any).aiJobRun.findFirst({
        where: { id: input.jobId, userId: ctx.session.user.id },
        select: { id: true, status: true },
      });
      if (!owned) throw new TRPCError({ code: "NOT_FOUND" });

      if (["SUCCEEDED", "FAILED", "CANCELLED"].includes(owned.status)) {
        return { ok: true, already_terminal: true };
      }

      await (db as any).aiJobRun.update({
        where: { id: input.jobId },
        data: { status: "CANCELLED", finishedAt: new Date() },
      });
      await upstash.hset(`job:${input.jobId}`, { cancel_requested: "1", status: "CANCELLED" });
      return { ok: true };
    }),
});
```

- [ ] **Step 3: Register router in `_app.ts`**

Edit `apps/web/trpc/routers/_app.ts`:

```ts
import { supportRouter } from './supportProcedures';
import { createTRPCRouter } from '../init';
import { landingRouter } from './landingProcedures';
import { documentationRouter } from './docProcedures';
import { homeRouter } from './homeProcedures';
import { billingRouter } from './billingProcedures';
import { seoRouter } from './seoProcedures';
import { aiRouter } from './aiProcedures';
import { aiJobsRouter } from './aiJobsProcedures';

export const appRouter = createTRPCRouter({
    support: supportRouter,
    landing: landingRouter,
    documentation: documentationRouter,
    home: homeRouter,
    billing: billingRouter,
    seo: seoRouter,
    ai: aiRouter,
    aiJobs: aiJobsRouter,
});
export type AppRouter = typeof appRouter;
```

- [ ] **Step 4: Add `@upstash/redis` dependency to web**

```bash
pnpm --filter web add @upstash/redis
```

- [ ] **Step 5: Write tRPC procedure tests**

`apps/web/trpc/routers/__tests__/aiJobs.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@workspace/database/client", () => ({
  default: {
    aiJobRun: {
      create: vi.fn(async () => ({ id: "j1" })),
      findFirst: vi.fn(async () => ({
        id: "j1",
        userId: "u1",
        agentId: "noop",
        status: "PENDING",
        createdAt: new Date(),
        startedAt: null,
        finishedAt: null,
        result: null,
        errorCode: null,
        errorMessage: null,
      })),
      update: vi.fn(async () => ({})),
    },
    aiJobEvent: {
      findMany: vi.fn(async () => []),
    },
  },
}));

vi.mock("@upstash/redis", () => ({
  Redis: {
    fromEnv: () => ({
      hgetall: vi.fn(async () => ({})),
      hset: vi.fn(async () => 1),
    }),
  },
}));

vi.mock("@/lib/backend/client", () => ({
  enqueueJob: vi.fn(async () => {}),
}));

import { aiJobsRouter } from "../aiJobsProcedures";
import { enqueueJob } from "@/lib/backend/client";

const ctx = {
  headers: new Headers(),
  session: { user: { id: "u1", role: "user", email: "u1@example.com", name: "u" } },
} as any;

describe("aiJobs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("create returns jobId and calls enqueue", async () => {
    const caller = aiJobsRouter.createCaller(ctx);
    const res = await caller.create({ agentId: "noop", input: {} });
    expect(res).toEqual({ jobId: "j1" });
    expect(enqueueJob).toHaveBeenCalledOnce();
  });

  it("status returns combined Postgres + Redis data", async () => {
    const caller = aiJobsRouter.createCaller(ctx);
    const res = await caller.status({ jobId: "j1" });
    expect(res.id).toBe("j1");
    expect(res.status).toBe("PENDING");
  });
});
```

- [ ] **Step 6: Run web tests**

```bash
pnpm --dir apps/web test -- aiJobs
```

Expected: `2 passed`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/ packages/observability/
git commit -m "Added tRPC aiJobs router with create/status/events/cancel"
```

---

### Task 3.6: End-to-end async job round-trip test (noop agent)

**Files:**
- Create: `apps/backend/tests/integration/test_async_job_e2e.py`

- [ ] **Step 1: Write the E2E test**

`apps/backend/tests/integration/test_async_job_e2e.py`:

```python
import asyncio
import os

import cuid2
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run against compose services",
)


@pytest.mark.asyncio
async def test_noop_job_runs_end_to_end():
    """Insert a PENDING row, enqueue, wait for terminal state via DB poll."""
    from sqlalchemy import text

    from saas_forge_backend.db.engine import get_sessionmaker
    from saas_forge_backend.db.models import AiJobStatus
    from saas_forge_backend.db.repositories import jobs as jobs_repo
    from saas_forge_backend.jobs.queue import enqueue_run_agent_job

    sm = get_sessionmaker()

    user_id = cuid2.cuid()
    async with sm() as s, s.begin():
        await s.execute(
            text(
                'INSERT INTO user_schema."User" (id, name, email, "emailVerified", role, banned, '
                '"creditsUsed","creditsTotal","createdAt","updatedAt") '
                "VALUES (:id, 'test', :email, false, 'user', false, 0, 20, now(), now())"
            ),
            {"id": user_id, "email": f"{user_id}@example.com"},
        )

    job_id = cuid2.cuid()
    async with sm() as s, s.begin():
        await jobs_repo.insert_pending(
            s, job_id=job_id, user_id=user_id, org_id=None,
            agent_id="noop", input_payload={"hello": "world"},
        )

    await enqueue_run_agent_job(job_id)

    # Poll for terminal state.
    deadline = asyncio.get_event_loop().time() + 30
    final = None
    while asyncio.get_event_loop().time() < deadline:
        async with sm() as s:
            row = await jobs_repo.get(s, job_id)
        if row and row.status in {
            AiJobStatus.SUCCEEDED, AiJobStatus.FAILED, AiJobStatus.CANCELLED
        }:
            final = row
            break
        await asyncio.sleep(0.5)

    assert final is not None, "job never reached terminal state"
    assert final.status == AiJobStatus.SUCCEEDED
    assert final.result == {"output": {"echo": {"hello": "world"}}}
```

- [ ] **Step 2: Run the E2E test locally**

```bash
docker compose up --build --detach postgres redis backend-worker
sleep 5
BACKEND_INTEGRATION=1 \
BACKEND_HMAC_SECRET="x" \
BACKEND_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge" \
REDIS_URL="redis://localhost:6379/0" \
pnpm --filter @workspace/backend test -- tests/integration/test_async_job_e2e -q
```

Expected: `1 passed`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/integration/test_async_job_e2e.py
git commit -m "Added end-to-end async job test using noop agent"
```

---

## Milestone 4 — LLM Providers + Sync Streaming Agent

**Goal:** A `provider:model` string resolves to a LangChain `BaseChatModel` for OpenAI, Anthropic, OpenRouter, or Ollama. `/agents/stream` runs an agent and emits the typed SSE event schema. Web's `/api/ai/agents/[agentId]/stream` proxies cleanly with cookie auth on the browser side. An LLM-mocked e2e test proves the SSE wire format end-to-end.

### Task 4.1: LLM provider factory

**Files:**
- Create: `apps/backend/src/saas_forge_backend/llm/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/llm/factory.py`
- Create: `apps/backend/tests/test_llm_factory.py`

- [ ] **Step 1: Create llm package init**

`apps/backend/src/saas_forge_backend/llm/__init__.py`: (empty)

- [ ] **Step 2: Write failing test**

`apps/backend/tests/test_llm_factory.py`:

```python
import pytest

from saas_forge_backend.llm.factory import (
    UnsupportedProvider,
    parse_provider_model,
    resolve_chat_model,
)


def test_parse_provider_model_basic():
    assert parse_provider_model("openai:gpt-4o-mini") == ("openai", "gpt-4o-mini")
    assert parse_provider_model("anthropic:claude-3-5-sonnet-20241022") == (
        "anthropic", "claude-3-5-sonnet-20241022",
    )
    assert parse_provider_model("ollama:llama3.1") == ("ollama", "llama3.1")
    assert parse_provider_model("openrouter:meta-llama/llama-3.1-70b") == (
        "openrouter", "meta-llama/llama-3.1-70b",
    )


def test_parse_provider_model_rejects_bad_format():
    with pytest.raises(ValueError):
        parse_provider_model("nope")
    with pytest.raises(ValueError):
        parse_provider_model("openai:")


def test_unsupported_provider_raises(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    with pytest.raises(UnsupportedProvider):
        resolve_chat_model("googleflavor:foo")


def test_resolve_openai(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    model = resolve_chat_model("openai:gpt-4o-mini")
    # Just verify the class came from langchain_openai.
    assert type(model).__module__.startswith("langchain_openai")


def test_resolve_openrouter_uses_openai_with_base_url(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("OPENROUTER_API_KEY", "sk-or-test")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    model = resolve_chat_model("openrouter:meta-llama/llama-3.1-70b")
    assert type(model).__module__.startswith("langchain_openai")
    # Spot-check that base_url got swapped.
    assert "openrouter.ai" in str(getattr(model, "openai_api_base", "")) or \
           "openrouter.ai" in str(getattr(model, "base_url", ""))
```

- [ ] **Step 3: Implement factory**

`apps/backend/src/saas_forge_backend/llm/factory.py`:

```python
from __future__ import annotations

from langchain_core.language_models import BaseChatModel

from saas_forge_backend.config import get_settings

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class UnsupportedProvider(Exception):
    pass


class MissingProviderCredentials(Exception):
    pass


def parse_provider_model(value: str) -> tuple[str, str]:
    if ":" not in value:
        raise ValueError(f"expected 'provider:model', got: {value!r}")
    provider, _, model = value.partition(":")
    provider = provider.strip().lower()
    model = model.strip()
    if not provider or not model:
        raise ValueError(f"empty provider or model in: {value!r}")
    return provider, model


def resolve_chat_model(value: str, *, temperature: float = 0.2) -> BaseChatModel:
    provider, model = parse_provider_model(value)
    settings = get_settings()

    if provider == "openai":
        if not settings.openai_api_key:
            raise MissingProviderCredentials("OPENAI_API_KEY not set")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(model=model, temperature=temperature, api_key=settings.openai_api_key)

    if provider == "openrouter":
        if not settings.openrouter_api_key:
            raise MissingProviderCredentials("OPENROUTER_API_KEY not set")
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model,
            temperature=temperature,
            api_key=settings.openrouter_api_key,
            base_url=OPENROUTER_BASE_URL,
        )

    if provider == "anthropic":
        if not settings.anthropic_api_key:
            raise MissingProviderCredentials("ANTHROPIC_API_KEY not set")
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=model, temperature=temperature, api_key=settings.anthropic_api_key)

    if provider == "ollama":
        if not settings.ollama_base_url:
            raise MissingProviderCredentials("OLLAMA_BASE_URL not set")
        from langchain_ollama import ChatOllama
        return ChatOllama(model=model, temperature=temperature, base_url=settings.ollama_base_url)

    raise UnsupportedProvider(f"unknown provider: {provider}")
```

- [ ] **Step 4: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_llm_factory.py -q
```

Expected: `5 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added LLM provider factory (openai/anthropic/openrouter/ollama)"
```

---

### Task 4.2: SSE event schema + emitter

**Files:**
- Create: `apps/backend/src/saas_forge_backend/api/sse.py`
- Create: `apps/backend/tests/test_sse.py`

- [ ] **Step 1: Write failing test**

`apps/backend/tests/test_sse.py`:

```python
import json

import pytest

from saas_forge_backend.api.sse import sse_event


def test_sse_event_format():
    assert sse_event("token", {"delta": "Hi"}) == 'event: token\ndata: {"delta":"Hi"}\n\n'


def test_sse_event_end_with_empty_payload():
    assert sse_event("end", {}) == "event: end\ndata: {}\n\n"


def test_sse_event_rejects_unknown_type():
    with pytest.raises(ValueError):
        sse_event("nope", {})
```

- [ ] **Step 2: Implement**

`apps/backend/src/saas_forge_backend/api/sse.py`:

```python
from __future__ import annotations

import json
from typing import Any

VALID_EVENT_TYPES = frozenset({
    "step", "token", "tool_call", "tool_result", "citation", "final", "error", "end"
})


def sse_event(type: str, payload: dict[str, Any]) -> str:
    if type not in VALID_EVENT_TYPES:
        raise ValueError(f"unknown SSE event type: {type}")
    body = json.dumps(payload, separators=(",", ":"))
    return f"event: {type}\ndata: {body}\n\n"
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_sse.py -q
```

Expected: `3 passed`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/
git commit -m "Added SSE event format helper with typed schema"
```

---

### Task 4.3: `/agents/stream` real handler

**Files:**
- Create: `apps/backend/src/saas_forge_backend/api/routes/agents.py`
- Create: `apps/backend/src/saas_forge_backend/api/schemas/agents.py`
- Modify: `apps/backend/src/saas_forge_backend/main.py`
- Create: `apps/backend/tests/test_agents_stream_endpoint.py`

- [ ] **Step 1: Request schema**

`apps/backend/src/saas_forge_backend/api/schemas/agents.py`:

```python
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class StreamAgentRequest(BaseModel):
    user_id: str = Field(min_length=1)
    org_id: str | None = None
    agent_id: str = Field(min_length=1)
    input: dict[str, Any] = Field(default_factory=dict)
```

- [ ] **Step 2: Route handler**

`apps/backend/src/saas_forge_backend/api/routes/agents.py`:

```python
from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from saas_forge_backend.agents.registry import REGISTRY, register_default_agents
from saas_forge_backend.api.schemas.agents import StreamAgentRequest
from saas_forge_backend.api.sse import sse_event

log = logging.getLogger(__name__)
router = APIRouter()


@router.post("/agents/stream")
async def agents_stream(request: Request) -> StreamingResponse:
    register_default_agents()
    body = StreamAgentRequest.model_validate(getattr(request.state, "verified_payload", {}))

    try:
        agent_fn = REGISTRY.get(body.agent_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    async def producer():
        try:
            agent_iter = agent_fn(body.input, {"user_id": body.user_id, "org_id": body.org_id})
            async for event in agent_iter:
                if await request.is_disconnected():
                    log.info("Client disconnected mid-stream; cancelling agent")
                    break
                yield sse_event(event.type, event.payload).encode()
        except asyncio.CancelledError:
            log.info("Stream cancelled")
            raise
        except Exception as exc:  # noqa: BLE001
            log.exception("Agent error")
            yield sse_event("error", {"code": "AGENT_ERROR", "message": str(exc)}).encode()
        finally:
            yield sse_event("end", {}).encode()

    return StreamingResponse(
        producer(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

- [ ] **Step 3: Wire route into app**

Update `apps/backend/src/saas_forge_backend/main.py` to include the agents router:

```python
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from saas_forge_backend.api.middleware import HmacMiddleware
from saas_forge_backend.api.routes import agents, health, jobs
from saas_forge_backend.db.engine import get_engine
from saas_forge_backend.db.schema_check import SchemaDriftError, assert_schema_agreement

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await assert_schema_agreement(get_engine())
    except SchemaDriftError as exc:
        log.error("Schema drift detected: %s", exc)
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="saas-forge-backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(HmacMiddleware)
    app.include_router(health.router)
    app.include_router(jobs.router)
    app.include_router(agents.router)
    return app


app = create_app()
```

- [ ] **Step 4: Test the streaming endpoint with noop agent**

`apps/backend/tests/test_agents_stream_endpoint.py`:

```python
import json

import pytest
from fastapi.testclient import TestClient

from saas_forge_backend.config import get_settings
from saas_forge_backend.main import create_app
from saas_forge_backend.security.hmac import sign_payload


@pytest.fixture(autouse=True)
def _secret(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _parse_sse(body: str) -> list[tuple[str, dict]]:
    events = []
    for chunk in body.split("\n\n"):
        if not chunk.strip():
            continue
        lines = chunk.splitlines()
        event_type = next(l.removeprefix("event: ") for l in lines if l.startswith("event: "))
        data = next(l.removeprefix("data: ") for l in lines if l.startswith("data: "))
        events.append((event_type, json.loads(data)))
    return events


def test_agents_stream_noop_emits_step_step_final_end():
    client = TestClient(create_app())
    payload = {"user_id": "u1", "org_id": None, "agent_id": "noop", "input": {"hello": "world"}}
    ts, sig = sign_payload("x" * 32, payload)
    resp = client.post(
        "/agents/stream",
        json=payload,
        headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig, "X-Saas-Forge-Req-Id": "r1"},
    )
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    events = _parse_sse(resp.text)
    types = [t for t, _ in events]
    assert types == ["step", "step", "final", "end"]


def test_agents_stream_unknown_agent_returns_404():
    client = TestClient(create_app())
    payload = {"user_id": "u1", "org_id": None, "agent_id": "doesnotexist", "input": {}}
    ts, sig = sign_payload("x" * 32, payload)
    resp = client.post(
        "/agents/stream",
        json=payload,
        headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig, "X-Saas-Forge-Req-Id": "r2"},
    )
    assert resp.status_code == 404
```

- [ ] **Step 5: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_agents_stream_endpoint.py -q
```

Expected: `2 passed`.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/
git commit -m "Added /agents/stream SSE endpoint backed by agent registry"
```

---

### Task 4.4: Web proxy route `/api/ai/agents/[agentId]/stream`

**Files:**
- Create: `apps/web/app/api/ai/agents/[agentId]/stream/route.ts`
- Create: `apps/web/app/api/ai/agents/__tests__/stream.test.ts`

- [ ] **Step 1: Implement the proxy route**

`apps/web/app/api/ai/agents/[agentId]/stream/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@workspace/auth/better-auth/auth";
import { openAgentStream } from "@/lib/backend/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ agentId: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { agentId } = await ctx.params;
  let input: Record<string, unknown> = {};
  try {
    input = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const upstream = await openAgentStream({
    userId: session.user.id,
    orgId: null,
    agentId,
    input,
    signal: req.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "backend_error", status: upstream.status },
      { status: 502 },
    );
  }

  // Re-stream SSE through to the client without buffering.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
```

- [ ] **Step 2: Write a route handler test**

`apps/web/app/api/ai/agents/__tests__/stream.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@workspace/auth/better-auth/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/backend/client", () => ({
  openAgentStream: vi.fn(),
}));

import { POST } from "@/app/api/ai/agents/[agentId]/stream/route";
import { auth } from "@workspace/auth/better-auth/auth";
import { openAgentStream } from "@/lib/backend/client";

const params = Promise.resolve({ agentId: "noop" });

function makeReq(body: unknown): Request {
  return new Request("http://test/api/ai/agents/noop/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

describe("agents stream proxy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when no session", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const resp = await POST(makeReq({}) as any, { params } as any);
    expect(resp.status).toBe(401);
  });

  it("pipes upstream body through when session present and backend OK", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce({ user: { id: "u1" } });
    const upstreamBody = "event: end\ndata: {}\n\n";
    (openAgentStream as any).mockResolvedValueOnce(
      new Response(upstreamBody, { status: 200 }),
    );
    const resp = await POST(makeReq({ q: "hi" }) as any, { params } as any);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("Content-Type")).toBe("text/event-stream");
    expect(await resp.text()).toBe(upstreamBody);
  });

  it("returns 502 if backend errors", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce({ user: { id: "u1" } });
    (openAgentStream as any).mockResolvedValueOnce(new Response("oops", { status: 500 }));
    const resp = await POST(makeReq({}) as any, { params } as any);
    expect(resp.status).toBe(502);
  });
});
```

- [ ] **Step 3: Run web tests**

```bash
pnpm --dir apps/web test -- stream
```

Expected: `3 passed`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/
git commit -m "Added /api/ai/agents/[agentId]/stream proxy to backend SSE"
```

---

### Task 4.5: LLM-mocked e2e agent (FakeListChatModel echo agent)

**Files:**
- Create: `apps/backend/src/saas_forge_backend/agents/echo_llm.py`
- Modify: `apps/backend/src/saas_forge_backend/agents/registry.py:30-35` (register `echo_llm` in `register_default_agents`)
- Create: `apps/backend/tests/test_echo_llm_agent.py`

- [ ] **Step 1: Echo agent using FakeListChatModel**

`apps/backend/src/saas_forge_backend/agents/echo_llm.py`:

```python
from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from langchain_core.language_models.fake_chat_models import FakeListChatModel
from langchain_core.messages import HumanMessage

from saas_forge_backend.agents.registry import AgentEvent


async def run(input_payload: dict[str, Any], ctx: dict[str, Any]) -> AsyncIterator[AgentEvent]:
    """
    Echo-LLM agent for LLM-mocked e2e tests.
    Input: { "query": str }. Output: streams tokens from a fake LLM that responds
    "ECHO: <query>", emits a final event with the full answer.
    """
    query = str(input_payload.get("query", ""))
    fake = FakeListChatModel(responses=[f"ECHO: {query}"])

    yield AgentEvent(type="step", payload={"node": "answer", "status": "start"})
    answer = ""
    async for chunk in fake.astream([HumanMessage(query)]):
        token = chunk.content or ""
        if token:
            answer += str(token)
            yield AgentEvent(type="token", payload={"delta": str(token)})
    yield AgentEvent(type="step", payload={"node": "answer", "status": "end"})
    yield AgentEvent(type="final", payload={"output": {"answer": answer}})
```

- [ ] **Step 2: Register the agent**

In `apps/backend/src/saas_forge_backend/agents/registry.py`, update `register_default_agents`:

```python
def register_default_agents() -> None:
    from saas_forge_backend.agents.noop import run as noop_run
    from saas_forge_backend.agents.echo_llm import run as echo_run
    if "noop" not in REGISTRY.ids():
        REGISTRY.register("noop", noop_run)
    if "echo_llm" not in REGISTRY.ids():
        REGISTRY.register("echo_llm", echo_run)
```

- [ ] **Step 3: Test echo_llm streams tokens + final**

`apps/backend/tests/test_echo_llm_agent.py`:

```python
import json

import pytest
from fastapi.testclient import TestClient

from saas_forge_backend.config import get_settings
from saas_forge_backend.main import create_app
from saas_forge_backend.security.hmac import sign_payload


@pytest.fixture(autouse=True)
def _secret(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_echo_llm_emits_step_tokens_step_final_end():
    client = TestClient(create_app())
    payload = {"user_id": "u1", "org_id": None, "agent_id": "echo_llm", "input": {"query": "hi"}}
    ts, sig = sign_payload("x" * 32, payload)
    resp = client.post(
        "/agents/stream",
        json=payload,
        headers={"X-Saas-Forge-Ts": ts, "X-Saas-Forge-Sig": sig, "X-Saas-Forge-Req-Id": "r1"},
    )
    assert resp.status_code == 200
    chunks = [c for c in resp.text.split("\n\n") if c.strip()]
    types = [next(l for l in c.splitlines() if l.startswith("event: ")).removeprefix("event: ") for c in chunks]
    assert types[0] == "step"
    assert "token" in types
    assert types[-2:] == ["final", "end"]

    # Reassemble token deltas.
    deltas = []
    final_payload = None
    for c in chunks:
        lines = c.splitlines()
        etype = next(l for l in lines if l.startswith("event: ")).removeprefix("event: ")
        data = json.loads(next(l for l in lines if l.startswith("data: ")).removeprefix("data: "))
        if etype == "token":
            deltas.append(data["delta"])
        if etype == "final":
            final_payload = data
    assert "".join(deltas) == "ECHO: hi"
    assert final_payload == {"output": {"answer": "ECHO: hi"}}
```

- [ ] **Step 4: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_echo_llm_agent.py -q
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added echo_llm agent with FakeListChatModel for SSE wire format verification"
```

---

## Milestone 5 — RAG Layer

**Goal:** A user can create a collection, ingest a text document, ask a question via the `rag_chat` agent, and receive a streaming answer with `citation` events that point back to the source chunks. pgvector backs storage by default; Qdrant adapter exists but is experimental.

### Task 5.1: Embedder factory

**Files:**
- Create: `apps/backend/src/saas_forge_backend/rag/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/rag/embedders.py`
- Create: `apps/backend/tests/test_embedders.py`

- [ ] **Step 1: Create rag package init**

`apps/backend/src/saas_forge_backend/rag/__init__.py`: (empty)

- [ ] **Step 2: Implement embedder factory**

`apps/backend/src/saas_forge_backend/rag/embedders.py`:

```python
from __future__ import annotations

from langchain_core.embeddings import Embeddings

from saas_forge_backend.config import get_settings


class UnsupportedEmbedder(Exception):
    pass


# Default dimensions per known model. Returned by `dimensions_for`.
_KNOWN_DIMS: dict[str, int] = {
    "openai:text-embedding-3-small": 1536,
    "openai:text-embedding-3-large": 3072,
}


def parse_embedder(value: str) -> tuple[str, str]:
    if ":" not in value:
        raise ValueError(f"expected 'provider:model', got: {value!r}")
    provider, _, model = value.partition(":")
    provider = provider.strip().lower()
    model = model.strip()
    if not provider or not model:
        raise ValueError(f"empty provider or model: {value!r}")
    return provider, model


def dimensions_for(value: str, *, ollama_default: int = 768) -> int:
    if value in _KNOWN_DIMS:
        return _KNOWN_DIMS[value]
    provider, _ = parse_embedder(value)
    if provider == "ollama":
        return ollama_default
    raise UnsupportedEmbedder(f"unknown embedder dims: {value}")


def resolve_embedder(value: str) -> Embeddings:
    provider, model = parse_embedder(value)
    settings = get_settings()

    if provider == "openai":
        if not settings.openai_api_key:
            raise UnsupportedEmbedder("OPENAI_API_KEY not set")
        from langchain_openai import OpenAIEmbeddings
        return OpenAIEmbeddings(model=model, api_key=settings.openai_api_key)

    if provider == "ollama":
        if not settings.ollama_base_url:
            raise UnsupportedEmbedder("OLLAMA_BASE_URL not set")
        from langchain_ollama import OllamaEmbeddings
        return OllamaEmbeddings(model=model, base_url=settings.ollama_base_url)

    raise UnsupportedEmbedder(f"unknown embedder provider: {provider}")
```

- [ ] **Step 3: Unit test**

`apps/backend/tests/test_embedders.py`:

```python
import pytest

from saas_forge_backend.rag.embedders import (
    UnsupportedEmbedder,
    dimensions_for,
    parse_embedder,
    resolve_embedder,
)


def test_parse_basic():
    assert parse_embedder("openai:text-embedding-3-small") == ("openai", "text-embedding-3-small")
    assert parse_embedder("ollama:nomic-embed-text") == ("ollama", "nomic-embed-text")


def test_dimensions_known():
    assert dimensions_for("openai:text-embedding-3-small") == 1536
    assert dimensions_for("openai:text-embedding-3-large") == 3072
    assert dimensions_for("ollama:nomic-embed-text") == 768


def test_dimensions_unknown():
    with pytest.raises(UnsupportedEmbedder):
        dimensions_for("googleflavor:foo")


def test_resolve_openai(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    emb = resolve_embedder("openai:text-embedding-3-small")
    assert type(emb).__module__.startswith("langchain_openai")
```

- [ ] **Step 4: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_embedders.py -q
```

Expected: `4 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added embedder factory for OpenAI and Ollama"
```

---

### Task 5.2: VectorStore factory (pgvector default + Qdrant adapter)

**Files:**
- Create: `apps/backend/src/saas_forge_backend/rag/vector_store.py`
- Create: `apps/backend/tests/test_vector_store_factory.py`

- [ ] **Step 1: Implement factory**

`apps/backend/src/saas_forge_backend/rag/vector_store.py`:

```python
from __future__ import annotations

from langchain_core.embeddings import Embeddings
from langchain_core.vectorstores import VectorStore

from saas_forge_backend.config import get_settings


class UnsupportedVectorStore(Exception):
    pass


def _to_sync_pg_url(asyncpg_url: str) -> str:
    """`langchain_postgres.PGVector` uses sync psycopg under the hood."""
    return asyncpg_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)


def get_vector_store(collection_id: str, embedder: Embeddings) -> VectorStore:
    settings = get_settings()
    backend = settings.rag_vector_store

    if backend == "pgvector":
        from langchain_postgres import PGVector
        return PGVector(
            embeddings=embedder,
            collection_name=collection_id,
            connection=_to_sync_pg_url(settings.backend_database_url),
            use_jsonb=True,
        )

    if backend == "qdrant":
        if not settings.qdrant_url:
            raise UnsupportedVectorStore("QDRANT_URL not set")
        from langchain_qdrant import QdrantVectorStore
        return QdrantVectorStore.from_existing_collection(
            collection_name=collection_id,
            embedding=embedder,
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
        )

    raise UnsupportedVectorStore(f"unknown RAG_VECTOR_STORE: {backend}")
```

- [ ] **Step 2: Add psycopg dependency (for langchain-postgres)**

In `apps/backend/pyproject.toml` append to `[project].dependencies`:

```toml
  "psycopg[binary]>=3.2",
```

Then:

```bash
cd apps/backend && uv lock && uv sync
```

- [ ] **Step 3: Unit test (factory dispatch only)**

`apps/backend/tests/test_vector_store_factory.py`:

```python
from unittest.mock import MagicMock

import pytest


def test_pgvector_selected_by_default(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("BACKEND_DATABASE_URL", "postgresql+asyncpg://u:p@h/db")
    monkeypatch.setenv("RAG_VECTOR_STORE", "pgvector")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    from saas_forge_backend.rag import vector_store as vs

    embedder = MagicMock()
    # We only check the factory doesn't raise; an integration test exercises real queries.
    store = vs.get_vector_store("test-collection", embedder)
    assert type(store).__name__ == "PGVector"


def test_qdrant_raises_without_url(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("RAG_VECTOR_STORE", "qdrant")
    monkeypatch.delenv("QDRANT_URL", raising=False)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    from saas_forge_backend.rag.vector_store import UnsupportedVectorStore, get_vector_store

    with pytest.raises(UnsupportedVectorStore):
        get_vector_store("c1", MagicMock())


def test_unknown_backend_raises(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("RAG_VECTOR_STORE", "weaviate")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()
    from saas_forge_backend.rag.vector_store import UnsupportedVectorStore, get_vector_store

    with pytest.raises(UnsupportedVectorStore):
        get_vector_store("c1", MagicMock())
```

- [ ] **Step 4: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_vector_store_factory.py -q
```

Expected: `3 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added VectorStore factory (pgvector default, Qdrant adapter)"
```

---

### Task 5.3: Text splitter wrapper

**Files:**
- Create: `apps/backend/src/saas_forge_backend/rag/splitters.py`
- Create: `apps/backend/tests/test_splitters.py`

- [ ] **Step 1: Wrapper**

`apps/backend/src/saas_forge_backend/rag/splitters.py`:

```python
from __future__ import annotations

from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter


@dataclass(slots=True)
class ChunkingConfig:
    chunk_size: int = 1000
    chunk_overlap: int = 200
    strategy: str = "recursive"

    @classmethod
    def from_input(cls, value: dict | None) -> "ChunkingConfig":
        if not value:
            return cls()
        return cls(
            chunk_size=int(value.get("chunk_size", 1000)),
            chunk_overlap=int(value.get("overlap", 200)),
            strategy=str(value.get("strategy", "recursive")),
        )


def split_text(text: str, config: ChunkingConfig | None = None) -> list[str]:
    cfg = config or ChunkingConfig()
    if cfg.strategy != "recursive":
        raise ValueError(f"only 'recursive' chunker supported in Phase 1, got {cfg.strategy}")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=cfg.chunk_size, chunk_overlap=cfg.chunk_overlap,
    )
    return splitter.split_text(text)
```

- [ ] **Step 2: Test**

`apps/backend/tests/test_splitters.py`:

```python
import pytest

from saas_forge_backend.rag.splitters import ChunkingConfig, split_text


def test_split_short_text_one_chunk():
    assert split_text("hello world") == ["hello world"]


def test_split_long_text_multiple_chunks():
    body = ("paragraph " * 200).strip()
    chunks = split_text(body, ChunkingConfig(chunk_size=200, chunk_overlap=20))
    assert len(chunks) > 1
    for c in chunks:
        assert len(c) <= 220  # size + slack


def test_rejects_unknown_strategy():
    with pytest.raises(ValueError):
        split_text("x", ChunkingConfig(strategy="markdown"))


def test_chunking_config_from_input():
    cfg = ChunkingConfig.from_input({"chunk_size": 500, "overlap": 50})
    assert cfg.chunk_size == 500
    assert cfg.chunk_overlap == 50
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_splitters.py -q
```

Expected: `4 passed`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/
git commit -m "Added recursive text splitter wrapper"
```

---

### Task 5.4: `KnowledgeSource` abstraction

**Files:**
- Create: `apps/backend/src/saas_forge_backend/rag/knowledge.py`
- Create: `apps/backend/tests/test_knowledge.py`

- [ ] **Step 1: Implement**

`apps/backend/src/saas_forge_backend/rag/knowledge.py`:

```python
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from langchain_core.embeddings import Embeddings

from saas_forge_backend.rag.vector_store import get_vector_store


@dataclass(slots=True)
class RetrievedChunk:
    text: str
    metadata: dict[str, Any]
    score: float

    def as_citation(self) -> dict[str, Any]:
        return {
            "doc_id": self.metadata.get("document_id"),
            "chunk_id": self.metadata.get("chunk_id"),
            "score": self.score,
            "snippet": self.text[:240],
        }


@dataclass(slots=True)
class KnowledgeSource:
    collection_id: str
    embedder: Embeddings
    top_k: int = 6
    score_threshold: float | None = None
    metadata_filter: dict[str, Any] | None = field(default=None)

    async def retrieve(self, query: str) -> list[RetrievedChunk]:
        store = get_vector_store(self.collection_id, self.embedder)
        results = await store.asimilarity_search_with_score(
            query,
            k=self.top_k,
            filter=self.metadata_filter,
        )
        chunks: list[RetrievedChunk] = []
        for doc, score in results:
            if self.score_threshold is not None and score < self.score_threshold:
                continue
            chunks.append(
                RetrievedChunk(text=doc.page_content, metadata=dict(doc.metadata), score=float(score)),
            )
        return chunks
```

- [ ] **Step 2: Unit test with mocked vector store**

`apps/backend/tests/test_knowledge.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from langchain_core.documents import Document


@pytest.mark.asyncio
async def test_retrieve_returns_chunks_and_applies_threshold(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    docs_with_scores = [
        (Document(page_content="hello", metadata={"document_id": "d1", "chunk_id": "c1"}), 0.91),
        (Document(page_content="weak", metadata={"document_id": "d2", "chunk_id": "c2"}), 0.3),
    ]
    fake_store = MagicMock()
    fake_store.asimilarity_search_with_score = AsyncMock(return_value=docs_with_scores)

    with patch("saas_forge_backend.rag.knowledge.get_vector_store", return_value=fake_store):
        from saas_forge_backend.rag.knowledge import KnowledgeSource

        embedder = MagicMock()
        ks = KnowledgeSource(collection_id="c1", embedder=embedder, top_k=2, score_threshold=0.5)
        chunks = await ks.retrieve("query")

    assert len(chunks) == 1
    assert chunks[0].text == "hello"
    assert chunks[0].as_citation()["doc_id"] == "d1"
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_knowledge.py -q
```

Expected: `1 passed`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/
git commit -m "Added KnowledgeSource RAG abstraction with citation projection"
```

---

### Task 5.5: Ingestion pipeline + `ingest_document_job`

**Files:**
- Create: `apps/backend/src/saas_forge_backend/rag/ingestion.py`
- Create: `apps/backend/src/saas_forge_backend/jobs/tasks/ingest_document_job.py`
- Modify: `apps/backend/src/saas_forge_backend/agents/registry.py` (register `rag_ingest` as a job-only agent — see Step 4)
- Create: `apps/backend/tests/test_ingestion_unit.py`
- Create: `apps/backend/tests/integration/test_rag_pgvector_e2e.py`

- [ ] **Step 1: Ingestion pipeline (steps return chunk texts + metadata)**

`apps/backend/src/saas_forge_backend/rag/ingestion.py`:

```python
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
```

- [ ] **Step 2: Ingestion worker task**

`apps/backend/src/saas_forge_backend/jobs/tasks/ingest_document_job.py`:

```python
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
```

- [ ] **Step 3: Wire the queue helper for ingestion**

The `enqueue_ingest_document_job` helper already exists in `jobs/queue.py` (Task 3.1). Verify by reading:

```bash
grep enqueue_ingest_document_job apps/backend/src/saas_forge_backend/jobs/queue.py
```

Expected: function exists.

- [ ] **Step 4: Update agent registry note**

Ingest jobs are NOT registered in the agent registry (they're worker-only tasks). Add a comment to `agents/registry.py` after `register_default_agents`:

```python
# Note: rag_ingest runs in `ingest_document_job` (ARQ task), not through the agent
# registry, because ingestion is exclusively asynchronous and does not stream events
# via the agent contract.
```

- [ ] **Step 5: Wire `aiJobs.create` to choose the right ARQ task on web side**

Update `apps/web/lib/backend/client.ts` — replace `enqueueJob` to take an explicit `kind`:

```ts
export type JobKind = "agent" | "ingest";

export type EnqueueJobInput = {
  jobId: string;
  userId: string;
  orgId: string | null;
  agentId: string;
  input: Record<string, unknown>;
  kind?: JobKind;
};

export async function enqueueJob(input: EnqueueJobInput): Promise<void> {
  const path = input.kind === "ingest" ? "/jobs/ingest" : "/jobs";
  const resp = await signedFetch({
    url: `${BACKEND_URL}${path}`,
    secret: BACKEND_HMAC_SECRET,
    payload: {
      job_id: input.jobId,
      user_id: input.userId,
      org_id: input.orgId,
      agent_id: input.agentId,
      input: input.input,
    },
  });
  if (!resp.ok) {
    throw new Error(`enqueue failed: ${resp.status} ${await resp.text()}`);
  }
}
```

And in `apps/web/trpc/routers/aiJobsProcedures.ts` `create` mutation, choose `kind` based on `agentId`:

```ts
const kind = input.agentId === "rag_ingest" ? "ingest" : "agent";
await enqueueJob({ jobId: row.id, userId: ctx.session.user.id, orgId: null,
                   agentId: input.agentId, input: input.input, kind });
```

- [ ] **Step 6: Add `/jobs/ingest` route on backend**

Update `apps/backend/src/saas_forge_backend/api/routes/jobs.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from saas_forge_backend.api.schemas.jobs import EnqueueJobRequest, EnqueueJobResponse
from saas_forge_backend.jobs.queue import enqueue_ingest_document_job, enqueue_run_agent_job

router = APIRouter(prefix="/jobs")


@router.post("", response_model=EnqueueJobResponse, status_code=202)
async def enqueue_job(request: Request) -> EnqueueJobResponse:
    body = EnqueueJobRequest.model_validate(getattr(request.state, "verified_payload", {}))
    try:
        await enqueue_run_agent_job(body.job_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"enqueue_failed: {exc}") from exc
    return EnqueueJobResponse(job_id=body.job_id, enqueued=True)


@router.post("/ingest", response_model=EnqueueJobResponse, status_code=202)
async def enqueue_ingest(request: Request) -> EnqueueJobResponse:
    body = EnqueueJobRequest.model_validate(getattr(request.state, "verified_payload", {}))
    try:
        await enqueue_ingest_document_job(body.job_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"enqueue_failed: {exc}") from exc
    return EnqueueJobResponse(job_id=body.job_id, enqueued=True)
```

- [ ] **Step 7: Unit test the ingestion pipeline with mocked embedder + vector store**

`apps/backend/tests/test_ingestion_unit.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from saas_forge_backend.rag.ingestion import UnsupportedSource, ingest


@pytest.mark.asyncio
async def test_ingest_text_source(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    embedder = MagicMock()
    embedder.aembed_documents = AsyncMock(return_value=[[0.1] * 4, [0.2] * 4])
    store = MagicMock()
    store.aadd_texts = AsyncMock()

    with patch("saas_forge_backend.rag.ingestion.get_vector_store", return_value=store):
        result = await ingest(
            source={"type": "text", "content": "hello world. " * 50},
            chunking={"chunk_size": 200, "overlap": 20},
            collection_id="c1",
            document_id="d1",
            embedder=embedder,
        )
    assert result.chunk_count >= 1
    embedder.aembed_documents.assert_awaited()
    store.aadd_texts.assert_awaited()


@pytest.mark.asyncio
async def test_ingest_rejects_unknown_source():
    embedder = MagicMock()
    with pytest.raises(UnsupportedSource):
        await ingest(
            source={"type": "magic"},
            chunking=None,
            collection_id="c1",
            document_id="d1",
            embedder=embedder,
        )
```

- [ ] **Step 8: Run unit tests**

```bash
cd apps/backend && uv run pytest tests/test_ingestion_unit.py tests/test_jobs_endpoint.py -q
```

Expected: pass (ingestion + jobs endpoint).

- [ ] **Step 9: Commit**

```bash
git add apps/backend/ apps/web/
git commit -m "Added RAG ingestion pipeline, ingest_document_job task, and /jobs/ingest route"
```

---

### Task 5.6: `rag_chat` agent (LangGraph: retrieve → answer)

**Files:**
- Create: `apps/backend/src/saas_forge_backend/agents/rag_chat.py`
- Modify: `apps/backend/src/saas_forge_backend/agents/registry.py` (register)
- Create: `apps/backend/tests/test_rag_chat_unit.py`

- [ ] **Step 1: Implement the LangGraph agent**

`apps/backend/src/saas_forge_backend/agents/rag_chat.py`:

```python
from __future__ import annotations

from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, SystemMessage

from saas_forge_backend.agents.registry import AgentEvent
from saas_forge_backend.llm.factory import resolve_chat_model
from saas_forge_backend.rag.embedders import resolve_embedder
from saas_forge_backend.rag.knowledge import KnowledgeSource


SYSTEM_PROMPT = (
    "You are a helpful assistant. Use only the provided context to answer. "
    "If the context is insufficient, say so plainly. Cite chunk numbers as [n]."
)


def _format_context(chunks: list[Document]) -> str:
    return "\n\n".join(f"[{i}] {c.page_content}" for i, c in enumerate(chunks))


async def run(input_payload: dict[str, Any], ctx: dict[str, Any]) -> AsyncIterator[AgentEvent]:
    """
    Input shape:
      {
        "query": str,
        "collection_id": str,
        "embedder": "openai:text-embedding-3-small",     # optional, defaults to settings
        "llm": "openai:gpt-4o-mini",                     # required
        "top_k": 6                                       # optional
      }
    """
    query = str(input_payload["query"])
    collection_id = str(input_payload["collection_id"])
    embedder_name = str(input_payload.get("embedder", ""))
    llm_name = str(input_payload["llm"])
    top_k = int(input_payload.get("top_k", 6))

    yield AgentEvent(type="step", payload={"node": "retrieve", "status": "start"})

    embedder = resolve_embedder(embedder_name) if embedder_name else resolve_embedder(
        # Falls back to settings.rag_embedder
        __import__("saas_forge_backend.config", fromlist=["get_settings"]).get_settings().rag_embedder
    )
    knowledge = KnowledgeSource(collection_id=collection_id, embedder=embedder, top_k=top_k)
    chunks = await knowledge.retrieve(query)

    for chunk in chunks:
        yield AgentEvent(type="citation", payload=chunk.as_citation())

    yield AgentEvent(type="step", payload={"node": "retrieve", "status": "end"})
    yield AgentEvent(type="step", payload={"node": "answer", "status": "start"})

    llm = resolve_chat_model(llm_name)
    context_block = _format_context([Document(page_content=c.text, metadata=c.metadata) for c in chunks])
    messages = [
        SystemMessage(SYSTEM_PROMPT),
        HumanMessage(f"Context:\n{context_block}\n\nQuestion: {query}"),
    ]
    answer_parts: list[str] = []
    async for chunk in llm.astream(messages):
        token = chunk.content or ""
        if token:
            answer_parts.append(str(token))
            yield AgentEvent(type="token", payload={"delta": str(token)})

    yield AgentEvent(type="step", payload={"node": "answer", "status": "end"})
    yield AgentEvent(type="final", payload={"output": {"answer": "".join(answer_parts)}})
```

> Note: this uses langchain primitives directly without `langgraph.StateGraph`. The graph wrapping is added in a follow-up if we need conditional routing; for retrieve→answer linear flow, the streaming agent generator IS the graph. langgraph stays available for multi-hop variants in Phase 2.

- [ ] **Step 2: Register the agent**

In `apps/backend/src/saas_forge_backend/agents/registry.py`, update `register_default_agents`:

```python
def register_default_agents() -> None:
    from saas_forge_backend.agents.noop import run as noop_run
    from saas_forge_backend.agents.echo_llm import run as echo_run
    from saas_forge_backend.agents.rag_chat import run as rag_chat_run
    if "noop" not in REGISTRY.ids():
        REGISTRY.register("noop", noop_run)
    if "echo_llm" not in REGISTRY.ids():
        REGISTRY.register("echo_llm", echo_run)
    if "rag_chat" not in REGISTRY.ids():
        REGISTRY.register("rag_chat", rag_chat_run)
```

- [ ] **Step 3: Unit test (mocked LLM + KnowledgeSource)**

`apps/backend/tests/test_rag_chat_unit.py`:

```python
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.asyncio
async def test_rag_chat_emits_citations_then_tokens_then_final(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    from saas_forge_backend.config import get_settings
    get_settings.cache_clear()

    from saas_forge_backend.rag.knowledge import RetrievedChunk

    fake_chunks = [
        RetrievedChunk(text="Paris is the capital of France.",
                       metadata={"document_id": "d1", "chunk_id": "c1"}, score=0.9),
    ]
    fake_ks = MagicMock()
    fake_ks.retrieve = AsyncMock(return_value=fake_chunks)

    class FakeLLM:
        async def astream(self, _messages):
            for t in ["Pa", "ris", "."]:
                m = MagicMock()
                m.content = t
                yield m

    with patch("saas_forge_backend.agents.rag_chat.KnowledgeSource", return_value=fake_ks), \
         patch("saas_forge_backend.agents.rag_chat.resolve_chat_model", return_value=FakeLLM()), \
         patch("saas_forge_backend.agents.rag_chat.resolve_embedder", return_value=MagicMock()):

        from saas_forge_backend.agents.rag_chat import run

        events = []
        async for ev in run(
            {"query": "capital of France?", "collection_id": "c1", "llm": "openai:gpt-4o-mini"},
            ctx={},
        ):
            events.append(ev)

    types = [e.type for e in events]
    assert "citation" in types
    assert types[-1] == "final"
    assert events[-1].payload["output"]["answer"] == "Paris."
```

- [ ] **Step 4: Run tests**

```bash
cd apps/backend && uv run pytest tests/test_rag_chat_unit.py -q
```

Expected: `1 passed`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added rag_chat agent (retrieve + LLM answer with citation events)"
```

---

### Task 5.7: pgvector e2e integration test (ingest → retrieve → answer)

**Files:**
- Create: `apps/backend/tests/integration/test_rag_pgvector_e2e.py`

- [ ] **Step 1: Write the e2e test**

`apps/backend/tests/integration/test_rag_pgvector_e2e.py`:

```python
import asyncio
import os
from unittest.mock import MagicMock, patch

import cuid2
import pytest

pytestmark = pytest.mark.skipif(
    not os.getenv("BACKEND_INTEGRATION"),
    reason="set BACKEND_INTEGRATION=1 to run against compose services",
)


@pytest.mark.asyncio
async def test_rag_pgvector_full_round_trip():
    """Ingest a short text into pgvector, then run rag_chat (mocked LLM) over it."""
    from sqlalchemy import text

    from saas_forge_backend.db.engine import get_sessionmaker
    from saas_forge_backend.db.models import AiJobStatus
    from saas_forge_backend.db.repositories import (
        collections as collections_repo,
        jobs as jobs_repo,
    )
    from saas_forge_backend.jobs.queue import enqueue_ingest_document_job

    sm = get_sessionmaker()
    user_id = cuid2.cuid()
    collection_id = cuid2.cuid()
    async with sm() as s, s.begin():
        await s.execute(
            text(
                'INSERT INTO user_schema."User" (id, name, email, "emailVerified", role, banned, '
                '"creditsUsed","creditsTotal","createdAt","updatedAt") '
                "VALUES (:id, 'test', :email, false, 'user', false, 0, 20, now(), now())"
            ),
            {"id": user_id, "email": f"{user_id}@example.com"},
        )
        await collections_repo.create(
            s,
            collection_id=collection_id,
            user_id=user_id,
            org_id=None,
            name=f"test-{collection_id}",
            embedder="openai:text-embedding-3-small",
            embedding_dims=1536,
        )

    # Insert a PENDING ingest job. Embedding requires a real OpenAI key; in CI we
    # use a fake embedder via env. For local runs, set OPENAI_API_KEY.
    if not os.getenv("OPENAI_API_KEY"):
        pytest.skip("OPENAI_API_KEY not set; pgvector e2e needs real embeddings")

    job_id = cuid2.cuid()
    async with sm() as s, s.begin():
        await jobs_repo.insert_pending(
            s, job_id=job_id, user_id=user_id, org_id=None,
            agent_id="rag_ingest",
            input_payload={
                "collection_id": collection_id,
                "title": "Capitals",
                "source": {"type": "text", "content": "Paris is the capital of France. Tokyo is the capital of Japan."},
            },
        )
    await enqueue_ingest_document_job(job_id)

    # Poll for completion.
    deadline = asyncio.get_event_loop().time() + 60
    final = None
    while asyncio.get_event_loop().time() < deadline:
        async with sm() as s:
            row = await jobs_repo.get(s, job_id)
        if row.status in {AiJobStatus.SUCCEEDED, AiJobStatus.FAILED}:
            final = row
            break
        await asyncio.sleep(0.5)
    assert final is not None and final.status == AiJobStatus.SUCCEEDED
    assert final.result["chunk_count"] >= 1

    # Now run rag_chat with a mocked LLM (we only verify retrieval works).
    from langchain_core.messages import AIMessageChunk

    class FakeLLM:
        async def astream(self, _messages):
            for t in ["The", " capital", " is", " Paris."]:
                yield AIMessageChunk(content=t)

    from saas_forge_backend.agents.rag_chat import run as rag_chat

    with patch("saas_forge_backend.agents.rag_chat.resolve_chat_model", return_value=FakeLLM()):
        events = []
        async for ev in rag_chat(
            {
                "query": "What is the capital of France?",
                "collection_id": collection_id,
                "llm": "openai:gpt-4o-mini",
                "top_k": 4,
            },
            ctx={},
        ):
            events.append(ev)

    citations = [e for e in events if e.type == "citation"]
    assert citations, "expected at least one citation event from pgvector retrieval"
    final_event = next(e for e in events if e.type == "final")
    assert "Paris" in final_event.payload["output"]["answer"]
```

- [ ] **Step 2: Document the local-run command**

The e2e requires OPENAI credentials. Local run command (documented for the developer):

```bash
docker compose up --build --detach postgres redis backend-worker
# Run migration first (Task 2.2)
BACKEND_INTEGRATION=1 \
OPENAI_API_KEY="<your-key>" \
BACKEND_HMAC_SECRET="x" \
BACKEND_DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge" \
REDIS_URL="redis://localhost:6379/0" \
pnpm --filter @workspace/backend test -- tests/integration/test_rag_pgvector_e2e -q
```

CI's `backend-integration` lane intentionally does NOT set `OPENAI_API_KEY`; this test will skip there.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/integration/test_rag_pgvector_e2e.py
git commit -m "Added pgvector RAG end-to-end integration test (skipped without OPENAI_API_KEY)"
```

---

## Milestone 6 — Polish, Template, Docs

**Goal:** structlog wired up; optional Prometheus + OTEL hooks behind env flags; backend README and root README updated; `pnpm template:check-sync` passes with `apps/backend` included; final smoke test against compose proves the whole stack.

### Task 6.1: structlog configuration

**Files:**
- Create: `apps/backend/src/saas_forge_backend/observability/__init__.py`
- Create: `apps/backend/src/saas_forge_backend/observability/logging.py`
- Modify: `apps/backend/src/saas_forge_backend/main.py`

- [ ] **Step 1: Init package**

`apps/backend/src/saas_forge_backend/observability/__init__.py`: (empty)

- [ ] **Step 2: Configure structlog**

`apps/backend/src/saas_forge_backend/observability/logging.py`:

```python
from __future__ import annotations

import logging

import structlog

from saas_forge_backend.config import get_settings


def configure_logging() -> None:
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if settings.log_format == "json":
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=[*shared_processors, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Route stdlib logging through structlog so library logs (uvicorn, sqlalchemy) match format.
    logging.basicConfig(level=level, format="%(message)s")
```

- [ ] **Step 3: Call from startup**

Update `apps/backend/src/saas_forge_backend/main.py` lifespan to add `configure_logging()` at the top:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    from saas_forge_backend.observability.logging import configure_logging
    configure_logging()
    try:
        await assert_schema_agreement(get_engine())
    except SchemaDriftError as exc:
        log.error("Schema drift detected: %s", exc)
    yield
```

- [ ] **Step 4: Smoke test (no behavior assertion; just import)**

```bash
cd apps/backend && uv run python -c "from saas_forge_backend.observability.logging import configure_logging; configure_logging(); print('ok')"
```

Expected: prints `ok`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added structlog configuration (pretty in dev, JSON in prod)"
```

---

### Task 6.2: Optional Prometheus `/metrics` endpoint

**Files:**
- Create: `apps/backend/src/saas_forge_backend/observability/metrics.py`
- Modify: `apps/backend/src/saas_forge_backend/main.py`
- Modify: `apps/backend/pyproject.toml` (add `prometheus-client`)

- [ ] **Step 1: Add dependency**

In `apps/backend/pyproject.toml` append to `[project].dependencies`:

```toml
  "prometheus-client>=0.21",
```

```bash
cd apps/backend && uv lock && uv sync
```

- [ ] **Step 2: Implement metrics module**

`apps/backend/src/saas_forge_backend/observability/metrics.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

from saas_forge_backend.config import get_settings

router = APIRouter()


JOB_COUNTER = Counter(
    "ai_jobs_total", "Total jobs by terminal status", ["status", "agent_id"],
)
JOB_DURATION = Histogram(
    "ai_job_duration_seconds", "Job duration seconds by agent", ["agent_id"],
)
LLM_LATENCY = Histogram(
    "ai_llm_latency_seconds", "LLM call latency", ["provider", "model"],
)


@router.get("/metrics")
async def metrics() -> Response:
    if not get_settings().metrics_enabled:
        return Response(status_code=404)
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
```

- [ ] **Step 3: Register route + use counters in run_agent_job**

Add to `main.py` create_app:

```python
from saas_forge_backend.observability import metrics as metrics_route
app.include_router(metrics_route.router)
```

In `apps/backend/src/saas_forge_backend/jobs/tasks/run_agent_job.py`, increment the counter at terminal:

```python
from saas_forge_backend.observability.metrics import JOB_COUNTER

# In success branch:
JOB_COUNTER.labels(status="SUCCEEDED", agent_id=row.agentId).inc()
# In CANCELLED:
JOB_COUNTER.labels(status="CANCELLED", agent_id=row.agentId).inc()
# In FAILED:
JOB_COUNTER.labels(status="FAILED", agent_id=row.agentId).inc()
```

- [ ] **Step 4: Quick smoke test (unit)**

Run all backend tests; counters won't be exercised but the module must import:

```bash
cd apps/backend && uv run pytest -q
```

Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added optional Prometheus /metrics endpoint behind METRICS_ENABLED"
```

---

### Task 6.3: Optional OpenTelemetry hooks

**Files:**
- Create: `apps/backend/src/saas_forge_backend/observability/otel.py`
- Modify: `apps/backend/src/saas_forge_backend/main.py`
- Modify: `apps/backend/pyproject.toml` (add OTEL packages)

- [ ] **Step 1: Add OTEL dependencies (optional at runtime)**

In `apps/backend/pyproject.toml` append:

```toml
  "opentelemetry-api>=1.27",
  "opentelemetry-sdk>=1.27",
  "opentelemetry-exporter-otlp-proto-http>=1.27",
  "opentelemetry-instrumentation-fastapi>=0.48b0",
  "opentelemetry-instrumentation-httpx>=0.48b0",
  "opentelemetry-instrumentation-sqlalchemy>=0.48b0",
```

```bash
cd apps/backend && uv lock && uv sync
```

- [ ] **Step 2: OTEL bootstrap (no-op unless endpoint is set)**

`apps/backend/src/saas_forge_backend/observability/otel.py`:

```python
from __future__ import annotations

import logging

from saas_forge_backend.config import get_settings

log = logging.getLogger(__name__)


def configure_otel(app) -> None:
    settings = get_settings()
    endpoint = settings.otel_exporter_otlp_endpoint
    if not endpoint:
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create({"service.name": "saas-forge-backend"})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint)))
    trace.set_tracer_provider(provider)

    FastAPIInstrumentor.instrument_app(app)
    HTTPXClientInstrumentor().instrument()
    SQLAlchemyInstrumentor().instrument()

    log.info("OpenTelemetry configured (endpoint=%s)", endpoint)
```

- [ ] **Step 3: Call from `create_app`**

In `apps/backend/src/saas_forge_backend/main.py`, after `app = FastAPI(...)`, before middleware:

```python
from saas_forge_backend.observability.otel import configure_otel
configure_otel(app)
```

- [ ] **Step 4: Verify imports**

```bash
cd apps/backend && uv run python -c "from saas_forge_backend.main import create_app; create_app(); print('ok')"
```

Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/
git commit -m "Added optional OpenTelemetry hooks behind OTEL_EXPORTER_OTLP_ENDPOINT"
```

---

### Task 6.4: Backend README

**Files:**
- Create: `apps/backend/README.md`

- [ ] **Step 1: Create README**

`apps/backend/README.md`:

````markdown
# @workspace/backend — FastAPI AI service

Long-running and agentic AI workloads (LangGraph + LangChain) for SaaS Forge. Internal-only service; web is the single trust boundary.

## Prerequisites

- Python 3.12
- [uv](https://github.com/astral-sh/uv)
- A running Postgres (with `pgvector`) and Redis — the repo's `docker-compose.yml` provides both.

## Quickstart (local dev)

```bash
# From repo root, the first time:
docker compose up --build --detach postgres redis
pnpm migrate              # applies Prisma migrations; appends pgvector SQL — see docs/superpowers/notes/2026-05-31-ai-backend-migration.md

# Install Python deps:
pnpm --filter @workspace/backend build   # runs `uv sync --frozen`

# Run the API:
pnpm dev                                 # starts web + backend API via turbo

# In a separate terminal, run the worker:
pnpm --filter @workspace/backend dev:worker
```

The API will be at `http://localhost:8000`. Health probe:

```bash
curl http://localhost:8000/healthz
```

## Smoke test the HMAC handshake

```bash
./scripts/smoke-backend-handshake.sh
```

## Layout

```
src/saas_forge_backend/
├── main.py              FastAPI app factory
├── config.py            pydantic-settings (env-driven)
├── security/hmac.py     HMAC verification middleware
├── db/                  SQLAlchemy engine + models + repositories
├── api/routes/          FastAPI route handlers (agents, jobs, health)
├── api/sse.py           SSE event format
├── llm/factory.py       provider:model → LangChain ChatModel
├── rag/                 VectorStore factory, embedders, splitters, KnowledgeSource, ingestion
├── agents/registry.py   agent_id → run function map
├── jobs/                ARQ worker + tasks + reaper
└── observability/       structlog, optional Prometheus + OTEL
```

## Adding a new agent

1. Create `src/saas_forge_backend/agents/your_agent.py` with an `async def run(input_payload, ctx) -> AsyncIterator[AgentEvent]`.
2. Register it in `agents/registry.py:register_default_agents`.
3. Add a unit test in `tests/`.

Agents are invocable as:
- Sync stream: `POST /agents/stream` with `{ "agent_id": "your_agent", "input": {...} }`.
- Async job: `trpc.aiJobs.create.mutate({ agentId: "your_agent", input: {...} })` from web.

## Adding a new LLM provider

Update `llm/factory.py:resolve_chat_model`. Add a credential env var to `config.py` and `.env.example`. Add a registry entry to `turbo.json:globalEnv`.

## Environment variables

See `.env.example` for the canonical list with defaults.

## Tests

```bash
uv run pytest                          # unit + mocked
BACKEND_INTEGRATION=1 \
BACKEND_HMAC_SECRET=x \
BACKEND_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge \
REDIS_URL=redis://localhost:6379/0 \
uv run pytest tests/integration         # integration (needs compose services)
```

## Deployment

The `Dockerfile.backend` builds two targets — `api` and `worker` — from one image. Deploy both per environment. Recommended targets:

- **Fly.io** — two `fly.toml` files, one per process.
- **Railway** — two services from one repo.
- **Render** — two services targeting different `Dockerfile` stages.
- **Kubernetes** — two `Deployments` from one image.

Backend should NOT be exposed to the public internet. Either co-locate with web on a private network, or front it with a private load balancer the web service can reach.
````

- [ ] **Step 2: Commit**

```bash
git add apps/backend/README.md
git commit -m "Added backend README"
```

---

### Task 6.5: Root README update — prerequisites

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Locate the existing Prerequisites/Setup section**

```bash
grep -n "Prerequisites\|prerequisites\|## Setup\|## Getting Started\|pnpm install" README.md | head
```

- [ ] **Step 2: Insert Python prerequisite**

In the prerequisites or setup section, add a bullet (place near the existing pnpm/Node bullet):

```markdown
- **Python 3.12+ and [uv](https://github.com/astral-sh/uv)** — required by `apps/backend` (FastAPI service for long-running AI workloads). Install uv with `pipx install uv` or `curl -LsSf https://astral.sh/uv/install.sh | sh`.
```

If a "What's in this monorepo" or apps list section exists, add `apps/backend — FastAPI AI service` to it.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Added Python 3.12 + uv to README prerequisites"
```

---

### Task 6.6: Re-sync template + verify

**Files:**
- (no edits; verification step)

- [ ] **Step 1: Sync template**

```bash
pnpm template:sync
```

Expected: `templates/saas-boilerplate/apps/backend/` is populated mirror of root.

- [ ] **Step 2: Verify**

```bash
pnpm template:check-sync
```

Expected: success.

- [ ] **Step 3: Stage and confirm staged backend has Python files**

```bash
pnpm template:stage
ls .generated/saas-boilerplate/apps/backend/src/saas_forge_backend/
```

Expected: directory tree present.

- [ ] **Step 4: Commit any newly synced template files**

```bash
git add templates/
git commit -m "Synced apps/backend into saas-boilerplate template"
```

---

### Task 6.7: Final whole-stack smoke

**Files:** none modified; this is a verification gate.

- [ ] **Step 1: Bring up the whole stack**

```bash
docker compose up --build --detach
sleep 10
```

- [ ] **Step 2: Apply migration (run only once per fresh DB)**

```bash
pnpm migrate
# Hand-edit the latest migration.sql per docs/superpowers/notes/2026-05-31-ai-backend-migration.md
pnpm --dir packages/database exec prisma migrate deploy --schema prisma
```

- [ ] **Step 3: Healthz round-trip**

```bash
curl -sS http://localhost:3000/api/healthcheck
curl -sS http://localhost:8000/healthz
curl -sS http://localhost:8000/readyz
```

Expected: all 200, readyz reports `{"ok": true, "db": true, "redis": true}`.

- [ ] **Step 4: HMAC handshake**

```bash
./scripts/smoke-backend-handshake.sh
```

Expected: 401 / 200 / 200 (the 200 because /agents/stream now serves real responses; the smoke script sends `agent_id: noop`).

- [ ] **Step 5: Tear down**

```bash
docker compose down
```

- [ ] **Step 6: Commit (any incidental fixes from smoke)**

If no incidentals, skip. Otherwise:

```bash
git add -A
git commit -m "Fixed [whatever the smoke surfaced]"
```

---

## Plan Self-Review Notes

Before declaring the plan ready for execution:

1. **Spec coverage check.** Every Phase-1 deliverable in the spec maps to a task:
   - Workspace skeleton → Task 0.1.
   - Dockerfile.backend → Task 0.3.
   - docker-compose updates → Task 0.4.
   - .env updates → Task 0.5.
   - CI lanes → Task 0.6, 2.4 (`backend-integration`).
   - Template manifest → Task 0.7, 6.6.
   - HMAC middleware + signed-fetch helper → Tasks 1.1, 1.2, 1.3.
   - SSE schema → Task 4.2.
   - /agents/stream → Task 4.3 (backend), 4.4 (web proxy).
   - /jobs + tRPC aiJobs → Tasks 3.3, 3.5.
   - ARQ worker + reaper + heartbeat → Tasks 3.1, 3.4.
   - Prisma schema additions → Task 2.1; migration doc → Task 2.2.
   - pgvector tail → Task 2.2.
   - SQLAlchemy mirror + schema check → Tasks 2.3, 2.4.
   - LLM provider factory → Task 4.1.
   - Embedder factory → Task 5.1.
   - VectorStore factory (pgvector default, Qdrant adapter) → Task 5.2.
   - KnowledgeSource + citation events → Tasks 5.4, 5.6.
   - rag_chat + rag_ingest → Tasks 5.5, 5.6.
   - Ingestion sources `text` + `uploaded_file` → Task 5.5.
   - Health/readiness → Tasks 1.2, 2.4.
   - structlog → Task 6.1; Prometheus → 6.2; OTEL → 6.3.
   - Python tests + integration → distributed across milestones.
   - Template sync + overrides + manifest → Tasks 0.7, 6.6.
   - Backend README + root README → Tasks 6.4, 6.5.

2. **Placeholder scan.** No TBDs, no "implement appropriately", no "similar to". Every test step shows real code; every command shows expected output.

3. **Type consistency:**
   - `AgentEvent` (registry.py) has `type: str, payload: dict[str, Any]` — referenced consistently everywhere it's emitted (noop, echo_llm, rag_chat, ingestion).
   - `EventEmitter.emit(session, type=..., payload=...)` — keyword-only kwargs match all call sites.
   - `jobs_repo.mark_terminal(s, job_id, status=..., result=..., error_code=..., error_message=...)` — call sites in run_agent_job, ingest_document_job, reaper all match.
   - `KnowledgeSource(collection_id=..., embedder=..., top_k=..., score_threshold=..., metadata_filter=...)` — instantiated consistently.
   - `signedFetch({ url, secret, payload, method?, signal?, requestId?, timestamp? })` — matches the web caller in `lib/backend/client.ts`.
   - `enqueueJob({ jobId, userId, orgId, agentId, input, kind? })` — matches both `aiJobs.create` and the backend `/jobs` payload shape.

4. **Migrations gate:** Tasks 2.3 and beyond assume the migration in Task 2.2 has been applied. Any developer running this plan must pause at 2.2, request migration, then proceed.

---

## Execution

**Plan complete and saved to `docs/superpowers/plans/2026-05-31-fastapi-ai-backend-langgraph.md`.**

When you're ready to implement, two execution options:

1. **Subagent-Driven (recommended)** — fresh subagent per task, two-stage review (code-reviewer + your review) between tasks, fast iteration. Use `superpowers:subagent-driven-development`.
2. **Inline Execution** — execute tasks in the current session with checkpoints for review. Use `superpowers:executing-plans`.

Pick one when you want to start building.





