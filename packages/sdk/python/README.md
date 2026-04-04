# opentool-sdk (Python)

Python SDK for the OpenTool MCP server. Manage tools, auth, and API keys programmatically.

Both **sync** and **async** clients included.

## Install

```bash
pip install opentool-sdk
```

## Quick Start (Sync)

```python
from opentool import OpenTool

client = OpenTool(
    base_url="http://localhost:3001",
    api_key="ot_your_key_here",
)

# Check server health
health = client.health()

# List all available tools
tools = client.tools.list()

# List your connected tools
connected = client.tools.connected()

# Execute a tool
result = client.tools.execute("github.create_issue", {
    "owner": "user",
    "repo": "my-repo",
    "title": "Created via SDK",
    "body": "This issue was created programmatically.",
})
```

## Quick Start (Async)

```python
from opentool import AsyncOpenTool

async with AsyncOpenTool(
    base_url="http://localhost:3001",
    api_key="ot_your_key_here",
) as client:
    tools = await client.tools.connected()
    result = await client.tools.execute("slack.send_message", {
        "channel": "#general",
        "text": "Hello from the SDK",
    })
```

## Auth

```python
# Sign up (auto-sets API key on this client)
res = client.auth.signup(email="dev@example.com", password="my-password", name="Dev")
print(res.api_key)

# Login
res = client.auth.login(email="dev@example.com", password="my-password")

# Get OAuth URL for a provider
url = client.auth.get_connect_url("github")
# → User visits this URL to authorize

# Disconnect a provider
client.auth.disconnect("github")
```

## API Keys

```python
# List active keys
keys = client.keys.list()

# Create a new key (raw key returned once)
new_key = client.keys.create("CI pipeline")
print(new_key.key)

# Revoke a key
client.keys.revoke(key_id)
```

## User Profile

```python
# Get your profile
me = client.users.me()
print(me.email, me.connected_tools_count)

# Update profile
client.users.update_me(name="New Name")
```

## Tools

```python
# All tools in the registry
all_tools = client.tools.list()

# Tools you've connected
mine = client.tools.connected()

# Tools for a specific provider
github_tools = client.tools.by_provider("github")

# Execute a tool via MCP
result = client.tools.execute("slack.send_message", {
    "channel": "#general",
    "text": "Hello from the SDK",
})
```

## Error Handling

```python
from opentool import OpenTool, OpenToolError, AuthenticationError

try:
    client.tools.connected()
except AuthenticationError:
    print("API key is invalid or expired")
except OpenToolError as e:
    print(f"Error {e.status}: {e.body}")
```

## Context Manager

```python
# Sync
with OpenTool(base_url="http://localhost:3001", api_key="ot_xxx") as client:
    tools = client.tools.list()

# Async
async with AsyncOpenTool(base_url="http://localhost:3001", api_key="ot_xxx") as client:
    tools = await client.tools.list()
```

## Configuration

```python
client = OpenTool(
    base_url="http://localhost:3001",  # Required
    api_key="ot_xxx",                  # Optional — set later with client.set_api_key()
    timeout=30.0,                      # Request timeout in seconds (default: 30)
    http_client=custom_httpx_client,   # Custom httpx.Client instance
)
```

## License

MIT
