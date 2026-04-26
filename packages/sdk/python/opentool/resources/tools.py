from __future__ import annotations

from typing import Any, Dict, List, Optional, Union

from opentool.http import HttpClient, AsyncHttpClient
from opentool.types import (
    Tool,
    ToolExecutionResult,
    ToolSearchResult,
    ToolSearchSummary,
    ToolDetails,
)


class ToolsResource:
    """Sync tool listing, provider browsing, search, and execution."""

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

    def search(
        self,
        *,
        query: Optional[str] = None,
        provider: Optional[str] = None,
        category: Optional[str] = None,
        auth_type: Optional[str] = None,
        read_only: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Union[ToolSearchResult, ToolSearchSummary]:
        """
        Search and filter tools by keyword, provider, category, or capability.
        Returns a paginated list of matching tools.
        If no options are provided, returns a provider summary.
        """
        params: Dict[str, str] = {}
        if query:
            params["q"] = query
        if provider:
            params["provider"] = provider
        if category:
            params["category"] = category
        if auth_type:
            params["auth_type"] = auth_type
        if read_only is not None:
            params["read_only"] = str(read_only).lower()
        if limit is not None:
            params["limit"] = str(limit)
        if offset is not None:
            params["offset"] = str(offset)

        qs = "&".join(f"{k}={v}" for k, v in params.items())
        path = f"/api/tools/search?{qs}" if qs else "/api/tools/search"
        data = self._http.get(path)

        if "providers" in data:
            return ToolSearchSummary.model_validate(data)
        return ToolSearchResult.model_validate(data)

    def details(self, tool_id: str) -> ToolDetails:
        """
        Get full schema and metadata for a specific tool.
        Fetches the tool list and finds the matching tool.
        """
        data = self._http.get("/api/tools/")
        for t in data["tools"]:
            if t["id"] == tool_id:
                return ToolDetails.model_validate(t)
        raise ValueError(f'Tool "{tool_id}" not found')

    def execute(
        self, tool_id: str, args: Dict[str, Any] | None = None
    ) -> ToolExecutionResult:
        """
        Execute a tool via the MCP JSON-RPC endpoint.

        Example::

            result = client.tools.execute("github_create_issue", {
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
    """Async tool listing, provider browsing, search, and execution."""

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

    async def search(
        self,
        *,
        query: Optional[str] = None,
        provider: Optional[str] = None,
        category: Optional[str] = None,
        auth_type: Optional[str] = None,
        read_only: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
    ) -> Union[ToolSearchResult, ToolSearchSummary]:
        """Search and filter tools."""
        params: Dict[str, str] = {}
        if query:
            params["q"] = query
        if provider:
            params["provider"] = provider
        if category:
            params["category"] = category
        if auth_type:
            params["auth_type"] = auth_type
        if read_only is not None:
            params["read_only"] = str(read_only).lower()
        if limit is not None:
            params["limit"] = str(limit)
        if offset is not None:
            params["offset"] = str(offset)

        qs = "&".join(f"{k}={v}" for k, v in params.items())
        path = f"/api/tools/search?{qs}" if qs else "/api/tools/search"
        data = await self._http.get(path)

        if "providers" in data:
            return ToolSearchSummary.model_validate(data)
        return ToolSearchResult.model_validate(data)

    async def details(self, tool_id: str) -> ToolDetails:
        """Get full schema and metadata for a specific tool."""
        data = await self._http.get("/api/tools/")
        for t in data["tools"]:
            if t["id"] == tool_id:
                return ToolDetails.model_validate(t)
        raise ValueError(f'Tool "{tool_id}" not found')

    async def execute(
        self, tool_id: str, args: Dict[str, Any] | None = None
    ) -> ToolExecutionResult:
        """Execute a tool via the MCP JSON-RPC endpoint."""
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
