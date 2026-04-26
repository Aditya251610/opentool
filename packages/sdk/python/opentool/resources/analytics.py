from __future__ import annotations

from typing import Dict, List, Optional
from urllib.parse import quote

from opentool.http import HttpClient, AsyncHttpClient
from opentool.types import ToolUsageStat, UsageSummary


class AnalyticsResource:
    """Sync analytics — usage stats, summaries, and context export."""

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def tools(self, days: int = 30) -> Dict:
        """Get per-tool usage stats for the authenticated user."""
        data = self._http.get(f"/api/analytics/tools?days={days}")
        return {
            "tools": [ToolUsageStat.model_validate(t) for t in data.get("tools", [])],
            "days": data.get("days", days),
        }

    def summary(self, days: int = 30) -> UsageSummary:
        """Get aggregated usage summary."""
        data = self._http.get(f"/api/analytics/summary?days={days}")
        return UsageSummary.model_validate(data)

    def export(
        self,
        format: str = "context.md",
        days: int = 30,
    ) -> str:
        """
        Export context in a format suitable for agent configuration files.

        Args:
            format: One of 'context.md', 'memory.json', '.cursorrules', 'CLAUDE.md'
            days: Lookback window (default 30, max 365)

        Returns:
            Raw string content (Markdown, JSON, or plain text).
        """
        data = self._http.get(
            f"/api/analytics/export?format={quote(format)}&days={days}"
        )
        return data if isinstance(data, str) else str(data)


class AsyncAnalyticsResource:
    """Async analytics — usage stats, summaries, and context export."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def tools(self, days: int = 30) -> Dict:
        """Get per-tool usage stats for the authenticated user."""
        data = await self._http.get(f"/api/analytics/tools?days={days}")
        return {
            "tools": [ToolUsageStat.model_validate(t) for t in data.get("tools", [])],
            "days": data.get("days", days),
        }

    async def summary(self, days: int = 30) -> UsageSummary:
        """Get aggregated usage summary."""
        data = await self._http.get(f"/api/analytics/summary?days={days}")
        return UsageSummary.model_validate(data)

    async def export(
        self,
        format: str = "context.md",
        days: int = 30,
    ) -> str:
        """Export context in a format suitable for agent configuration files."""
        data = await self._http.get(
            f"/api/analytics/export?format={quote(format)}&days={days}"
        )
        return data if isinstance(data, str) else str(data)
