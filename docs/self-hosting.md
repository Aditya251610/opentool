# Self-Hosting

> Your tokens, your infrastructure, your rules. That's the whole point.

OpenTool is designed to run on your own servers. No phoning home, no telemetry, no "contact sales for the self-hosted plan." You clone it, you run it, you own it.

---

## Docker Compose (Recommended)

The fastest way to get everything running. One command, five services, zero drama.

### Prerequisites

- Docker and Docker Compose installed
- A `.env` file with your configuration

### Steps

```bash
git clone https://github.com/Aditya251610/opentool.git
cd opentool
cp .env.example .env
```

Edit `.env` with your OAuth credentials (see [Configuration](./configuration.md) for the full list).

```bash
docker-compose up -d
```

That's it. Five containers come up:

| Service | Port | What it does |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL 16 database |
| `redis` | 6379 | Redis 7 cache |
| `migrate` | — | Runs Prisma migrations + seed on startup, then exits |
| `server` | 3001 | Hono API server + MCP endpoint |
| `dashboard` | 3000 | Next.js dashboard |

### Verify

```bash
curl http://localhost:3001/health
# → {"status":"ok"}
```

Dashboard: [http://localhost:3000](http://localhost:3000)

---

## What Docker Compose Does

Here's the boot sequence so you know what's happening:

1. **Postgres** starts and waits for healthcheck (`pg_isready`)
2. **Redis** starts and waits for healthcheck (`redis-cli ping`)
3. **Migrate** container runs `prisma migrate deploy` then `tsx prisma/seed.ts`, then exits
4. **Server** starts after migrate succeeds, exposes port 3001
5. **Dashboard** starts after server is healthy, exposes port 3000

All services use internal Docker networking. Only ports 3000 and 3001 are exposed to the host.

---

## Manual Setup (No Docker)

If you prefer running things directly, or want more control over your stack.

### Requirements

- Node.js 18+
- pnpm 9+
- PostgreSQL 14+ (local or hosted — Neon, Supabase, RDS, etc.)
- Redis 6+ (local or hosted — Upstash, ElastiCache, etc.)

### Install

```bash
git clone https://github.com/Aditya251610/opentool.git
cd opentool
pnpm install
```

### Configure

```bash
cp .env.example apps/server/.env
```

Fill in your database URLs, Redis URL, and encryption key. See [Configuration](./configuration.md) for details.

### Database

```bash
cd apps/server
npx prisma db push       # Create/update schema
npx tsx prisma/seed.ts    # Seed providers + tools
```

### Dashboard Environment

Create `apps/dashboard/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Run

```bash
# From repo root — starts both server and dashboard
pnpm dev
```

Or run them separately:

```bash
# Terminal 1 — Server
cd apps/server && pnpm dev

# Terminal 2 — Dashboard
cd apps/dashboard && pnpm dev
```

---

## Production Deployment

### Environment Considerations

- **`SERVER_URL`** must be the publicly accessible URL for your server (for OAuth callbacks)
- **`DASHBOARD_URL`** must be the publicly accessible URL for your dashboard (for OAuth redirects)
- Use **HTTPS** in production — OAuth providers require it for callback URIs
- **`TOKEN_ENCRYPTION_KEY`** must be consistent across deploys — changing it invalidates all stored tokens

### Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/opentool
server {
    listen 443 ssl;
    server_name opentool.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Dashboard
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API + MCP
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /mcp {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Health Checks

The server exposes `GET /health` which returns `{"status":"ok"}`. Use this for load balancer health checks, uptime monitoring, and container orchestration.

### Database Backups

If you're using the Docker Compose Postgres, set up pg_dump on a cron:

```bash
# Backup daily at 3am
0 3 * * * docker exec opentool-postgres-1 pg_dump -U postgres opentool > /backups/opentool-$(date +\%Y\%m\%d).sql
```

If you're using Neon or Supabase, they handle backups for you.

---

## Updating

```bash
cd opentool
git pull origin main

# If using Docker:
docker-compose down
docker-compose up -d --build

# If running manually:
pnpm install
cd apps/server
npx prisma db push
npx tsx prisma/seed.ts
# Restart your processes
```

The migrate container handles schema changes automatically on Docker restarts.

---

## Troubleshooting

See [Troubleshooting](./troubleshooting.md) for common issues. The short version:

- **Can't connect to database?** → Check `DATABASE_URL` and `DIRECT_URL`
- **OAuth callback failing?** → Make sure `SERVER_URL` matches your OAuth app's redirect URI
- **Tokens not decrypting?** → `TOKEN_ENCRYPTION_KEY` must be the same one used when tokens were stored
- **Redis connection refused?** → Check `REDIS_URL` and that Redis is running
