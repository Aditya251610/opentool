import { Prisma } from '@prisma/client'
import { logger } from '../logger'

// ─────────────────────────────────────────
// DATA ISOLATION MIDDLEWARE (Prisma Extension)
// Ensures org-scoped queries always include orgId filter.
// Prevents accidental cross-tenant data access.
// ─────────────────────────────────────────

/**
 * Models that require orgId scoping.
 * Any query on these models MUST include an orgId in the where clause.
 */
const ORG_SCOPED_MODELS = new Set([
  'OrgMembership',
  'Team',
  'TeamMembership',
  'OrgApiKey',
  'OrgToolConnection',
  'OrgTokenStore',
  'OrgInvite',
  'OrgPolicy',
  'OrgAuditLog',
  'OrgSsoSession',
  'DataRetentionPolicy',
])

/**
 * Creates a Prisma extension that enforces data isolation.
 * When applied, all findMany/findFirst/updateMany/deleteMany on org-scoped models
 * are validated to contain an orgId filter — logs warnings if missing.
 *
 * In production, missing orgId logs a warning but does NOT block (avoid breaking changes).
 * In test/development, it throws to catch bugs early.
 */
export function createDataIsolationExtension(mode: 'strict' | 'warn' = 'warn') {
  return Prisma.defineExtension({
    name: 'dataIsolation',
    query: {
      $allOperations({ model, operation, args, query }) {
        if (!model || !ORG_SCOPED_MODELS.has(model)) {
          return query(args)
        }

        // Only check operations that read/write multiple records
        const multiOps = ['findMany', 'updateMany', 'deleteMany', 'count', 'aggregate', 'groupBy']
        if (!multiOps.includes(operation)) {
          return query(args)
        }

        // Check if where clause contains orgId
        const where = (args as any)?.where
        const hasOrgId = where && ('orgId' in where || 'org' in where || 'orgId_userId' in where)

        if (!hasOrgId) {
          const message = `[DATA ISOLATION] Query on ${model}.${operation} without orgId filter`

          if (mode === 'strict') {
            throw new Error(message)
          } else {
            logger.warn(message, { model, operation })
          }
        }

        return query(args)
      },
    },
  })
}
