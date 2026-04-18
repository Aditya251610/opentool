# opentool-cli

The command-line interface for **[OpenTool](https://github.com/Aditya251610/opentool)** — the open-source, self-hosted MCP tool server.

Connect, manage, and execute tools from your terminal. Works as both an interactive REPL and a scriptable CLI.

## Install

```bash
# npm (recommended)
npm i -g opentool-cli

# or run without installing
npx opentool-cli

# or curl installer
curl -fsSL https://raw.githubusercontent.com/Aditya251610/opentool/main/install.sh | bash
```

Requires **Node.js ≥ 18**.

## Quick Start

```bash
# First-time setup
opentool init

# Log in
opentool login

# Connect a provider (opens browser)
opentool connect github

# List available tools
opentool tools

# Execute a tool
opentool exec github.list_repos --args '{"per_page": 5}'

# Interactive REPL
opentool
```

## Commands

| Command                               | Description                               |
| ------------------------------------- | ----------------------------------------- |
| `opentool`                            | Launch interactive REPL                   |
| `opentool init`                       | First-time setup wizard                   |
| `opentool login`                      | Log in via browser                        |
| `opentool login <email> <pass>`       | Log in directly                           |
| `opentool logout`                     | Clear saved credentials                   |
| `opentool tools`                      | List all available tools                  |
| `opentool tools --json`               | Machine-readable tool list                |
| `opentool show <tool-id>`             | Show tool details + parameters            |
| `opentool exec <tool-id> --args '{}'` | Execute a tool                            |
| `opentool connect <provider>`         | Connect a provider (OAuth)                |
| `opentool disconnect <provider>`      | Remove a provider connection              |
| `opentool status`                     | Server health check                       |
| `opentool doctor`                     | Full diagnostics (9 checks)               |
| `opentool config`                     | Show current configuration                |
| `opentool history`                    | Command history                           |
| `opentool completion --install`       | Install shell completions (bash/zsh/fish) |
| `opentool --help`                     | Full help                                 |

## REPL Features

- **Tab completion** for commands, providers, and tool IDs
- **Ghost-text suggestions** with right-arrow accept
- **Ctrl+R** reverse history search
- **Readline keybindings** (Ctrl+A/E/U/K/W)
- **Fuzzy "did you mean?"** for typos
- **Automatic update check** (non-blocking)
- **Tool caching** for instant tab completion

## Piping & Scripting

```bash
# Pipe JSON args via stdin
echo '{"per_page": 5}' | opentool exec github.list_repos

# Machine-readable output
opentool tools --json | jq '.[] | .id'

# Use in scripts
if opentool status --json | jq -e '.healthy'; then
  echo "Server is up"
fi
```

## Configuration

Config is stored at `~/.opentool/config.json`:

```bash
opentool set-url http://localhost:3001   # Change server URL
opentool set-key <api-key>              # Set API key manually
```

## Environment Variables

| Variable              | Description                  |
| --------------------- | ---------------------------- |
| `OPENTOOL_SERVER_URL` | Override server URL          |
| `OPENTOOL_API_KEY`    | Override API key             |
| `OPENTOOL_DEBUG=1`    | Enable debug logging         |
| `NO_COLOR=1`          | Disable colors               |
| `FORCE_COLOR=1`       | Force colors (even in pipes) |

## Requirements

- Node.js ≥ 18
- A running OpenTool server ([deploy guide](https://github.com/Aditya251610/opentool#deploy))

## License

MIT — see [LICENSE](https://github.com/Aditya251610/opentool/blob/main/LICENSE)
