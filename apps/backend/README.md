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
