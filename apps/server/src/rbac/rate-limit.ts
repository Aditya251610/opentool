import { Context, Next } from 'hono'
import Redis from 'ioredis'
import { config } from '../config'
import { logger } from '../logger'

// ─────────────────────────────────────────
// PER-ORG RATE LIMITER
// Uses Redis sliding window, tiered by org plan
// ─────────────────────────────────────────

const PLAN_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  free: { maxRequests: 100, windowSeconds: 60 },
  pro: { maxRequests: 500, windowSeconds: 60 },
  enterprise: { maxRequests: 2000, windowSeconds: 60 },
}

const DEFAULT_LIMIT = PLAN_LIMITS.free

let rateLimitRedis: Redis | null = null

function getRateLimitRedis(): Redis {
  if (!rateLimitRedis) {
    rateLimitRedis = new Redis(config.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true })
    rateLimitRedis.on('error', () => {})
  }
  return rateLimitRedis
}

/**
 * Per-org rate limiting middleware.
 * Must be used AFTER orgContextMiddleware (needs `c.get('org')`).
 * Falls open if Redis is unavailable (allows request).
 */
export async function orgRateLimiter(c: Context, next: Next): Promise<Response | void> {
  const org = c.get('org')
  if (!org) {
    // No org context — skip (shouldn't happen if used correctly)
    await next()
    return
  }

  const limits = PLAN_LIMITS[org.plan] ?? DEFAULT_LIMIT
  const key = `ot:org:ratelimit:${org.id}`

  try {
    const redis = getRateLimitRedis()
    const current = await redis.incr(key)

    if (current === 1) {
      await redis.expire(key, limits.windowSeconds)
    }

    // Set rate limit headers
    const remaining = Math.max(0, limits.maxRequests - current)
    c.header('X-RateLimit-Limit', String(limits.maxRequests))
    c.header('X-RateLimit-Remaining', String(remaining))

    if (current > limits.maxRequests) {
      const ttl = await redis.ttl(key)
      c.header('X-RateLimit-Reset', String(ttl > 0 ? ttl : 1))
      c.header('Retry-After', String(ttl > 0 ? ttl : 1))

      logger.warn('Org rate limit exceeded', { orgId: org.id, slug: org.slug, current })
      return c.json(
        {
          error: 'Rate limit exceeded',
          message: `Organization plan '${org.plan}' allows ${limits.maxRequests} requests per minute`,
          retryAfter: ttl > 0 ? ttl : 1,
        },
        429,
      )
    }
  } catch {
    // Redis down — fail open
  }

  await next()
}
