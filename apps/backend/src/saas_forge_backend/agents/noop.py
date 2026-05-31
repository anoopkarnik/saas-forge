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
