# CLI Reference

> Manage your tools without leaving the terminal. Because some of us live here.

The OpenTool CLI (`@opentool-ts/cli`) is an interactive terminal application built with Ink (React for terminals). It lets you manage tools, execute actions, and configure your OpenTool instance — all from the command line.

---

## Installation

```bash
# Global install
npm install -g @opentool-ts/cli

# Or run directly with npx
npx @opentool-ts/cli
```

---

## First Run

```bash
opentool
```

This starts the interactive CLI. On first run, you'll need to configure your server URL and API key:

```bash
opentool> set-url http://localhost:3001
opentool> set-key ot_your_api_key_here
```

Configuration is saved to `~/.opentool/config.json` and persists across sessions.

---

## Commands

### Authentication

| Command | Description |
|---------|-------------|
| `login` | Open browser to login (interactive) |
| `login <email> <password>` | Login directly from terminal |
| `set-key <api-key>` | Store your API key |
| `set-url <server-url>` | Set the server URL |

### Tool Management

| Command | Description |
|---------|-------------|
| `tools` or `ls` | List your connected tools |
| `connect <provider>` | Get the OAuth URL for a provider |
| `disconnect <provider>` | Revoke a provider connection |
| `execute <tool-id> [json]` | Execute a tool with JSON arguments |

### API Keys

| Command | Description |
|---------|-------------|
| `keys` | List your active API keys |

### System

| Command | Description |
|---------|-------------|
| `status` | Check server health |
| `config` | Show current configuration |
| `help` or `?` | Show available commands |
| `exit` or `quit` or `q` | Exit the CLI |

---

## Usage Examples

### List connected tools

```bash
opentool> tools

Connected Tools (7):
  ✅ github.create_issue    — Create a new issue
  ✅ github.list_issues     — List repository issues
  ✅ github.create_pr       — Create a pull request
  ✅ slack.send_message     — Send a Slack message
  ✅ slack.read_channel     — Read channel messages
  ✅ notion.create_page     — Create a Notion page
  ✅ notion.query_database  — Query a database
```

### Execute a tool

```bash
opentool> execute github.create_issue {"owner":"Aditya251610","repo":"opentool","title":"Test from CLI"}

✅ Success:
{
  "id": 42,
  "url": "https://github.com/Aditya251610/opentool/issues/42",
  "title": "Test from CLI"
}
```

### Check server status

```bash
opentool> status

Server: http://localhost:3001
Status: ✅ Online
```

### Connect a provider

```bash
opentool> connect github

Open this URL in your browser to authorize:
https://github.com/login/oauth/authorize?client_id=...&scope=repo...

Once authorized, return here.
```

---

## MCP Mode

The CLI also serves as an MCP transport for AI agents:

```bash
OPENTOOL_API_KEY=ot_your_key npx @opentool-ts/cli mcp start
```

This starts a stdio-based MCP server that AI clients (Claude Desktop, Cursor, etc.) can connect to. See [MCP Integration](./mcp-integration.md) for setup instructions.

---

## Configuration File

The CLI stores configuration at `~/.opentool/config.json`:

```json
{
  "serverUrl": "http://localhost:3001",
  "apiKey": "ot_a1b2c3d4_..."
}
```

You can edit this file directly or use the `set-url` and `set-key` commands.

---

## Environment Variables

| Variable | Description | Overrides |
|----------|-------------|-----------|
| `OPENTOOL_API_KEY` | API key for authentication | Config file `apiKey` |
| `OPENTOOL_SERVER_URL` | Server URL | Config file `serverUrl` |

Environment variables take precedence over the config file.
