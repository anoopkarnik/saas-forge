# @workspace/backend — FastAPI AI service

AI agent and RAG execution (LangGraph + LangChain) for SaaS Forge. Web Inngest manages asynchronous jobs; this service exposes signed execution APIs.

## Prerequisites

- Python 3.12
- [uv](https://github.com/astral-sh/uv)
- A running Postgres with `pgvector` — the repo's `docker-compose.yml` provides it.

## Quickstart (local dev)

```bash
# From repo root, the first time:
docker compose up --build --detach postgres
pnpm migrate              # applies Prisma migrations; appends pgvector SQL — see docs/superpowers/notes/2026-05-31-ai-backend-migration.md

# Install Python deps:
pnpm --filter @workspace/backend build   # runs `uv sync --frozen`

# Run the API:
pnpm dev                                 # starts web + backend API via turbo

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
├── api/routes/          FastAPI route handlers (agents, ingestion, health)
├── api/sse.py           SSE event format
├── llm/factory.py       provider:model → LangChain ChatModel
├── rag/                 VectorStore factory, embedders, splitters, KnowledgeSource, ingestion
├── agents/registry.py   agent_id → run function map
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

## Project Launchpad (root app)

The root app registers `launchpad_v1` for optional task help from saved project settings.
The Launchpad checklist itself is curated and available without AI or a queue.
New checklist-generation requests are rejected; the agent retains generation support for older queued work.
Set `NVIDIA_API_KEY`; `NVIDIA_LAUNCHPAD_MODEL` defaults to
`nvidia:nvidia/nemotron-3-ultra-550b-a55b`. Only server configuration chooses the model;
The shared NVIDIA factory uses `https://integrate.api.nvidia.com/v1`.
Set server-only `OPENROUTER_API_KEY` to enable fallback to
`google/gemini-3.1-flash-lite` at `https://openrouter.ai/api/v1` when NVIDIA times out,
fails, or cannot produce validated guidance. The fallback model is fixed on the server.
NVIDIA gets up to 90 seconds when fallback is configured; both providers share the
180-second attempt budget and a single repair. OpenRouter bills the configured account;
Launchpad does not charge user credits. Without its key, NVIDIA retains the full budget.
See [OpenRouter model pricing and structured-output support](https://openrouter.ai/google/gemini-3.1-flash-lite).

Requests contain a bounded source pack and optional task/question/history.
No project brief, credentials, or arbitrary project configuration is sent.
The agent validates JSON results against source IDs, commands, file paths, dependencies
and anchor coverage before emitting a final event. It emits safe status events only,
performs at most one structured-output repair, and stops after 180 seconds.
Launchpad registration and implementation are excluded from the released starter.

[NVIDIA JSON mode documentation](https://docs.nvidia.com/nim/large-language-models/2.0.6/day-0/get-started-nemotron-3-ultra.html)
describes the structured response format used by this agent.

## Environment variables

See `.env.example` for the canonical list with defaults.

## Tests

```bash
uv run pytest                          # unit + mocked
BACKEND_INTEGRATION=1 \
BACKEND_HMAC_SECRET=x \
BACKEND_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/saas_forge \
uv run pytest tests/integration         # integration (needs compose services)
```

## Deployment

The `Dockerfile.backend` builds the `api` target. Deploy the web Inngest functions before changing job dispatch. Generate the Prisma migration for the new `AiJobRun` fields with `pnpm migrate`, deploy the schema, then deploy the web and backend services. Drain the old ARQ worker before removing it.

Backend should NOT be exposed to the public internet. Either co-locate with web on a private network, or front it with a private load balancer the web service can reach.
