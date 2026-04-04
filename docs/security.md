# Security

> Your tokens, encrypted. Your data, local. Your infrastructure, auditable.

OpenTool takes security seriously because the whole point is handling sensitive credentials. Here's exactly how everything works — no hand-waving.

---

## Threat Model

OpenTool sits between your AI agent and external services. It handles OAuth tokens, API keys, and user credentials. The security design assumes:

- **The database might be compromised.** All tokens are encrypted at rest with a separate key.
- **API keys might leak.** They can be revoked instantly and are stored as irreversible hashes.
- **The encryption key is the crown jewel.** Protect it like a database password. If it leaks, all stored tokens are exposed.

---

## Encryption

### Tokens at Rest

All OAuth access tokens, refresh tokens, and API key values are encrypted using **AES-256-GCM** before storage.

| Property | Value |
|----------|-------|
| Algorithm | AES-256-GCM |
| Key size | 256 bits (32 bytes) |
| IV | 12 bytes, randomly generated per encryption |
| Auth tag | 16 bytes |
| Storage format | `{iv_hex}:{auth_tag_hex}:{ciphertext_hex}` |

The encryption key (`TOKEN_ENCRYPTION_KEY`) is stored as an environment variable, not in the database. Compromising the database alone does not expose any tokens.

### API Key Storage

User API keys are stored as **SHA-256 hashes**. The raw key is returned once at creation and never stored.

```
User sees:    ot_a1b2c3d4_7e37b6bd...
DB stores:    sha256("ot_a1b2c3d4_7e37b6bd...") → "e3b0c442..."
Display:      ot_a1b2c3d4... (prefix only)
```

This means:
- If the database is dumped, no raw API keys are exposed
- Lost keys cannot be recovered — generate a new one
- Key validation is a hash comparison (constant time not guaranteed, but the hash is one-way)

### OAuth Client Secrets

Provider client secrets (GitHub, Slack, etc.) are also encrypted with AES-256-GCM in the `oauth_providers` table.

---

## Authentication

### API Key Middleware

Every authenticated endpoint goes through `apiKeyMiddleware`:

1. Extract `Authorization: Bearer <key>` header
2. Hash the key with SHA-256
3. Look up the hash in `api_keys` table
4. Check: not revoked, not expired
5. Resolve the associated user
6. Set user context for the request

Failed authentication returns `401 Unauthorized` with no details about why it failed (to prevent enumeration).

### OAuth State Parameter

The OAuth flow uses a `state` parameter to prevent CSRF:

```json
{
  "userId": "cuid...",
  "provider": "github",
  "createdAt": 1704067200000
}
```

This is Base64-encoded and included in the OAuth URL. On callback:
- The state is decoded and validated
- The timestamp must be less than 10 minutes old
- The userId must exist

This prevents:
- CSRF attacks (attacker can't forge a valid state)
- Replay attacks (state expires after 10 minutes)

---

## Network Security

### CORS

The server is configured with CORS that only allows requests from the dashboard origin (`DASHBOARD_URL`). API clients using Bearer auth are not affected by CORS.

### HTTPS

OAuth providers require HTTPS for redirect URIs in production. In development, HTTP with localhost is accepted. For production deployment, always use HTTPS (via reverse proxy, load balancer, or managed hosting).

---

## Data Handling

### What's stored

| Data | Encrypted? | Where |
|------|-----------|-------|
| User email | No | `users` table |
| User password | Hashed (bcrypt) | `users` table |
| API keys | Hashed (SHA-256) | `api_keys` table |
| OAuth access tokens | Yes (AES-256-GCM) | `token_stores` table |
| OAuth refresh tokens | Yes (AES-256-GCM) | `token_stores` table |
| OAuth client secrets | Yes (AES-256-GCM) | `oauth_providers` table |
| Tool input/output | Sanitized snapshot | `audit_logs` table |

### What's NOT stored

- Raw API keys (shown once, stored as hash)
- Raw passwords (stored as bcrypt hash)
- Decrypted tokens (only in memory during execution)

### What's NOT sent anywhere

- No telemetry
- No analytics
- No external API calls except to the providers you explicitly connect
- No "phone home" behavior

This is self-hosted software. Your data stays where you put it.

---

## Audit Logging

Every tool execution and auth event is logged to the `audit_logs` table:

| Field | Description |
|-------|-------------|
| `action` | What happened: `TOOL_EXECUTE`, `TOKEN_REFRESH`, `TOKEN_REVOKE`, etc. |
| `status` | `SUCCESS`, `FAILURE`, or `PENDING` |
| `durationMs` | How long the operation took |
| `inputSnapshot` | Sanitized copy of the input (no secrets) |
| `errorMessage` | Error details if the operation failed |
| `ipAddress` | Request IP (if available) |
| `userAgent` | Request user agent |

Audit logs are immutable — no update or delete operations.

---

## Recommendations

### In Production

- **Use HTTPS everywhere.** OAuth callbacks must use HTTPS.
- **Rotate the encryption key only if compromised.** Changing it invalidates all stored tokens.
- **Use a separate database user** for OpenTool with minimal permissions.
- **Back up your encryption key** separately from your database backups.
- **Set API key expiration** for keys used in CI/CD or temporary contexts.
- **Monitor audit logs** for unexpected tool executions.

### For Development

- **Use test/sandbox credentials** for OAuth providers.
- **ngrok works fine** for OAuth callbacks during development.
- **Redis is optional** in development — the server falls back to DB-only token retrieval if Redis is unavailable.

---

## Reporting Vulnerabilities

Found a security issue? Open a private issue at [github.com/Aditya251610/opentool](https://github.com/Aditya251610/opentool) or email the maintainer directly. Don't open public issues for security vulnerabilities.
