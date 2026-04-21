import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { OrgRole, InviteStatus, TeamRole } from '@prisma/client'

// Mocks must be hoisted — no variable references in factory
vi.mock('../../db/client', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orgMembership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orgInvite: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    orgAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    orgApiKey: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teamMembership: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    orgToolConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    oAuthProvider: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(async (fn: any) => {
      // The transaction callback receives prisma as tx — just call with the mock itself
      const self = (await import('../../db/client')).prisma
      return fn(self)
    }),
  },
}))

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  })),
}))
vi.mock('../../config', () => ({
  config: { redisUrl: 'redis://localhost:6379' },
}))
vi.mock('../../logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))
// Mock apiKeyMiddleware to be a no-op (auth is simulated by test app's use() middleware)
vi.mock('../middleware', () => ({
  apiKeyMiddleware: vi.fn(async (_c: any, next: any) => next()),
}))

// Import after mocks
import { orgRoutes } from '../routes/orgs'
import { prisma } from '../../db/client'

const mockPrisma = prisma as any

// Create test app with mock auth
function createTestApp() {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('user', { id: 'user_1', email: 'admin@acme.com', name: 'Admin' })
    await next()
  })
  app.route('/orgs', orgRoutes)
  return app
}

const mockOrg = { id: 'org_1', slug: 'acme-corp', name: 'Acme Corp', plan: 'free' }

describe('Org CRUD Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /orgs — Create org', () => {
    it('creates org and owner membership', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null) // slug available
      mockPrisma.organization.create.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.create.mockResolvedValue({})
      mockPrisma.orgAuditLog.create.mockResolvedValue({})

      const app = createTestApp()
      const res = await app.request('/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Acme Corp', slug: 'acme-corp' }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.org.slug).toBe('acme-corp')
    })

    it('returns 409 if slug taken', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)

      const app = createTestApp()
      const res = await app.request('/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Acme', slug: 'acme-corp' }),
      })

      expect(res.status).toBe(409)
    })

    it('returns 400 for invalid input', async () => {
      const app = createTestApp()
      const res = await app.request('/orgs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A', slug: '-bad-' }),
      })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /orgs — List user orgs', () => {
    it('returns user memberships with org data', async () => {
      mockPrisma.orgMembership.findMany.mockResolvedValue([
        { org: mockOrg, role: OrgRole.OWNER, joinedAt: new Date() },
      ])

      const app = createTestApp()
      const res = await app.request('/orgs')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.orgs).toHaveLength(1)
      expect(body.orgs[0].role).toBe('OWNER')
    })
  })

  describe('GET /orgs/:slug — Get org', () => {
    it('returns org details for members', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.MEMBER })

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp')

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.org.slug).toBe('acme-corp')
      expect(body.role).toBe('MEMBER')
    })
  })

  describe('PATCH /orgs/:slug — Update org', () => {
    it('allows admins to update', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.ADMIN })
      mockPrisma.organization.update.mockResolvedValue({ ...mockOrg, name: 'New Name' })
      mockPrisma.orgAuditLog.create.mockResolvedValue({})

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Org-Slug': 'acme-corp' },
        body: JSON.stringify({ name: 'New Name' }),
      })

      expect(res.status).toBe(200)
    })

    it('blocks viewers from updating', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.VIEWER })

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Org-Slug': 'acme-corp' },
        body: JSON.stringify({ name: 'New Name' }),
      })

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /orgs/:slug — Delete org', () => {
    it('allows owners to delete', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.OWNER })
      mockPrisma.organization.delete.mockResolvedValue(mockOrg)

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp', {
        method: 'DELETE',
        headers: { 'X-Org-Slug': 'acme-corp' },
      })

      expect(res.status).toBe(200)
    })

    it('blocks admins from deleting', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.ADMIN })

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp', {
        method: 'DELETE',
        headers: { 'X-Org-Slug': 'acme-corp' },
      })

      expect(res.status).toBe(403)
    })
  })
})

