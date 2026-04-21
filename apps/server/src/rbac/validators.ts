import { z } from 'zod'

// ─────────────────────────────────────────
// ORGANIZATION SCHEMAS
// ─────────────────────────────────────────

export const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(64, 'Name must be at most 64 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      'Name can only contain letters, numbers, spaces, hyphens, and underscores',
    ),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(32, 'Slug must be at most 32 characters')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase alphanumeric with hyphens, no leading/trailing hyphens',
    ),
})

export const updateOrgSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-zA-Z0-9\s\-_]+$/)
    .optional(),
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
})

// ─────────────────────────────────────────
// MEMBER & INVITE SCHEMAS
// ─────────────────────────────────────────

export const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER'], {
    errorMap: () => ({ message: 'Role must be ADMIN, MEMBER, or VIEWER' }),
  }),
})

export const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER'], {
    errorMap: () => ({ message: 'Role must be ADMIN, MEMBER, or VIEWER' }),
  }),
})

// ─────────────────────────────────────────
// TEAM SCHEMAS
// ─────────────────────────────────────────

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, 'Team name must be at least 2 characters')
    .max(48, 'Team name must be at most 48 characters'),
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(), // auto-generated from name if not provided
  description: z.string().max(256).optional(),
})

export const updateTeamSchema = z.object({
  name: z.string().min(2).max(48).optional(),
  slug: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().max(256).nullable().optional(),
})

// ─────────────────────────────────────────
// ORG API KEY SCHEMAS
// ─────────────────────────────────────────

const validScopes = ['tools:execute', 'tools:read', 'keys:manage', 'full'] as const

const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/

export const createOrgKeySchema = z.object({
  name: z
    .string()
    .min(2, 'Key name must be at least 2 characters')
    .max(64, 'Key name must be at most 64 characters'),
  scopes: z.array(z.enum(validScopes)).min(1, 'At least one scope is required'),
  ipAllowlist: z
    .array(z.string().regex(cidrRegex, 'Invalid CIDR format (e.g., 10.0.0.0/8)'))
    .optional()
    .default([]),
  expiresAt: z
    .string()
    .datetime()
    .refine((d) => new Date(d) > new Date(), 'Expiry must be in the future')
    .optional(),
  environment: z.enum(['production', 'staging', 'development']).default('production'),
})

// ─────────────────────────────────────────
// SSO CONFIGURATION SCHEMAS
// ─────────────────────────────────────────

export const ssoConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('saml'),
    entityId: z.string().url(),
    ssoUrl: z.string().url(),
    certificate: z.string().min(100, 'Certificate appears too short'),
    allowedDomains: z.array(z.string().min(3)).min(1),
    defaultRole: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
  }),
  z.object({
    type: z.literal('oidc'),
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    issuerUrl: z.string().url(),
    allowedDomains: z.array(z.string().min(3)).min(1),
    defaultRole: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
  }),
])

// ─────────────────────────────────────────
// QUERY PARAMETER SCHEMAS
// ─────────────────────────────────────────

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const auditQuerySchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ─────────────────────────────────────────
// TYPE EXPORTS
// ─────────────────────────────────────────

export type CreateOrgInput = z.infer<typeof createOrgSchema>
export type UpdateOrgInput = z.infer<typeof updateOrgSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>
export type CreateTeamInput = z.infer<typeof createTeamSchema>
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>
export type CreateOrgKeyInput = z.infer<typeof createOrgKeySchema>
export type SsoConfigInput = z.infer<typeof ssoConfigSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type AuditQueryInput = z.infer<typeof auditQuerySchema>
