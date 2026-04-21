import { describe, it, expect } from 'vitest'
import { OrgRole } from '@prisma/client'
import {
  Permission,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
} from '../permissions'

describe('RBAC Permissions', () => {
  describe('ROLE_PERMISSIONS mapping', () => {
    it('OWNER has all permissions', () => {
      const allPerms = Object.values(Permission)
      expect(ROLE_PERMISSIONS[OrgRole.OWNER]).toEqual(expect.arrayContaining(allPerms))
      expect(ROLE_PERMISSIONS[OrgRole.OWNER]).toHaveLength(allPerms.length)
    })

    it('ADMIN has all permissions except org:delete, org:billing, data:delete', () => {
      const adminPerms = ROLE_PERMISSIONS[OrgRole.ADMIN]
      expect(adminPerms).not.toContain(Permission.ORG_DELETE)
      expect(adminPerms).not.toContain(Permission.ORG_BILLING)
      expect(adminPerms).not.toContain(Permission.DATA_DELETE)
      // Admin should have everything else
      expect(adminPerms).toContain(Permission.ORG_UPDATE)
      expect(adminPerms).toContain(Permission.MEMBERS_INVITE)
      expect(adminPerms).toContain(Permission.TOOLS_EXECUTE)
      expect(adminPerms).toContain(Permission.AUDIT_EXPORT)
      expect(adminPerms).toContain(Permission.POLICIES_MANAGE)
    })

    it('MEMBER has limited permissions', () => {
      const memberPerms = ROLE_PERMISSIONS[OrgRole.MEMBER]
      expect(memberPerms).toContain(Permission.TOOLS_EXECUTE)
      expect(memberPerms).toContain(Permission.TOOLS_VIEW)
      expect(memberPerms).toContain(Permission.TOOLS_CONNECT)
      expect(memberPerms).toContain(Permission.KEYS_CREATE)
      expect(memberPerms).toContain(Permission.AUDIT_VIEW)
      expect(memberPerms).toContain(Permission.TEAMS_VIEW)
      // Should NOT have admin actions
      expect(memberPerms).not.toContain(Permission.MEMBERS_INVITE)
      expect(memberPerms).not.toContain(Permission.MEMBERS_REMOVE)
      expect(memberPerms).not.toContain(Permission.ORG_UPDATE)
      expect(memberPerms).not.toContain(Permission.KEYS_REVOKE)
    })

    it('VIEWER has read-only permissions', () => {
      const viewerPerms = ROLE_PERMISSIONS[OrgRole.VIEWER]
      expect(viewerPerms).toContain(Permission.TOOLS_VIEW)
      expect(viewerPerms).toContain(Permission.AUDIT_VIEW)
      expect(viewerPerms).toContain(Permission.TEAMS_VIEW)
      // Should NOT have any write actions
      expect(viewerPerms).not.toContain(Permission.TOOLS_EXECUTE)
      expect(viewerPerms).not.toContain(Permission.TOOLS_CONNECT)
      expect(viewerPerms).not.toContain(Permission.KEYS_CREATE)
      expect(viewerPerms).not.toContain(Permission.MEMBERS_INVITE)
    })

    it('role hierarchy: OWNER > ADMIN > MEMBER > VIEWER', () => {
      const ownerCount = ROLE_PERMISSIONS[OrgRole.OWNER].length
      const adminCount = ROLE_PERMISSIONS[OrgRole.ADMIN].length
      const memberCount = ROLE_PERMISSIONS[OrgRole.MEMBER].length
      const viewerCount = ROLE_PERMISSIONS[OrgRole.VIEWER].length
      expect(ownerCount).toBeGreaterThan(adminCount)
      expect(adminCount).toBeGreaterThan(memberCount)
      expect(memberCount).toBeGreaterThan(viewerCount)
    })
  })

  describe('hasPermission', () => {
    it('returns true when role has permission', () => {
      expect(hasPermission(OrgRole.OWNER, Permission.ORG_DELETE)).toBe(true)
      expect(hasPermission(OrgRole.ADMIN, Permission.MEMBERS_INVITE)).toBe(true)
      expect(hasPermission(OrgRole.MEMBER, Permission.TOOLS_EXECUTE)).toBe(true)
      expect(hasPermission(OrgRole.VIEWER, Permission.TOOLS_VIEW)).toBe(true)
    })

    it('returns false when role lacks permission', () => {
      expect(hasPermission(OrgRole.ADMIN, Permission.ORG_DELETE)).toBe(false)
      expect(hasPermission(OrgRole.MEMBER, Permission.MEMBERS_INVITE)).toBe(false)
      expect(hasPermission(OrgRole.VIEWER, Permission.TOOLS_EXECUTE)).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('returns true if role has at least one of the permissions', () => {
      expect(
        hasAnyPermission(OrgRole.MEMBER, [Permission.ORG_DELETE, Permission.TOOLS_EXECUTE]),
      ).toBe(true)
    })

    it('returns false if role has none of the permissions', () => {
      expect(
        hasAnyPermission(OrgRole.VIEWER, [Permission.TOOLS_EXECUTE, Permission.KEYS_CREATE]),
      ).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('returns true if role has all listed permissions', () => {
      expect(
        hasAllPermissions(OrgRole.MEMBER, [Permission.TOOLS_EXECUTE, Permission.TOOLS_VIEW]),
      ).toBe(true)
    })

    it('returns false if role is missing any permission', () => {
      expect(
        hasAllPermissions(OrgRole.MEMBER, [Permission.TOOLS_EXECUTE, Permission.MEMBERS_INVITE]),
      ).toBe(false)
    })
  })

  describe('getPermissionsForRole', () => {
    it('returns a copy of the permissions array', () => {
      const perms = getPermissionsForRole(OrgRole.OWNER)
      perms.push(Permission.ORG_DELETE) // mutate
      // Original should be unchanged
      expect(ROLE_PERMISSIONS[OrgRole.OWNER].length).toBe(Object.values(Permission).length)
    })
  })

  describe('every role × every permission coverage', () => {
    const roles = Object.values(OrgRole) as OrgRole[]
    const permissions = Object.values(Permission) as Permission[]

    for (const role of roles) {
      for (const perm of permissions) {
        it(`${role} × ${perm} is deterministic`, () => {
          const result = hasPermission(role, perm)
          expect(typeof result).toBe('boolean')
          expect(result).toBe(ROLE_PERMISSIONS[role].includes(perm))
        })
      }
    }
  })
})
