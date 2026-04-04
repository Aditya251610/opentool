# API Reference

> Every endpoint. Every parameter. No guessing.

Base URL: `http://localhost:3001` (or your `SERVER_URL`)

All authenticated endpoints require:
```
Authorization: Bearer ot_your_api_key
```

---

## Health

### `GET /health`

Check if the server is running. No auth required.

**Response:**
```json
{ "status": "ok" }
```

---

## Authentication

### `POST /api/auth/signup`

Create a new account. Returns a user and auto-generated API key.

**Body:**
```json
{
  "email": "you@example.com",
  "password": "your-password",
  "name": "Your Name"
}
```

**Response (200):**
```json
{
  "user": { "id": "cuid...", "email": "you@example.com", "name": "Your Name" },
  "apiKey": "ot_a1b2c3d4_full_raw_key_here"
}
```

> **Save the `apiKey`!** It's shown once and never again.

---

### `POST /api/auth/login`

Login with email and password.

**Body:**
```json
{
  "email": "you@example.com",
  "password": "your-password"
}
```

**Response (200):**
```json
{
  "user": { "id": "cuid...", "email": "you@example.com", "name": "Your Name" },
  "apiKey": "ot_a1b2c3d4_session_key_here"
}
```

---

### `GET /api/auth/connect-url/:provider` 🔒

Get the OAuth authorization URL for a provider.

**Response (200) — OAuth provider:**
```json
{ "url": "https://github.com/login/oauth/authorize?client_id=...&state=..." }
```

**Response (200) — API Key provider:**
```json
{ "authType": "API_KEY", "provider": "resend" }
```

**Response (501):**
```json
{ "error": "Provider \"stripe\" is not enabled — set STRIPE_CLIENT_ID and STRIPE_CLIENT_SECRET in .env, then re-run the seed." }
```

---

### `POST /api/auth/connect-api-key/:provider` 🔒

Connect an API key-based provider (Resend, PostgreSQL). Stores the pre-configured API key for the user.

**Response (200):**
```json
{ "success": true, "provider": "resend" }
```

---

### `GET /api/auth/callback/:provider`

OAuth callback handler. Called by the provider after user authorization. Not called directly by users.

**Query params:** `code`, `state`

**Behavior:**
- Success → Redirect to `{DASHBOARD_URL}/dashboard/tools?connected={provider}`
- Failure → Redirect to `{DASHBOARD_URL}/dashboard/tools?error={provider}`

---

### `DELETE /api/auth/revoke/:provider` 🔒

Disconnect a provider. Revokes the stored token and marks the connection as revoked.

**Response (200):**
```json
{ "success": true }
```

---

## API Keys

### `POST /api/keys` 🔒

Create a new API key.

**Body:**
```json
{ "name": "production-key" }
```

**Response (200):**
```json
{
  "id": "cuid...",
  "name": "production-key",
  "key": "ot_a1b2c3d4_full_raw_key",
  "prefix": "ot_a1b2c3d4"
}
```

> The `key` field contains the full raw key. Save it — it's never returned again.

---

### `GET /api/keys` 🔒

List all active (non-revoked) API keys. Only returns metadata, never the raw key.

**Response (200):**
```json
[
  {
    "id": "cuid...",
    "name": "production-key",
    "keyPrefix": "ot_a1b2c3d4",
    "lastUsedAt": "2024-01-15T10:30:00Z",
    "expiresAt": null,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

---

### `DELETE /api/keys/:id` 🔒

Revoke an API key. The key is soft-deleted (marked with `revokedAt` timestamp).

**Response (200):**
```json
{ "success": true }
```

---

## Tools

### `GET /api/tools`

List all tools in the registry. No auth required.

**Response (200):**
```json
{
  "count": 23,
  "tools": [
    {
      "id": "github.create_issue",
      "name": "Create GitHub Issue",
      "description": "Create a new issue in a GitHub repository",
      "provider": "github",
      "authType": "oauth2",
      "inputSchema": { ... }
    }
  ]
}
```

---

### `GET /api/tools/connected` 🔒

List tools the authenticated user has access to (connected providers only).

**Response (200):**
```json
{
  "count": 7,
  "tools": [
    {
      "id": "github.create_issue",
      "name": "Create GitHub Issue",
      "description": "Create a new issue in a GitHub repository",
      "provider": "github",
      "authType": "oauth2"
    }
  ]
}
```

---

### `GET /api/tools/:provider`

List tools for a specific provider. No auth required.

**Response (200):**
```json
{
  "count": 5,
  "tools": [ ... ]
}
```

---

## Users

### `GET /api/users/me` 🔒

Get the current user's profile.

**Response (200):**
```json
{
  "id": "cuid...",
  "email": "you@example.com",
  "name": "Your Name",
  "connectedToolsCount": 7,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### `PATCH /api/users/me` 🔒

Update the current user's profile.

**Body:**
```json
{ "name": "New Name", "email": "new@example.com" }
```

**Response (200):**
```json
{
  "id": "cuid...",
  "email": "new@example.com",
  "name": "New Name"
}
```

---

## MCP Endpoint

### `POST /mcp` 🔒

The MCP JSON-RPC endpoint. Accepts standard MCP protocol messages.

**Headers:**
```
Authorization: Bearer ot_your_api_key
Content-Type: application/json
```

**List tools:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Call a tool:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "github.create_issue",
    "arguments": {
      "owner": "Aditya251610",
      "repo": "opentool",
      "title": "Test issue"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      { "type": "text", "text": "{...json result...}" }
    ]
  }
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{ "error": "Human-readable error message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (missing params, invalid input) |
| 401 | Unauthorized (invalid or missing API key) |
| 404 | Resource not found |
| 500 | Internal server error |
| 501 | Provider not configured/enabled |
| 503 | Database connection error |

---

## Legend

🔒 = Requires `Authorization: Bearer ot_...` header
