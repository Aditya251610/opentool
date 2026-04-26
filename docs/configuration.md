# Configuration

> Every env var, every OAuth app, every knob you can turn. No hidden settings.

---

## Environment Variables

All configuration lives in `apps/server/.env`. Here's every variable, what it does, and whether you need it.

### Required

| Variable               | Description                                           | Example                                                                                   |
| ---------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string (pooled, for runtime)    | `postgresql://user:pass@host:6543/db?pgbouncer=true`                                      |
| `DIRECT_URL`           | PostgreSQL connection string (direct, for migrations) | `postgresql://user:pass@host:5432/db`                                                     |
| `REDIS_URL`            | Redis connection string                               | `redis://localhost:6379`                                                                  |
| `TOKEN_ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM encryption            | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Server URLs

| Variable        | Description                                             | Default                 |
| --------------- | ------------------------------------------------------- | ----------------------- |
| `SERVER_URL`    | Public URL of the API server (used for OAuth callbacks) | `http://localhost:3001` |
| `DASHBOARD_URL` | Public URL of the dashboard (OAuth redirects go here)   | `http://localhost:3000` |
| `PORT`          | Port the server listens on                              | `3001`                  |

> **Important:** When using ngrok or a public domain, `SERVER_URL` must match exactly what you put as the redirect URI in each OAuth provider's settings.

### Dashboard

Create `apps/dashboard/.env.local`:

| Variable              | Description           | Default                 |
| --------------------- | --------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | URL of the API server | `http://localhost:3001` |

---

## OAuth Provider Setup

Each provider needs a Client ID and Client Secret. You only need to configure the ones you want to use — the seed script skips unconfigured providers.

### GitHub

| Variable               | Value                      |
| ---------------------- | -------------------------- |
| `GITHUB_CLIENT_ID`     | From your GitHub OAuth App |
| `GITHUB_CLIENT_SECRET` | From your GitHub OAuth App |

**Setup:**

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. **Homepage URL:** Your dashboard URL
3. **Callback URL:** `{SERVER_URL}/api/auth/callback/github`
4. Copy Client ID + generate Client Secret

**Scopes granted:** `repo`, `read:user`, `user:email`

---

### Notion

| Variable               | Value                               |
| ---------------------- | ----------------------------------- |
| `NOTION_CLIENT_ID`     | From your Notion public integration |
| `NOTION_CLIENT_SECRET` | From your Notion public integration |

**Setup:**

1. Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations) → **New integration**
2. Choose **Public** integration (not Internal — Internal doesn't support OAuth)
3. **Redirect URI:** `{SERVER_URL}/api/auth/callback/notion`
4. Submit for review (or use in development mode for testing)

> **Note:** Notion uses Basic Auth for token exchange. OpenTool handles this automatically.

---

### Slack

| Variable              | Value               |
| --------------------- | ------------------- |
| `SLACK_CLIENT_ID`     | From your Slack app |
| `SLACK_CLIENT_SECRET` | From your Slack app |

**Setup:**

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. **OAuth & Permissions** → add **Redirect URL:** `{SERVER_URL}/api/auth/callback/slack`
3. **Bot Token Scopes** → add: `channels:read`, `chat:write`, `users:read`
4. Copy Client ID + Client Secret from **Basic Information**

> **Important:** You must add at least one Bot Token Scope or Slack won't create a bot user and the install will fail.

---

### Linear

| Variable               | Value                      |
| ---------------------- | -------------------------- |
| `LINEAR_CLIENT_ID`     | From your Linear OAuth app |
| `LINEAR_CLIENT_SECRET` | From your Linear OAuth app |

**Setup:**

1. Go to [linear.app/settings/api/applications/new](https://linear.app/settings/api/applications/new)
2. **Callback URL:** `{SERVER_URL}/api/auth/callback/linear`
3. Copy Client ID + Client Secret

**Scopes granted:** `read`, `write`

> **Note:** Linear uses comma-separated scopes (not space-separated). OpenTool handles this automatically.

---

### Google (Gmail + Calendar + Drive + Meet)

Gmail, Google Calendar, Google Drive, and Google Meet use the **same** OAuth credentials. One Google Cloud project, multiple APIs.

| Variable               | Value                     |
| ---------------------- | ------------------------- |
| `GOOGLE_CLIENT_ID`     | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |

**Setup:**

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create or select a project
2. **APIs & Services → Library** → enable:
   - **Gmail API**
   - **Google Calendar API**
   - **Google Drive API**
3. **OAuth consent screen** → External → fill in app name and support email
4. Add yourself as a **test user** (required while in "Testing" status)
5. **Credentials → Create OAuth Client ID** → **Web application**
6. Add redirect URIs for each Google provider:
   - `{SERVER_URL}/api/auth/callback/gmail`
   - `{SERVER_URL}/api/auth/callback/gcal`
   - `{SERVER_URL}/api/auth/callback/gdrive`
   - `{SERVER_URL}/api/auth/callback/gmeet`
7. Copy Client ID + Client Secret

**Gmail scopes:** `gmail.send`, `gmail.readonly`
**Calendar scopes:** `calendar`
**Drive scopes:** `drive`
**Meet scopes:** `calendar` (uses Calendar API for conference data)

> OpenTool automatically adds `access_type=offline` and `prompt=consent` to get refresh tokens.

---

### Vercel

| Variable               | Value                        |
| ---------------------- | ---------------------------- |
| `VERCEL_CLIENT_ID`     | From your Vercel integration |
| `VERCEL_CLIENT_SECRET` | From your Vercel integration |

**Setup:**

1. Go to [vercel.com/dashboard/integrations/console](https://vercel.com/dashboard/integrations/console) → **Create Integration**
2. **Redirect URL:** `{SERVER_URL}/api/auth/callback/vercel`
3. Fill in required fields (name, logo, etc.)
4. Copy Client ID + Client Secret from the integration settings

---

### Stripe

| Variable               | Value                                           |
| ---------------------- | ----------------------------------------------- |
| `STRIPE_CLIENT_ID`     | Connect platform Client ID (`ca_...`)           |
| `STRIPE_CLIENT_SECRET` | API Secret Key (`sk_test_...` or `sk_live_...`) |

**Setup:**

1. Go to [dashboard.stripe.com/settings/connect](https://dashboard.stripe.com/settings/connect)
2. Enable Stripe Connect
3. Add **Redirect URI:** `{SERVER_URL}/api/auth/callback/stripe`
4. Copy the Connect **Client ID** (`ca_...`)
5. Get your **API Secret Key** from Developers → API Keys

> **Note:** Stripe Connect OAuth is not available in all countries (e.g., India). Check Stripe's supported countries list.

> **Note:** Stripe uses Basic Auth with the secret key. OpenTool handles this automatically.

---

### Resend (API Key)

| Variable         | Value                          |
| ---------------- | ------------------------------ |
| `RESEND_API_KEY` | Your Resend API key (`re_...`) |

**Setup:**

1. Go to [resend.com/api-keys](https://resend.com/api-keys) → **Create API Key**
2. Name: `OpenTool`, Permission: **Full access**
3. Copy the key

No OAuth flow needed — Resend connects instantly when you click "Connect" in the dashboard.

---

### PostgreSQL Tool (API Key)

| Variable                     | Value                                              |
| ---------------------------- | -------------------------------------------------- |
| `POSTGRES_CONNECTION_STRING` | PostgreSQL connection string for the tool to query |

**Setup:**
Just provide a connection string. This can be the same database OpenTool uses, or a separate one.

```bash
POSTGRES_CONNECTION_STRING="postgresql://user:pass@host/db?sslmode=require"
```

Like Resend, no OAuth flow — connects instantly from the dashboard.

---

### Atlassian (Jira + Confluence)

Both Jira and Confluence use the **same** Atlassian OAuth credentials.

| Variable                  | Value                                   |
| ------------------------- | --------------------------------------- |
| `ATLASSIAN_CLIENT_ID`     | From your Atlassian OAuth 2.0 (3LO) app |
| `ATLASSIAN_CLIENT_SECRET` | From your Atlassian OAuth 2.0 (3LO) app |

**Setup:**

1. Go to [developer.atlassian.com/console/myapps](https://developer.atlassian.com/console/myapps/) → **Create** → **OAuth 2.0 integration**
2. Under **Authorization** → add callback URL: `{SERVER_URL}/api/auth/callback/jira` and `{SERVER_URL}/api/auth/callback/confluence`
3. Under **Permissions** → add Jira API (`read:jira-work`, `write:jira-work`) and Confluence API (`read:confluence-content.all`, `write:confluence-content`)
4. Copy Client ID + Client Secret from **Settings**

> **Note:** Atlassian requires `audience` parameter and uses a separate accessible resources endpoint to get the cloud ID.

---

### Microsoft 365 (Outlook + Calendar + Teams)

| Variable                  | Value                                                  |
| ------------------------- | ------------------------------------------------------ |
| `MICROSOFT_CLIENT_ID`     | From Azure AD app registration                         |
| `MICROSOFT_CLIENT_SECRET` | From Azure AD app registration                         |
| `MICROSOFT_TENANT_ID`     | Your Azure AD tenant ID (or `common` for multi-tenant) |

**Setup:**

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. **Redirect URI:** `{SERVER_URL}/api/auth/callback/microsoft` (Web platform)
3. **API permissions** → add Microsoft Graph: `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite`, `Team.ReadBasic.All`, `Channel.ReadBasic.All`, `ChannelMessage.Send`
4. **Certificates & secrets** → new client secret
5. Copy Application (client) ID + secret value

---

### Azure

| Variable              | Value                          |
| --------------------- | ------------------------------ |
| `AZURE_CLIENT_ID`     | From Azure AD app registration |
| `AZURE_CLIENT_SECRET` | From Azure AD app registration |
| `AZURE_TENANT_ID`     | Your Azure AD tenant ID        |

**Setup:** Same app registration as Microsoft 365, but add **Azure Service Management** API permissions: `user_impersonation`.

---

### Sentry

| Variable               | Value                   |
| ---------------------- | ----------------------- |
| `SENTRY_CLIENT_ID`     | From Sentry integration |
| `SENTRY_CLIENT_SECRET` | From Sentry integration |

**Setup:**

1. Go to [sentry.io/settings/developer-settings](https://sentry.io/settings/developer-settings/) → **Create New Integration** → **Public**
2. **Redirect URL:** `{SERVER_URL}/api/auth/callback/sentry`
3. **Permissions:** Project (Read), Event (Read), Organization (Read)
4. Copy Client ID + Client Secret

---

### GitLab

| Variable               | Value                   |
| ---------------------- | ----------------------- |
| `GITLAB_CLIENT_ID`     | From GitLab application |
| `GITLAB_CLIENT_SECRET` | From GitLab application |

**Setup:**

1. Go to [gitlab.com/-/user_settings/applications](https://gitlab.com/-/user_settings/applications)
2. **Redirect URI:** `{SERVER_URL}/api/auth/callback/gitlab`
3. **Scopes:** `api`, `read_user`
4. Copy Application ID + Secret

---

### PayPal

| Variable               | Value                           |
| ---------------------- | ------------------------------- |
| `PAYPAL_CLIENT_ID`     | From PayPal Developer Dashboard |
| `PAYPAL_CLIENT_SECRET` | From PayPal Developer Dashboard |

**Setup:**

1. Go to [developer.paypal.com/dashboard/applications](https://developer.paypal.com/dashboard/applications/live)
2. Create an app or use the default sandbox app
3. Copy Client ID + Secret

---

### Cloudflare (API Key)

| Variable               | Value                     |
| ---------------------- | ------------------------- |
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token |

**Setup:**

1. Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token**
2. Use the "Edit zone DNS" template or create custom with Zone/DNS/Worker permissions
3. Copy the token

---

### AWS (API Key)

| Variable                | Value                              |
| ----------------------- | ---------------------------------- |
| `AWS_ACCESS_KEY_ID`     | Your AWS access key                |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key                |
| `AWS_REGION`            | Default region (e.g., `us-east-1`) |

**Setup:**

1. Go to [IAM Console](https://console.aws.amazon.com/iam/) → Users → create or select a user
2. Create access key under **Security credentials**
3. Attach appropriate policies (EC2, S3, Lambda, EKS, CloudWatch read access)

---

### GCP (Service Account)

| Variable                  | Value                                   |
| ------------------------- | --------------------------------------- |
| `GCP_SERVICE_ACCOUNT_KEY` | Base64-encoded service account JSON key |
| `GCP_PROJECT_ID`          | Your GCP project ID                     |

**Setup:**

1. Go to [Cloud Console](https://console.cloud.google.com) → **IAM & Admin** → **Service Accounts**
2. Create a service account with Viewer/Editor role
3. Create a JSON key → base64 encode it: `base64 -w 0 key.json`

---

### Telegram (API Key)

| Variable             | Value          |
| -------------------- | -------------- |
| `TELEGRAM_BOT_TOKEN` | From BotFather |

**Setup:**

1. Message [@BotFather](https://t.me/botfather) on Telegram → `/newbot`
2. Copy the bot token

---

### Discord (API Key)

| Variable                 | Value                         |
| ------------------------ | ----------------------------- |
| `DISCORD_BOT_TOKEN`      | From Discord Developer Portal |
| `DISCORD_APPLICATION_ID` | From Discord Developer Portal |

**Setup:**

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) → **New Application**
2. **Bot** → copy the bot token
3. **OAuth2** → copy the Application ID
4. Invite the bot to your server with appropriate permissions

---

### Twilio (API Key)

| Variable               | Value                                                       |
| ---------------------- | ----------------------------------------------------------- |
| `TWILIO_ACCOUNT_SID`   | Your Twilio Account SID                                     |
| `TWILIO_AUTH_TOKEN`    | Your Twilio Auth Token                                      |
| `TWILIO_SMS_FROM`      | Your Twilio phone number for SMS                            |
| `TWILIO_WHATSAPP_FROM` | Your Twilio WhatsApp number (e.g., `whatsapp:+14155238886`) |

**Setup:**

1. Go to [twilio.com/console](https://www.twilio.com/console)
2. Copy Account SID and Auth Token from the dashboard
3. Get a phone number for SMS and/or enable WhatsApp sandbox

---

### Docker Hub (API Key)

| Variable              | Value                            |
| --------------------- | -------------------------------- |
| `DOCKER_USERNAME`     | Your Docker Hub username         |
| `DOCKER_ACCESS_TOKEN` | Docker Hub personal access token |

**Setup:**

1. Go to [hub.docker.com/settings/security](https://hub.docker.com/settings/security) → **New Access Token**
2. Copy the token

---

### Neon (API Key)

| Variable       | Value             |
| -------------- | ----------------- |
| `NEON_API_KEY` | Your Neon API key |

**Setup:**

1. Go to [console.neon.tech/app/settings/api-keys](https://console.neon.tech/app/settings/api-keys)
2. Create and copy an API key

---

## After Adding Credentials

Every time you add or change OAuth credentials in `.env`:

```bash
cd apps/server
npx tsx prisma/seed.ts   # Re-seed to update provider enablement
# Restart the server
```

The seed script checks for the presence of credentials and enables/disables providers accordingly. If you see `⏭️ Provider: X (no credentials — disabled)`, that provider's env vars aren't set.

---

## Encryption Key

The `TOKEN_ENCRYPTION_KEY` is critical:

- Used to encrypt/decrypt all OAuth tokens and API keys at rest
- Must be **exactly 32 bytes** (64 hex characters)
- **If you lose or change it, all stored tokens become unreadable** — users will need to re-connect their tools
- Store it securely. Treat it like a database password.

Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
