import { Hono, Context, Next } from 'hono'
import { logger as honoLogger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { compress } from 'hono/compress'
import { serve } from '@hono/node-server'
import Redis from 'ioredis'
import { config } from './config'
import { logger } from './logger'
import { captureException } from './error-tracking'
import { prisma } from './db/client'
import { api } from './api'
import { handleMcpStreamable, closeAllMcpSessions } from './mcp/transport'
import { metrics, httpRequests } from './metrics'

const app = new Hono()
const redis = new Redis(config.redisUrl)
const rateLimitRedis = new Redis(config.redisUrl)

// Graceful shutdown state
let isShuttingDown = false
const activeRequests = new Set<string>()

/**
 * Redis-backed sliding-window rate limiter
 * Uses INCR + EXPIRE for distributed rate limiting across multiple instances
 * @param maxRequests - Maximum requests allowed
 * @param windowSeconds - Time window in seconds
 */
const createRateLimiter = (maxRequests: number, windowSeconds: number) => {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('cf-connecting-ip') ||
      'unknown'
    const key = `ot:ratelimit:${ip}`

    try {
      const current = await rateLimitRedis.incr(key)

      // Set expiration only on first request in window
      if (current === 1) {
        await rateLimitRedis.expire(key, windowSeconds)
      }

      if (current > maxRequests) {
        const ttl = await rateLimitRedis.ttl(key)
        logger.warn('Rate limit exceeded', { ip, current, maxRequests, ttl })
        return c.json(
          {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Max 20 requests per minute.',
            retryAfter: ttl > 0 ? ttl : 1,
          },
          429,
        )
      }
    } catch (error) {
      logger.error('Rate limiter error', { error, ip })
      // If Redis is down, allow the request (fail-open for rate limiting)
    }

    await next()
  }
}

// Shutdown check middleware
const shutdownMiddleware = async (c: Context, next: Next) => {
  if (isShuttingDown) {
    logger.warn('Request received during shutdown')
    return c.json({ error: 'Service is shutting down' }, 503)
  }

  const requestId = `${Date.now()}-${Math.random()}`
  activeRequests.add(requestId)

  try {
    await next()
  } finally {
    activeRequests.delete(requestId)
  }
}

// HTTP requests metrics middleware
const metricsMiddleware = async (c: Context, next: Next) => {
  const method = c.req.method
  const path = c.req.routePath || c.req.path
  httpRequests.inc({ method, path })
  await next()
}

// Security & compression
app.use('*', secureHeaders())
app.use('*', compress())
app.use('*', shutdownMiddleware)
app.use('*', metricsMiddleware)

// CORS — restrict to dashboard origin in production
app.use(
  '*',
  cors(config.nodeEnv === 'production' ? { origin: config.dashboardUrl } : { origin: '*' }),
)

// Rate limiting for sensitive routes (20 requests per minute per IP)
const authKeysRateLimiter = createRateLimiter(20, 60)
app.use('/api/auth/*', authKeysRateLimiter)
app.use('/api/keys/*', authKeysRateLimiter)
app.use('/api/users/*', authKeysRateLimiter)

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use('*', honoLogger())
}

// Liveness probe — always returns 200
app.get('/health/live', (c) => {
  return c.json({ status: 'ok' }, 200)
})

// Metrics endpoint — Prometheus text format
app.get('/metrics', (c) => {
  return c.text(metrics.toPrometheus(), 200, {
    'Content-Type': 'text/plain; version=0.0.4',
  })
})

// Readiness probe — checks DB + Redis connectivity
app.get('/health/ready', async (c) => {
  const [dbResult, redisResult] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ])

  const dbOk = dbResult.status === 'fulfilled'
  const redisOk = redisResult.status === 'fulfilled'

  const status = dbOk && redisOk ? 'ok' : 'degraded'

  return c.json(
    {
      status,
      db: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    },
    status === 'ok' ? 200 : 503,
  )
})

