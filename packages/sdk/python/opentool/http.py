from __future__ import annotations

from typing import Any, Dict, Optional

import httpx

from opentool.types import OpenToolError, AuthenticationError


class HttpClient:
    """Synchronous HTTP client for OpenTool API."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout
        self._client = http_client or httpx.Client(timeout=timeout)

    def set_api_key(self, key: str) -> None:
        self._api_key = key

    def clear_api_key(self) -> None:
        self._api_key = None

    def _headers(self) -> Dict[str, str]:
        h: Dict[str, str] = {"Content-Type": "application/json"}
        if self._api_key:
            h["Authorization"] = f"Bearer {self._api_key}"
        return h

    def request(self, method: str, path: str, body: Any = None) -> Any:
        url = f"{self._base_url}{path}"
        resp = self._client.request(
            method,
            url,
            headers=self._headers(),
            json=body,
        )
        if not resp.is_success:
            try:
                parsed = resp.json()
            except Exception:
                parsed = resp.text
            if resp.status_code == 401:
                raise AuthenticationError()
            raise OpenToolError(
                f"{method} {path} failed: {resp.status_code}",
                status=resp.status_code,
                body=parsed,
            )
        if not resp.text:
            return {}
        return resp.json()

    def get(self, path: str) -> Any:
        return self.request("GET", path)

    def post(self, path: str, body: Any = None) -> Any:
        return self.request("POST", path, body)

    def patch(self, path: str, body: Any = None) -> Any:
        return self.request("PATCH", path, body)

    def delete(self, path: str) -> Any:
        return self.request("DELETE", path)

    def close(self) -> None:
        self._client.close()


class AsyncHttpClient:
    """Async HTTP client for OpenTool API."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout
        self._client = http_client or httpx.AsyncClient(timeout=timeout)

    def set_api_key(self, key: str) -> None:
        self._api_key = key

    def clear_api_key(self) -> None:
        self._api_key = None

    def _headers(self) -> Dict[str, str]:
        h: Dict[str, str] = {"Content-Type": "application/json"}
        if self._api_key:
            h["Authorization"] = f"Bearer {self._api_key}"
        return h

    async def request(self, method: str, path: str, body: Any = None) -> Any:
        url = f"{self._base_url}{path}"
        resp = await self._client.request(
            method,
            url,
            headers=self._headers(),
            json=body,
        )
        if not resp.is_success:
            try:
                parsed = resp.json()
            except Exception:
                parsed = resp.text
            if resp.status_code == 401:
                raise AuthenticationError()
            raise OpenToolError(
                f"{method} {path} failed: {resp.status_code}",
                status=resp.status_code,
                body=parsed,
            )
        if not resp.text:
            return {}
        return resp.json()

    async def get(self, path: str) -> Any:
        return await self.request("GET", path)

    async def post(self, path: str, body: Any = None) -> Any:
        return await self.request("POST", path, body)

    async def patch(self, path: str, body: Any = None) -> Any:
        return await self.request("PATCH", path, body)

    async def delete(self, path: str) -> Any:
        return await self.request("DELETE", path)

    async def close(self) -> None:
        await self._client.aclose()
