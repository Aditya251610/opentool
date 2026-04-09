import { Hono, Context, Next } from 'hono'
import { logger as honoLogger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { compress } from 'hono/compress'
import { serve } from '@hono/node-server'
import Redis from 'ioredis'
import { config } from './config'
import { logger } from './logger'
import { prisma } from './db/client'
import { api } from './api'
import { handleMcpHono } from './mcp/transport'

const app = new Hono()
const redis = new Redis(config.redisUrl)

/**
 * Simple in-memory sliding-window rate limiter
 * Stores: { count, resetAt } for each IP
 */
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  let cleaned = 0
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(ip)
      cleaned++
    }
  }
  if (cleaned > 0) {
    logger.debug('Rate limiter cleanup', { cleaned, remaining: rateLimitStore.size })
  }
}, 5 * 60 * 1000)

/**
 * Rate limiter middleware factory
 * @param maxRequests - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 */
const createRateLimiter = (maxRequests: number, windowMs: number) => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown'
    const now = Date.now()

    const entry = rateLimitStore.get(ip)

    // Check if we need to reset
    if (!entry || entry.resetAt < now) {
      rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs })
      await next()
      return
    }

    // Increment count
    entry.count++

    // Check limit
    if (entry.count > maxRequests) {
      logger.warn('Rate limit exceeded', { ip, count: entry.count, maxRequests })
      return c.json(
        {
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Max 20 requests per minute.',
        },
        429,
      )
    }

    await next()
  }
}

// Security & compression
app.use('*', secureHeaders())
app.use('*', compress())

// CORS — restrict to dashboard origin in production
app.use(
  '*',
  cors(
    config.nodeEnv === 'production'
      ? { origin: config.dashboardUrl }
      : { origin: '*' },
  ),
)

// Rate limiting for sensitive routes (20 requests per minute per IP)
const authKeysRateLimiter = createRateLimiter(20, 60 * 1000)
app.use('/api/auth/*', authKeysRateLimiter)
app.use('/api/keys/*', authKeysRateLimiter)

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use('*', honoLogger())
}

// Health check — verify DB + Redis connectivity
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
app.post('/mcp', handleMcpHono)
app.get('/mcp', (c) => c.json({ error: 'Use POST /mcp to connect' }, 405))

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`)
  await prisma.$disconnect()
  redis.disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

serve({ fetch: app.fetch, port: config.port }, () => {
  logger.info('🚀 OpenTool server running', { port: config.port })
})