# Privacy Policy

**Last updated:** April 2025

## Overview

OpenTool is an open-source, self-hosted tool. When you run OpenTool on your own infrastructure, **you control all the data**. Nothing phones home. No analytics. No telemetry.

## What OpenTool Stores

When self-hosted, OpenTool stores the following in **your** database:

- **User accounts** — email, name, hashed password
- **API keys** — SHA-256 hashed (raw key shown once, never stored)
- **OAuth tokens** — AES-256-GCM encrypted access/refresh tokens for connected providers
- **Audit logs** — tool execution records (action, status, duration, sanitized inputs)

All data lives on your server. OpenTool has no access to it.

## Third-Party Services

When you connect a provider (GitHub, Slack, Notion, etc.), OpenTool initiates an OAuth flow with that provider. The provider's own privacy policy governs how they handle your data. OpenTool only stores the access token (encrypted) to make API calls on your behalf.

## Data Encryption

- OAuth tokens: AES-256-GCM with a key you generate and control (`TOKEN_ENCRYPTION_KEY`)
- API keys: SHA-256 hashed before storage
- Provider client secrets: AES-256-GCM encrypted at rest

## Data Deletion

Delete your account or revoke a provider connection, and the associated tokens are removed from the database and Redis cache immediately.

## No Tracking

OpenTool does not:
- Collect analytics or telemetry
- Use cookies for tracking
- Share data with third parties
- Phone home to any external service

## Contact

If you have questions, open an issue at [github.com/Aditya251610/opentool](https://github.com/Aditya251610/opentool/issues).
