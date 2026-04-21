import { describe, it, expect } from 'vitest'
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateRoleSchema,
  createTeamSchema,
  createOrgKeySchema,
  ssoConfigSchema,
} from '../validators'

describe('createOrgSchema', () => {
  it('accepts valid input', () => {
    const result = createOrgSchema.safeParse({ name: 'Acme Corp', slug: 'acme-corp' })
    expect(result.success).toBe(true)
  })

  it('rejects name < 2 chars', () => {
    const result = createOrgSchema.safeParse({ name: 'A', slug: 'acme' })
    expect(result.success).toBe(false)
  })

  it('rejects name > 64 chars', () => {
    const result = createOrgSchema.safeParse({ name: 'A'.repeat(65), slug: 'acme' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid name characters', () => {
    const result = createOrgSchema.safeParse({ name: 'Acme @Corp!', slug: 'acme' })
    expect(result.success).toBe(false)
  })

  it('rejects slug with uppercase', () => {
    const result = createOrgSchema.safeParse({ name: 'Acme', slug: 'Acme-Corp' })
    expect(result.success).toBe(false)
  })

  it('rejects slug with leading hyphen', () => {
    const result = createOrgSchema.safeParse({ name: 'Acme', slug: '-acme' })
    expect(result.success).toBe(false)
  })

  it('rejects slug with trailing hyphen', () => {
    const result = createOrgSchema.safeParse({ name: 'Acme', slug: 'acme-' })
    expect(result.success).toBe(false)
  })

  it('rejects slug > 32 chars', () => {
    const result = createOrgSchema.safeParse({ name: 'Acme', slug: 'a'.repeat(33) })
    expect(result.success).toBe(false)
  })

  it('accepts slug with numbers', () => {
    const result = createOrgSchema.safeParse({ name: 'Team 42', slug: 'team-42' })
    expect(result.success).toBe(true)
  })
})

describe('updateOrgSchema', () => {
  it('accepts partial updates', () => {
    expect(updateOrgSchema.safeParse({ name: 'New Name' }).success).toBe(true)
    expect(updateOrgSchema.safeParse({ avatarUrl: 'https://img.com/a.png' }).success).toBe(true)
    expect(updateOrgSchema.safeParse({ avatarUrl: null }).success).toBe(true)
    expect(updateOrgSchema.safeParse({}).success).toBe(true)
  })

  it('rejects invalid avatar URL', () => {
    expect(updateOrgSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false)
  })
})

describe('inviteMemberSchema', () => {
  it('accepts valid invite', () => {
    const result = inviteMemberSchema.safeParse({ email: 'user@acme.com', role: 'MEMBER' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    expect(inviteMemberSchema.safeParse({ email: 'notanemail', role: 'MEMBER' }).success).toBe(
      false,
    )
  })

  it('rejects OWNER role', () => {
    expect(inviteMemberSchema.safeParse({ email: 'a@b.com', role: 'OWNER' }).success).toBe(false)
  })

  it('accepts ADMIN, MEMBER, VIEWER', () => {
    for (const role of ['ADMIN', 'MEMBER', 'VIEWER']) {
      expect(inviteMemberSchema.safeParse({ email: 'a@b.com', role }).success).toBe(true)
    }
  })
})

describe('updateRoleSchema', () => {
  it('rejects OWNER role', () => {
    expect(updateRoleSchema.safeParse({ role: 'OWNER' }).success).toBe(false)
  })

  it('accepts valid roles', () => {
    for (const role of ['ADMIN', 'MEMBER', 'VIEWER']) {
      expect(updateRoleSchema.safeParse({ role }).success).toBe(true)
    }
  })
})

describe('createTeamSchema', () => {
  it('accepts valid team', () => {
    const result = createTeamSchema.safeParse({ name: 'Engineering', description: 'Backend team' })
    expect(result.success).toBe(true)
  })

  it('rejects name < 2 chars', () => {
    expect(createTeamSchema.safeParse({ name: 'A' }).success).toBe(false)
  })

  it('rejects name > 48 chars', () => {
    expect(createTeamSchema.safeParse({ name: 'A'.repeat(49) }).success).toBe(false)
  })

  it('rejects description > 256 chars', () => {
    expect(createTeamSchema.safeParse({ name: 'Eng', description: 'A'.repeat(257) }).success).toBe(
      false,
    )
  })

  it('slug is optional', () => {
    expect(createTeamSchema.safeParse({ name: 'Engineering' }).success).toBe(true)
  })
})

describe('createOrgKeySchema', () => {
  it('accepts valid key', () => {
    const result = createOrgKeySchema.safeParse({
      name: 'Production Key',
      scopes: ['tools:execute'],
      environment: 'production',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty scopes', () => {
    expect(createOrgKeySchema.safeParse({ name: 'Key', scopes: [] }).success).toBe(false)
  })

  it('rejects invalid scope', () => {
    expect(createOrgKeySchema.safeParse({ name: 'Key', scopes: ['invalid:scope'] }).success).toBe(
      false,
    )
  })

  it('rejects invalid CIDR', () => {
    const result = createOrgKeySchema.safeParse({
      name: 'Key',
      scopes: ['full'],
      ipAllowlist: ['not-a-cidr'],
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid CIDR list', () => {
    const result = createOrgKeySchema.safeParse({
      name: 'Key',
      scopes: ['full'],
      ipAllowlist: ['10.0.0.0/8', '192.168.1.0/24'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects past expiry', () => {
    const result = createOrgKeySchema.safeParse({
      name: 'Key',
      scopes: ['full'],
      expiresAt: '2020-01-01T00:00:00Z',
    })
    expect(result.success).toBe(false)
  })

  it('accepts future expiry', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const result = createOrgKeySchema.safeParse({
      name: 'Key',
      scopes: ['full'],
      expiresAt: future,
    })
    expect(result.success).toBe(true)
  })

  it('defaults environment to production', () => {
    const result = createOrgKeySchema.safeParse({ name: 'Key', scopes: ['full'] })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.environment).toBe('production')
    }
  })
})

describe('ssoConfigSchema', () => {
  it('accepts valid SAML config', () => {
    const result = ssoConfigSchema.safeParse({
      type: 'saml',
      entityId: 'https://idp.acme.com',
      ssoUrl: 'https://idp.acme.com/sso',
      certificate: 'A'.repeat(200),
      allowedDomains: ['acme.com'],
      defaultRole: 'MEMBER',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid OIDC config', () => {
    const result = ssoConfigSchema.safeParse({
      type: 'oidc',
      clientId: 'client-123',
      clientSecret: 'secret-456',
      issuerUrl: 'https://accounts.google.com',
      allowedDomains: ['acme.com'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects SAML without certificate', () => {
    const result = ssoConfigSchema.safeParse({
      type: 'saml',
      entityId: 'https://idp.acme.com',
      ssoUrl: 'https://idp.acme.com/sso',
      allowedDomains: ['acme.com'],
    })
    expect(result.success).toBe(false)
  })

  it('rejects OIDC without issuerUrl', () => {
    const result = ssoConfigSchema.safeParse({
      type: 'oidc',
      clientId: 'id',
      clientSecret: 'secret',
      allowedDomains: ['acme.com'],
    })
    expect(result.success).toBe(false)
  })
})
