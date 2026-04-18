from __future__ import annotations

import random
import time
from typing import Any, Dict, Optional

import httpx

from opentool.types import OpenToolError, AuthenticationError

_RETRYABLE_STATUS = {408, 429, 500, 502, 503, 504}
_MAX_RETRIES = 3
_BASE_DELAY = 0.5


def _jitter(seconds: float) -> float:
    return seconds + random.random() * seconds * 0.5


class HttpClient:
    """Synchronous HTTP client for OpenTool API with retry logic."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = _MAX_RETRIES,
        http_client: Optional[httpx.Client] = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout
        self._max_retries = max_retries
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
        last_error: Optional[Exception] = None

        for attempt in range(self._max_retries + 1):
            try:
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
                    if resp.status_code in _RETRYABLE_STATUS and attempt < self._max_retries:
                        retry_after = resp.headers.get("retry-after")
                        if retry_after:
                            delay = float(retry_after)
                        else:
                            delay = _jitter(_BASE_DELAY * (2 ** attempt))
                        time.sleep(delay)
                        continue
                    raise OpenToolError(
                        f"{method} {path} failed: {resp.status_code}",
                        status=resp.status_code,
                        body=parsed,
                    )
                if not resp.text:
                    return {}
                return resp.json()
            except (AuthenticationError, OpenToolError):
                raise
            except Exception as exc:
                last_error = exc
                if attempt < self._max_retries:
                    time.sleep(_jitter(_BASE_DELAY * (2 ** attempt)))
                    continue
                raise

        if last_error:
            raise last_error
        return {}

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
    """Async HTTP client for OpenTool API with retry logic."""

    def __init__(
        self,
        base_url: str,
        api_key: Optional[str] = None,
        timeout: float = 30.0,
        max_retries: int = _MAX_RETRIES,
        http_client: Optional[httpx.AsyncClient] = None,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout
        self._max_retries = max_retries
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
        import asyncio

        url = f"{self._base_url}{path}"
        last_error: Optional[Exception] = None

        for attempt in range(self._max_retries + 1):
            try:
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
                    if resp.status_code in _RETRYABLE_STATUS and attempt < self._max_retries:
                        retry_after = resp.headers.get("retry-after")
                        if retry_after:
                            delay = float(retry_after)
                        else:
                            delay = _jitter(_BASE_DELAY * (2 ** attempt))
                        await asyncio.sleep(delay)
                        continue
                    raise OpenToolError(
                        f"{method} {path} failed: {resp.status_code}",
                        status=resp.status_code,
                        body=parsed,
                    )
                if not resp.text:
                    return {}
                return resp.json()
            except (AuthenticationError, OpenToolError):
                raise
            except Exception as exc:
                last_error = exc
                if attempt < self._max_retries:
                    await asyncio.sleep(_jitter(_BASE_DELAY * (2 ** attempt)))
                    continue
                raise

        if last_error:
            raise last_error
        return {}

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
