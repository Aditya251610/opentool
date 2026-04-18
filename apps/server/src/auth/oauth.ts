import crypto from 'crypto'
import { prisma } from '../db/client'
import { decrypt } from './encryption'
import { storeToken, getTokenForUser, revokeToken } from './broker'
import { config } from '../config'
import { OAUTH_STATE_TTL_MS, COMMA_SCOPE_PROVIDERS } from '../constants'
import { ProviderNotFoundError } from '../errors'

// ─────────────────────────────────────────
// PKCE UTILITIES
// ─────────────────────────────────────────

/** Generates a code verifier for PKCE (43-128 character URL-safe string). */
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Generates a code challenge from a verifier using SHA-256. */
function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url')
}

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export interface OAuthState {
  userId: string
  provider: string
  createdAt: number
  codeVerifier: string // PKCE code verifier for secure token exchange
}

export interface OAuthTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  team_id?: string // Vercel integration
  installation_id?: string // Vercel integration
  [key: string]: unknown // other provider-specific fields
}

// ─────────────────────────────────────────
// FUNCTIONS
// ─────────────────────────────────────────

/** Generates a base64-encoded OAuth state parameter containing user ID, provider, timestamp, and PKCE code verifier. */
export function generateState(userId: string, provider: string): string {
  const codeVerifier = generateCodeVerifier()
  const state: OAuthState = {
    userId,
    provider,
    createdAt: Date.now(),
    codeVerifier,
  }
  const json = JSON.stringify(state)
  return Buffer.from(json).toString('base64')
}

/** Parses and validates an OAuth state parameter, returning null if expired or malformed. */
export function parseState(state: string): OAuthState | null {
  try {
    const decoded = Buffer.from(state, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded) as OAuthState

    if (Date.now() - parsed.createdAt > OAUTH_STATE_TTL_MS) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/** Builds the full OAuth authorization URL for a provider, including state, PKCE parameters, and scopes. */
export async function generateAuthUrl(provider: string, userId: string): Promise<string> {
  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { provider },
  })

  if (!oauthProvider) throw new ProviderNotFoundError(provider)
  if (!oauthProvider.isEnabled)
    throw new Error(
      `Provider "${provider}" is not enabled — set ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in .env, then re-run the seed.`,
    )
  if (!oauthProvider.clientId)
    throw new Error(`Provider "${provider}" is not configured — missing OAuth credentials`)

  const serverUrl = config.serverUrl
  const state = generateState(userId, provider)
  const parsedState = parseState(state)
  if (!parsedState) throw new Error('Failed to generate state')

  const codeChallenge = generateCodeChallenge(parsedState.codeVerifier)

  const scopeSeparator = COMMA_SCOPE_PROVIDERS.includes(provider as any) ? ',' : ' '

  const params = new URLSearchParams({
    client_id: oauthProvider.clientId,
    redirect_uri: `${serverUrl}/api/auth/callback/${provider}`,
    scope: oauthProvider.defaultScopes.join(scopeSeparator),
    state,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  // Google requires access_type=offline for refresh tokens
  if (provider === 'gmail' || provider === 'gcal') {
    params.set('access_type', 'offline')
    params.set('prompt', 'consent')
  }

  return `${oauthProvider.authUrl}?${params.toString()}`
}

/** Exchanges an OAuth authorization code for tokens and stores them. */
export async function exchangeCode(
  provider: string,
  code: string,
  state: string,
): Promise<{ userId: string }> {
  const parsedState = parseState(state)
  if (!parsedState) throw new Error('Invalid or expired state')

  const oauthProvider = await prisma.oAuthProvider.findUnique({
    where: { provider },
  })
  if (!oauthProvider) throw new ProviderNotFoundError(provider)

  const clientSecret = decrypt(oauthProvider.clientSecretEnc)

  const redirectUri = `${config.serverUrl}/api/auth/callback/${provider}`

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  const bodyParams: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    code_verifier: parsedState.codeVerifier, // Include PKCE code verifier
  }

  if (provider === 'notion') {
    // Notion: Basic Auth with client_id:client_secret, include redirect_uri in body
    headers['Authorization'] =
      `Basic ${Buffer.from(`${oauthProvider.clientId}:${clientSecret}`).toString('base64')}`
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

  const data = (await res.json()) as OAuthTokenResponse

  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined

  const scopes = data.scope?.split(' ') ?? oauthProvider.defaultScopes

  // Capture provider-specific metadata (e.g. Vercel team_id)
  const rawMetadata: Record<string, unknown> = {}
  if (data.team_id) rawMetadata.team_id = data.team_id
  if (data.installation_id) rawMetadata.installation_id = data.installation_id

  await storeToken({
    userId: parsedState.userId,
    provider,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt,
    scopes,
    ...(Object.keys(rawMetadata).length > 0 && { rawMetadata }),
  })

  return { userId: parsedState.userId }
}

/** Revokes an OAuth token, calling the provider's revoke endpoint if available. */
export async function revokeOAuthToken(provider: string, userId: string): Promise<void> {
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
