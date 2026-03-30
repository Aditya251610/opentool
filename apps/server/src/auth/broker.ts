import { prisma } from '../db/client'
import { encrypt, decrypt, hashApiKey } from './encryption'
import Redis from 'ioredis'
import { ConnectionStatus } from '@prisma/client'

const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379')

const CACHE_PREFIX = 'token'
const DEFAULT_TTL = 3600

function cacheKey(userId: string, provider: string): string {
  return `${CACHE_PREFIX}:${userId}:${provider}`
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
}

// ─────────────────────────────────────────
// FUNCTIONS
// ─────────────────────────────────────────

export async function resolveApiKey(rawKey: string): Promise<ResolvedUser | null> {
  const keyHash = hashApiKey(rawKey)

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  })

  // not found, revoked, or expired
  if (!apiKey) return null
  if (apiKey.revokedAt) return null
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

  // update lastUsedAt — fire and forget, don't block the response
  prisma.apiKey.update({
    where: { keyHash },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  return {
    id: apiKey.user.id,
    email: apiKey.user.email,
    name: apiKey.user.name,
  }
}

export async function getTokenForUser(
  userId: string,
  provider: string
): Promise<TokenData | null> {
  // check Redis cache first
  const cached = await redis.get(cacheKey(userId, provider))
  if (cached) {
    const parsed = JSON.parse(cached)
    return {
      ...parsed,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
    }
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
  const refreshToken = tokenStore.refreshTokenEnc
    ? decrypt(tokenStore.refreshTokenEnc)
    : null

  const tokenData: TokenData = {
    accessToken,
    refreshToken,
    expiresAt: tokenStore.accessTokenExpiry,
    scopes: tokenStore.scopes,
  }

  // cache with TTL
  const ttl = tokenStore.accessTokenExpiry
    ? Math.floor((tokenStore.accessTokenExpiry.getTime() - Date.now()) / 1000)
    : DEFAULT_TTL

  if (ttl > 0) {
    await redis.set(cacheKey(userId, provider), JSON.stringify(tokenData), 'EX', ttl)
  }

  return tokenData
}

export async function storeToken(params: StoreTokenParams): Promise<void> {
  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { provider: params.provider },
  })

  if (!oauthProvider) {
    throw new Error(`Unknown provider: ${params.provider}`)
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
    },
    create: {
      connectionId: connection.id,
      accessTokenEnc,
      refreshTokenEnc,
      accessTokenExpiry: params.expiresAt ?? null,
      scopes: params.scopes,
    },
  })

  // invalidate cache
  await redis.del(cacheKey(params.userId, params.provider))
}

export async function refreshTokenIfExpired(
  userId: string,
  provider: string
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

  // not expired — return current token
  if (tokenStore.accessTokenExpiry && tokenStore.accessTokenExpiry > new Date()) {
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
    return null
  }

  const data = await res.json() as {
    access_token: string
    refresh_token?: string
    expires_in?: number
  }

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : undefined

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

  await redis.del(cacheKey(userId, provider))
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

async function getProviderIdBySlug(provider: string): Promise<string> {
  const p = await prisma.oAuthProvider.findUnique({
    where: { provider },
    select: { id: true },
  })
  if (!p) throw new Error(`Unknown provider: ${provider}`)
  return p.id
}