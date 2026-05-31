import pytest

from saas_forge_backend.agents.noop import run


@pytest.mark.asyncio
async def test_noop_emits_three_events():
    events = []
    async for ev in run({"hello": "world"}, ctx={}):
        events.append(ev)
    assert [e.type for e in events] == ["step", "step", "final"]
    assert events[-1].payload == {"output": {"echo": {"hello": "world"}}}
