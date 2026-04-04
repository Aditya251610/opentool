# Authentication

> How OpenTool handles auth so you don't have to. Again.

OpenTool manages two types of authentication:

1. **User auth** — How you log into OpenTool itself (email/password + API keys)
2. **Tool auth** — How OpenTool connects to external services on your behalf (OAuth2 + API keys)

---

## User Authentication

### Signup & Login

OpenTool uses email/password authentication. No third-party auth providers, no magic links, no "sign in with 47 different services." Just email and password.

```
POST /api/auth/signup  → { email, password, name }  → { user, apiKey }
POST /api/auth/login   → { email, password }         → { user, apiKey }
```

Passwords are hashed with **bcrypt** (cost factor 12) before storage. The raw password is never stored or logged.

### API Keys

Every authenticated request to OpenTool uses an API key. Here's how they work:

- **Format:** `ot_<8-char-prefix>_<random-hex>` (e.g., `ot_a1b2c3d4_...`)
- **Storage:** Only the **SHA-256 hash** is stored in the database. The raw key is returned once at creation and never again.
- **Validation:** On each request, the server hashes the provided key and looks up the hash.
- **Revocation:** Keys can be revoked (soft delete with `revokedAt` timestamp). Revoked keys are immediately rejected.

```
# Create a key
POST /api/keys  → { name: "my-key" }  → { raw: "ot_...", prefix: "ot_a1b2c3d4", id: "..." }

# List keys (only shows prefixes, never raw values)
GET /api/keys  → [{ id, name, prefix, lastUsedAt, createdAt }]

# Revoke a key
DELETE /api/keys/:id
```

### How Requests Are Authenticated

Every API request (except `/health` and public tool listings) requires:

```
Authorization: Bearer ot_your_api_key_here
```

The `apiKeyMiddleware` extracts the key, hashes it, looks up the user, and sets the user context for downstream routes. If the key is invalid, expired, or revoked — 401.

---

## Tool Authentication (OAuth2)

This is the core value of OpenTool — handling OAuth so your agent doesn't have to.

### The Flow

```
You click "Connect GitHub"
       │
       ▼
OpenTool generates an OAuth URL with:
  - client_id (from your OAuth app)
  - redirect_uri (back to OpenTool)
  - scopes (what permissions to request)
  - state (signed token with userId + provider + timestamp)
       │
       ▼
You authorize on GitHub/Slack/etc.
       │
       ▼
Provider redirects to: /api/auth/callback/{provider}?code=xxx&state=yyy
       │
       ▼
OpenTool:
  1. Validates the state token (must be < 10 minutes old)
  2. Exchanges the authorization code for access + refresh tokens
  3. Encrypts both tokens with AES-256-GCM
  4. Stores them in the database
  5. Caches the access token in Redis
  6. Redirects you to the dashboard with a success message
       │
       ▼
Done. Your agent can now use that provider's tools.
```

### Provider-Specific Quirks

Not every OAuth provider follows the spec the same way. OpenTool handles the differences:

| Provider | Token Exchange Method | Notes |
|----------|----------------------|-------|
| GitHub | `client_secret` in POST body | Standard |
| Vercel | `client_secret` in POST body | Standard |
| Slack | `client_secret` in POST body | Requires bot scopes to be set first |
| Linear | `client_secret` in POST body | Comma-separated scopes (not space-separated) |
| Google | `client_secret` in POST body | Needs `access_type=offline` for refresh tokens |
| Notion | `Authorization: Basic` header | Base64-encoded `client_id:client_secret` |
| Stripe | `Authorization: Basic` header | Secret key as username, empty password |

### Token Refresh

OAuth tokens expire. When a tool execution needs a token and it's expired:

1. Check if a refresh token exists
2. If yes → POST to the provider's token endpoint with `grant_type=refresh_token`
3. Store the new access token (and new refresh token if provided)
4. Retry the original operation

If the refresh fails (e.g., user revoked access on the provider's side), the connection is marked as `EXPIRED` and the user needs to re-authorize.

### Token Storage

All tokens are encrypted at rest using **AES-256-GCM**:

- **Algorithm:** AES-256-GCM with 12-byte IV and 16-byte auth tag
- **Format:** `{iv_hex}:{auth_tag_hex}:{ciphertext_hex}`
- **Key:** 32-byte key from `TOKEN_ENCRYPTION_KEY` env var

The encryption key is separate from the database credentials. Compromising the database alone doesn't expose tokens.

---

## API Key Authentication (Resend, PostgreSQL)

Some providers don't use OAuth — they use static API keys or connection strings. For these:

1. You set the API key in `.env` (e.g., `RESEND_API_KEY`)
2. The seed script stores it encrypted in the provider record
3. When you click "Connect" in the dashboard, it creates a connection entry instantly (no redirect)
4. Tool execution decrypts and uses the key directly

No browser flow, no callbacks, no state management. Just works.

---

## Security Summary

| What | How |
|------|-----|
| User passwords | bcrypt (cost 12) |
| API keys | SHA-256 hash (raw shown once) |
| OAuth tokens | AES-256-GCM encrypted at rest |
| Token cache | Redis with TTL (expires when token expires) |
| State parameter | Base64 JSON with timestamp (expires in 10 min) |
| CORS | Configured for dashboard origin only |

For more details, see [Security](./security.md).
