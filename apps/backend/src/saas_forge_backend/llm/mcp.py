from __future__ import annotations

import structlog
from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient
from pydantic import BaseModel, Field, HttpUrl, TypeAdapter

log = structlog.get_logger(__name__)


class McpServerConfig(BaseModel):
    """One remote MCP server, configured by the deployer in AI_MCP_SERVERS."""

    name: str = Field(pattern=r"^[a-z0-9_]{1,32}$")
    url: HttpUrl
    headers: dict[str, str] = Field(default_factory=dict)


_SERVERS = TypeAdapter(list[McpServerConfig])


def parse_mcp_servers(raw: str | None) -> list[McpServerConfig]:
    """Parses AI_MCP_SERVERS; raises ValueError on malformed JSON or entries."""
    if not raw or not raw.strip():
        return []
    servers = _SERVERS.validate_json(raw)
    names = [server.name for server in servers]
    if len(set(names)) != len(names):
        raise ValueError("AI_MCP_SERVERS has duplicate server names")
    return servers


async def load_mcp_tools(servers: list[McpServerConfig]) -> list[BaseTool]:
    """Tools from every reachable server, named `<server>_<tool>`; others are skipped."""
    if not servers:
        return []
    client = MultiServerMCPClient(
        {
            server.name: {
                "transport": "streamable_http",
                "url": str(server.url),
                "headers": server.headers or None,
                "timeout": 10,
            }
            for server in servers
        },
        tool_name_prefix=True,
    )
    tools: list[BaseTool] = []
    for server in servers:
        try:
            tools.extend(await client.get_tools(server_name=server.name))
        except Exception as exc:  # one broken server must not stop the others
            log.warning("mcp.server_unavailable", server=server.name, error=str(exc))
    return tools
