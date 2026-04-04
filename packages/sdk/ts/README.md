# @opentool/sdk

TypeScript SDK for the OpenTool MCP server. Manage tools, auth, and API keys programmatically.

## Install

```bash
npm install @opentool/sdk
```

## Quick Start

```ts
import { OpenTool } from '@opentool/sdk'

const client = new OpenTool({
  baseUrl: 'http://localhost:3001',
  apiKey: 'ot_your_key_here',
})

// Check server health
const health = await client.health()

// List all available tools
const tools = await client.tools.list()

// List your connected tools
const connected = await client.tools.connected()

// Execute a tool
const result = await client.tools.execute('github.create_issue', {
  owner: 'user',
  repo: 'my-repo',
  title: 'Created via SDK',
  body: 'This issue was created programmatically.',
})
```

## Auth

```ts
// Sign up (auto-sets API key on this client)
const { user, apiKey } = await client.auth.signup({
  email: 'dev@example.com',
  password: 'my-password',
  name: 'Dev',
})

// Login
const { user, apiKey } = await client.auth.login({
  email: 'dev@example.com',
  password: 'my-password',
})

// Get OAuth URL for a provider
const url = await client.auth.getConnectUrl('github')
// → User visits this URL to authorize

// Disconnect a provider
await client.auth.disconnect('github')
```

## API Keys

```ts
// List active keys
const keys = await client.keys.list()

// Create a new key (raw key returned once)
const { key, prefix, name } = await client.keys.create({ name: 'CI pipeline' })

// Revoke a key
await client.keys.revoke(keyId)
```

## User Profile

```ts
// Get your profile
const me = await client.users.me()

// Update profile
await client.users.updateMe({ name: 'New Name' })
```

## Tools

```ts
// All tools in the registry
const all = await client.tools.list()

// Tools you've connected
const mine = await client.tools.connected()

// Tools for a specific provider
const githubTools = await client.tools.byProvider('github')

// Execute a tool via MCP
const result = await client.tools.execute('slack.send_message', {
  channel: '#general',
  text: 'Hello from the SDK',
})
```

## Error Handling

```ts
import { OpenTool, OpenToolError, AuthenticationError } from '@opentool/sdk'

try {
  await client.tools.connected()
} catch (err) {
  if (err instanceof AuthenticationError) {
    // API key is invalid or expired
  } else if (err instanceof OpenToolError) {
    console.error(err.status, err.body)
  }
}
```

## Configuration

```ts
const client = new OpenTool({
  baseUrl: 'http://localhost:3001',  // Required
  apiKey: 'ot_xxx',                  // Optional — set later with client.setApiKey()
  timeout: 30000,                    // Request timeout in ms (default: 30s)
  fetch: customFetch,                // Custom fetch implementation
})
```

## License

MIT
