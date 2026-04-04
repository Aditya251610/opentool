from __future__ import annotations

from typing import Any, Dict, List

from opentool.http import HttpClient, AsyncHttpClient
from opentool.types import Tool, ToolExecutionResult


class ToolsResource:
    """Sync tool listing, provider browsing, and execution."""

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(self) -> List[Tool]:
        """List all tools in the registry (no auth required)."""
        data = self._http.get("/api/tools/")
        return [Tool.model_validate(t) for t in data["tools"]]

    def connected(self) -> List[Tool]:
        """List tools the authenticated user has connected."""
        data = self._http.get("/api/tools/connected")
        return [Tool.model_validate(t) for t in data["tools"]]

    def by_provider(self, provider: str) -> List[Tool]:
        """List tools for a specific provider."""
        data = self._http.get(f"/api/tools/{provider}")
        return [Tool.model_validate(t) for t in data["tools"]]

    def execute(
        self, tool_id: str, args: Dict[str, Any] | None = None
    ) -> ToolExecutionResult:
        """
        Execute a tool via the MCP JSON-RPC endpoint.

        Example::

            result = client.tools.execute("github.create_issue", {
                "owner": "user",
                "repo": "my-repo",
                "title": "Bug report",
            })
        """
        rpc_response = self._http.post(
            "/mcp",
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {"name": tool_id, "arguments": args or {}},
            },
        )
        if "error" in rpc_response:
            raise RuntimeError(
                f"Tool execution failed: {rpc_response['error']['message']}"
            )
        return ToolExecutionResult.model_validate(rpc_response["result"])


class AsyncToolsResource:
    """Async tool listing, provider browsing, and execution."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(self) -> List[Tool]:
        """List all tools in the registry (no auth required)."""
        data = await self._http.get("/api/tools/")
        return [Tool.model_validate(t) for t in data["tools"]]

    async def connected(self) -> List[Tool]:
        """List tools the authenticated user has connected."""
        data = await self._http.get("/api/tools/connected")
        return [Tool.model_validate(t) for t in data["tools"]]

    async def by_provider(self, provider: str) -> List[Tool]:
        """List tools for a specific provider."""
        data = await self._http.get(f"/api/tools/{provider}")
        return [Tool.model_validate(t) for t in data["tools"]]

    async def execute(
        self, tool_id: str, args: Dict[str, Any] | None = None
    ) -> ToolExecutionResult:
        """
        Execute a tool via the MCP JSON-RPC endpoint.

        Example::

            result = await client.tools.execute("github.create_issue", {
                "owner": "user",
                "repo": "my-repo",
                "title": "Bug report",
            })
        """
        rpc_response = await self._http.post(
            "/mcp",
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {"name": tool_id, "arguments": args or {}},
            },
        )
        if "error" in rpc_response:
            raise RuntimeError(
                f"Tool execution failed: {rpc_response['error']['message']}"
            )
        return ToolExecutionResult.model_validate(rpc_response["result"])
