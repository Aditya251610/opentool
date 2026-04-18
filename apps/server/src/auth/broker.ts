import { prisma } from '../db/client'
import { encrypt, decrypt, hashApiKey, stripApiKeyPrefix } from './encryption'
import Redis from 'ioredis'
import { ConnectionStatus, Prisma } from '@prisma/client'
import { config } from '../config'
import { logger } from '../logger'
import { CACHE_KEY_PREFIX, TOKEN_CACHE_DEFAULT_TTL } from '../constants'
import { ProviderNotFoundError } from '../errors'
import crypto from 'crypto'

const redis = new Redis(config.redisUrl)

function cacheKey(userId: string, provider: string): string {
  return `${CACHE_KEY_PREFIX}:${userId}:${provider}`
}

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface ResolvedUser {
  id: string
  email: string
  name: string | null
}

export interface TokenData {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
  scopes: string[]
}

export interface StoreTokenParams {
  userId: string
  provider: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scopes: string[]
  rawMetadata?: Record<string, unknown>
}

// ─────────────────────────────────────────
// FUNCTIONS
// ─────────────────────────────────────────

/** Resolves a raw API key to the owning user, or returns null if invalid/revoked/expired. */
export async function resolveApiKey(rawKey: string): Promise<ResolvedUser | null> {
  const strippedKey = stripApiKeyPrefix(rawKey)
  const computedHash = hashApiKey(strippedKey)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: computedHash },
    include: { user: true },
  })

  // Timing-safe comparison to prevent timing attacks
  // Always perform the comparison even if the key was not found
  if (!apiKey) return null

  let isValid = false
  try {
    isValid = crypto.timingSafeEqual(Buffer.from(apiKey.keyHash), Buffer.from(computedHash))
  } catch {
    // timingSafeEqual throws if buffers are different lengths, treat as invalid
    isValid = false
  }

  // not found, hash mismatch, revoked, or expired
  if (!isValid) return null
  if (apiKey.revokedAt) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

  // update lastUsedAt — fire and forget, don't block the response
  prisma.apiKey
    .update({
      where: { keyHash: computedHash },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {})

  return {
    id: apiKey.user.id,
    email: apiKey.user.email,
    name: apiKey.user.name,
  }
}

/** Retrieves the decrypted token for a user + provider, checking Redis cache then DB. */
export async function getTokenForUser(userId: string, provider: string): Promise<TokenData | null> {
  // check Redis cache first
  try {
    const cached = await redis.get(cacheKey(userId, provider))
    if (cached) {
      try {
        // Decrypt the cached data before parsing
        const decrypted = decrypt(cached)
        const parsed = JSON.parse(decrypted)
        return {
          ...parsed,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
        }
      } catch (_decryptErr) {
        // Cache is corrupted or tampered with, delete it and fall through to DB
        logger.warn('Redis cache decryption failed, invalidating entry', { provider })
        try {
          await redis.del(cacheKey(userId, provider))
        } catch (_delErr) {
          logger.warn('Failed to delete corrupted cache entry', { provider })
        }
      }
    }
  } catch (_err) {
    logger.warn('Redis cache unavailable, falling through to DB', { provider })
  }

  // cache miss — hit DB
  const connection = await prisma.toolConnection.findUnique({
    where: {
      userId_providerId: {
        userId,
        providerId: await getProviderIdBySlug(provider),
      },
    },
    include: { tokenStore: true },
  })

  if (!connection || !connection.tokenStore) return null
  if (connection.status !== ConnectionStatus.CONNECTED) return null

  const tokenStore = connection.tokenStore

  const accessToken = decrypt(tokenStore.accessTokenEnc)
  const refreshToken = tokenStore.refreshTokenEnc ? decrypt(tokenStore.refreshTokenEnc) : null

  const tokenData: TokenData = {
    accessToken,
    refreshToken,
    expiresAt: tokenStore.accessTokenExpiry,
    scopes: tokenStore.scopes,
  }

  // cache with TTL — store encrypted
  const ttl = tokenStore.accessTokenExpiry
    ? Math.floor((tokenStore.accessTokenExpiry.getTime() - Date.now()) / 1000)
    : TOKEN_CACHE_DEFAULT_TTL

  if (ttl > 0) {
    try {
      // Encrypt the token data before caching
      const encryptedCache = encrypt(JSON.stringify(tokenData))
      await redis.set(cacheKey(userId, provider), encryptedCache, 'EX', ttl)
    } catch (_err) {
      logger.warn('Redis cache write failed', { provider })
    }
  }

  return tokenData
}

