# OpenTool

> One MCP server. All your tools. Fully open-source and self-hosted.

OpenTool gives AI agents secure, authenticated access to your tools via a single MCP connection. Connect GitHub, Notion, Slack, and more — then point any MCP-compatible agent at OpenTool with one API key.

Built for solo developers building with AI agents.

[![npm](https://img.shields.io/npm/v/opentool-cli?label=CLI&color=blue)](https://www.npmjs.com/package/opentool-cli)
[![npm](https://img.shields.io/npm/v/@opentool-ts/sdk?label=SDK&color=blue)](https://www.npmjs.com/package/@opentool-ts/sdk)
[![PyPI](https://img.shields.io/pypi/v/opentool?label=Python%20SDK&color=blue)](https://pypi.org/project/opentool/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Why OpenTool

|                            | Arcade  | Composio | OpenTool |
| -------------------------- | ------- | -------- | -------- |
| Open source                | Partial | Partial  | ✅ Full  |
| Self-hostable              | ❌      | ❌       | ✅       |
| MCP native                 | ✅      | ✅       | ✅       |
| Free forever (self-hosted) | ❌      | ❌       | ✅       |
| CLI with REPL              | ❌      | ❌       | ✅       |
| TypeScript + Python SDKs   | ✅      | ✅       | ✅       |

---

## Install

### CLI

```bash
# npm (recommended)
npm i -g opentool-cli

# or run without installing
npx opentool-cli

# or curl installer
curl -fsSL https://raw.githubusercontent.com/Aditya251610/opentool/main/install.sh | bash
```

### SDKs

```bash
# TypeScript
npm i @opentool-ts/sdk

# Python
pip install opentool
```

---

## Quickstart (Hosted)

**1. Get your API key**
Sign up at [opentool.space](https://opentool.space) → Settings → Generate API key

**2. Connect your tools**
Go to the dashboard → Tools → Connect GitHub, Notion, Slack etc.

**3. Connect your agent**

For VS Code / Copilot / Claude Code, add to `mcp.json`:

```json
{
  "servers": {
    "opentool": {
      "type": "http",
      "url": "https://opentool.onrender.com/mcp",
      "headers": {
        "Authorization": "Bearer <TOKEN>"
      }
    }
  }
}
```

**Or use the CLI:**

```bash
opentool init       # guided setup
opentool login      # authenticate
opentool tools      # see your connected tools
opentool            # launch interactive REPL
```

That's it. Your agent now has access to all your connected tools.

---

## Self-Hosting

**Prerequisites:** Docker + Docker Compose

```bash
git clone https://github.com/Aditya251610/opentool
cd opentool
cp .env.example .env
# Fill in your OAuth app credentials in .env
docker-compose up -d
```

Dashboard available at `http://localhost:3000`
MCP server available at `http://localhost:3001`

### Production Deployment

- **[Self-Hosting Guide](docs/self-hosting.md)** — Docker Compose, manual setup, reverse proxy, health checks, backups
- **[Security Guide](docs/security.md)** — Encryption, authentication, threat model, data handling

Key production checklist:

- Use HTTPS with valid SSL certificates
- Set a strong `TOKEN_ENCRYPTION_KEY` (64 hex characters)
- Configure `SERVER_URL` and `DASHBOARD_URL` for your domain
- Back up your encryption key separately from database backups
- CSP and HSTS headers are enabled by default

---

## Supported Tools

10 providers, 26 actions — and growing.

| Tool            | Status | Actions                                                      |
| --------------- | ------ | ------------------------------------------------------------ |
| GitHub          | ✅     | Create issue, list issues, create PR, comment, read repo     |
| Notion          | ✅     | Create page, query database, update block                    |
| Slack           | ✅     | Send message, read channel                                   |
| Linear          | ✅     | Create issue, update status                                  |
| Gmail           | ✅     | Send, read, search                                           |
| Google Calendar | ✅     | Create event, list events                                    |
| Stripe          | ✅     | Create payment link, list customers                          |
| Vercel          | ✅     | List deployments, get deployment                             |
| Postgres        | ✅     | Execute query, list tables, describe schema, run transaction |
| Resend          | ✅     | Send email                                                   |

Want a tool added? [Open an issue](https://github.com/Aditya251610/opentool/issues) or [contribute a tool](#contributing-a-tool).

---

## CLI

The CLI ships with an interactive REPL and scriptable subcommands:

```bash
opentool                    # Launch interactive REPL
opentool tools --json       # List tools (machine-readable)
opentool exec github.list_issues --args '{"owner":"me","repo":"myrepo"}'
opentool doctor             # Run 9-point diagnostics
opentool completion --install  # Shell completions (bash/zsh/fish)
```

**REPL features:** Tab completion, ghost-text suggestions, Ctrl+R history search, fuzzy "did you mean?", readline keybindings, update notifications.

Full reference: [docs/cli-reference.md](docs/cli-reference.md)

---

## Project Structure

```
opentool/
├── apps/
│   ├── server/          # MCP server + Auth broker + REST API (Hono)
│   │   └── tools/       # Tool definitions (10 providers, 26 actions)
│   └── dashboard/       # Next.js dashboard
├── packages/
│   ├── cli/             # opentool-cli — interactive CLI + REPL
│   ├── sdk/ts/          # @opentool-ts/sdk — TypeScript SDK
│   ├── sdk/python/      # opentool — Python SDK
│   └── tool-schema/     # Shared tool definition types
├── install.sh           # curl | sh installer
└── docker-compose.yml
```

---

## Contributing a Tool

Tools are self-contained modules in `apps/server/tools/`. Each tool exports:

```typescript
import { defineTool } from '@opentool/tool-schema'

export const myTool = defineTool({
  id: 'my-tool.action',
  name: 'My Tool Action',
  description: 'What this tool does',
  authType: 'oauth2',
  inputSchema: z.object({
    param: z.string().describe('What this param does'),
  }),
  execute: async ({ input, auth }) => {
    // auth.accessToken available here
    // return result
  },
})
```

1. Fork the repo
2. Add your tool in `apps/server/tools/yourprovider/`
3. Register it in `apps/server/src/registry/index.ts`
4. Add OAuth config in `.env.example`
5. Open a PR

Full guide: [docs/contributing-a-tool.md](docs/contributing-a-tool.md)

---

## Tech Stack

- **Server** — Hono, TypeScript, Prisma, Postgres, Redis
- **Dashboard** — Next.js 14, Auth.js
- **CLI** — TypeScript, Ink (React for terminals), Commander
- **Protocol** — MCP (Model Context Protocol) TypeScript SDK
- **SDKs** — TypeScript ([npm](https://www.npmjs.com/package/@opentool-ts/sdk)) + Python ([PyPI](https://pypi.org/project/opentool/))
- **Monorepo** — Turborepo + pnpm
- **Security** — AES-256-GCM encryption, CSP/HSTS headers, session obfuscation

---

## Documentation

Full docs at [`docs/`](docs/README.md):

- [Quickstart](docs/quickstart.md) — Zero to connected tools in 5 minutes
- [Self-Hosting](docs/self-hosting.md) — Docker or manual setup
- [Configuration](docs/configuration.md) — Every env var and OAuth setup
- [Architecture](docs/architecture.md) — How it all fits together
- [Authentication](docs/authentication.md) — OAuth flows and token management
- [Tools](docs/tools.md) — All 10 providers, 26 actions
- [MCP Integration](docs/mcp-integration.md) — Claude, Cursor, any MCP client
- [SDK Reference](docs/sdk-reference.md) — TypeScript and Python
- [CLI Reference](docs/cli-reference.md) — Terminal tool management
- [API Reference](docs/api-reference.md) — Every REST endpoint
- [Contributing a Tool](docs/contributing-a-tool.md) — Add a provider in ~100 lines
- [Security](docs/security.md) — Encryption, tokens, threat model
- [Troubleshooting](docs/troubleshooting.md) — Common issues and fixes

---

## Roadmap

- [x] Core MCP server with 10 providers, 26 actions
- [x] OAuth auth broker with token encryption
- [x] Dashboard (Next.js)
- [x] CLI with interactive REPL (`opentool-cli` on [npm](https://www.npmjs.com/package/opentool-cli))
- [x] TypeScript SDK (`@opentool-ts/sdk` on [npm](https://www.npmjs.com/package/@opentool-ts/sdk))
- [x] Python SDK (`opentool` on [PyPI](https://pypi.org/project/opentool/))
- [x] Production hardening (CSP, HSTS, retry logic, 211 tests)
- [x] CI/CD with automated releases
- [x] curl installer (`install.sh`)
- [ ] Team/org support
- [ ] Tool marketplace
- [ ] Usage analytics
- [ ] Webhook support
- [ ] Plugin system for custom tools

---

## License

MIT — use it, fork it, self-host it, build on it.
