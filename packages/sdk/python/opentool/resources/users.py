from __future__ import annotations

from typing import Optional

from opentool.http import HttpClient, AsyncHttpClient
from opentool.types import User, UserProfile


class UsersResource:
    """Sync user profile operations."""

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def me(self) -> UserProfile:
        """Get the authenticated user's profile."""
        data = self._http.get("/api/users/me")
        return UserProfile.model_validate(data)

    def update_me(
        self,
        name: Optional[str] = None,
        email: Optional[str] = None,
    ) -> User:
        """Update the authenticated user's profile."""
        payload = {}
        if name is not None:
            payload["name"] = name
        if email is not None:
            payload["email"] = email
        data = self._http.patch("/api/users/me", payload)
        return User.model_validate(data)


class AsyncUsersResource:
    """Async user profile operations."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def me(self) -> UserProfile:
        """Get the authenticated user's profile."""
        data = await self._http.get("/api/users/me")
        return UserProfile.model_validate(data)

    async def update_me(
        self,
        name: Optional[str] = None,
        email: Optional[str] = None,
    ) -> User:
        """Update the authenticated user's profile."""
        payload = {}
        if name is not None:
            payload["name"] = name
        if email is not None:
            payload["email"] = email
        data = await self._http.patch("/api/users/me", payload)
        return User.model_validate(data)
