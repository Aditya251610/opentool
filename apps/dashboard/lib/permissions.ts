// Client-side permission checking — mirrors server's RBAC role-permission map

import type { OrgRole } from './api'

export type Permission =
  | 'ORG_DELETE'
  | 'ORG_UPDATE'
  | 'ORG_BILLING'
  | 'ORG_SSO_CONFIGURE'
  | 'MEMBERS_INVITE'
  | 'MEMBERS_REMOVE'
  | 'MEMBERS_ROLE_CHANGE'
  | 'TEAMS_MANAGE'
  | 'TEAMS_VIEW'
  | 'KEYS_CREATE'
  | 'KEYS_REVOKE'
  | 'KEYS_VIEW_ALL'
  | 'TOOLS_CONNECT'
  | 'TOOLS_DISCONNECT'
  | 'TOOLS_EXECUTE'
  | 'TOOLS_VIEW'
  | 'AUDIT_VIEW'
  | 'AUDIT_EXPORT'
  | 'POLICIES_MANAGE'
  | 'DATA_EXPORT'
  | 'DATA_DELETE'

const ROLE_PERMISSIONS: Record<OrgRole, Set<Permission>> = {
  OWNER: new Set([
    'ORG_DELETE',
    'ORG_UPDATE',
    'ORG_BILLING',
    'ORG_SSO_CONFIGURE',
    'MEMBERS_INVITE',
    'MEMBERS_REMOVE',
    'MEMBERS_ROLE_CHANGE',
    'TEAMS_MANAGE',
    'TEAMS_VIEW',
    'KEYS_CREATE',
    'KEYS_REVOKE',
    'KEYS_VIEW_ALL',
    'TOOLS_CONNECT',
    'TOOLS_DISCONNECT',
    'TOOLS_EXECUTE',
    'TOOLS_VIEW',
    'AUDIT_VIEW',
    'AUDIT_EXPORT',
    'POLICIES_MANAGE',
    'DATA_EXPORT',
    'DATA_DELETE',
  ]),
  ADMIN: new Set([
    'ORG_UPDATE',
    'ORG_BILLING',
    'ORG_SSO_CONFIGURE',
    'MEMBERS_INVITE',
    'MEMBERS_REMOVE',
    'MEMBERS_ROLE_CHANGE',
    'TEAMS_MANAGE',
    'TEAMS_VIEW',
    'KEYS_CREATE',
    'KEYS_REVOKE',
    'KEYS_VIEW_ALL',
    'TOOLS_CONNECT',
    'TOOLS_DISCONNECT',
    'TOOLS_EXECUTE',
    'TOOLS_VIEW',
    'AUDIT_VIEW',
    'AUDIT_EXPORT',
    'POLICIES_MANAGE',
    'DATA_EXPORT',
    'DATA_DELETE',
  ]),
  MEMBER: new Set([
    'TEAMS_VIEW',
    'KEYS_CREATE',
    'KEYS_VIEW_ALL',
    'TOOLS_CONNECT',
    'TOOLS_DISCONNECT',
    'TOOLS_EXECUTE',
    'TOOLS_VIEW',
    'AUDIT_VIEW',
  ]),
  VIEWER: new Set(['TOOLS_VIEW', 'AUDIT_VIEW', 'TEAMS_VIEW']),
}

export function hasPermission(role: OrgRole | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false
}

export function hasAnyPermission(role: OrgRole | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}
