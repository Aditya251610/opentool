# SDK Reference

> TypeScript and Python. Pick your poison.

OpenTool ships with official SDKs for TypeScript and Python. Both provide typed, ergonomic access to the full API.

---

## TypeScript SDK

### Installation

```bash
npm install @opentool-ts/sdk
# or
pnpm add @opentool-ts/sdk
# or
yarn add @opentool-ts/sdk
```

### Quick Start

```typescript
import { OpenTool } from '@opentool-ts/sdk'

const client = new OpenTool({
  apiKey: 'ot_your_api_key',
  baseUrl: 'http://localhost:3001', // optional, defaults to this
})

// List your connected tools
const { tools } = await client.tools.connected()
console.log(tools)

// Execute a tool
const result = await client.tools.execute('github.create_issue', {
  owner: 'Aditya251610',
  repo: 'opentool',
  title: 'Created via SDK',
})
```

### Authentication

```typescript
// Sign up
const { user, apiKey } = await client.auth.signup({
  email: 'you@example.com',
  password: 'secure-password',
  name: 'Your Name',
})

// Login
const { user, apiKey } = await client.auth.login({
  email: 'you@example.com',
  password: 'secure-password',
})

// Set API key after creation
client.setApiKey(apiKey)

// Get OAuth connect URL
const url = await client.auth.getConnectUrl('github')
// → redirect user to this URL

// Disconnect a provider
await client.auth.disconnect('github')
```

### Users

```typescript
// Get current user profile
const profile = await client.users.me()
// → { id, email, name, connectedToolsCount }

// Update profile
const updated = await client.users.update({ name: 'New Name' })
```

### API Keys

```typescript
// Create a new key
const { key, prefix, id } = await client.keys.create({ name: 'production' })
// key is the raw value — save it now, you won't see it again

// List keys (only shows prefixes)
const keys = await client.keys.list()

// Revoke a key
await client.keys.revoke('key-id')
```

### Tools

```typescript
// List all available tools (no auth required)
const { tools } = await client.tools.list()

// List connected tools (requires auth)
const { tools } = await client.tools.connected()

// List tools by provider
const { tools } = await client.tools.byProvider('github')

// Execute a tool
const result = await client.tools.execute('slack.send_message', {
  channel: '#general',
  text: 'Hello from OpenTool SDK!',
})
```

### Health Check

```typescript
const status = await client.health()
// → { status: 'ok' }
```

### Error Handling

```typescript
import { OpenToolError, AuthenticationError, NotFoundError } from '@opentool-ts/sdk'

try {
  await client.tools.execute('github.create_issue', { ... })
} catch (error) {
  if (error instanceof AuthenticationError) {
    // Invalid or expired API key
  } else if (error instanceof NotFoundError) {
    // Tool or resource not found
  } else if (error instanceof OpenToolError) {
    // General API error
    console.error(error.status, error.message)
  }
}
```

---

## Python SDK

### Installation

```bash
pip install opentool
```

### Quick Start

```python
from opentool import OpenTool

client = OpenTool(
    api_key="ot_your_api_key",
    base_url="http://localhost:3001",  # optional
)

# List connected tools
tools = client.tools.connected()

# Execute a tool
result = client.tools.execute("github.create_issue", {
    "owner": "Aditya251610",
    "repo": "opentool",
    "title": "Created via Python SDK",
})
```

### Async Support

```python
from opentool import AsyncOpenTool

async def main():
    async with AsyncOpenTool(api_key="ot_your_key") as client:
        tools = await client.tools.connected()
        result = await client.tools.execute("github.create_issue", {
            "owner": "Aditya251610",
            "repo": "opentool",
            "title": "Created async!",
        })
```

### Authentication

```python
# Sign up
response = client.auth.signup(
    email="you@example.com",
    password="secure-password",
    name="Your Name",
)
client.api_key = response.api_key

# Login
response = client.auth.login(
    email="you@example.com",
    password="secure-password",
)

# Get OAuth URL
url = client.auth.get_connect_url("github")

# Disconnect
client.auth.disconnect("github")
```

### Users

```python
# Current user
profile = client.users.me()

# Update
client.users.update(name="New Name")
```

### API Keys

```python
# Create
created = client.keys.create(name="production")
print(created.key)  # Save this — shown once

# List
keys = client.keys.list()

# Revoke
client.keys.revoke("key-id")
```

### Context Manager

Both sync and async clients support context managers for clean resource management:

```python
# Sync
with OpenTool(api_key="ot_...") as client:
    tools = client.tools.list()

# Async
async with AsyncOpenTool(api_key="ot_...") as client:
    tools = await client.tools.list()
```

---

## SDK Architecture

Both SDKs follow the same structure:

```
client
├── auth      → signup, login, connect, disconnect
├── users     → me, update
├── keys      → create, list, revoke
└── tools     → list, connected, byProvider, execute
```

The HTTP layer handles auth headers, error parsing, and retries. You interact with typed resource objects that map cleanly to the REST API.