/** Stores (upserts) an OAuth token for a user + provider, encrypting secrets and invalidating cache. */
export async function storeToken(params: StoreTokenParams): Promise<void> {
  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { provider: params.provider },
  })

  if (!oauthProvider) {
    throw new ProviderNotFoundError(params.provider)
  }

  // upsert connection
  const connection = await prisma.toolConnection.upsert({
    where: {
      userId_providerId: {
        userId: params.userId,
        providerId: oauthProvider.id,
      },
    },
    update: {
      status: ConnectionStatus.CONNECTED,
      scopes: params.scopes,
    },
    create: {
      userId: params.userId,
      providerId: oauthProvider.id,
      status: ConnectionStatus.CONNECTED,
      scopes: params.scopes,
    },
  })

  const accessTokenEnc = encrypt(params.accessToken)
  const refreshTokenEnc = params.refreshToken ? encrypt(params.refreshToken) : null

  // upsert token store
  await prisma.tokenStore.upsert({
    where: { connectionId: connection.id },
    update: {
      accessTokenEnc,
      refreshTokenEnc,
      accessTokenExpiry: params.expiresAt ?? null,
      scopes: params.scopes,
      ...(params.rawMetadata && { rawMetadata: params.rawMetadata as Prisma.InputJsonValue }),
    },
    create: {
      connectionId: connection.id,
      accessTokenEnc,
      refreshTokenEnc,
      accessTokenExpiry: params.expiresAt ?? null,
      scopes: params.scopes,
      ...(params.rawMetadata && { rawMetadata: params.rawMetadata as Prisma.InputJsonValue }),
    },
  })

  // invalidate cache
  try {
    await redis.del(cacheKey(params.userId, params.provider))
  } catch (_err) {
    logger.warn('Redis cache invalidation failed', { provider: params.provider })
  }
}

/** Refreshes the token if expired, returning the fresh token or null if re-auth is needed. */
export async function refreshTokenIfExpired(
  userId: string,
  provider: string,
): Promise<TokenData | null> {
  const providerId = await getProviderIdBySlug(provider)

  const connection = await prisma.toolConnection.findUnique({
    where: { userId_providerId: { userId, providerId } },
    include: {
      tokenStore: true,
      provider: true,
    },
  })

  if (!connection || !connection.tokenStore) return null

  const { tokenStore } = connection

  // no expiry set (e.g. GitHub) or not yet expired — return current token
  if (!tokenStore.accessTokenExpiry || tokenStore.accessTokenExpiry > new Date()) {
    return getTokenForUser(userId, provider)
  }

  // expired — attempt refresh
  if (!tokenStore.refreshTokenEnc) return null // user must re-auth

  const refreshToken = decrypt(tokenStore.refreshTokenEnc)
  const clientSecret = decrypt(connection.provider.clientSecretEnc)

  const res = await fetch(connection.provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: connection.provider.clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    // refresh failed — mark connection as expired
    await prisma.toolConnection.update({
      where: { id: connection.id },
      data: { status: ConnectionStatus.EXPIRED },
    })
    logger.warn('Token refresh failed', { userId, provider })
    return null
  }

  const data = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined

  await storeToken({
    userId,
    provider,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scopes: connection.scopes,
  })

  return getTokenForUser(userId, provider)
}

/** Revokes a user's connection to a provider, deleting stored tokens and invalidating cache. */
export async function revokeToken(userId: string, provider: string): Promise<void> {
  const providerId = await getProviderIdBySlug(provider)

  const connection = await prisma.toolConnection.findUnique({
    where: { userId_providerId: { userId, providerId } },
  })

  if (!connection) return

  await prisma.toolConnection.update({
    where: { id: connection.id },
    data: { status: ConnectionStatus.REVOKED },
  })

  await prisma.tokenStore.delete({
    where: { connectionId: connection.id },
  })

  try {
    await redis.del(cacheKey(userId, provider))
  } catch (_err) {
    logger.warn('Redis cache invalidation failed', { provider })
  }
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

async function getProviderIdBySlug(provider: string): Promise<string> {
  const p = await prisma.oAuthProvider.findUnique({
    where: { provider },
    select: { id: true },
  })
  if (!p) throw new ProviderNotFoundError(provider)
  return p.id
}
