from __future__ import annotations

from typing import Optional

from opentool.http import HttpClient, AsyncHttpClient
from opentool.types import AuthResponse


class AuthResource:
    """Sync auth operations: signup, login, connect/disconnect providers."""

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def signup(
        self, email: str, password: str, name: Optional[str] = None
    ) -> AuthResponse:
        """Create a new account. Returns user + raw API key. Auto-sets the key on this client."""
        payload = {"email": email, "password": password}
        if name is not None:
            payload["name"] = name
        data = self._http.post("/api/auth/signup", payload)
        res = AuthResponse.model_validate(data)
        self._http.set_api_key(res.api_key)
        return res

    def login(self, email: str, password: str) -> AuthResponse:
        """Log in with email + password. Returns user + raw API key. Auto-sets the key."""
        data = self._http.post("/api/auth/login", {"email": email, "password": password})
        res = AuthResponse.model_validate(data)
        self._http.set_api_key(res.api_key)
        return res

    def get_connect_url(self, provider: str) -> str:
        """Get the OAuth URL for a provider. User visits this URL to authorize."""
        data = self._http.get(f"/api/auth/connect-url/{provider}")
        return str(data["url"])

    def disconnect(self, provider: str) -> None:
        """Disconnect (revoke) a provider."""
        self._http.delete(f"/api/auth/revoke/{provider}")


class AsyncAuthResource:
    """Async auth operations: signup, login, connect/disconnect providers."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def signup(
        self, email: str, password: str, name: Optional[str] = None
    ) -> AuthResponse:
        """Create a new account. Returns user + raw API key. Auto-sets the key on this client."""
        payload = {"email": email, "password": password}
        if name is not None:
            payload["name"] = name
        data = await self._http.post("/api/auth/signup", payload)
        res = AuthResponse.model_validate(data)
        self._http.set_api_key(res.api_key)
        return res

    async def login(self, email: str, password: str) -> AuthResponse:
        """Log in with email + password. Returns user + raw API key. Auto-sets the key."""
        data = await self._http.post(
            "/api/auth/login", {"email": email, "password": password}
        )
        res = AuthResponse.model_validate(data)
        self._http.set_api_key(res.api_key)
        return res

    async def get_connect_url(self, provider: str) -> str:
        """Get the OAuth URL for a provider. User visits this URL to authorize."""
        data = await self._http.get(f"/api/auth/connect-url/{provider}")
        return str(data["url"])

    async def disconnect(self, provider: str) -> None:
        """Disconnect (revoke) a provider."""
        await self._http.delete(f"/api/auth/revoke/{provider}")
