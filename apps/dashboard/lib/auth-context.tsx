'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { orgApi, FEATURES, type Org, type OrgRole } from './api'

interface User {
  id: string
  email: string
  name: string | null
}

interface OrgContext {
  org: Org
  role: OrgRole
}

interface AuthState {
  apiKey: string | null
  user: User | null
  isLoading: boolean
  login: (apiKey: string, user: User) => Promise<void>
  logout: () => Promise<void>
  // Org state
  orgs: (Org & { role: OrgRole })[]
  activeOrg: OrgContext | null
  switchOrg: (slug: string) => void
  clearOrg: () => void
  refreshOrgs: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  apiKey: null,
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  orgs: [],
  activeOrg: null,
  switchOrg: () => {},
  clearOrg: () => {},
  refreshOrgs: async () => {},
})

const STORAGE_ORG = 'opentool_active_org'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orgs, setOrgs] = useState<(Org & { role: OrgRole })[]>([])
  const [activeOrg, setActiveOrg] = useState<OrgContext | null>(null)

  // On mount: check for existing httpOnly session
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session')
        const data = await res.json()
        if (data.authenticated && data.user) {
          setUser(data.user)
          setApiKey('__httponly__') // Marker — real key is in httpOnly cookie
        }
        // Restore org context from localStorage (non-sensitive)
        const storedOrg = localStorage.getItem(STORAGE_ORG)
        if (storedOrg) {
          setActiveOrg(JSON.parse(storedOrg))
        }
      } catch {
        // No session — user is not logged in
      }
      setIsLoading(false)
    }
    checkSession()
  }, [])

  // Fetch orgs after authentication
  const refreshOrgs = useCallback(async () => {
    if (!apiKey || !FEATURES.ORGS_ENABLED) return
    try {
      const { orgs: fetchedOrgs } = await orgApi.list()
      setOrgs(fetchedOrgs)
    } catch {
      // Non-critical — user may not have orgs yet
    }
  }, [apiKey])

  useEffect(() => {
    if (apiKey) refreshOrgs()
  }, [apiKey, refreshOrgs])

  const login = useCallback(async (key: string, userData: User) => {
    // Store key in httpOnly cookie via server-side route
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: key, user: userData }),
    })
    setApiKey('__httponly__')
    setUser(userData)
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/session', { method: 'DELETE' })
    localStorage.removeItem(STORAGE_ORG)
    setApiKey(null)
    setUser(null)
    setOrgs([])
    setActiveOrg(null)
  }, [])

  const switchOrg = useCallback(
    (slug: string) => {
      const found = orgs.find((o) => o.slug === slug)
      if (!found) return
      const ctx: OrgContext = { org: found, role: found.role }
      setActiveOrg(ctx)
      localStorage.setItem(STORAGE_ORG, JSON.stringify(ctx))
    },
    [orgs],
  )

  const clearOrg = useCallback(() => {
    setActiveOrg(null)
    localStorage.removeItem(STORAGE_ORG)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        apiKey,
        user,
        isLoading,
        login,
        logout,
        orgs,
        activeOrg,
        switchOrg,
        clearOrg,
        refreshOrgs,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
