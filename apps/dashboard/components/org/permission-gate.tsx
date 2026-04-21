'use client'

import { type ReactNode } from 'react'
import { useAuth } from '@/lib/auth-context'
import { hasPermission, hasAnyPermission, type Permission } from '@/lib/permissions'

interface PermissionGateProps {
  /** Single permission required */
  permission?: Permission
  /** Multiple permissions — user needs at least one */
  anyOf?: Permission[]
  /** What to render when permission is denied */
  fallback?: ReactNode
  children: ReactNode
}

/** Only renders children if the user has the required org permission */
export function PermissionGate({
  permission,
  anyOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { activeOrg } = useAuth()
  const role = activeOrg?.role

  if (permission && !hasPermission(role, permission)) return <>{fallback}</>
  if (anyOf && !hasAnyPermission(role, anyOf)) return <>{fallback}</>

  return <>{children}</>
}

/** Hook version — returns boolean */
export function usePermission(permission: Permission): boolean {
  const { activeOrg } = useAuth()
  return hasPermission(activeOrg?.role, permission)
}

export function useAnyPermission(permissions: Permission[]): boolean {
  const { activeOrg } = useAuth()
  return hasAnyPermission(activeOrg?.role, permissions)
}
