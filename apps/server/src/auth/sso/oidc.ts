// OIDC (OpenID Connect) SSO Provider implementation
// Supports Google Workspace, Okta, Azure AD, and custom OIDC providers

import type { SsoProvider, SsoProviderConfig, SsoUserProfile } from './types.js'
import { createHash, randomBytes } from 'node:crypto'

interface OidcDiscovery {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  issuer: string
  jwks_uri: string
}

interface OidcTokenResponse {
  access_token: string
  id_token: string
  token_type: string
  expires_in: number
}

interface OidcUserInfo {
  sub: string
  email: string
  email_verified?: boolean
  name?: string
  given_name?: string
  family_name?: string
  groups?: string[]
}

export class OidcProvider implements SsoProvider {
  private discovery: OidcDiscovery | null = null

  constructor(private config: SsoProviderConfig) {}

  async getLoginUrl(state: string): Promise<string> {
    const discovery = await this.getDiscovery()
    const nonce = randomBytes(16).toString('hex')

    const url = new URL(discovery.authorization_endpoint)
    url.searchParams.set('client_id', this.config.clientId!)
    url.searchParams.set('redirect_uri', this.config.callbackUrl)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('state', state)
    url.searchParams.set('nonce', nonce)

    return url.toString()
  }

  async validateCallback(params: Record<string, string>): Promise<SsoUserProfile> {
    const { code } = params
    if (!code) throw new Error('Missing authorization code')

    const discovery = await this.getDiscovery()

    // Exchange code for tokens
    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.callbackUrl,
        client_id: this.config.clientId!,
        client_secret: this.config.clientSecret!,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      throw new Error(`Token exchange failed: ${err}`)
    }

    const tokens = (await tokenRes.json()) as OidcTokenResponse

    // Fetch user info
    const userRes = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userRes.ok) throw new Error('Failed to fetch user info')

    const userInfo = (await userRes.json()) as OidcUserInfo

    if (!userInfo.email) throw new Error('No email in user info')

    return {
      email: userInfo.email.toLowerCase(),
      name:
        userInfo.name ||
        [userInfo.given_name, userInfo.family_name].filter(Boolean).join(' ') ||
        undefined,
      idpUserId: userInfo.sub,
      idpSessionId: createHash('sha256').update(tokens.access_token).digest('hex').slice(0, 16),
      groups: userInfo.groups,
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (!this.config.clientId) return { success: false, error: 'Missing clientId' }
    if (!this.config.clientSecret) return { success: false, error: 'Missing clientSecret' }
    if (!this.config.discoveryUrl) return { success: false, error: 'Missing discoveryUrl' }

    try {
      const discovery = await this.getDiscovery()
      return { success: !!discovery.authorization_endpoint }
    } catch (err: any) {
      return { success: false, error: `Discovery failed: ${err.message}` }
    }
  }

  private async getDiscovery(): Promise<OidcDiscovery> {
    if (this.discovery) return this.discovery

    if (!this.config.discoveryUrl) throw new Error('OIDC discoveryUrl not configured')

    const res = await fetch(this.config.discoveryUrl, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`Discovery endpoint returned ${res.status}`)

    this.discovery = (await res.json()) as OidcDiscovery
    return this.discovery!
  }
}

// Well-known discovery URLs for common providers
export const OIDC_DISCOVERY_URLS: Record<string, string> = {
  GOOGLE_WORKSPACE: 'https://accounts.google.com/.well-known/openid-configuration',
  OKTA: '', // Org-specific: https://{org}.okta.com/.well-known/openid-configuration
  AZURE_AD: '', // Tenant-specific: https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration
}
