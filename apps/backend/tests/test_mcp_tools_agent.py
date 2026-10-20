from unittest.mock import patch

import pytest
from langchain_core.messages import AIMessage
from langchain_core.tools import tool

from saas_forge_backend.llm.mcp import McpServerConfig, load_mcp_tools, parse_mcp_servers


@pytest.fixture(autouse=True)
def _settings(monkeypatch):
    monkeypatch.setenv("BACKEND_HMAC_SECRET", "x" * 32)
    monkeypatch.setenv("AI_MCP_SERVERS", '[{"name": "docs", "url": "https://mcp.example.com/mcp"}]')
    from saas_forge_backend.config import get_settings

    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def test_parse_mcp_servers_accepts_the_shared_json_shape():
    servers = parse_mcp_servers(
        '[{"name": "docs", "url": "https://mcp.example.com/mcp",'
        ' "headers": {"Authorization": "Bearer t"}}]'
    )
    assert servers[0].name == "docs"
    assert servers[0].headers == {"Authorization": "Bearer t"}
    assert parse_mcp_servers(None) == []
    assert parse_mcp_servers("  ") == []


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        '[{"name": "Docs!", "url": "https://mcp.example.com"}]',
        '[{"name": "docs", "url": "ftp://mcp.example.com"}]',
        '[{"name": "a", "url": "https://a.example.com"}, {"name": "a", "url": "https://b.example.com"}]',
    ],
)
def test_parse_mcp_servers_rejects_bad_config(raw):
    with pytest.raises(ValueError):
        parse_mcp_servers(raw)


@pytest.mark.asyncio
async def test_load_mcp_tools_skips_an_unreachable_server():
    @tool
    def docs_search(q: str) -> str:
        """Search docs."""
        return q

    class FakeClient:
        def __init__(self, connections, tool_name_prefix):
            assert tool_name_prefix is True
            assert connections["docs"]["transport"] == "streamable_http"

        async def get_tools(self, *, server_name):
            if server_name == "down":
                raise ConnectionError("refused")
            return [docs_search]

    servers = [
        McpServerConfig(name="docs", url="https://docs.example.com/mcp"),
        McpServerConfig(name="down", url="https://down.example.com/mcp"),
    ]
    with patch("saas_forge_backend.llm.mcp.MultiServerMCPClient", FakeClient):
        tools = await load_mcp_tools(servers)
    assert [t.name for t in tools] == ["docs_search"]


@pytest.mark.asyncio
async def test_agent_calls_a_tool_then_answers():
    @tool
    def docs_search(q: str) -> str:
        """Search docs."""
        return f"result for {q}"

    class FakeLLM:
        def __init__(self):
            self.replies = [
                AIMessage(
                    content="",
                    tool_calls=[{"name": "docs_search", "args": {"q": "mcp"}, "id": "c1"}],
                ),
                AIMessage(content="MCP is a protocol."),
            ]
            self.seen = []

        def bind_tools(self, tools):
            assert [t.name for t in tools] == ["docs_search"]
            return self

        async def ainvoke(self, messages):
            self.seen.append(list(messages))
            return self.replies.pop(0)

    llm = FakeLLM()
    with (
        patch("saas_forge_backend.agents.mcp_tools.load_mcp_tools", return_value=[docs_search]),
        patch("saas_forge_backend.agents.mcp_tools.resolve_chat_model", return_value=llm),
    ):
        from saas_forge_backend.agents.mcp_tools import run

        events = [
            ev async for ev in run({"query": "what is mcp?", "llm": "openai:gpt-4o-mini"}, ctx={})
        ]

    by_type = [ev.type for ev in events]
    assert by_type.index("tool_call") < by_type.index("tool_result") < by_type.index("final")
    result = next(ev for ev in events if ev.type == "tool_result")
    assert result.payload == {
        "id": "c1",
        "name": "docs_search",
        "ok": True,
        "output": "result for mcp",
    }
    assert events[-1].payload == {"output": {"answer": "MCP is a protocol."}}
    # The second model call saw the tool's output.
    assert llm.seen[1][-1].content == "result for mcp"


@pytest.mark.asyncio
async def test_agent_refuses_to_run_without_tools():
    with patch("saas_forge_backend.agents.mcp_tools.load_mcp_tools", return_value=[]):
        from saas_forge_backend.agents.mcp_tools import run

        with pytest.raises(ValueError, match="AI_MCP_SERVERS"):
            async for _ in run({"query": "hi", "llm": "openai:gpt-4o-mini"}, ctx={}):
                pass


def test_agent_is_registered():
    from saas_forge_backend.agents.registry import REGISTRY, register_default_agents

    register_default_agents()
    assert "mcp_tools" in REGISTRY.ids()