describe('Members Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /orgs/:slug/invites — Invite member', () => {
    it('creates invite for new email', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.ADMIN })
      mockPrisma.user.findUnique.mockResolvedValue(null) // email not registered
      mockPrisma.orgInvite.findFirst.mockResolvedValue(null) // no pending
      mockPrisma.orgInvite.create.mockResolvedValue({
        id: 'inv_1',
        email: 'new@acme.com',
        role: OrgRole.MEMBER,
        expiresAt: new Date(),
      })
      mockPrisma.orgAuditLog.create.mockResolvedValue({})

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Org-Slug': 'acme-corp' },
        body: JSON.stringify({ email: 'new@acme.com', role: 'MEMBER' }),
      })

      expect(res.status).toBe(201)
    })

    it('returns 409 for already-member', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique
        .mockResolvedValueOnce({ role: OrgRole.ADMIN }) // acting user
        .mockResolvedValueOnce({ role: OrgRole.MEMBER }) // target already member
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user_2', email: 'exists@acme.com' })

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Org-Slug': 'acme-corp' },
        body: JSON.stringify({ email: 'exists@acme.com', role: 'MEMBER' }),
      })

      expect(res.status).toBe(409)
    })
  })

  describe('PATCH /orgs/:slug/members/:userId — Change role', () => {
    it('prevents changing own role', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.OWNER })

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/members/user_1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'X-Org-Slug': 'acme-corp' },
        body: JSON.stringify({ role: 'ADMIN' }),
      })

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('own role')
    })
  })
})

describe('Teams Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /orgs/:slug/teams — Create team', () => {
    it('creates team and adds creator as LEAD', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.ADMIN })
      mockPrisma.team.findUnique.mockResolvedValue(null) // slug available
      mockPrisma.team.create.mockResolvedValue({
        id: 'team_1',
        name: 'Engineering',
        slug: 'engineering',
        description: null,
      })
      mockPrisma.teamMembership.create.mockResolvedValue({})
      mockPrisma.orgAuditLog.create.mockResolvedValue({})

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Org-Slug': 'acme-corp' },
        body: JSON.stringify({ name: 'Engineering' }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.team.name).toBe('Engineering')
    })
  })

  describe('GET /orgs/:slug/teams — List teams', () => {
    it('returns teams with member count', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.MEMBER })
      mockPrisma.team.findMany.mockResolvedValue([
        {
          id: 'team_1',
          name: 'Eng',
          slug: 'eng',
          description: null,
          _count: { memberships: 5 },
          createdAt: new Date(),
        },
      ])

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/teams', {
        method: 'GET',
        headers: { 'X-Org-Slug': 'acme-corp' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.teams[0].memberCount).toBe(5)
    })
  })
})

describe('Org API Keys Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /orgs/:slug/keys — Create key', () => {
    it('creates org API key with scopes', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.ADMIN })
      mockPrisma.orgApiKey.create.mockResolvedValue({ id: 'key_1' })
      mockPrisma.orgAuditLog.create.mockResolvedValue({})

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Org-Slug': 'acme-corp' },
        body: JSON.stringify({ name: 'CI Key', scopes: ['tools:execute'] }),
      })

      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.key).toMatch(/^ot_org_/)
      expect(body.prefix).toMatch(/^ot_org_/)
    })

    it('rejects invalid scopes', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.ADMIN })

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Org-Slug': 'acme-corp' },
        body: JSON.stringify({ name: 'Bad', scopes: ['invalid:scope'] }),
      })

      expect(res.status).toBe(400)
    })
  })
})

describe('Audit Log Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /orgs/:slug/audit', () => {
    it('returns paginated audit logs', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.ADMIN })
      mockPrisma.orgAuditLog.findMany.mockResolvedValue([
        {
          id: 'log_1',
          action: 'ORG_CREATED',
          userId: 'user_1',
          inputSnapshot: {},
          createdAt: new Date(),
        },
      ])

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/audit?limit=10', {
        headers: { 'X-Org-Slug': 'acme-corp' },
      })

      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.logs).toHaveLength(1)
      expect(body.pagination.hasMore).toBe(false)
    })

    it('allows viewers to access audit logs (read-only permission)', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg)
      mockPrisma.orgMembership.findUnique.mockResolvedValue({ role: OrgRole.VIEWER })
      mockPrisma.orgAuditLog.findMany.mockResolvedValue([])

      const app = createTestApp()
      const res = await app.request('/orgs/acme-corp/audit', {
        headers: { 'X-Org-Slug': 'acme-corp' },
      })

      expect(res.status).toBe(200)
    })
  })
})
