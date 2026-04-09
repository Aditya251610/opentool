# OpenTool

> One MCP server. All your tools. Fully open-source and self-hosted.

OpenTool gives AI agents secure, authenticated access to your tools via a single MCP connection. Connect GitHub, Notion, Slack, and more — then point any MCP-compatible agent at OpenTool with one API key.

Built for solo developers building with AI agents.

---

## Why OpenTool

| | Arcade | Composio | OpenTool |
|---|---|---|---|
| Open source | Partial | Partial | ✅ Full |
| Self-hostable | ❌ | ❌ | ✅ |
| MCP native | ✅ | ✅ | ✅ |
| Free forever (self-hosted) | ❌ | ❌ | ✅ |

---

## Quickstart (Hosted)

**1. Get your API key**
Sign up at [opentool.dev](https://opentool.dev) → Settings → Generate API key

**2. Connect your tools**
Go to the dashboard → Tools → Connect GitHub, Notion, Slack etc.

**3. Connect your agent**

For Claude Desktop, add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "opentool": {
      "command": "npx",
      "args": ["@opentool/cli", "mcp", "start"],
      "env": {
        "OPENTOOL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

For Claude Code:
```bash
npx @opentool/cli init
claude mcp add opentool
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

For complete self-hosting and production deployment guides, see:

- **[Self-Hosting Guide](docs/self-hosting.md)** — Docker Compose, manual setup, reverse proxy configuration, health checks, and backups
- **[Security Guide](docs/security.md)** — Encryption, authentication, threat model, data handling, and vulnerability reporting

Key production checklist:
- Use HTTPS with valid SSL certificates
- Set a strong `TOKEN_ENCRYPTION_KEY` (64 hex characters)
- Configure `SERVER_URL` and `DASHBOARD_URL` for your domain
- Back up your encryption key separately from database backups
- Monitor audit logs for unexpected activity

---

## Supported Tools

| Tool | Status | Actions |
|---|---|---|
| GitHub | ✅ | Create issue, create PR, comment, read repo |
| Notion | ✅ | Create page, query database, update block |
| Slack | ✅ | Send message, read channel |
| Linear | ✅ | Create issue, update status |
| Gmail | ✅ | Send, read, search |
| Google Calendar | ✅ | Create event, list events |
| Stripe | ✅ | Create payment link, read customer |
| Vercel | ✅ | Trigger deploy, read status |
| Postgres | ✅ | Execute query |
| Resend | ✅ | Send email |

Want a tool added? [Open an issue](https://github.com/Aditya251610/opentool/issues) or [contribute a tool](#contributing-a-tool).

---

## Project Structure
```
opentool/
├── apps/
│   ├── server/          # MCP server + Auth broker + REST API (Hono)
│   │   └── tools/       # Tool definitions
│   └── dashboard/       # Next.js dashboard
├── packages/
│   ├── sdk/             # @opentool/sdk — TypeScript SDK
│   ├── tool-schema/     # Shared tool definition types
│   └── cli/             # @opentool/cli
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
    param: z.string().describe('What this param does')
  }),
  execute: async ({ input, auth }) => {
    // auth.accessToken available here
    // return result
  }
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
- **Protocol** — MCP (Model Context Protocol) TypeScript SDK
- **SDKs** — TypeScript + Python
- **Monorepo** — Turborepo + pnpm

---

## Documentation

Full docs at [`docs/`](docs/README.md):

- [Quickstart](docs/quickstart.md) — Zero to connected tools in 5 minutes
- [Self-Hosting](docs/self-hosting.md) — Docker or manual setup
- [Configuration](docs/configuration.md) — Every env var and OAuth setup
- [Architecture](docs/architecture.md) — How it all fits together
- [Authentication](docs/authentication.md) — OAuth flows and token management
- [Tools](docs/tools.md) — All 10 providers, 23 actions
- [MCP Integration](docs/mcp-integration.md) — Claude, Cursor, any MCP client
- [SDK Reference](docs/sdk-reference.md) — TypeScript and Python
- [CLI Reference](docs/cli-reference.md) — Terminal tool management
- [API Reference](docs/api-reference.md) — Every REST endpoint
- [Contributing a Tool](docs/contributing-a-tool.md) — Add a provider in ~100 lines
- [Security](docs/security.md) — Encryption, tokens, threat model
- [Troubleshooting](docs/troubleshooting.md) — Common issues and fixes

---

## Roadmap

- [x] Core MCP server
- [x] OAuth auth broker
- [x] Dashboard
- [x] CLI
- [x] TypeScript SDK
- [x] Python SDK
- [ ] Team/org support
- [ ] Tool marketplace
- [ ] Usage analytics
- [ ] Webhook support

---

## License

MIT — use it, fork it, self-host it, build on it.