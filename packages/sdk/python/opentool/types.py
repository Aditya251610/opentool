from __future__ import annotations

from typing import Any, List, Optional
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

    model_config = {"populate_by_name": True}


class ToolList(BaseModel):
    count: int
    tools: List[Tool]


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
