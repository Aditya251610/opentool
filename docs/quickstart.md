# Quickstart

> Zero to connected tools in 5 minutes. No, really.

This guide gets you from "I just cloned this" to "my AI agent is using GitHub tools." If you want the full self-hosting guide with Docker, see [Self-Hosting](./self-hosting.md).

---

## Prerequisites

- **Node.js** 18+ and **pnpm** installed
- **PostgreSQL** database (we recommend [Neon](https://neon.tech) — free tier is plenty)
- **Redis** running locally (`brew install redis && redis-server` or use Docker)

---

## 1. Clone and Install

```bash
git clone https://github.com/Aditya251610/opentool.git
cd opentool
pnpm install
```

---

## 2. Set Up Environment

```bash
cp .env.example apps/server/.env
```

Edit `apps/server/.env` with your values:

```bash
# Database (Neon pooled + direct URLs)
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"

# Redis
REDIS_URL=redis://localhost:6379

# URLs
SERVER_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000

# Generate this (run the command below)
TOKEN_ENCRYPTION_KEY=
```

Generate your encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Set Up Database

```bash
cd apps/server
npx prisma db push    # Create tables
npx tsx prisma/seed.ts # Seed providers and tools
```

You'll see output like:

```
🌱 Seeding database...
  ⏭️  Provider: GitHub (no credentials — disabled)
  ⏭️  Provider: Notion (no credentials — disabled)
  ...
  ✓ Tool: github.create_issue
  ✓ Tool: github.list_issues
  ...
✅ Seed complete
```

Don't worry about the "disabled" providers — we'll connect those next.

---

## 4. Start the Server

```bash
# From repo root
pnpm dev
```

This starts both the server (`:3001`) and dashboard (`:3000`) via Turborepo.

Open [http://localhost:3000](http://localhost:3000) — you should see the OpenTool dashboard.

---

## 5. Create an Account

1. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Enter your email, name, and password
3. You'll be logged in with an auto-generated API key

---

## 6. Connect a Tool

Let's connect GitHub as a first example.

### Create a GitHub OAuth App

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Fill in:
   - **Application name:** `OpenTool`
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3001/api/auth/callback/github`
3. Copy the **Client ID** and generate a **Client Secret**

### Add to `.env`

```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

### Re-seed and Restart

```bash
cd apps/server
npx tsx prisma/seed.ts
# Restart the server (Ctrl+C and pnpm dev again, or it auto-reloads with tsx watch)
```

Now seed shows `✅ Provider: GitHub`.

### Connect in Dashboard

Go to **Dashboard → Tools → GitHub → Connect**. Authorize the OAuth app. Done.

---

## 7. Connect Your AI Agent

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

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

### Claude Code

```bash
npx @opentool/cli init
claude mcp add opentool
```

### Any MCP Client

Point it at `http://localhost:3001/mcp` with your API key as a Bearer token.

---

## 8. Test It

Ask your AI agent:

> "Create a GitHub issue in my repo titled 'Test from OpenTool'"

If it works, congratulations — you just killed a bunch of glue code.

---

## What's Next

- [Connect more tools](./tools.md) — Notion, Slack, Linear, Gmail, Google Calendar, Vercel, Resend, PostgreSQL
- [Self-host with Docker](./self-hosting.md) — Production-ready deployment
- [Use the SDK](./sdk-reference.md) — Build your own integrations
- [Use the CLI](./cli-reference.md) — Manage tools from the terminal
