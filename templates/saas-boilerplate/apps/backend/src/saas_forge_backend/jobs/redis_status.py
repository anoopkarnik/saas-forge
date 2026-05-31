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
