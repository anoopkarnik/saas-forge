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
