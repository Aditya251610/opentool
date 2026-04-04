# Architecture

> How the pieces fit together. No mystery boxes.

OpenTool is a monorepo with a clean separation of concerns. Here's the full picture.

---

## System Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   AI Agent       │     │   Dashboard       │     │   CLI            │
│ (Claude, Cursor, │     │ (Next.js :3000)   │     │ (@opentool/cli)  │
│  any MCP client) │     │                   │     │                  │
└────────┬─────────┘     └────────┬──────────┘     └────────┬─────────┘
         │ MCP (JSON-RPC)         │ REST API                │ REST API
         │                        │                         │
         ▼                        ▼                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        OpenTool Server (Hono :3001)                 │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ MCP      │  │ REST API     │  │ OAuth      │  │ Token        │ │
│  │ Endpoint │  │ Routes       │  │ Handler    │  │ Broker       │ │
│  │ /mcp     │  │ /api/*       │  │ /callback  │  │ (encrypt +   │ │
│  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  │  cache)      │ │
│       │               │                │          └──────┬───────┘ │
│       ▼               ▼                ▼                 ▼         │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Tool Registry + Executor                  │  │
│  │         (loads tools, resolves auth, executes, audits)       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└───────────┬──────────────────┬──────────────────┬──────────────────┘
            │                  │                  │
            ▼                  ▼                  ▼
     ┌─────────────┐   ┌─────────────┐   ┌──────────────────┐
     │ PostgreSQL   │   │ Redis       │   │ External APIs    │
     │ (Prisma)     │   │ (token      │   │ (GitHub, Slack,  │
     │              │   │  cache)     │   │  Notion, etc.)   │
     └─────────────┘   └─────────────┘   └──────────────────┘
```

---

## Project Structure

```
opentool/
├── apps/
│   ├── server/                  # The core — API + MCP + Auth
│   │   ├── src/
│   │   │   ├── index.ts         # Entry point (Hono app)
│   │   │   ├── api/
│   │   │   │   ├── routes/      # REST routes (auth, keys, tools, users)
│   │   │   │   └── middleware.ts # API key validation
│   │   │   ├── auth/
│   │   │   │   ├── oauth.ts     # OAuth URL generation + code exchange
│   │   │   │   ├── broker.ts    # Token storage, retrieval, refresh
│   │   │   │   └── encryption.ts # AES-256-GCM + SHA-256 hashing
│   │   │   ├── mcp/
│   │   │   │   ├── server.ts    # MCP server creation per user
│   │   │   │   ├── transport.ts # HTTP ↔ MCP bridge
│   │   │   │   └── tools.ts     # Tool loading + execution
│   │   │   ├── registry/
│   │   │   │   └── index.ts     # Tool registry (maps ID → definition)
│   │   │   └── db/
│   │   │       └── client.ts    # Prisma client singleton
│   │   ├── tools/               # Tool implementations by provider
│   │   │   ├── github/
│   │   │   ├── notion/
│   │   │   ├── slack/
│   │   │   └── ...
│   │   └── prisma/
│   │       ├── schema.prisma    # Data model
│   │       └── seed.ts          # Provider + tool seeding
│   │
│   └── dashboard/               # Next.js 14 web UI
│       ├── app/                  # App router pages
│       ├── components/           # UI components
│       └── lib/                  # API client, auth context, providers
│
├── packages/
│   ├── sdk/
│   │   ├── ts/                  # TypeScript SDK (@opentool/sdk)
│   │   └── python/              # Python SDK (opentool)
│   ├── tool-schema/             # Shared tool definition types
│   └── cli/                     # Interactive terminal UI (Ink)
│
├── docker-compose.yml           # Full stack: postgres + redis + server + dashboard
└── turbo.json                   # Turborepo build orchestration
```

---

## Data Model

Six tables. That's it.

### Users & Auth

- **`users`** — Email, name, password hash. One row per person.
- **`api_keys`** — Stored as SHA-256 hashes. Raw key shown once at creation, never stored. Prefix (`ot_...`) kept for display.

### Providers & Tools

- **`oauth_providers`** — One row per provider (GitHub, Slack, etc.). Stores OAuth endpoints, encrypted client secrets, scopes, auth type.
- **`tool_definitions`** — One row per tool action (e.g., `github.create_issue`). Links to a provider. Stores input/output JSON schemas.

### Connections & Tokens

- **`tool_connections`** — Per-user, per-provider connection status. One row = "this user has connected GitHub."
- **`token_stores`** — Encrypted access + refresh tokens. One-to-one with tool_connections. All token values encrypted with AES-256-GCM.

### Audit

- **`audit_logs`** — Immutable log of every tool execution and auth event. Tracks duration, sanitized input, errors.

---

## Request Flow: Tool Execution

Here's what happens when an AI agent calls a tool:

```
1. Agent sends JSON-RPC request to POST /mcp
   {"method": "tools/call", "params": {"name": "github.create_issue", ...}}

2. Server validates API key from Authorization header
   → Resolves to a User

3. MCP server looks up "github.create_issue" in the tool registry
   → Gets the tool definition + execute function

4. Token broker fetches the user's GitHub token
   → Checks Redis cache first
   → Falls back to DB if cache miss
   → Auto-refreshes if expired + has refresh_token

5. Tool's execute() function runs with {input, auth: {accessToken}}
   → Makes API call to GitHub

6. Result logged to audit_logs table

7. Response returned as MCP JSON-RPC result
   {"result": {"content": [{"type": "text", "text": "..."}]}}
```

---

## Key Design Decisions

### Why Hono (not Express)?

Hono is lighter, faster, and has first-class TypeScript support. For an API server that's mostly routing + middleware, Express's baggage isn't worth it.

### Why In-Memory MCP Transport (not SSE)?

The HTTP endpoint uses `InMemoryTransport` to bridge HTTP requests to the MCP SDK. This means each request is stateless — no persistent connections to manage, no SSE complexity. The CLI uses stdio transport for persistent connections.

### Why encrypt tokens at rest?

Because if someone gets access to your database, they shouldn't automatically get access to every connected service. AES-256-GCM with a separate encryption key means compromising the DB alone isn't enough.

### Why Redis for token caching?

Token lookups happen on every tool execution. Hitting Postgres every time adds latency. Redis cache with TTL (matched to token expiry) keeps things fast without stale data.

### Why Turborepo?

Multiple packages that share types and build artifacts. Turborepo handles the dependency graph so `pnpm dev` just works across all packages.
