import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { OrgRole } from '@prisma/client'
import { orgContextMiddleware, requirePermission, requireAnyPermission } from '../middleware'
import { Permission } from '../permissions'

// Mock prisma
vi.mock('../../db/client', () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
    },
    orgMembership: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock Redis
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      on: vi.fn(),
    })),
  }
})

// Mock config
vi.mock('../../config', () => ({
  config: { redisUrl: 'redis://localhost:6379' },
}))

import { prisma } from '../../db/client'

const mockOrg = { id: 'org_1', slug: 'acme-corp', name: 'Acme Corp', plan: 'free' }
const mockUser = { id: 'user_1', email: 'test@acme.com', name: 'Test' }

function createApp() {
  const app = new Hono()

  // Simulate auth middleware
  app.use('*', async (c, next) => {
    const userId = c.req.header('X-Test-User-Id')
    if (userId) {
      c.set('user', { ...mockUser, id: userId })
    }
    await next()
  })

  return app
}

describe('orgContextMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 if no org slug provided', async () => {
    const app = createApp()
    app.get('/test', orgContextMiddleware, (c) => c.json({ ok: true }))

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1' },
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Organization required')
  })

  it('returns 404 if org not found', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null)

    const app = createApp()
    app.get('/test', orgContextMiddleware, (c) => c.json({ ok: true }))

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1', 'X-Org-Slug': 'nonexistent' },
    })
    expect(res.status).toBe(404)
  })

  it('returns 401 if no authenticated user', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)

    const app = createApp()
    app.get('/test', orgContextMiddleware, (c) => c.json({ ok: true }))

    const res = await app.request('/test', {
      headers: { 'X-Org-Slug': 'acme-corp' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 if user is not a member', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue(null)

    const app = createApp()
    app.get('/test', orgContextMiddleware, (c) => c.json({ ok: true }))

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1', 'X-Org-Slug': 'acme-corp' },
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Not a member of this organization')
  })

  it('passes and sets org context for valid member', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue({ role: OrgRole.ADMIN } as any)

    const app = createApp()
    app.get('/test', orgContextMiddleware, (c) => {
      return c.json({ org: c.get('org'), role: c.get('orgRole') })
    })

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1', 'X-Org-Slug': 'acme-corp' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.org.slug).toBe('acme-corp')
    expect(body.role).toBe('ADMIN')
  })

  it('reads org slug from URL param :slug', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue({ role: OrgRole.MEMBER } as any)

    const app = createApp()
    app.get('/orgs/:slug/info', orgContextMiddleware, (c) => {
      return c.json({ org: c.get('org') })
    })

    const res = await app.request('/orgs/acme-corp/info', {
      headers: { 'X-Test-User-Id': 'user_1' },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.org.slug).toBe('acme-corp')
  })
})

describe('requirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 if no org role in context', async () => {
    const app = createApp()
    app.get('/test', requirePermission(Permission.MEMBERS_INVITE), (c) => c.json({ ok: true }))

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1' },
    })
    expect(res.status).toBe(400)
  })

  it('returns 403 if role lacks permission', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue({ role: OrgRole.VIEWER } as any)

    const app = createApp()
    app.get('/test', orgContextMiddleware, requirePermission(Permission.TOOLS_EXECUTE), (c) =>
      c.json({ ok: true }),
    )

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1', 'X-Org-Slug': 'acme-corp' },
    })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Insufficient permissions')
    expect(body.required).toContain(Permission.TOOLS_EXECUTE)
  })

  it('passes if role has required permission', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue({ role: OrgRole.ADMIN } as any)

    const app = createApp()
    app.get('/test', orgContextMiddleware, requirePermission(Permission.MEMBERS_INVITE), (c) =>
      c.json({ ok: true }),
    )

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1', 'X-Org-Slug': 'acme-corp' },
    })
    expect(res.status).toBe(200)
  })

  it('requires ALL permissions when multiple specified', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue({ role: OrgRole.MEMBER } as any)

    const app = createApp()
    app.get(
      '/test',
      orgContextMiddleware,
      requirePermission(Permission.TOOLS_EXECUTE, Permission.MEMBERS_INVITE),
      (c) => c.json({ ok: true }),
    )

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1', 'X-Org-Slug': 'acme-corp' },
    })
    // MEMBER has TOOLS_EXECUTE but NOT MEMBERS_INVITE
    expect(res.status).toBe(403)
  })
})

describe('requireAnyPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('passes if role has at least one of the permissions', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue({ role: OrgRole.MEMBER } as any)

    const app = createApp()
    app.get(
      '/test',
      orgContextMiddleware,
      requireAnyPermission(Permission.MEMBERS_INVITE, Permission.TOOLS_EXECUTE),
      (c) => c.json({ ok: true }),
    )

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1', 'X-Org-Slug': 'acme-corp' },
    })
    // MEMBER has TOOLS_EXECUTE
    expect(res.status).toBe(200)
  })

  it('returns 403 if role has none of the permissions', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(mockOrg as any)
    vi.mocked(prisma.orgMembership.findUnique).mockResolvedValue({ role: OrgRole.VIEWER } as any)

    const app = createApp()
    app.get(
      '/test',
      orgContextMiddleware,
      requireAnyPermission(Permission.MEMBERS_INVITE, Permission.TOOLS_EXECUTE),
      (c) => c.json({ ok: true }),
    )

    const res = await app.request('/test', {
      headers: { 'X-Test-User-Id': 'user_1', 'X-Org-Slug': 'acme-corp' },
    })
    expect(res.status).toBe(403)
  })
})
