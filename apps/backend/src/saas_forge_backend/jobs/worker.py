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
