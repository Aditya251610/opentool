# Tools

> Every tool, every action, every provider. Connect once, use everything.

OpenTool ships with **26 providers** and **133 tool actions**. Each tool is a discrete action your AI agent can call via MCP.

---

## Provider Overview

### Developer & DevOps

| Provider                  | Auth Type | Tools | Status    |
| ------------------------- | --------- | ----- | --------- |
| [GitHub](#github)         | OAuth2    | 7     | ✅ Stable |
| [GitLab](#gitlab)         | OAuth2    | 8     | ✅ Stable |
| [Linear](#linear)         | OAuth2    | 3     | ✅ Stable |
| [Vercel](#vercel)         | OAuth2    | 2     | ✅ Stable |
| [Docker Hub](#docker-hub) | API Key   | 4     | ✅ Stable |
| [Sentry](#sentry)         | OAuth2    | 7     | ✅ Stable |

### Cloud Platforms

| Provider                  | Auth Type       | Tools | Status    |
| ------------------------- | --------------- | ----- | --------- |
| [AWS](#aws)               | API Key         | 8     | ✅ Stable |
| [GCP](#gcp)               | Service Account | 7     | ✅ Stable |
| [Azure](#azure)           | OAuth2          | 7     | ✅ Stable |
| [Cloudflare](#cloudflare) | API Key         | 6     | ✅ Stable |

### Productivity & Communication

| Provider                            | Auth Type | Tools | Status    |
| ----------------------------------- | --------- | ----- | --------- |
| [Gmail](#gmail)                     | OAuth2    | 3     | ✅ Stable |
| [Google Calendar](#google-calendar) | OAuth2    | 2     | ✅ Stable |
| [Google Drive](#google-drive)       | OAuth2    | 6     | ✅ Stable |
| [Google Meet](#google-meet)         | OAuth2    | 3     | ✅ Stable |
| [Microsoft 365](#microsoft-365)     | OAuth2    | 8     | ✅ Stable |
| [Notion](#notion)                   | OAuth2    | 3     | ✅ Stable |
| [Slack](#slack)                     | OAuth2    | 3     | ✅ Stable |
| [Jira](#jira)                       | OAuth2    | 7     | ✅ Stable |
| [Confluence](#confluence)           | OAuth2    | 6     | ✅ Stable |

### Messaging & Notifications

| Provider              | Auth Type | Tools | Status    |
| --------------------- | --------- | ----- | --------- |
| [Telegram](#telegram) | API Key   | 5     | ✅ Stable |
| [Discord](#discord)   | API Key   | 5     | ✅ Stable |
| [Twilio](#twilio)     | API Key   | 4     | ✅ Stable |

### Payments & Data

| Provider                  | Auth Type         | Tools | Status    |
| ------------------------- | ----------------- | ----- | --------- |
| [Stripe](#stripe)         | OAuth2            | 2     | ✅ Stable |
| [PayPal](#paypal)         | OAuth2            | 8     | ✅ Stable |
| [Resend](#resend)         | API Key           | 1     | ✅ Stable |
| [PostgreSQL](#postgresql) | Connection String | 5     | ✅ Stable |

---

## GitHub

Create issues, open PRs, comment, search code, and query repos. The bread and butter.

| Tool ID                   | Name                | Description                                 |
| ------------------------- | ------------------- | ------------------------------------------- |
| `github_create_issue`     | Create Issue        | Create a new issue in a repository          |
| `github_list_issues`      | List Issues         | List issues for a repository (with filters) |
| `github_create_pr`        | Create Pull Request | Open a new pull request                     |
| `github_comment_on_issue` | Comment on Issue    | Add a comment to an issue or PR             |
| `github_get_repo`         | Get Repository      | Get repository details                      |
| `github_search_code`      | Search Code         | Search code across a repository             |
| `github_get_pr_diff`      | Get PR Diff         | Get the diff of a pull request              |

**Required scopes:** `repo`, `read:user`, `user:email`

**Example:** "Create an issue in my repo titled 'Add webhook support' with a description"

---

## GitLab

Full project lifecycle — issues, merge requests, pipelines, and search.

| Tool ID                             | Name                 | Description                         |
| ----------------------------------- | -------------------- | ----------------------------------- |
| `gitlab_create_issue`               | Create Issue         | Create a new issue in a project     |
| `gitlab_get_issue`                  | Get Issue            | Get details of a specific issue     |
| `gitlab_create_merge_request`       | Create Merge Request | Open a new merge request            |
| `gitlab_get_merge_request`          | Get Merge Request    | Get details of a merge request      |
| `gitlab_list_merge_request_commits` | List MR Commits      | List commits in a merge request     |
| `gitlab_list_pipelines`             | List Pipelines       | List CI/CD pipelines for a project  |
| `gitlab_get_pipeline_jobs`          | Get Pipeline Jobs    | Get jobs for a specific pipeline    |
| `gitlab_search`                     | Search               | Search across projects, issues, MRs |

**Required scopes:** `api`, `read_user`

**Example:** "List the last 5 pipelines for my project and show which ones failed"

---

## Linear

Create issues and manage statuses for teams that track work in Linear.

| Tool ID                | Name          | Description                            |
| ---------------------- | ------------- | -------------------------------------- |
| `linear_create_issue`  | Create Issue  | Create a new issue in Linear           |
| `linear_update_status` | Update Status | Update the status of an existing issue |
| `linear_search_issues` | Search Issues | Search issues across Linear workspace  |

**Required scopes:** `read`, `write`

**Example:** "Create a Linear issue titled 'Fix login redirect bug' assigned to Frontend team"

---

## Vercel

Check deployments and their status.

| Tool ID                   | Name             | Description                          |
| ------------------------- | ---------------- | ------------------------------------ |
| `vercel_list_deployments` | List Deployments | List recent deployments              |
| `vercel_get_deployment`   | Get Deployment   | Get details of a specific deployment |

**Required scopes:** Configured via Vercel integration

**Example:** "Show me the last 5 deployments for my Vercel project"

---

## Docker Hub

Search images, inspect tags, and check vulnerabilities.

| Tool ID                            | Name                | Description                              |
| ---------------------------------- | ------------------- | ---------------------------------------- |
| `docker_search_images`             | Search Images       | Search Docker Hub for images             |
| `docker_get_image`                 | Get Image           | Get details about a Docker image         |
| `docker_list_tags`                 | List Tags           | List available tags for an image         |
| `docker_get_image_vulnerabilities` | Get Vulnerabilities | Check known vulnerabilities for an image |

**Auth type:** API Key (set `DOCKER_USERNAME` and `DOCKER_ACCESS_TOKEN` in `.env`)

**Example:** "Search Docker Hub for Node.js images and list tags for the official one"

---

## Sentry

Monitor errors, manage issues, and investigate events.

| Tool ID                     | Name               | Description                            |
| --------------------------- | ------------------ | -------------------------------------- |
| `sentry_list_organizations` | List Organizations | List Sentry organizations              |
| `sentry_list_projects`      | List Projects      | List projects in an organization       |
| `sentry_list_issues`        | List Issues        | List unresolved issues for a project   |
| `sentry_get_issue`          | Get Issue          | Get details of a specific issue        |
| `sentry_get_event`          | Get Event          | Get details of a specific event        |
| `sentry_resolve_issue`      | Resolve Issue      | Mark an issue as resolved              |
| `sentry_search_issues`      | Search Issues      | Search issues with Sentry query syntax |

**Required scopes:** `project:read`, `event:read`, `org:read`

**Example:** "Show me the top 5 unresolved Sentry issues from the last 24 hours"

---

## AWS

Manage EC2, S3, Lambda, EKS, and CloudWatch from your agent.

| Tool ID                      | Name                   | Description                            |
| ---------------------------- | ---------------------- | -------------------------------------- |
| `aws_list_ec2_instances`     | List EC2 Instances     | List all EC2 instances in a region     |
| `aws_describe_ec2_instance`  | Describe EC2 Instance  | Get details of a specific EC2 instance |
| `aws_list_s3_buckets`        | List S3 Buckets        | List all S3 buckets                    |
| `aws_list_s3_objects`        | List S3 Objects        | List objects in an S3 bucket           |
| `aws_list_lambda_functions`  | List Lambda Functions  | List all Lambda functions              |
| `aws_invoke_lambda`          | Invoke Lambda          | Invoke a Lambda function               |
| `aws_list_eks_clusters`      | List EKS Clusters      | List EKS Kubernetes clusters           |
| `aws_get_cloudwatch_metrics` | Get CloudWatch Metrics | Get metrics from CloudWatch            |

**Auth type:** API Key (set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` in `.env`)

**Example:** "List all running EC2 instances in us-east-1 and show their instance types"

---

## GCP

Manage Compute Engine, GKE, Cloud Functions, and Cloud Storage.

| Tool ID                   | Name                | Description                        |
| ------------------------- | ------------------- | ---------------------------------- |
| `gcp_list_instances`      | List Instances      | List Compute Engine instances      |
| `gcp_get_instance`        | Get Instance        | Get details of a specific instance |
| `gcp_list_gke_clusters`   | List GKE Clusters   | List GKE Kubernetes clusters       |
| `gcp_list_functions`      | List Functions      | List Cloud Functions               |
| `gcp_list_buckets`        | List Buckets        | List Cloud Storage buckets         |
| `gcp_list_bucket_objects` | List Bucket Objects | List objects in a storage bucket   |
| `gcp_get_project`         | Get Project         | Get project details                |

**Auth type:** Service Account (set `GCP_SERVICE_ACCOUNT_KEY`, `GCP_PROJECT_ID` in `.env`)

**Example:** "List all GKE clusters in my project and show their node counts"

---

## Azure

Manage subscriptions, resource groups, VMs, AKS, storage, and functions.

| Tool ID                       | Name                  | Description                            |
| ----------------------------- | --------------------- | -------------------------------------- |
| `azure_list_subscriptions`    | List Subscriptions    | List Azure subscriptions               |
| `azure_list_resource_groups`  | List Resource Groups  | List resource groups in a subscription |
| `azure_list_vms`              | List VMs              | List virtual machines                  |
| `azure_get_vm`                | Get VM                | Get details of a specific VM           |
| `azure_list_aks_clusters`     | List AKS Clusters     | List AKS Kubernetes clusters           |
| `azure_list_storage_accounts` | List Storage Accounts | List storage accounts                  |
| `azure_list_functions`        | List Functions        | List Azure Functions                   |

**Auth type:** OAuth2 (set `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` in `.env`)

**Example:** "List all VMs in my Azure subscription and show their sizes"

---

## Cloudflare

Manage DNS, zones, workers, and purge cache.

| Tool ID                        | Name              | Description                   |
| ------------------------------ | ----------------- | ----------------------------- |
| `cloudflare_list_zones`        | List Zones        | List all Cloudflare zones     |
| `cloudflare_list_dns_records`  | List DNS Records  | List DNS records for a zone   |
| `cloudflare_create_dns_record` | Create DNS Record | Create a new DNS record       |
| `cloudflare_update_dns_record` | Update DNS Record | Update an existing DNS record |
| `cloudflare_purge_cache`       | Purge Cache       | Purge cache for a zone        |
| `cloudflare_list_workers`      | List Workers      | List Cloudflare Workers       |

**Auth type:** API Key (set `CLOUDFLARE_API_TOKEN` in `.env`)

**Example:** "List all DNS records for my domain and add an A record pointing to my server"

---

## Gmail

Send, read, and search emails. The three things you actually do with email.

| Tool ID               | Name          | Description                           |
| --------------------- | ------------- | ------------------------------------- |
| `gmail_send_email`    | Send Email    | Send an email via Gmail               |
| `gmail_read_email`    | Read Email    | Read a specific email by ID           |
| `gmail_search_emails` | Search Emails | Search emails with Gmail query syntax |

**Required scopes:** `gmail.send`, `gmail.readonly`

**Example:** "Search my Gmail for emails from john@example.com in the last week"

---

## Google Calendar

Create events and list your schedule.

| Tool ID                        | Name         | Description             |
| ------------------------------ | ------------ | ----------------------- |
| `google_calendar_create_event` | Create Event | Create a calendar event |
| `google_calendar_list_events`  | List Events  | List upcoming events    |

**Required scopes:** `calendar`

**Example:** "Create a meeting tomorrow at 2pm called 'Sprint Planning' for 1 hour"

---

## Google Drive

List, search, create, share, and manage files in Google Drive.

| Tool ID                     | Name         | Description                     |
| --------------------------- | ------------ | ------------------------------- |
| `google_drive_list_files`   | List Files   | List files in Drive             |
| `google_drive_search_files` | Search Files | Search files by name or content |
| `google_drive_get_file`     | Get File     | Get file metadata and content   |
| `google_drive_create_file`  | Create File  | Create a new file in Drive      |
| `google_drive_share_file`   | Share File   | Share a file with users         |
| `google_drive_delete_file`  | Delete File  | Delete a file from Drive        |

**Required scopes:** `drive` (uses existing Google OAuth)

**Example:** "Search my Google Drive for files containing 'Q4 report' and share the latest one"

---

## Google Meet

Create and manage video meetings via Google Calendar API.

| Tool ID                      | Name           | Description              |
| ---------------------------- | -------------- | ------------------------ |
| `google_meet_create_meeting` | Create Meeting | Create a new Google Meet |
| `google_meet_list_meetings`  | List Meetings  | List upcoming meetings   |
| `google_meet_get_meeting`    | Get Meeting    | Get details of a meeting |

**Required scopes:** `calendar` (uses existing Google OAuth with conference data)

**Example:** "Create a Google Meet for tomorrow's standup at 9am"

---

## Microsoft 365

Outlook email, Calendar events, and Teams messaging — all via Microsoft Graph.

| Tool ID                          | Name                 | Description                       |
| -------------------------------- | -------------------- | --------------------------------- |
| `microsoft_list_emails`          | List Emails          | List recent emails in Outlook     |
| `microsoft_send_email`           | Send Email           | Send an email via Outlook         |
| `microsoft_search_emails`        | Search Emails        | Search emails with query syntax   |
| `microsoft_list_events`          | List Events          | List calendar events              |
| `microsoft_create_event`         | Create Event         | Create a new calendar event       |
| `microsoft_list_teams`           | List Teams           | List Microsoft Teams              |
| `microsoft_list_channels`        | List Channels        | List channels in a Team           |
| `microsoft_send_channel_message` | Send Channel Message | Post a message to a Teams channel |

**Auth type:** OAuth2 (set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` in `.env`)

**Example:** "Search my Outlook for emails about the budget review and forward the latest to my team"

---

## Notion

Create pages, query databases, and update blocks. Your workspace, programmatically.

| Tool ID                 | Name           | Description                                                   |
| ----------------------- | -------------- | ------------------------------------------------------------- |
| `notion_create_page`    | Create Page    | Create a new page in a database or as a child of another page |
| `notion_query_database` | Query Database | Query a Notion database with filters and sorts                |
| `notion_update_block`   | Update Block   | Update the content of a block                                 |

**Required scopes:** Configured via Notion integration capabilities

**Example:** "Add a new row to my Tasks database in Notion with title 'Review PR #42' and status 'In Progress'"

---

## Slack

Send messages, read channels, and search across your workspace.

| Tool ID                 | Name            | Description                          |
| ----------------------- | --------------- | ------------------------------------ |
| `slack_send_message`    | Send Message    | Send a message to a Slack channel    |
| `slack_read_channel`    | Read Channel    | Read recent messages from a channel  |
| `slack_search_messages` | Search Messages | Search messages across the workspace |

**Required scopes:** `channels:read`, `chat:write`, `users:read`, `search:read`

**Example:** "Send a message to #general saying 'Deploy complete for v2.1.0'"

---

## Jira

Full issue lifecycle — projects, search, create, update, comment, and transitions.

| Tool ID                 | Name             | Description                                    |
| ----------------------- | ---------------- | ---------------------------------------------- |
| `jira_list_projects`    | List Projects    | List all Jira projects                         |
| `jira_search_issues`    | Search Issues    | Search issues with JQL                         |
| `jira_get_issue`        | Get Issue        | Get details of a specific issue                |
| `jira_create_issue`     | Create Issue     | Create a new issue                             |
| `jira_update_issue`     | Update Issue     | Update an existing issue                       |
| `jira_add_comment`      | Add Comment      | Add a comment to an issue                      |
| `jira_list_transitions` | List Transitions | List available status transitions for an issue |

**Auth type:** OAuth2 via Atlassian (set `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET` in `.env`)

**Example:** "Search Jira for all open bugs assigned to me and move the oldest one to 'In Progress'"

---

## Confluence

Create and manage wiki pages and spaces.

| Tool ID                     | Name           | Description                      |
| --------------------------- | -------------- | -------------------------------- |
| `confluence_list_spaces`    | List Spaces    | List all Confluence spaces       |
| `confluence_search_content` | Search Content | Search pages and blog posts      |
| `confluence_get_page`       | Get Page       | Get a specific page with content |
| `confluence_create_page`    | Create Page    | Create a new page                |
| `confluence_update_page`    | Update Page    | Update an existing page          |
| `confluence_list_pages`     | List Pages     | List pages in a space            |

**Auth type:** OAuth2 via Atlassian (shares `ATLASSIAN_CLIENT_ID`, `ATLASSIAN_CLIENT_SECRET` with Jira)

**Example:** "Search Confluence for our API documentation and update the authentication section"

---

## Telegram

Send messages, photos, and interact with your Telegram bot.

| Tool ID                 | Name         | Description                     |
| ----------------------- | ------------ | ------------------------------- |
| `telegram_get_me`       | Get Bot Info | Get information about the bot   |
| `telegram_send_message` | Send Message | Send a text message to a chat   |
| `telegram_get_updates`  | Get Updates  | Get recent messages and updates |
| `telegram_get_chat`     | Get Chat     | Get chat details                |
| `telegram_send_photo`   | Send Photo   | Send a photo to a chat          |

**Auth type:** API Key (set `TELEGRAM_BOT_TOKEN` in `.env`)

**Example:** "Send a Telegram message to my DevOps channel with the latest deployment status"

---

## Discord

List servers, channels, and send messages via your Discord bot.

| Tool ID                 | Name          | Description                       |
| ----------------------- | ------------- | --------------------------------- |
| `discord_list_guilds`   | List Guilds   | List servers the bot is in        |
| `discord_list_channels` | List Channels | List channels in a server         |
| `discord_send_message`  | Send Message  | Send a message to a channel       |
| `discord_get_message`   | Get Message   | Get a specific message            |
| `discord_list_messages` | List Messages | List recent messages in a channel |

**Auth type:** API Key (set `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID` in `.env`)

**Example:** "Send a message to #deployments in my Discord server announcing the new release"

---

## Twilio

Send SMS and WhatsApp messages, and manage message history.

| Tool ID                | Name          | Description                       |
| ---------------------- | ------------- | --------------------------------- |
| `twilio_send_sms`      | Send SMS      | Send an SMS message               |
| `twilio_send_whatsapp` | Send WhatsApp | Send a WhatsApp message           |
| `twilio_list_messages` | List Messages | List recent messages              |
| `twilio_get_message`   | Get Message   | Get details of a specific message |

**Auth type:** API Key (set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM` in `.env`)

**Example:** "Send an SMS to +1234567890 saying 'Your order has shipped'"

---

## Stripe

Payment links and customer management.

| Tool ID                      | Name                | Description                  |
| ---------------------------- | ------------------- | ---------------------------- |
| `stripe_create_payment_link` | Create Payment Link | Create a Stripe payment link |
| `stripe_list_customers`      | List Customers      | List Stripe customers        |

**Required scopes:** `read_write`

**Example:** "Create a payment link for $49.99 with the description 'Pro Plan Monthly'"

---

## PayPal

Invoices, orders, refunds, transactions, and product management.

| Tool ID                    | Name              | Description                     |
| -------------------------- | ----------------- | ------------------------------- |
| `paypal_create_invoice`    | Create Invoice    | Create a new invoice            |
| `paypal_list_invoices`     | List Invoices     | List all invoices               |
| `paypal_send_invoice`      | Send Invoice      | Send an invoice to a customer   |
| `paypal_create_order`      | Create Order      | Create a new payment order      |
| `paypal_get_order`         | Get Order         | Get details of an order         |
| `paypal_create_refund`     | Create Refund     | Refund a captured payment       |
| `paypal_list_transactions` | List Transactions | List recent transactions        |
| `paypal_create_product`    | Create Product    | Create a product in the catalog |

**Auth type:** OAuth2 (set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` in `.env`)

**Example:** "Create an invoice for $500 for consulting services and send it to client@example.com"

---

## Resend

Transactional emails via API key. No OAuth dance.

| Tool ID             | Name       | Description                           |
| ------------------- | ---------- | ------------------------------------- |
| `resend_send_email` | Send Email | Send a transactional email via Resend |

**Auth type:** API Key (set `RESEND_API_KEY` in `.env`)

**Example:** "Send a welcome email via Resend to user@example.com"

---

## PostgreSQL

Execute SQL queries, inspect schema, and run transactions against your database.

| Tool ID                    | Name            | Description                                                |
| -------------------------- | --------------- | ---------------------------------------------------------- |
| `postgres_execute_query`   | Execute Query   | Run a SQL query against the configured PostgreSQL database |
| `postgres_list_tables`     | List Tables     | List all tables in the database with row counts            |
| `postgres_describe_table`  | Describe Table  | Get column names, types, and constraints for a table       |
| `postgres_run_transaction` | Run Transaction | Execute multiple SQL statements atomically                 |
| `postgres_explain_query`   | Explain Query   | Run EXPLAIN ANALYZE on a query                             |

**Auth type:** Connection String (set `POSTGRES_CONNECTION_STRING` in `.env`)

**Example:** "Run a query to get the top 10 users by sign-up date"

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