// Backwards compatibility: /health as alias for /health/ready
app.get('/health', async (c) => {
  const [dbResult, redisResult] = await Promise.allSettled([
    prisma.$queryRaw`SELECT 1`,
    redis.ping(),
  ])

  const dbOk = dbResult.status === 'fulfilled'
  const redisOk = redisResult.status === 'fulfilled'

  const status = dbOk && redisOk ? 'ok' : 'degraded'

  return c.json(
    {
      status,
      db: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
    },
    status === 'ok' ? 200 : 503,
  )
})

app.route('/api', api)
app.all('/mcp', handleMcpStreamable)

// Return 404 for OAuth discovery endpoints so MCP clients know OAuth is not required
app.get('/.well-known/oauth-authorization-server', (c) =>
  c.json({ error: 'OAuth is not supported. Use Bearer token authentication.' }, 404),
)
app.get('/.well-known/oauth-protected-resource', (c) =>
  c.json({ error: 'OAuth is not supported. Use Bearer token authentication.' }, 404),
)
app.all('/authorize', (c) =>
  c.json({ error: 'OAuth is not supported. Use Bearer token in Authorization header.' }, 404),
)
app.all('/token', (c) =>
  c.json({ error: 'OAuth is not supported. Use Bearer token in Authorization header.' }, 404),
)
app.all('/register', (c) =>
  c.json({ error: 'OAuth is not supported. Use Bearer token in Authorization header.' }, 404),
)

// Global error handler — captures exceptions to error tracking service
app.onError((err, c) => {
  if (err instanceof Error) {
    captureException(err, {
      operation: 'http_request',
    })
  }
  logger.error('Unhandled HTTP error', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`)
  isShuttingDown = true

  // Set a 15-second timeout to force exit
  const forceExitTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded, forcing exit')
    process.exit(1)
  }, 15000).unref()

  // Wait up to 10s for in-flight requests to complete
  let waitTime = 0
  const waitInterval = 100
  const maxWait = 10000

  while (activeRequests.size > 0 && waitTime < maxWait) {
    logger.info('Waiting for in-flight requests', { count: activeRequests.size, waitTime })
    await new Promise((resolve) => setTimeout(resolve, waitInterval))
    waitTime += waitInterval
  }

  if (activeRequests.size > 0) {
    logger.warn('Timeout waiting for requests', { remaining: activeRequests.size })
  } else {
    logger.info('All in-flight requests completed')
  }

  // Disconnect from services
  logger.info('Closing MCP sessions and disconnecting from database and cache')
  await closeAllMcpSessions()
  await prisma.$disconnect()
  redis.disconnect()
  rateLimitRedis.disconnect()

  clearTimeout(forceExitTimer)
  logger.info('Graceful shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export { app }

// Periodic audit log cleanup (runs once on startup, then every 24h)
const AUDIT_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000
async function cleanupAuditLogs() {
  try {
    const { AUDIT_LOG_RETENTION_DAYS } = await import('./constants')
    const cutoff = new Date(Date.now() - AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } })
    if (result.count > 0) {
      logger.info('Audit log cleanup', { deleted: result.count, olderThan: cutoff.toISOString() })
    }
  } catch (err) {
    logger.warn('Audit log cleanup failed', {
      error: err instanceof Error ? err.message : 'unknown',
    })
  }
}
// Run cleanup on startup (delayed 30s) and then every 24h
// Both timers are unref'd so they don't prevent graceful process exit
const auditStartupTimer = setTimeout(cleanupAuditLogs, 30_000)
auditStartupTimer.unref()
const auditCleanupTimer = setInterval(cleanupAuditLogs, AUDIT_CLEANUP_INTERVAL)
auditCleanupTimer.unref()

serve({ fetch: app.fetch, port: config.port }, () => {
  logger.info('🚀 OpenTool server running', { port: config.port })
})
