import { OrgRole } from '@prisma/client'

// ─────────────────────────────────────────
// PERMISSION DEFINITIONS
// ─────────────────────────────────────────

export enum Permission {
  ORG_DELETE = 'org:delete',
  ORG_UPDATE = 'org:update',
  ORG_BILLING = 'org:billing',
  ORG_SSO_CONFIGURE = 'org:sso_configure',
  MEMBERS_INVITE = 'members:invite',
  MEMBERS_REMOVE = 'members:remove',
  MEMBERS_ROLE_CHANGE = 'members:role_change',
  TEAMS_MANAGE = 'teams:manage',
  TEAMS_VIEW = 'teams:view',
  KEYS_CREATE = 'keys:create',
  KEYS_REVOKE = 'keys:revoke',
  KEYS_VIEW_ALL = 'keys:view_all',
  TOOLS_CONNECT = 'tools:connect',
  TOOLS_DISCONNECT = 'tools:disconnect',
  TOOLS_EXECUTE = 'tools:execute',
  TOOLS_VIEW = 'tools:view',
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',
  POLICIES_MANAGE = 'policies:manage',
  DATA_EXPORT = 'data:export',
  DATA_DELETE = 'data:delete',
}

// ─────────────────────────────────────────
// ROLE → PERMISSIONS MAPPING
// ─────────────────────────────────────────

const ALL_PERMISSIONS = Object.values(Permission)

const ADMIN_PERMISSIONS = ALL_PERMISSIONS.filter(
  (p) =>
    p !== Permission.ORG_DELETE && p !== Permission.ORG_BILLING && p !== Permission.DATA_DELETE,
)

const MEMBER_PERMISSIONS: Permission[] = [
  Permission.TOOLS_EXECUTE,
  Permission.TOOLS_VIEW,
  Permission.TOOLS_CONNECT,
  Permission.KEYS_CREATE,
  Permission.AUDIT_VIEW,
  Permission.TEAMS_VIEW,
]

const VIEWER_PERMISSIONS: Permission[] = [
  Permission.TOOLS_VIEW,
  Permission.AUDIT_VIEW,
  Permission.TEAMS_VIEW,
]

export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  [OrgRole.OWNER]: ALL_PERMISSIONS,
  [OrgRole.ADMIN]: ADMIN_PERMISSIONS,
  [OrgRole.MEMBER]: MEMBER_PERMISSIONS,
  [OrgRole.VIEWER]: VIEWER_PERMISSIONS,
}

// ─────────────────────────────────────────
// PERMISSION CHECK FUNCTIONS
// ─────────────────────────────────────────

/** Check if a role has a specific permission */
export function hasPermission(role: OrgRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/** Check if a role has ANY of the listed permissions */
export function hasAnyPermission(role: OrgRole, permissions: Permission[]): boolean {
  const rolePerms = ROLE_PERMISSIONS[role]
  return permissions.some((p) => rolePerms.includes(p))
}

/** Check if a role has ALL of the listed permissions */
export function hasAllPermissions(role: OrgRole, permissions: Permission[]): boolean {
  const rolePerms = ROLE_PERMISSIONS[role]
  return permissions.every((p) => rolePerms.includes(p))
}

/** Get all permissions for a given role */
export function getPermissionsForRole(role: OrgRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]]
}
