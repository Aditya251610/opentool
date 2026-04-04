from __future__ import annotations

from typing import List

from opentool.http import HttpClient, AsyncHttpClient
from opentool.types import ApiKey, ApiKeyCreated


class KeysResource:
    """Sync API key management."""

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(self) -> List[ApiKey]:
        """List all active (non-revoked) API keys."""
        data = self._http.get("/api/keys/")
        return [ApiKey.model_validate(k) for k in data["keys"]]

    def create(self, name: str) -> ApiKeyCreated:
        """Create a new API key. The raw key is only returned once — store it."""
        data = self._http.post("/api/keys/", {"name": name})
        return ApiKeyCreated.model_validate(data)

    def revoke(self, key_id: str) -> None:
        """Revoke an API key by ID. Irreversible."""
        self._http.delete(f"/api/keys/{key_id}")


class AsyncKeysResource:
    """Async API key management."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def list(self) -> List[ApiKey]:
        """List all active (non-revoked) API keys."""
        data = await self._http.get("/api/keys/")
        return [ApiKey.model_validate(k) for k in data["keys"]]

    async def create(self, name: str) -> ApiKeyCreated:
        """Create a new API key. The raw key is only returned once — store it."""
        data = await self._http.post("/api/keys/", {"name": name})
        return ApiKeyCreated.model_validate(data)

    async def revoke(self, key_id: str) -> None:
        """Revoke an API key by ID. Irreversible."""
        await self._http.delete(f"/api/keys/{key_id}")
