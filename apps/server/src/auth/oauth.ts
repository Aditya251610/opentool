import { prisma } from '../db/client'
import { decrypt } from './encryption'
import { storeToken, getTokenForUser, revokeToken } from './broker'

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface OAuthState {
  userId: string
  provider: string
  createdAt: number
}

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

// ─────────────────────────────────────────
// FUNCTIONS
// ─────────────────────────────────────────

export function generateState(userId: string, provider: string): string {
  const state: OAuthState = {
    userId,
    provider,
    createdAt: Date.now(),
  }
  const json = JSON.stringify(state)
  return Buffer.from(json).toString('base64')
}

export function parseState(state: string): OAuthState | null {
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded) as OAuthState

    if (Date.now() - parsed.createdAt > 10 * 60 * 1000) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export async function generateAuthUrl(
  provider: string,
  userId: string
): Promise<string> {
  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { provider },
  })

  if (!oauthProvider) throw new Error(`Provider "${provider}" not found. Run: npx tsx prisma/seed.ts`)
  if (!oauthProvider.isEnabled) throw new Error(`Provider "${provider}" is not enabled — set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in .env, then re-run the seed.`)
  if (!oauthProvider.clientId) throw new Error(`Provider "${provider}" is not configured — missing OAuth credentials`)

  const serverUrl = process.env['SERVER_URL'] || 'http://localhost:3001'
  const state = generateState(userId, provider)

  const scopeSeparator = provider === 'linear' ? ',' : ' '

  const params = new URLSearchParams({
    client_id: oauthProvider.clientId,
    redirect_uri: `${serverUrl}/api/auth/callback/${provider}`,
    scope: oauthProvider.defaultScopes.join(scopeSeparator),
    state,
    response_type: 'code',
  })

  // Google requires access_type=offline for refresh tokens
  if (provider === 'gmail' || provider === 'gcal') {
    params.set('access_type', 'offline')
    params.set('prompt', 'consent')
  }

  return `${oauthProvider.authUrl}?${params.toString()}`
}

export async function exchangeCode(
  provider: string,
  code: string,
  state: string
): Promise<{ userId: string }> {
  const parsedState = parseState(state)
  if (!parsedState) throw new Error('Invalid or expired state')

  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { provider },
  })
  if (!oauthProvider) throw new Error(`Unknown provider: ${provider}`)

  const clientSecret = decrypt(oauthProvider.clientSecretEnc)

  const redirectUri = `${process.env['SERVER_URL'] || 'http://localhost:3001'}/api/auth/callback/${provider}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  const bodyParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
  }

  if (provider === 'notion') {
    // Notion: Basic Auth with client_id:client_secret, include redirect_uri in body
    headers['Authorization'] = `Basic ${Buffer.from(`${oauthProvider.clientId}:${clientSecret}`).toString('base64')}`
    bodyParams['redirect_uri'] = redirectUri
  } else if (provider === 'stripe') {
    // Stripe: Basic Auth with secret_key as username (empty password), no redirect_uri
    headers['Authorization'] = `Basic ${Buffer.from(`${clientSecret}:`).toString('base64')}`
  } else {
    // Default: client credentials in body
    bodyParams['client_id'] = oauthProvider.clientId
    bodyParams['client_secret'] = clientSecret
    bodyParams['redirect_uri'] = redirectUri
  }

  const res = await fetch(oauthProvider.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(bodyParams),
  })

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Token exchange failed: ${res.status} ${errBody}`)
  }

  const data = await res.json() as OAuthTokenResponse

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000)
    : undefined

  const scopes = data.scope?.split(' ') ?? oauthProvider.defaultScopes

  await storeToken({
    userId: parsedState.userId,
    provider,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scopes,
  })

  return { userId: parsedState.userId }
}

export async function revokeOAuthToken(
  provider: string,
  userId: string
): Promise<void> {
  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { provider },
  })

  if (!oauthProvider?.revokeUrl) {
    await revokeToken(userId, provider)
    return
  }

  const tokenData = await getTokenForUser(userId, provider)
  if (!tokenData) return

  await fetch(oauthProvider.revokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: tokenData.accessToken }),
  })

  await revokeToken(userId, provider)
}