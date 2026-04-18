# Tools

> Every tool, every action, every provider. Connect once, use everything.

OpenTool ships with 10 providers and 26 tool actions. Each tool is a discrete action your AI agent can call via MCP.

---

## Provider Overview

| Provider                            | Auth Type | Tools | Status    |
| ----------------------------------- | --------- | ----- | --------- |
| [GitHub](#github)                   | OAuth2    | 5     | ✅ Stable |
| [Notion](#notion)                   | OAuth2    | 3     | ✅ Stable |
| [Slack](#slack)                     | OAuth2    | 2     | ✅ Stable |
| [Linear](#linear)                   | OAuth2    | 2     | ✅ Stable |
| [Gmail](#gmail)                     | OAuth2    | 3     | ✅ Stable |
| [Google Calendar](#google-calendar) | OAuth2    | 2     | ✅ Stable |
| [Vercel](#vercel)                   | OAuth2    | 2     | ✅ Stable |
| [Stripe](#stripe)                   | OAuth2    | 2     | ✅ Stable |
| [Resend](#resend)                   | API Key   | 1     | ✅ Stable |
| [PostgreSQL](#postgresql)           | API Key   | 4     | ✅ Stable |

---

## GitHub

Create issues, open PRs, comment, and query repos. The bread and butter.

| Tool ID                   | Name                | Description                                 |
| ------------------------- | ------------------- | ------------------------------------------- |
| `github.create_issue`     | Create Issue        | Create a new issue in a repository          |
| `github.list_issues`      | List Issues         | List issues for a repository (with filters) |
| `github.create_pr`        | Create Pull Request | Open a new pull request                     |
| `github.comment_on_issue` | Comment on Issue    | Add a comment to an issue or PR             |
| `github.get_repo`         | Get Repository      | Get repository details                      |

**Required scopes:** `repo`, `read:user`, `user:email`

**Example usage (via AI agent):**

> "Create an issue in Aditya251610/opentool titled 'Add webhook support' with a description of what it should do"

---

## Notion

Create pages, query databases, and update blocks. Your workspace, programmatically.

| Tool ID                 | Name           | Description                                                   |
| ----------------------- | -------------- | ------------------------------------------------------------- |
| `notion.create_page`    | Create Page    | Create a new page in a database or as a child of another page |
| `notion.query_database` | Query Database | Query a Notion database with filters and sorts                |
| `notion.update_block`   | Update Block   | Update the content of a block                                 |

**Required scopes:** Configured via Notion integration capabilities

**Example usage:**

> "Add a new row to my Tasks database in Notion with title 'Review PR #42' and status 'In Progress'"

---

## Slack

Send messages and read channels. No more Slack webhook spaghetti.

| Tool ID              | Name         | Description                         |
| -------------------- | ------------ | ----------------------------------- |
| `slack.send_message` | Send Message | Send a message to a Slack channel   |
| `slack.read_channel` | Read Channel | Read recent messages from a channel |

**Required scopes:** `channels:read`, `chat:write`, `users:read`

**Example usage:**

> "Send a message to #general saying 'Deploy complete for v2.1.0'"

---

## Linear

Create issues and update statuses. For teams that track work in Linear.

| Tool ID                | Name          | Description                            |
| ---------------------- | ------------- | -------------------------------------- |
| `linear.create_issue`  | Create Issue  | Create a new issue in Linear           |
| `linear.update_status` | Update Status | Update the status of an existing issue |

**Required scopes:** `read`, `write`

**Example usage:**

> "Create a Linear issue titled 'Fix login redirect bug' and assign it to the Frontend team"

---

## Gmail

Send, read, and search emails. The three things you actually do with email.

| Tool ID               | Name          | Description                           |
| --------------------- | ------------- | ------------------------------------- |
| `gmail.send_email`    | Send Email    | Send an email via Gmail               |
| `gmail.read_email`    | Read Email    | Read a specific email by ID           |
| `gmail.search_emails` | Search Emails | Search emails with Gmail query syntax |

**Required scopes:** `gmail.send`, `gmail.readonly`

**Example usage:**

> "Search my Gmail for emails from john@example.com in the last week"

---

## Google Calendar

Create events and list your schedule.

| Tool ID             | Name         | Description             |
| ------------------- | ------------ | ----------------------- |
| `gcal.create_event` | Create Event | Create a calendar event |
| `gcal.list_events`  | List Events  | List upcoming events    |

**Required scopes:** `calendar`

**Example usage:**

> "Create a meeting tomorrow at 2pm called 'Sprint Planning' for 1 hour"

---

## Vercel

Check deployments and their status.

| Tool ID                   | Name             | Description                          |
| ------------------------- | ---------------- | ------------------------------------ |
| `vercel.list_deployments` | List Deployments | List recent deployments              |
| `vercel.get_deployment`   | Get Deployment   | Get details of a specific deployment |

**Required scopes:** Configured via Vercel integration

**Example usage:**

> "Show me the last 5 deployments for my Vercel project"

---

## Stripe

Payment links and customer management. (Note: Stripe Connect OAuth is not available in all countries.)

| Tool ID                      | Name                | Description                  |
| ---------------------------- | ------------------- | ---------------------------- |
| `stripe.create_payment_link` | Create Payment Link | Create a Stripe payment link |
| `stripe.list_customers`      | List Customers      | List Stripe customers        |

**Required scopes:** `read_write`

**Example usage:**

> "Create a payment link for $49.99 with the description 'Pro Plan Monthly'"

---

## Resend

Transactional emails via API key. No OAuth dance.

| Tool ID             | Name       | Description                           |
| ------------------- | ---------- | ------------------------------------- |
| `resend.send_email` | Send Email | Send a transactional email via Resend |

**Auth type:** API Key (set `RESEND_API_KEY` in `.env`)

**Example usage:**

> "Send an email via Resend to user@example.com welcoming them to the platform"

---

## PostgreSQL

Execute SQL queries, inspect schema, and run transactions against your database.

| Tool ID                    | Name            | Description                                                |
| -------------------------- | --------------- | ---------------------------------------------------------- |
| `postgres.execute_query`   | Execute Query   | Run a SQL query against the configured PostgreSQL database |
| `postgres.list_tables`     | List Tables     | List all tables in the database with row counts            |
| `postgres.describe_table`  | Describe Table  | Get column names, types, and constraints for a table       |
| `postgres.run_transaction` | Run Transaction | Execute multiple SQL statements atomically                 |

**Auth type:** Connection String (set `POSTGRES_CONNECTION_STRING` in `.env`)

**Example usage:**

> "Run a query to get the top 10 users by sign-up date"

> **⚠️ Security note:** This gives your AI agent raw SQL access to whatever database you connect. Use a read-only connection string or a separate database if you're concerned about destructive queries.

---

## Connecting Tools

### OAuth Providers

1. Add credentials to `apps/server/.env` (see [Configuration](./configuration.md))
2. Re-seed: `npx tsx prisma/seed.ts`
3. Restart server
4. Dashboard → Tools → Click **Connect** → Authorize

### API Key Providers

1. Add the key to `apps/server/.env`
2. Re-seed: `npx tsx prisma/seed.ts`
3. Restart server
4. Dashboard → Tools → Click **Connect** (instant, no redirect)

---

## Want a New Tool?

See [Contributing a Tool](./contributing-a-tool.md). It's about 100 lines of TypeScript to add a new provider.
