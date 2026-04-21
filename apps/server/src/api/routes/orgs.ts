import { Hono } from 'hono'
import { prisma } from '../../db/client'
import { apiKeyMiddleware } from '../middleware'
import { orgContextMiddleware, requirePermission } from '../../rbac'
import { Permission } from '../../rbac/permissions'
import { orgRateLimiter } from '../../rbac/rate-limit'
import { invalidateMembershipCache } from '../../rbac/middleware'
import {
  createOrgSchema,
  updateOrgSchema,
  inviteMemberSchema,
  updateRoleSchema,
  createTeamSchema,
  updateTeamSchema,
  createOrgKeySchema,
  ssoConfigSchema,
  auditQuerySchema,
} from '../../rbac/validators'
import { logger } from '../../logger'
import { OrgRole, TeamRole, InviteStatus } from '@prisma/client'
import crypto from 'crypto'

export const orgRoutes = new Hono()

const ORG_KEY_PREFIX = 'ot_org_'

// ─────────────────────────────────────────
// ORG CRUD (BE-15)
// ─────────────────────────────────────────

// Create organization
orgRoutes.post('/', apiKeyMiddleware, async (c) => {
  const user = c.get('user')
  try {
    const body = await c.req.json()
    const parsed = createOrgSchema.safeParse(body)
    if (!parsed.success) {
      return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
    }

    const { name, slug } = parsed.data

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({ where: { slug } })
    if (existing) {
      return c.json({ error: 'Organization slug already taken' }, 409)
    }

    // Create org + owner membership in a transaction
    const org = await prisma.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: { name, slug, plan: 'free' },
      })

      await tx.orgMembership.create({
        data: {
          orgId: newOrg.id,
          userId: user.id,
          role: OrgRole.OWNER,
        },
      })

      // Create audit log entry
      await tx.orgAuditLog.create({
        data: {
          orgId: newOrg.id,
          userId: user.id,
          action: 'ORG_CREATED',
          status: 'SUCCESS',
          inputSnapshot: { name, slug },
        },
      })

      return newOrg
    })

    return c.json({ org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan } }, 201)
  } catch (error) {
    logger.error('Failed to create org', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// List user's organizations
orgRoutes.get('/', apiKeyMiddleware, async (c) => {
  const user = c.get('user')
  try {
    const memberships = await prisma.orgMembership.findMany({
      where: { userId: user.id },
      include: {
        org: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    })

    const orgs = memberships.map((m) => ({
      ...m.org,
      role: m.role,
      joinedAt: m.joinedAt,
    }))

    return c.json({ orgs })
  } catch (error) {
    logger.error('Failed to list orgs', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Get org details (requires membership)
orgRoutes.get('/:slug', apiKeyMiddleware, orgContextMiddleware, orgRateLimiter, (c) => {
  const org = c.get('org')
  const role = c.get('orgRole')
  return c.json({ org, role })
})

// Update org
orgRoutes.patch(
  '/:slug',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.ORG_UPDATE),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')

    try {
      const body = await c.req.json()
      const parsed = updateOrgSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
      }

      const data = parsed.data

      // Check slug uniqueness if changing
      if (data.slug && data.slug !== org.slug) {
        const existing = await prisma.organization.findUnique({ where: { slug: data.slug } })
        if (existing) {
          return c.json({ error: 'Slug already taken' }, 409)
        }
      }

      const updated = await prisma.organization.update({
        where: { id: org.id },
        data,
        select: { id: true, name: true, slug: true, plan: true, avatarUrl: true },
      })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_UPDATED',
          status: 'SUCCESS',
          inputSnapshot: data,
        },
      })

      return c.json({ org: updated })
    } catch (error) {
      logger.error('Failed to update org', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Delete org (OWNER only)
orgRoutes.delete(
  '/:slug',
  apiKeyMiddleware,
  orgContextMiddleware,
  requirePermission(Permission.ORG_DELETE),
  async (c) => {
    const org = c.get('org')

    try {
      await prisma.organization.delete({ where: { id: org.id } })
      return c.json({ success: true, message: `Organization '${org.slug}' deleted` })
    } catch (error) {
      logger.error('Failed to delete org', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// ─────────────────────────────────────────
// MEMBERS & INVITES (BE-16)
// ─────────────────────────────────────────

// List members
orgRoutes.get(
  '/:slug/members',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.TEAMS_VIEW),
  async (c) => {
    const org = c.get('org')
    try {
      const members = await prisma.orgMembership.findMany({
        where: { orgId: org.id },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
      })

      return c.json({
        members: members.map((m) => ({
          userId: m.user.id,
          email: m.user.email,
          name: m.user.name,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      })
    } catch (error) {
      logger.error('Failed to list members', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Invite member
orgRoutes.post(
  '/:slug/invites',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.MEMBERS_INVITE),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')

    try {
      const body = await c.req.json()
      const parsed = inviteMemberSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
      }

      const { email, role } = parsed.data

      // Check if already a member
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) {
        const existingMembership = await prisma.orgMembership.findUnique({
          where: { orgId_userId: { orgId: org.id, userId: existingUser.id } },
        })
        if (existingMembership) {
          return c.json({ error: 'User is already a member' }, 409)
        }
      }

      // Check for pending invite
      const pendingInvite = await prisma.orgInvite.findFirst({
        where: { orgId: org.id, email, status: InviteStatus.PENDING },
      })
      if (pendingInvite) {
        return c.json({ error: 'Invite already pending for this email' }, 409)
      }

      const token = crypto.randomBytes(32).toString('hex')
      const invite = await prisma.orgInvite.create({
        data: {
          orgId: org.id,
          email,
          role: role as OrgRole,
          invitedBy: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_MEMBER_INVITED',
          status: 'SUCCESS',
          inputSnapshot: { email, role },
        },
      })

      return c.json({ invite: { id: invite.id, email, role, expiresAt: invite.expiresAt } }, 201)
    } catch (error) {
      logger.error('Failed to invite member', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Accept invite (by token)
orgRoutes.post('/invites/:token/accept', apiKeyMiddleware, async (c) => {
  const user = c.get('user')
  const token = c.req.param('token')!

  try {
    const invite = await prisma.orgInvite.findUnique({ where: { token } })
    if (!invite || invite.status !== InviteStatus.PENDING) {
      return c.json({ error: 'Invalid or expired invite' }, 404)
    }
    if (invite.expiresAt < new Date()) {
      await prisma.orgInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.EXPIRED },
      })
      return c.json({ error: 'Invite has expired' }, 410)
    }
    if (invite.email !== user.email) {
      return c.json({ error: 'Invite was sent to a different email address' }, 403)
    }

    await prisma.$transaction(async (tx) => {
      await tx.orgMembership.create({
        data: { orgId: invite.orgId, userId: user.id, role: invite.role },
      })
      await tx.orgInvite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
      })
      await tx.orgAuditLog.create({
        data: {
          orgId: invite.orgId,
          userId: user.id,
          action: 'ORG_MEMBER_JOINED',
          status: 'SUCCESS',
          inputSnapshot: { role: invite.role, viaInvite: invite.id },
        },
      })
    })

    return c.json({ success: true, message: 'Invite accepted' })
  } catch (error) {
    logger.error('Failed to accept invite', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// Update member role
orgRoutes.patch(
  '/:slug/members/:userId',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.MEMBERS_ROLE_CHANGE),
  async (c) => {
    const org = c.get('org')
    const actingUser = c.get('user')
    const targetUserId = c.req.param('userId')!

    try {
      const body = await c.req.json()
      const parsed = updateRoleSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
      }

      const { role } = parsed.data

      // Can't change your own role
      if (targetUserId === actingUser.id) {
        return c.json({ error: 'Cannot change your own role' }, 400)
      }

      // Can't change OWNER role
      const targetMembership = await prisma.orgMembership.findUnique({
        where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
      })
      if (!targetMembership) {
        return c.json({ error: 'Member not found' }, 404)
      }
      if (targetMembership.role === OrgRole.OWNER) {
        return c.json({ error: 'Cannot change the role of the organization owner' }, 403)
      }

      await prisma.orgMembership.update({
        where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
        data: { role: role as OrgRole },
      })

      await invalidateMembershipCache(org.id, targetUserId)

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: actingUser.id,
          action: 'ORG_MEMBER_ROLE_CHANGED',
          status: 'SUCCESS',
          inputSnapshot: { targetUserId, oldRole: targetMembership.role, newRole: role },
        },
      })

      return c.json({ success: true, userId: targetUserId, role })
    } catch (error) {
      logger.error('Failed to update member role', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Remove member
orgRoutes.delete(
  '/:slug/members/:userId',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.MEMBERS_REMOVE),
  async (c) => {
    const org = c.get('org')
    const actingUser = c.get('user')
    const targetUserId = c.req.param('userId')!

    try {
      if (targetUserId === actingUser.id) {
        return c.json({ error: 'Use the leave endpoint to remove yourself' }, 400)
      }

      const targetMembership = await prisma.orgMembership.findUnique({
        where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
      })
      if (!targetMembership) {
        return c.json({ error: 'Member not found' }, 404)
      }
      if (targetMembership.role === OrgRole.OWNER) {
        return c.json({ error: 'Cannot remove the organization owner' }, 403)
      }

      await prisma.$transaction(async (tx) => {
        // Remove from all teams first
        await tx.teamMembership.deleteMany({
          where: { userId: targetUserId, team: { orgId: org.id } },
        })
        await tx.orgMembership.delete({
          where: { orgId_userId: { orgId: org.id, userId: targetUserId } },
        })
        await tx.orgAuditLog.create({
          data: {
            orgId: org.id,
            userId: actingUser.id,
            action: 'ORG_MEMBER_REMOVED',
            status: 'SUCCESS',
            inputSnapshot: { targetUserId, previousRole: targetMembership.role },
          },
        })
      })

      await invalidateMembershipCache(org.id, targetUserId)
      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to remove member', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// ─────────────────────────────────────────
// TEAMS (BE-17)
// ─────────────────────────────────────────

// List teams
orgRoutes.get(
  '/:slug/teams',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.TEAMS_VIEW),
  async (c) => {
    const org = c.get('org')
    try {
      const teams = await prisma.team.findMany({
        where: { orgId: org.id },
        include: { _count: { select: { memberships: true } } },
        orderBy: { createdAt: 'asc' },
      })

      return c.json({
        teams: teams.map((t) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          description: t.description,
          memberCount: t._count.memberships,
          createdAt: t.createdAt,
        })),
      })
    } catch (error) {
      logger.error('Failed to list teams', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Create team
orgRoutes.post(
  '/:slug/teams',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.TEAMS_MANAGE),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')

    try {
      const body = await c.req.json()
      const parsed = createTeamSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
      }

      const { name, slug: teamSlug, description } = parsed.data
      const finalSlug =
        teamSlug ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

      // Check uniqueness within org
      const existing = await prisma.team.findUnique({
        where: { orgId_slug: { orgId: org.id, slug: finalSlug } },
      })
      if (existing) {
        return c.json({ error: 'Team slug already exists in this organization' }, 409)
      }

      const team = await prisma.$transaction(async (tx) => {
        const newTeam = await tx.team.create({
          data: { orgId: org.id, name, slug: finalSlug, description },
        })

        // Creator auto-joins as LEAD
        await tx.teamMembership.create({
          data: { teamId: newTeam.id, userId: user.id, role: TeamRole.LEAD },
        })

        await tx.orgAuditLog.create({
          data: {
            orgId: org.id,
            userId: user.id,
            action: 'ORG_TEAM_CREATED',
            status: 'SUCCESS',
            inputSnapshot: { teamId: newTeam.id, name, slug: finalSlug },
          },
        })

        return newTeam
      })

      return c.json(
        { team: { id: team.id, name: team.name, slug: team.slug, description: team.description } },
        201,
      )
    } catch (error) {
      logger.error('Failed to create team', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Update team
orgRoutes.patch(
  '/:slug/teams/:teamSlug',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.TEAMS_MANAGE),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')
    const teamSlug = c.req.param('teamSlug')!

    try {
      const team = await prisma.team.findUnique({
        where: { orgId_slug: { orgId: org.id, slug: teamSlug } },
      })
      if (!team) return c.json({ error: 'Team not found' }, 404)

      const body = await c.req.json()
      const parsed = updateTeamSchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
      }

      const data = parsed.data
      if (data.slug && data.slug !== teamSlug) {
        const existing = await prisma.team.findUnique({
          where: { orgId_slug: { orgId: org.id, slug: data.slug } },
        })
        if (existing) return c.json({ error: 'Team slug already exists' }, 409)
      }

      const updated = await prisma.team.update({
        where: { id: team.id },
        data,
      })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_TEAM_CREATED',
          status: 'SUCCESS',
          inputSnapshot: { teamId: team.id, changes: data },
        },
      })

      return c.json({
        team: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
        },
      })
    } catch (error) {
      logger.error('Failed to update team', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Delete team
orgRoutes.delete(
  '/:slug/teams/:teamSlug',
  apiKeyMiddleware,
  orgContextMiddleware,
  requirePermission(Permission.TEAMS_MANAGE),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')
    const teamSlug = c.req.param('teamSlug')!

    try {
      const team = await prisma.team.findUnique({
        where: { orgId_slug: { orgId: org.id, slug: teamSlug } },
      })
      if (!team) return c.json({ error: 'Team not found' }, 404)

      await prisma.team.delete({ where: { id: team.id } })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_TEAM_DELETED',
          status: 'SUCCESS',
          inputSnapshot: { teamId: team.id, name: team.name },
        },
      })

      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to delete team', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Add member to team
orgRoutes.post(
  '/:slug/teams/:teamSlug/members',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.TEAMS_MANAGE),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')
    const teamSlug = c.req.param('teamSlug')!

    try {
      const team = await prisma.team.findUnique({
        where: { orgId_slug: { orgId: org.id, slug: teamSlug } },
      })
      if (!team) return c.json({ error: 'Team not found' }, 404)

      const { userId, role = 'MEMBER' } = await c.req.json()
      if (!userId) return c.json({ error: 'userId is required' }, 400)

      // Verify user is an org member
      const orgMembership = await prisma.orgMembership.findUnique({
        where: { orgId_userId: { orgId: org.id, userId } },
      })
      if (!orgMembership) return c.json({ error: 'User is not an org member' }, 400)

      // Check if already in team
      const existingTeamMembership = await prisma.teamMembership.findUnique({
        where: { teamId_userId: { teamId: team.id, userId } },
      })
      if (existingTeamMembership) return c.json({ error: 'User is already a team member' }, 409)

      await prisma.teamMembership.create({
        data: { teamId: team.id, userId, role: role as TeamRole },
      })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_TEAM_CREATED',
          status: 'SUCCESS',
          inputSnapshot: { teamId: team.id, addedUserId: userId, role },
        },
      })

      return c.json({ success: true }, 201)
    } catch (error) {
      logger.error('Failed to add team member', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Remove member from team
orgRoutes.delete(
  '/:slug/teams/:teamSlug/members/:userId',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.TEAMS_MANAGE),
  async (c) => {
    const org = c.get('org')
    const actingUser = c.get('user')
    const teamSlug = c.req.param('teamSlug')!
    const targetUserId = c.req.param('userId')!

    try {
      const team = await prisma.team.findUnique({
        where: { orgId_slug: { orgId: org.id, slug: teamSlug } },
      })
      if (!team) return c.json({ error: 'Team not found' }, 404)

      const membership = await prisma.teamMembership.findUnique({
        where: { teamId_userId: { teamId: team.id, userId: targetUserId } },
      })
      if (!membership) return c.json({ error: 'Member not in team' }, 404)

      await prisma.teamMembership.delete({
        where: { teamId_userId: { teamId: team.id, userId: targetUserId } },
      })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: actingUser.id,
          action: 'ORG_TEAM_DELETED',
          status: 'SUCCESS',
          inputSnapshot: { teamId: team.id, removedUserId: targetUserId },
        },
      })

      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to remove team member', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// ─────────────────────────────────────────
// ORG API KEYS (BE-18)
// ─────────────────────────────────────────

// List org keys
orgRoutes.get(
  '/:slug/keys',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.KEYS_VIEW_ALL),
  async (c) => {
    const org = c.get('org')
    try {
      const keys = await prisma.orgApiKey.findMany({
        where: { orgId: org.id, revokedAt: null },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          scopes: true,
          environment: true,
          lastUsedAt: true,
          expiresAt: true,
          createdAt: true,
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      return c.json({ keys })
    } catch (error) {
      logger.error('Failed to list org keys', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Create org key
orgRoutes.post(
  '/:slug/keys',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.KEYS_CREATE),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')

    try {
      const body = await c.req.json()
      const parsed = createOrgKeySchema.safeParse(body)
      if (!parsed.success) {
        return c.json({ error: parsed.error.errors[0]?.message ?? 'Invalid input' }, 400)
      }

      const { name, scopes, ipAllowlist, expiresAt, environment } = parsed.data
      const { hash, prefix, fullKey } = generateOrgApiKey()

      const key = await prisma.orgApiKey.create({
        data: {
          orgId: org.id,
          createdBy: user.id,
          name,
          keyHash: hash,
          keyPrefix: prefix,
          scopes,
          ipAllowlist: ipAllowlist ?? [],
          environment,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
        },
      })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_KEY_CREATED',
          status: 'SUCCESS',
          inputSnapshot: { keyId: key.id, name, scopes, environment },
        },
      })

      return c.json({ key: fullKey, prefix, name, id: key.id }, 201)
    } catch (error) {
      logger.error('Failed to create org key', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Revoke org key
orgRoutes.delete(
  '/:slug/keys/:keyId',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.KEYS_REVOKE),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')
    const keyId = c.req.param('keyId')!

    try {
      const key = await prisma.orgApiKey.findFirst({
        where: { id: keyId, orgId: org.id },
      })
      if (!key) return c.json({ error: 'Key not found' }, 404)
      if (key.revokedAt) return c.json({ error: 'Key already revoked' }, 400)

      await prisma.orgApiKey.update({
        where: { id: keyId },
        data: { revokedAt: new Date() },
      })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_KEY_REVOKED',
          status: 'SUCCESS',
          inputSnapshot: { keyId, name: key.name },
        },
      })

      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to revoke org key', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// ─────────────────────────────────────────
// TOOL CONNECTIONS (BE-20)
// ─────────────────────────────────────────

// List org tool connections
orgRoutes.get(
  '/:slug/connections',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.TOOLS_VIEW),
  async (c) => {
    const org = c.get('org')
    try {
      const connections = await prisma.orgToolConnection.findMany({
        where: { orgId: org.id },
        include: { provider: { select: { id: true, provider: true, displayName: true } } },
        orderBy: { createdAt: 'desc' },
      })

      return c.json({
        connections: connections.map((conn) => ({
          id: conn.id,
          provider: conn.provider,
          status: conn.status,
          connectedBy: conn.connectedBy,
          createdAt: conn.createdAt,
        })),
      })
    } catch (error) {
      logger.error('Failed to list connections', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Connect a tool/provider to the org
orgRoutes.post(
  '/:slug/connections',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.TOOLS_CONNECT),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')

    try {
      const { providerId } = await c.req.json()
      if (!providerId) return c.json({ error: 'providerId is required' }, 400)

      // Check provider exists
      const provider = await prisma.oAuthProvider.findUnique({ where: { id: providerId } })
      if (!provider) return c.json({ error: 'Provider not found' }, 404)

      // Check if already connected
      const existing = await prisma.orgToolConnection.findUnique({
        where: { orgId_providerId: { orgId: org.id, providerId } },
      })
      if (existing) return c.json({ error: 'Provider already connected' }, 409)

      const connection = await prisma.orgToolConnection.create({
        data: {
          orgId: org.id,
          providerId,
          connectedBy: user.id,
          status: 'CONNECTED',
          scopes: [],
        },
      })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_TOOL_CONNECTED',
          status: 'SUCCESS',
          inputSnapshot: { providerId, providerName: provider.displayName },
        },
      })

      return c.json({ connection: { id: connection.id, providerId } }, 201)
    } catch (error) {
      logger.error('Failed to connect tool', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// Disconnect tool
orgRoutes.delete(
  '/:slug/connections/:connectionId',
  apiKeyMiddleware,
  orgContextMiddleware,
  requirePermission(Permission.TOOLS_CONNECT),
  async (c) => {
    const org = c.get('org')
    const user = c.get('user')
    const connectionId = c.req.param('connectionId')!

    try {
      const connection = await prisma.orgToolConnection.findFirst({
        where: { id: connectionId, orgId: org.id },
      })
      if (!connection) return c.json({ error: 'Connection not found' }, 404)

      await prisma.orgToolConnection.delete({ where: { id: connectionId } })

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          userId: user.id,
          action: 'ORG_TOOL_DISCONNECTED',
          status: 'SUCCESS',
          inputSnapshot: { connectionId, providerId: connection.providerId },
        },
      })

      return c.json({ success: true })
    } catch (error) {
      logger.error('Failed to disconnect tool', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// ─────────────────────────────────────────
// AUDIT LOG (BE-21)
// ─────────────────────────────────────────

orgRoutes.get(
  '/:slug/audit',
  apiKeyMiddleware,
  orgContextMiddleware,
  orgRateLimiter,
  requirePermission(Permission.AUDIT_VIEW),
  async (c) => {
    const org = c.get('org')

    try {
      const query = auditQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams))
      if (!query.success) {
        return c.json({ error: 'Invalid query parameters' }, 400)
      }

      const { userId, action, startDate, endDate, cursor, limit } = query.data

      const where: any = { orgId: org.id }
      if (userId) where.userId = userId
      if (action) where.action = action
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = new Date(startDate)
        if (endDate) where.createdAt.lte = new Date(endDate)
      }
      if (cursor) where.id = { lt: cursor }

      const logs = await prisma.orgAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // fetch one extra for cursor
      })

      const hasMore = logs.length > limit
      const items = hasMore ? logs.slice(0, limit) : logs
      const nextCursor = hasMore ? items[items.length - 1]?.id : null

      return c.json({
        logs: items.map((log) => ({
          id: log.id,
          action: log.action,
          userId: log.userId,
          inputSnapshot: log.inputSnapshot,
          createdAt: log.createdAt,
        })),
        pagination: { hasMore, nextCursor },
      })
    } catch (error) {
      logger.error('Failed to list audit logs', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  },
)

// ─────────────────────────────────────────
// SSO CONFIGURATION
// ─────────────────────────────────────────

orgRoutes.post(
  '/:slug/sso/configure',
  orgContextMiddleware,
  requirePermission(Permission.ORG_SSO_CONFIGURE),
  async (c) => {
    try {
      const org = c.get('org' as never) as any
      const body = await c.req.json()
      const parsed = ssoConfigSchema.safeParse(body)
      if (!parsed.success)
        return c.json({ error: 'Invalid SSO configuration', details: parsed.error.issues }, 400)

      const data = parsed.data
      const { configureSso } = await import('../../auth/sso/index.js')

      const providerType =
        data.type === 'saml' ? ('CUSTOM_SAML' as const) : ('CUSTOM_OIDC' as const)
      const baseUrl = new URL(c.req.url).origin
      const callbackUrl = `${baseUrl}/api/orgs/${org.slug}/sso/callback`

      const config =
        data.type === 'saml'
          ? { entryPoint: data.ssoUrl, issuer: data.entityId, cert: data.certificate, callbackUrl }
          : {
              clientId: data.clientId,
              clientSecret: data.clientSecret,
              discoveryUrl: `${data.issuerUrl}/.well-known/openid-configuration`,
              callbackUrl,
            }

      await configureSso(org.id, providerType, config)

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          action: 'ORG_SSO_CONFIGURED',
          userId: (c.get('user' as never) as any).id,
          status: 'SUCCESS',
        },
      })

      return c.json({ success: true, provider: providerType })
    } catch (error: any) {
      logger.error('Failed to configure SSO', error)
      return c.json({ error: error.message || 'SSO configuration failed' }, 500)
    }
  },
)

orgRoutes.post(
  '/:slug/sso/test',
  orgContextMiddleware,
  requirePermission(Permission.ORG_SSO_CONFIGURE),
  async (c) => {
    try {
      const body = await c.req.json()
      const { testSsoConfig } = await import('../../auth/sso/index.js')
      const result = await testSsoConfig(body.provider, body.config)
      return c.json(result)
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500)
    }
  },
)

orgRoutes.delete(
  '/:slug/sso',
  orgContextMiddleware,
  requirePermission(Permission.ORG_SSO_CONFIGURE),
  async (c) => {
    try {
      const org = c.get('org' as never) as any
      const { disableSso } = await import('../../auth/sso/index.js')
      await disableSso(org.id)
      return c.json({ success: true })
    } catch (error: any) {
      return c.json({ error: error.message }, 500)
    }
  },
)

orgRoutes.get('/:slug/sso/login', orgContextMiddleware, async (c) => {
  try {
    const org = c.get('org' as never) as any
    const { getOrgSsoProvider } = await import('../../auth/sso/index.js')
    const sso = await getOrgSsoProvider(org.slug)
    if (!sso) return c.json({ error: 'SSO not configured for this organization' }, 404)

    const state = JSON.stringify({ orgSlug: org.slug, ts: Date.now() })
    const encodedState = Buffer.from(state).toString('base64url')
    const url = await sso.provider.getLoginUrl(encodedState)
    return c.json({ url })
  } catch (error: any) {
    return c.json({ error: error.message }, 500)
  }
})

orgRoutes.post('/:slug/sso/callback', async (c) => {
  try {
    const slug = c.req.param('slug')!
    const params = (await c.req.parseBody()) as Record<string, string>
    const query = Object.fromEntries(new URL(c.req.url).searchParams)
    const allParams = { ...query, ...params }

    const { getOrgSsoProvider, handleSsoCallback } = await import('../../auth/sso/index.js')
    const sso = await getOrgSsoProvider(slug)
    if (!sso) return c.json({ error: 'SSO not configured' }, 404)

    const profile = await sso.provider.validateCallback(allParams)
    const result = await handleSsoCallback(slug, profile)

    // Generate API key for the user
    const raw = crypto.randomBytes(32).toString('hex')
    const keyHash = crypto.createHash('sha256').update(raw).digest('hex')
    await prisma.apiKey.create({
      data: {
        userId: result.userId,
        keyHash,
        keyPrefix: raw.slice(0, 8),
        name: `SSO session (${slug})`,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
      },
    })

    return c.json({
      apiKey: raw,
      userId: result.userId,
      isNewUser: result.isNewUser,
      sessionId: result.sessionId,
    })
  } catch (error: any) {
    logger.error('SSO callback failed', error)
    return c.json({ error: error.message || 'SSO authentication failed' }, 401)
  }
})

orgRoutes.post(
  '/:slug/sso/verify-domain',
  orgContextMiddleware,
  requirePermission(Permission.ORG_SSO_CONFIGURE),
  async (c) => {
    try {
      const org = c.get('org' as never) as any
      const { domain } = await c.req.json()
      if (!domain) return c.json({ error: 'Domain is required' }, 400)

      const { verifyDomain } = await import('../../auth/sso/index.js')
      const result = await verifyDomain(org.id, domain)
      return c.json(result)
    } catch (error: any) {
      return c.json({ error: error.message }, 500)
    }
  },
)

// ─────────────────────────────────────────
// GDPR: DATA EXPORT & ERASURE
// ─────────────────────────────────────────

orgRoutes.post(
  '/:slug/data/export',
  orgContextMiddleware,
  requirePermission(Permission.DATA_EXPORT),
  async (c) => {
    try {
      const org = c.get('org' as never) as any
      const user = c.get('user' as never) as any

      // Gather all org-scoped data for the requesting user
      const [membership, auditLogs, keys, teams] = await Promise.all([
        prisma.orgMembership.findUnique({
          where: { orgId_userId: { orgId: org.id, userId: user.id } },
        }),
        prisma.orgAuditLog.findMany({
          where: { orgId: org.id, userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
        prisma.orgApiKey.findMany({ where: { orgId: org.id, createdBy: user.id } }),
        prisma.teamMembership.findMany({
          where: { team: { orgId: org.id }, userId: user.id },
          include: { team: true },
        }),
      ])

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { id: user.id, email: user.email, name: user.name },
        organization: { id: org.id, name: org.name, slug: org.slug },
        membership,
        teams: teams.map((tm) => ({
          teamId: tm.teamId,
          teamName: tm.team.name,
          role: tm.role,
          joinedAt: tm.joinedAt,
        })),
        apiKeys: keys.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: k.keyPrefix,
          createdAt: k.createdAt,
        })),
        auditLogs: auditLogs.map((l) => ({
          action: l.action,
          createdAt: l.createdAt,
          resource: l.resource,
        })),
      }

      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          action: 'ORG_UPDATED',
          userId: user.id,
          resource: 'gdpr:data_export',
          status: 'SUCCESS',
        },
      })

      return c.json(exportData)
    } catch (error: any) {
      logger.error('Data export failed', error)
      return c.json({ error: 'Export failed' }, 500)
    }
  },
)

orgRoutes.delete(
  '/:slug/data/erase',
  orgContextMiddleware,
  requirePermission(Permission.DATA_DELETE),
  async (c) => {
    try {
      const org = c.get('org' as never) as any
      const user = c.get('user' as never) as any
      const { confirm } = await c.req.json()

      if (confirm !== user.email) {
        return c.json({ error: 'Confirmation email does not match' }, 400)
      }

      // Remove all user data from this org
      await prisma.$transaction([
        prisma.teamMembership.deleteMany({ where: { userId: user.id, team: { orgId: org.id } } }),
        prisma.orgApiKey.updateMany({
          where: { orgId: org.id, createdBy: user.id },
          data: { revokedAt: new Date() },
        }),
        prisma.orgMembership.delete({
          where: { orgId_userId: { orgId: org.id, userId: user.id } },
        }),
      ])

      // Audit (system-level, since user is being removed)
      await prisma.orgAuditLog.create({
        data: {
          orgId: org.id,
          action: 'ORG_MEMBER_REMOVED',
          userId: user.id,
          resource: 'gdpr:data_erasure',
          status: 'SUCCESS',
        },
      })

      return c.json({
        success: true,
        message: 'All your data in this organization has been erased.',
      })
    } catch (error: any) {
      logger.error('Data erasure failed', error)
      return c.json({ error: 'Erasure failed' }, 500)
    }
  },
)

// ─────────────────────────────────────────
// INVITE ACCEPTANCE (PUBLIC)
// ─────────────────────────────────────────

orgRoutes.post('/invites/:token/accept', async (c) => {
  try {
    const token = c.req.param('token')!
    const authHeader = c.req.header('Authorization')
    if (!authHeader) return c.json({ error: 'Authentication required' }, 401)

    const apiKeyRaw = authHeader.replace(/^Bearer\s+/i, '').replace(/^Bearer\s+/i, '')
    const keyHash = crypto.createHash('sha256').update(apiKeyRaw).digest('hex')
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      include: { user: true },
    })
    if (!apiKeyRecord) return c.json({ error: 'Invalid API key' }, 401)

    const invite = await prisma.orgInvite.findFirst({
      where: { token, status: 'PENDING', expiresAt: { gt: new Date() } },
    })
    if (!invite) return c.json({ error: 'Invalid or expired invite' }, 404)

    if (invite.email.toLowerCase() !== apiKeyRecord.user.email.toLowerCase()) {
      return c.json({ error: 'Invite email does not match authenticated user' }, 403)
    }

    // Accept invite — create membership
    await prisma.$transaction([
      prisma.orgMembership.create({
        data: { orgId: invite.orgId, userId: apiKeyRecord.user.id, role: invite.role },
      }),
      prisma.orgInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      }),
    ])

    await prisma.orgAuditLog.create({
      data: {
        orgId: invite.orgId,
        action: 'ORG_MEMBER_JOINED',
        userId: apiKeyRecord.user.id,
        status: 'SUCCESS',
      },
    })

    const org = await prisma.organization.findUnique({ where: { id: invite.orgId } })
    return c.json({
      success: true,
      org: { id: org!.id, name: org!.name, slug: org!.slug },
      role: invite.role,
    })
  } catch (error: any) {
    logger.error('Invite acceptance failed', error)
    return c.json({ error: 'Failed to accept invite' }, 500)
  }
})

// ─────────────────────────────────────────
// HELPER: Generate org-scoped API key
// ─────────────────────────────────────────

function generateOrgApiKey(): { hash: string; prefix: string; fullKey: string } {
  const raw = crypto.randomBytes(32).toString('hex')
  const prefix = `${ORG_KEY_PREFIX}${raw.slice(0, 8)}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const fullKey = `${ORG_KEY_PREFIX}${raw}`
  return { hash, prefix, fullKey }
}
