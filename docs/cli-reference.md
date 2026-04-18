# CLI Reference

> Manage your tools without leaving the terminal. Because some of us live here.

The OpenTool CLI (`opentool-cli`) ships in **two modes**:

- **Interactive REPL** (default when you run `opentool` with no args) — built with Ink (React for terminals). Tab completion, ghost-text suggestions, Ctrl+R history search, fuzzy matching, live status bar.
- **Non-interactive subcommands** (run `opentool <cmd>` directly) — scriptable, supports `--json` for machine-readable output, exits with structured codes. Pipe-friendly (`opentool tools --json | jq`).

---

## Installation

```bash
# npm (recommended)
npm i -g opentool-cli

# npx (zero-install)
npx opentool-cli

# curl installer
curl -fsSL https://raw.githubusercontent.com/Aditya251610/opentool/main/install.sh | bash
```

Requires **Node.js ≥ 18**.

---

## First Run

```bash
opentool init      # guided setup wizard (server URL + health check + next steps)
opentool login     # log in via browser, then save the API key
opentool doctor    # verify everything is working (9-point diagnostic)
```

Configuration is saved to `~/.opentool/config.json` and persists across sessions. Command history is stored in `~/.opentool/history`.

---

## Commands

### Authentication

| Command                    | Description                         |
| -------------------------- | ----------------------------------- |
| `login`                    | Open browser to login (interactive) |
| `login <email> <password>` | Login directly from terminal        |
| `logout`                   | Clear saved API key                 |
| `set-key <api-key>`        | Store your API key manually         |
| `set-url <server-url>`     | Set the server URL                  |

### Tool Management

| Command                          | Description                          |
| -------------------------------- | ------------------------------------ |
| `tools` or `ls`                  | List your connected tools            |
| `tools --json`                   | Machine-readable tool list           |
| `show <tool-id>`                 | Show tool details + parameter schema |
| `connect <provider>`             | Get the OAuth URL for a provider     |
| `disconnect <provider>`          | Revoke a provider connection         |
| `exec <tool-id> --args '{json}'` | Execute a tool with JSON arguments   |
| `refresh`                        | Refresh the tools cache              |

### System & Diagnostics

| Command                 | Description                               |
| ----------------------- | ----------------------------------------- |
| `status`                | Check server health, latency, tool count  |
| `status --json`         | Machine-readable status                   |
| `doctor`                | 9-point diagnostic check                  |
| `config`                | Show current configuration                |
| `ping`                  | Quick server latency check                |
| `whoami`                | Show current login info                   |
| `history`               | Recent command history                    |
| `completion --install`  | Install shell completions (bash/zsh/fish) |
| `help` or `?`           | Show available commands                   |
| `exit` or `quit` or `q` | Exit the CLI                              |

### Flags

| Flag        | Description                  |
| ----------- | ---------------------------- |
| `--json`    | Machine-readable JSON output |
| `--debug`   | Enable debug logging         |
| `--version` | Show CLI version             |
| `--help`    | Show help                    |

---

## REPL Features

When you run `opentool` with no arguments, you get an interactive REPL:

- **Tab completion** — Commands, provider names, and tool IDs
- **Ghost-text suggestions** — Right arrow to accept
- **Ctrl+R** — Reverse search through command history
- **Fuzzy matching** — Typo? "Did you mean: tools?"
- **Readline keybindings** — Ctrl+A/E (start/end), Ctrl+U/K (kill line), Ctrl+W (delete word)
- **History** — ↑/↓ to navigate, persisted across sessions
- **Auto-update check** — Non-blocking check for newer versions
- **Session stats** — Command count and uptime in status bar
- **Responsive banner** — Adapts to terminal width

---

## Usage Examples

### List connected tools

```bash
$ opentool tools

Connected Tools (7):
  ✅ github.create_issue    — Create a new issue
  ✅ github.list_issues     — List repository issues
  ✅ github.create_pr       — Create a pull request
  ✅ slack.send_message     — Send a Slack message
  ✅ slack.read_channel     — Read channel messages
  ✅ notion.create_page     — Create a Notion page
  ✅ notion.query_database  — Query a database
```

### Show tool details

```bash
$ opentool show github.create_issue

  github.create_issue
  name:       Create Issue
  provider:   github

  Parameters:
    owner <string> *  Repository owner
    repo <string> *   Repository name
    title <string> *  Issue title
    body <string>     Issue body

  * = required

  Execute: opentool exec github.create_issue --args '{}'
```

### Execute a tool

```bash
$ opentool exec github.create_issue --args '{"owner":"Aditya251610","repo":"opentool","title":"Test"}'

✓ Executed github.create_issue (245ms)
────────────────────────────
{
  "id": 42,
  "url": "https://github.com/Aditya251610/opentool/issues/42",
  "title": "Test"
}
```

### Pipe JSON args via stdin

```bash
echo '{"per_page": 5}' | opentool exec github.list_repos
```

### Machine-readable output

```bash
opentool tools --json | jq '.[] | .id'
opentool status --json | jq '.healthy'
```

### Run diagnostics

```bash
$ opentool doctor

  ✓ Config file     ~/.opentool/config.json found
  ✓ Server URL      http://localhost:3001 is valid
  ✓ Server          reachable (120ms), v0.0.1
  ✓ Auth            API key is set
  ✓ API key         valid
  ✓ Node.js         v20.20.2
  ✓ Terminal        256 colors, 80×24
  ✓ Config writable yes
  ✓ Providers       github, slack, notion connected
```

### Connect a provider

```bash
$ opentool connect github

🔗 Open this URL in your browser to authorize:
https://github.com/login/oauth/authorize?client_id=...

Once authorized, run: opentool tools
```

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

| Variable              | Description                  | Overrides               |
| --------------------- | ---------------------------- | ----------------------- |
| `OPENTOOL_API_KEY`    | API key for authentication   | Config file `apiKey`    |
| `OPENTOOL_SERVER_URL` | Server URL                   | Config file `serverUrl` |
| `OPENTOOL_DEBUG=1`    | Enable debug logging         | `--debug` flag          |
| `NO_COLOR=1`          | Disable colored output       | —                       |
| `FORCE_COLOR=1`       | Force colors (even in pipes) | —                       |

Environment variables take precedence over the config file.

---

## Exit Codes

| Code | Meaning       |
| ---- | ------------- |
| 0    | Success       |
| 1    | General error |
| 2    | Auth error    |
| 3    | Network error |
| 4    | Not found     |
| 5    | Tool error    |

---

## Shell Completions

Generate and install completions for your shell:

```bash
opentool completion --install   # auto-detect and install
opentool completion bash        # print bash completions
opentool completion zsh         # print zsh completions
opentool completion fish        # print fish completions
```
