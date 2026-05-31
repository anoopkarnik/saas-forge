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
    from saas_forge_backend.agents.echo_llm import run as echo_run
    if "noop" not in REGISTRY.ids():
        REGISTRY.register("noop", noop_run)
    if "echo_llm" not in REGISTRY.ids():
        REGISTRY.register("echo_llm", echo_run)
