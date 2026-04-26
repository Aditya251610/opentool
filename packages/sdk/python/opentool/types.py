from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# ─── Response models ───


class User(BaseModel):
    id: str
    email: str
    name: Optional[str] = None


class UserProfile(User):
    created_at: str = Field(alias="createdAt")
    connected_tools_count: int = Field(alias="connectedToolsCount")

    model_config = {"populate_by_name": True}


class AuthResponse(BaseModel):
    user: User
    api_key: str = Field(alias="apiKey")

    model_config = {"populate_by_name": True}


class ApiKey(BaseModel):
    id: str
    name: str
    key_prefix: str = Field(alias="keyPrefix")
    last_used_at: Optional[str] = Field(None, alias="lastUsedAt")
    expires_at: Optional[str] = Field(None, alias="expiresAt")
    created_at: str = Field(alias="createdAt")

    model_config = {"populate_by_name": True}


class ApiKeyCreated(BaseModel):
    key: str
    prefix: str
    name: str


class Tool(BaseModel):
    id: str
    name: str
    description: str
    provider: str
    auth_type: str = Field(alias="authType")
    category: Optional[str] = None
    annotations: Optional[Dict[str, bool]] = None

    model_config = {"populate_by_name": True}


class ToolList(BaseModel):
    count: int
    tools: List[Tool]


class ToolSearchOptions(BaseModel):
    """Options for searching/filtering tools."""
    query: Optional[str] = None
    provider: Optional[str] = None
    category: Optional[str] = None
    auth_type: Optional[str] = None
    read_only: Optional[bool] = None
    connected_only: Optional[bool] = None
    limit: Optional[int] = None
    offset: Optional[int] = None


class ToolSearchResult(BaseModel):
    tools: List[Tool]
    total: int
    limit: int
    offset: int
    has_more: bool = Field(alias="hasMore")

    model_config = {"populate_by_name": True}


class ProviderSummary(BaseModel):
    provider: str
    tool_count: int = Field(alias="toolCount")

    model_config = {"populate_by_name": True}


class ToolSearchSummary(BaseModel):
    message: str
    providers: List[ProviderSummary]
    total_tools: int = Field(alias="totalTools")

    model_config = {"populate_by_name": True}


class ToolDetails(BaseModel):
    id: str
    name: str
    description: str
    provider: str
    category: str
    auth_type: str = Field(alias="authType")
    required_scopes: List[str] = Field(alias="requiredScopes")
    input_schema: Dict[str, Any] = Field(alias="inputSchema")
    output_schema: Optional[Dict[str, Any]] = Field(None, alias="outputSchema")
    annotations: Optional[Dict[str, bool]] = None

    model_config = {"populate_by_name": True}


class ToolUsageStat(BaseModel):
    """Per-tool usage statistics."""
    tool_id: str = Field(alias="toolId")
    provider: str
    call_count: int = Field(alias="callCount")
    avg_duration_ms: float = Field(alias="avgDurationMs")
    error_rate: float = Field(alias="errorRate")
    total_input_tokens: int = Field(alias="totalInputTokens")
    total_output_tokens: int = Field(alias="totalOutputTokens")
    total_tokens: int = Field(alias="totalTokens")
    last_used_at: Optional[str] = Field(None, alias="lastUsedAt")

    model_config = {"populate_by_name": True}


class UsageSummary(BaseModel):
    """Aggregated usage summary."""
    total_calls: int = Field(alias="totalCalls")
    total_tokens: int = Field(alias="totalTokens")
    avg_tokens_per_call: float = Field(alias="avgTokensPerCall")
    top_tools: List[Dict[str, Any]] = Field(alias="topTools")
    top_providers: List[Dict[str, Any]] = Field(alias="topProviders")
    daily_usage: List[Dict[str, Any]] = Field(alias="dailyUsage")

    model_config = {"populate_by_name": True}


class ConnectUrl(BaseModel):
    url: str


class HealthStatus(BaseModel):
    status: str
    timestamp: str


class ToolContentItem(BaseModel):
    type: str
    text: str


class ToolExecutionResult(BaseModel):
    content: List[ToolContentItem]
    is_error: Optional[bool] = Field(None, alias="isError")

    model_config = {"populate_by_name": True}


# ─── Errors ───


class OpenToolError(Exception):
    """Base exception for OpenTool SDK errors."""

    def __init__(self, message: str, status: int, body: Any = None) -> None:
        super().__init__(message)
        self.status = status
        self.body = body


class AuthenticationError(OpenToolError):
    """Raised when API key is invalid or missing."""

    def __init__(self, message: str = "Invalid or missing API key") -> None:
        super().__init__(message, status=401)


class NotFoundError(OpenToolError):
    """Raised when a resource is not found."""

    def __init__(self, message: str) -> None:
        super().__init__(message, status=404)
