import { Context, Next } from 'hono'
import { OrgRole } from '@prisma/client'
import { prisma } from '../db/client'
import { Permission, hasPermission, hasAnyPermission } from './permissions'
import { redis } from '../db/redis'

// ─────────────────────────────────────────
// TYPE EXTENSIONS
// ─────────────────────────────────────────

export interface OrgContext {
  id: string
  slug: string
  name: string
  plan: string
}

declare module 'hono' {
  interface ContextVariableMap {
    org: OrgContext
    orgRole: OrgRole
  }
}

// ─────────────────────────────────────────
// REDIS CACHE
// ─────────────────────────────────────────

const CACHE_TTL = 300 // 5 minutes
const CACHE_PREFIX = 'ot:org:member'

function memberCacheKey(orgId: string, userId: string): string {
  return `${CACHE_PREFIX}:${orgId}:${userId}`
}

interface CachedMembership {
  role: OrgRole
}

async function getCachedMembership(
  orgId: string,
  userId: string,
): Promise<CachedMembership | null> {
  try {
    const data = await redis.get(memberCacheKey(orgId, userId))
    if (!data) return null
    return JSON.parse(data)
  } catch {
    return null // Redis failure → fallback to DB
  }
}

async function setCachedMembership(
  orgId: string,
  userId: string,
  membership: CachedMembership,
): Promise<void> {
  try {
    await redis.set(memberCacheKey(orgId, userId), JSON.stringify(membership), 'EX', CACHE_TTL)
  } catch {
    // Best-effort cache write
  }
}

/** Invalidate a user's membership cache for a specific org */
export async function invalidateMembershipCache(orgId: string, userId: string): Promise<void> {
  try {
    await redis.del(memberCacheKey(orgId, userId))
  } catch {
    // Best-effort
  }
}

// ─────────────────────────────────────────
// ORG CONTEXT MIDDLEWARE
// Resolves organization from X-Org-Slug header or :slug param
// Validates user membership and attaches org + role to context
// ─────────────────────────────────────────

export async function orgContextMiddleware(c: Context, next: Next): Promise<Response | void> {
  const orgSlug = c.req.header('X-Org-Slug') || c.req.param('slug')

  if (!orgSlug) {
    return c.json(
      { error: 'Organization required', hint: 'Provide X-Org-Slug header or :slug param' },
      400,
    )
  }

  // Look up the organization
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true, slug: true, name: true, plan: true },
  })

  if (!org) {
    return c.json({ error: 'Organization not found' }, 404)
  }

  // Get the authenticated user from upstream middleware
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401)
  }

  // Check membership (cache first, then DB)
  let membership = await getCachedMembership(org.id, user.id)

  if (!membership) {
    const dbMembership = await prisma.orgMembership.findUnique({
      where: { orgId_userId: { orgId: org.id, userId: user.id } },
      select: { role: true },
    })

    if (!dbMembership) {
      return c.json({ error: 'Not a member of this organization' }, 403)
    }

    membership = { role: dbMembership.role }
    await setCachedMembership(org.id, user.id, membership)
  }

  // Attach to context
  c.set('org', { id: org.id, slug: org.slug, name: org.name, plan: org.plan })
  c.set('orgRole', membership.role)

  await next()
}

// ─────────────────────────────────────────
// PERMISSION GUARD
// Route-level middleware that checks if user has required permission(s)
// ─────────────────────────────────────────

/**
 * Require ALL specified permissions.
 * Usage: `app.post('/route', orgContextMiddleware, requirePermission(Permission.MEMBERS_INVITE), handler)`
 */
export function requirePermission(...permissions: Permission[]) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const role = c.get('orgRole') as OrgRole | undefined

    if (!role) {
      return c.json({ error: 'Organization context required' }, 400)
    }

    for (const perm of permissions) {
      if (!hasPermission(role, perm)) {
        return c.json(
          {
            error: 'Insufficient permissions',
            required: permissions,
            role,
          },
          403,
        )
      }
    }

    await next()
  }
}

/**
 * Require ANY of the specified permissions (pass if user has at least one).
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const role = c.get('orgRole') as OrgRole | undefined

    if (!role) {
      return c.json({ error: 'Organization context required' }, 400)
    }

    if (!hasAnyPermission(role, permissions)) {
      return c.json(
        {
          error: 'Insufficient permissions',
          required: permissions,
          hint: 'Need at least one of the listed permissions',
          role,
        },
        403,
      )
    }

    await next()
  }
}
