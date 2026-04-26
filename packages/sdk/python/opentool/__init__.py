"""OpenTool Python SDK — manage tools, auth, and API keys programmatically."""

from opentool.client import OpenTool, AsyncOpenTool
from opentool.types import (
    User,
    UserProfile,
    AuthResponse,
    ApiKey,
    ApiKeyCreated,
    Tool,
    ToolList,
    ToolSearchOptions,
    ToolSearchResult,
    ToolSearchSummary,
    ToolDetails,
    ProviderSummary,
    ToolUsageStat,
    UsageSummary,
    ConnectUrl,
    HealthStatus,
    ToolExecutionResult,
    ToolContentItem,
    OpenToolError,
    AuthenticationError,
    NotFoundError,
)

__all__ = [
    "OpenTool",
    "AsyncOpenTool",
    "User",
    "UserProfile",
    "AuthResponse",
    "ApiKey",
    "ApiKeyCreated",
    "Tool",
    "ToolList",
    "ToolSearchOptions",
    "ToolSearchResult",
    "ToolSearchSummary",
    "ToolDetails",
    "ProviderSummary",
    "ToolUsageStat",
    "UsageSummary",
    "ConnectUrl",
    "HealthStatus",
    "ToolExecutionResult",
    "ToolContentItem",
    "OpenToolError",
    "AuthenticationError",
    "NotFoundError",
]

__version__ = "0.2.0"
