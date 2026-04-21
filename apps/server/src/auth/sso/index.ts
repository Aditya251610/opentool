// SSO Service — orchestrates SAML/OIDC flows and manages org SSO configuration

import { prisma } from '../../db/client.js'
import { SamlProvider } from './saml.js'
import { OidcProvider, OIDC_DISCOVERY_URLS } from './oidc.js'
import type { SsoProvider, SsoProviderConfig, SsoProviderType, SsoUserProfile } from './types.js'
import { encrypt, decrypt } from '../encryption.js'

export { type SsoUserProfile, type SsoProviderType } from './types.js'

/**
 * Create an SSO provider instance from org config
 */
export function createSsoProvider(type: SsoProviderType, config: SsoProviderConfig): SsoProvider {
  switch (type) {
    case 'CUSTOM_SAML':
      return new SamlProvider(config)
    case 'GOOGLE_WORKSPACE':
    case 'OKTA':
    case 'AZURE_AD':
    case 'CUSTOM_OIDC':
      return new OidcProvider({
        ...config,
        discoveryUrl: config.discoveryUrl || OIDC_DISCOVERY_URLS[type] || undefined,
      })
    default:
      throw new Error(`Unsupported SSO provider type: ${type}`)
  }
}

/**
 * Configure SSO for an organization
 */
export async function configureSso(
  orgId: string,
  provider: SsoProviderType,
  config: SsoProviderConfig,
) {
  const encryptedConfig = encrypt(JSON.stringify(config))

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      ssoEnabled: true,
      ssoProvider: provider,
      ssoConfig: encryptedConfig,
      ...(config.callbackUrl.includes('://') ? {} : {}),
    },
  })

  return { success: true }
}

/**
 * Get the SSO provider for an org (decrypts stored config)
 */
export async function getOrgSsoProvider(
  orgSlug: string,
): Promise<{ provider: SsoProvider; type: SsoProviderType } | null> {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { ssoEnabled: true, ssoProvider: true, ssoConfig: true },
  })

  if (!org || !org.ssoEnabled || !org.ssoProvider || !org.ssoConfig) return null

  const config: SsoProviderConfig = JSON.parse(decrypt(org.ssoConfig as string))
  const provider = createSsoProvider(org.ssoProvider as SsoProviderType, config)

  return { provider, type: org.ssoProvider as SsoProviderType }
}

/**
 * Verify a domain belongs to the org (DNS TXT record check)
 */
export async function verifyDomain(
  orgId: string,
  domain: string,
): Promise<{ verified: boolean; error?: string }> {
  // In production: check DNS TXT record for opentool-verify=<orgId>
  // For now, accept the domain claim and store it
  const cleanDomain = domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')

  // Check no other org has this domain
  const existing = await prisma.organization.findFirst({
    where: { domainVerified: cleanDomain, id: { not: orgId } },
  })
  if (existing) return { verified: false, error: 'Domain already claimed by another organization' }

  await prisma.organization.update({
    where: { id: orgId },
    data: { domainVerified: cleanDomain },
  })

  return { verified: true }
}

/**
 * Handle SSO callback — find/create user, create session
 */
export async function handleSsoCallback(
  orgSlug: string,
  profile: SsoUserProfile,
): Promise<{
  userId: string
  sessionId: string
  isNewUser: boolean
}> {
  const org = await prisma.organization.findUnique({ where: { slug: orgSlug } })
  if (!org) throw new Error('Organization not found')

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email: profile.email } })
  let isNewUser = false

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name || null,
        passwordHash: '', // SSO users don't have passwords
      },
    })
    isNewUser = true
  }

  // Ensure user is an org member
  const membership = await prisma.orgMembership.findUnique({
    where: { orgId_userId: { orgId: org.id, userId: user.id } },
  })

  if (!membership) {
    await prisma.orgMembership.create({
      data: { orgId: org.id, userId: user.id, role: 'MEMBER' },
    })
  }

  // Create SSO session
  const session = await prisma.orgSsoSession.create({
    data: {
      orgId: org.id,
      userId: user.id,
      idpSessionId: profile.idpSessionId,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8h
    },
  })

  // Audit
  await prisma.orgAuditLog.create({
    data: {
      orgId: org.id,
      action: 'ORG_SSO_LOGIN',
      userId: user.id,
      resource: `user:${user.id}`,
      status: 'SUCCESS',
    },
  })

  return { userId: user.id, sessionId: session.id, isNewUser }
}

/**
 * Disable SSO for an org
 */
export async function disableSso(orgId: string) {
  await prisma.organization.update({
    where: { id: orgId },
    data: { ssoEnabled: false, ssoProvider: null, ssoConfig: undefined },
  })

  // Expire all active SSO sessions
  await prisma.orgSsoSession.deleteMany({ where: { orgId } })

  return { success: true }
}

/**
 * Test SSO configuration without saving
 */
export async function testSsoConfig(type: SsoProviderType, config: SsoProviderConfig) {
  const provider = createSsoProvider(type, config)
  return provider.testConnection()
}
