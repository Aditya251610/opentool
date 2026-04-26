# Troubleshooting

> Things that go wrong and how to fix them. Because they will.

---

## Server Won't Start

### "Can't reach database"

```
Error: Can't reach database server at `host`:`port`
```

**Fix:**

- Check `DATABASE_URL` in `apps/server/.env`
- Make sure your PostgreSQL is running
- If using Neon/Supabase, check that the connection string includes `?sslmode=require`
- If using Docker Compose, make sure the postgres container is healthy: `docker-compose ps`

### "REDIS connection refused"

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Fix:**

- Start Redis: `redis-server` or `docker run -d -p 6379:6379 redis:7-alpine`
- Check `REDIS_URL` in `.env`

### "TOKEN_ENCRYPTION_KEY is not set"

**Fix:**
Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add it to `apps/server/.env`.

---

## OAuth Issues

### "Provider is not enabled"

```json
{
  "error": "Provider \"github\" is not enabled — set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env, then re-run the seed."
}
```

**Fix:**

1. Add the credentials to `apps/server/.env`
2. Re-seed: `cd apps/server && npx tsx prisma/seed.ts`
3. Restart the server

### "redirect_uri did not match"

The OAuth provider rejected the callback URL.

**Fix:**

- Make sure the redirect URI in your OAuth app settings **exactly matches** `{SERVER_URL}/api/auth/callback/{provider}`
- Check `SERVER_URL` in `.env` — if using ngrok, it must be the ngrok URL
- No trailing slashes
- HTTPS required in production

### "Token exchange failed: 401"

The code-for-token exchange was rejected.

**Common causes:**

- **Wrong client secret** — double-check it in `.env`
- **Expired code** — OAuth codes expire in ~5 minutes. Try again.
- **Client secret changed** — if you rotated the secret, update `.env` and re-seed

### Notion shows "connection failed"

Notion requires **Basic Auth** for token exchange (not client_secret in body). If you're seeing 401s on the callback:

**Fix:** Make sure you're on the latest code. OpenTool handles Notion's auth quirk automatically. If still failing:

- Verify you created a **Public** integration (not Internal)
- Check Client ID and Secret are from the OAuth section, not the Internal integration token

### Google returns "500 error"

This is a **Google-side error**, not yours. Common when:

- You just enabled the Gmail/Calendar API and it hasn't propagated
- Google's OAuth infrastructure is having a moment

**Fix:** Wait 2-3 minutes and try again.

### Slack says "doesn't have a bot user to install"

**Fix:** Add at least one **Bot Token Scope** in your Slack app settings:

- Go to [api.slack.com/apps](https://api.slack.com/apps) → your app → **OAuth & Permissions**
- Under **Bot Token Scopes**, add: `channels:read`, `chat:write`, `users:read`

---

## Dashboard Issues

### Dashboard can't reach server

```
Failed to fetch
```

**Fix:**

- Check that the server is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `apps/dashboard/.env.local` matches the server URL
- If using ngrok, add `allowedDevOrigins` to `apps/dashboard/next.config.js`:
  ```js
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.io']
  ```

### "Unauthorized" after login

Your API key might be expired or revoked.

**Fix:**

- Log out and log back in (creates a fresh session key)
- Check that the server is running and accessible

### Tools show as "not connected" after connecting

The connected tools list is fetched on page load.

**Fix:**

- Hard refresh the page (Ctrl+Shift+R)
- Check the server logs — is the callback returning 302 (success) or an error?

---

## CLI Issues

### "command not found: opentool"

**Fix:**

```bash
# Install globally
npm install -g opentool-cli

# Or use npx
npx opentool-cli
```

### "Unable to connect to server"

**Fix:**

```bash
opentool> set-url http://localhost:3001
opentool> status
```

Make sure the server is running and the URL is correct.

---

## Docker Issues

### Containers keep restarting

Check logs:

```bash
docker-compose logs server
docker-compose logs dashboard
```

Common causes:

- Missing or invalid `.env` file
- Database not ready (migrate container failed)
- Port conflicts (3000 or 3001 already in use)

### "migrate" container fails

```bash
docker-compose logs migrate
```

Usually means:

- Database isn't reachable from within Docker (check `DATABASE_URL`)
- Schema changes that conflict with existing data

**Fix:**

```bash
docker-compose down
docker volume rm opentool_pgdata  # ⚠️ Deletes all data
docker-compose up -d
```

---

## Token Issues

### "Failed to decrypt token"

The `TOKEN_ENCRYPTION_KEY` changed since the token was stored.

**Fix:** There's no way to recover tokens encrypted with a different key. Users need to disconnect and reconnect their tools.

**Prevention:** Never change `TOKEN_ENCRYPTION_KEY` unless it's been compromised. Back it up separately.

### Tokens expire immediately

Some providers issue short-lived tokens (Linear: 24h, Google: 1h). OpenTool auto-refreshes tokens if a refresh_token is available.

If auto-refresh fails:

- Check the server logs for refresh errors
- The user may have revoked access on the provider's side
- Disconnect and reconnect the provider

---

## ngrok Issues

### "1 simultaneous agent session"

Free ngrok only allows one tunnel at a time.

**Fix:**

- Stop any other ngrok sessions: check [dashboard.ngrok.com/agents](https://dashboard.ngrok.com/agents)
- Or use a single tunnel and route traffic with ngrok's config

### ngrok URL changed

Free ngrok assigns a new URL every time you restart.

**Fix:**

1. Update `SERVER_URL` in `apps/server/.env` with the new URL
2. Update redirect URIs in **every** OAuth provider's settings
3. Re-seed: `npx tsx prisma/seed.ts`
4. Restart server

This is why ngrok is for development only. In production, use a stable domain.

---

## Still Stuck?

1. Check server logs (the `tsx watch` output shows every request)
2. Check the audit_logs table for error details
3. Open an issue at [github.com/Aditya251610/opentool/issues](https://github.com/Aditya251610/opentool/issues)
