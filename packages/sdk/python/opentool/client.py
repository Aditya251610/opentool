from __future__ import annotations

from typing import Optional

import httpx

from opentool.http import HttpClient, AsyncHttpClient
from opentool.types import HealthStatus
from opentool.resources.auth import AuthResource, AsyncAuthResource
from opentool.resources.users import UsersResource, AsyncUsersResource
from opentool.resources.keys import KeysResource, AsyncKeysResource
from opentool.resources.tools import ToolsResource, AsyncToolsResource
from opentool.resources.analytics import AnalyticsResource, AsyncAnalyticsResource


class OpenTool:
    """
    Synchronous OpenTool SDK client.

    Example::

        from opentool import OpenTool

        client = OpenTool(
            base_url="http://localhost:3001",
            api_key="ot_your_key_here",
        )

        tools = client.tools.connected()
        result = client.tools.execute("github.create_issue", {
            "owner": "user",
            "repo": "my-repo",
            "title": "Created via SDK",
        })
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self._http = HttpClient(
            base_url=base_url,
            api_key=api_key,
            timeout=timeout,
            http_client=http_client,
        )
        self.auth = AuthResource(self._http)
        self.users = UsersResource(self._http)
        self.keys = KeysResource(self._http)
        self.tools = ToolsResource(self._http)
        self.analytics = AnalyticsResource(self._http)

    def set_api_key(self, key: str) -> None:
        """Set or replace the API key used for authenticated requests."""
        self._http.set_api_key(key)

    def clear_api_key(self) -> None:
        """Clear the current API key."""
        self._http.clear_api_key()

    def health(self) -> HealthStatus:
        """Check server health. No auth required."""
        data = self._http.get("/health")
        return HealthStatus.model_validate(data)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> "OpenTool":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


class AsyncOpenTool:
    """
    Async OpenTool SDK client.

    Example::

        from opentool import AsyncOpenTool

        async with AsyncOpenTool(
            base_url="http://localhost:3001",
            api_key="ot_your_key_here",
        ) as client:
            tools = await client.tools.connected()
            result = await client.tools.execute("github.create_issue", {
                "owner": "user",
                "repo": "my-repo",
                "title": "Created via SDK",
            })
    """

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self._http = AsyncHttpClient(
            base_url=base_url,
            api_key=api_key,
            timeout=timeout,
            http_client=http_client,
        )
        self.auth = AsyncAuthResource(self._http)
        self.users = AsyncUsersResource(self._http)
        self.keys = AsyncKeysResource(self._http)
        self.tools = AsyncToolsResource(self._http)
        self.analytics = AsyncAnalyticsResource(self._http)

    def set_api_key(self, key: str) -> None:
        """Set or replace the API key used for authenticated requests."""
        self._http.set_api_key(key)

    def clear_api_key(self) -> None:
        """Clear the current API key."""
        self._http.clear_api_key()

    async def health(self) -> HealthStatus:
        """Check server health. No auth required."""
        data = await self._http.get("/health")
        return HealthStatus.model_validate(data)

    async def close(self) -> None:
        """Close the underlying HTTP client."""
        await self._http.close()

    async def __aenter__(self) -> "AsyncOpenTool":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.close()
