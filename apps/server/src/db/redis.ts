/**
 * Shared Redis connection module.
 * All server code should import Redis clients from here — no direct `new Redis()` elsewhere.
 */
import Redis from 'ioredis'
import { config } from '../config'
import { logger } from '../logger'

// Main Redis client — general purpose (caching, locks, pub/sub)
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 5) return null
    return Math.min(times * 200, 2000)
  },
})

// Rate-limit Redis client — separate connection to avoid blocking main client
export const rateLimitRedis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableOfflineQueue: false,
})

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message })
})

rateLimitRedis.on('error', (err) => {
  logger.error('Rate-limit Redis connection error', { error: err.message })
})

/** Gracefully disconnect all Redis clients */
export async function disconnectRedis(): Promise<void> {
  redis.disconnect()
  rateLimitRedis.disconnect()
}
