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
