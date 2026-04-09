# MCP Integration

> One connection. All your tools. That's the pitch, and it actually works.

MCP (Model Context Protocol) is how AI agents discover and use tools. Instead of wiring up 10 different tool servers, you point your agent at OpenTool and it gets everything.

---

## What is MCP?

MCP is an open protocol (by Anthropic) that lets AI models call external tools in a standardized way. Think of it as a USB port for AI tools — plug in once, everything works.

OpenTool is an MCP server. Your AI agent is an MCP client. They speak JSON-RPC.

---

## Connecting Claude Desktop

Add this to your Claude Desktop config:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Linux:** `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "opentool": {
      "command": "npx",
      "args": ["@opentool-ts/cli", "mcp", "start"],
      "env": {
        "OPENTOOL_API_KEY": "ot_your_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop. Your connected tools appear automatically.

### How it works

1. Claude Desktop spawns `@opentool-ts/cli mcp start` as a subprocess
2. The CLI connects to your OpenTool server via stdio transport
3. Claude discovers all your connected tools (GitHub, Slack, etc.)
4. When Claude wants to use a tool, it sends a JSON-RPC request through the CLI
5. The CLI forwards it to the server, which executes the tool and returns the result

---

## Connecting Claude Code

```bash
# One-time setup
npx @opentool-ts/cli init

# Add as MCP server
claude mcp add opentool -- npx @opentool-ts/cli mcp start
```

---

## Connecting via HTTP (Any MCP Client)

If your MCP client supports HTTP transport, you can connect directly:

**Endpoint:** `POST http://localhost:3001/mcp`

**Headers:**
```
Authorization: Bearer ot_your_api_key_here
Content-Type: application/json
```

**Request (list tools):**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "github.create_issue",
        "description": "Create a new issue in a GitHub repository",
        "inputSchema": {
          "type": "object",
          "properties": {
            "owner": { "type": "string" },
            "repo": { "type": "string" },
            "title": { "type": "string" },
            "body": { "type": "string" }
          },
          "required": ["owner", "repo", "title"]
        }
      }
    ]
  }
}
```

**Request (call a tool):**
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
      "title": "Test issue from MCP",
      "body": "This was created by an AI agent via OpenTool"
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
      {
        "type": "text",
        "text": "{\"id\": 123, \"url\": \"https://github.com/Aditya251610/opentool/issues/123\"}"
      }
    ]
  }
}
```

---

## Connecting Cursor

Cursor supports MCP servers. Add to your Cursor settings:

```json
{
  "mcpServers": {
    "opentool": {
      "command": "npx",
      "args": ["@opentool-ts/cli", "mcp", "start"],
      "env": {
        "OPENTOOL_API_KEY": "ot_your_api_key_here"
      }
    }
  }
}
```

---

## Connecting Windsurf / Other MCP Clients

Any client that supports the MCP protocol can connect. The pattern is the same:

1. **Stdio transport:** Run `npx @opentool-ts/cli mcp start` with `OPENTOOL_API_KEY` env var
2. **HTTP transport:** POST to `/mcp` with Bearer auth

---

## How Tool Discovery Works

When an MCP client connects, it calls `tools/list`. OpenTool returns only the tools for providers the user has connected. If you've connected GitHub and Slack but not Notion, the agent only sees GitHub and Slack tools.

This means:
- No "permission denied" errors for tools you haven't set up
- The agent's tool list is always clean and relevant
- Connect a new provider → agent immediately sees the new tools (on next `tools/list`)

---

## Debugging

### Check what tools your agent sees

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer ot_your_key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Test a tool execution

```bash
curl -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer ot_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"github.get_repo",
      "arguments":{"owner":"Aditya251610","repo":"opentool"}
    }
  }'
```

### Check server health

```bash
curl http://localhost:3001/health
```
