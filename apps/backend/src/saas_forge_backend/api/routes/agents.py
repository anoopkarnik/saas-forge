from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from saas_forge_backend.agents.registry import REGISTRY, register_default_agents
from saas_forge_backend.api.schemas.agents import StreamAgentRequest
from saas_forge_backend.api.sse import sse_event
from saas_forge_backend.db.engine import get_sessionmaker
from saas_forge_backend.db.models import AiJobStatus
from saas_forge_backend.db.repositories import jobs as jobs_repo

log = logging.getLogger(__name__)
router = APIRouter()


async def is_job_cancelled(job_id: str) -> bool:
    async with get_sessionmaker()() as session:
        job = await jobs_repo.get(session, job_id)
    return job is None or job.status != AiJobStatus.RUNNING


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
                if body.job_id and await is_job_cancelled(body.job_id):
                    log.info("AI job cancelled; stopping stream")
                    break
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
