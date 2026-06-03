from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class StreamAgentRequest(BaseModel):
    user_id: str = Field(min_length=1)
    org_id: str | None = None
    agent_id: str = Field(min_length=1)
    input: dict[str, Any] = Field(default_factory=dict)
