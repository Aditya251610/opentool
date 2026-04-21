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
  login: (apiKey: string, user: User) => void
  logout: () => void
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
  login: () => {},
  logout: () => {},
  orgs: [],
  activeOrg: null,
  switchOrg: () => {},
  clearOrg: () => {},
  refreshOrgs: async () => {},
})

const STORAGE_KEY = 'opentool_api_key'
const STORAGE_USER = 'opentool_user'
const STORAGE_ORG = 'opentool_active_org'

// XOR-based obfuscation for sessionStorage (not encryption, but prevents casual inspection)
const OBF_KEY = 'OpEnToOl_2026'
function obfuscate(text: string): string {
  const arr: number[] = []
  for (let i = 0; i < text.length; i++) {
    arr.push(text.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length))
  }
  return btoa(String.fromCharCode(...arr))
}
function deobfuscate(encoded: string): string {
  const decoded = atob(encoded)
  const arr: number[] = []
  for (let i = 0; i < decoded.length; i++) {
    arr.push(decoded.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length))
  }
  return String.fromCharCode(...arr)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [orgs, setOrgs] = useState<(Org & { role: OrgRole })[]>([])
  const [activeOrg, setActiveOrg] = useState<OrgContext | null>(null)

  useEffect(() => {
    try {
      const storedKey = sessionStorage.getItem(STORAGE_KEY)
      const storedUser = sessionStorage.getItem(STORAGE_USER)
      const storedOrg = sessionStorage.getItem(STORAGE_ORG)
      if (storedKey) setApiKey(deobfuscate(storedKey))
      if (storedUser) setUser(JSON.parse(deobfuscate(storedUser)))
      if (storedOrg) setActiveOrg(JSON.parse(deobfuscate(storedOrg)))
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_USER)
      sessionStorage.removeItem(STORAGE_ORG)
    }
    setIsLoading(false)
  }, [])

  // Fetch orgs after api key is set
  const refreshOrgs = useCallback(async () => {
    if (!apiKey || !FEATURES.ORGS_ENABLED) return
    try {
      const { orgs: fetchedOrgs } = await orgApi.list(apiKey)
      setOrgs(fetchedOrgs)
    } catch {
      // Non-critical — user may not have orgs yet
    }
  }, [apiKey])

  useEffect(() => {
    if (apiKey) refreshOrgs()
  }, [apiKey, refreshOrgs])

  const login = useCallback((key: string, userData: User) => {
    sessionStorage.setItem(STORAGE_KEY, obfuscate(key))
    sessionStorage.setItem(STORAGE_USER, obfuscate(JSON.stringify(userData)))
    setApiKey(key)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_USER)
    sessionStorage.removeItem(STORAGE_ORG)
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
      sessionStorage.setItem(STORAGE_ORG, obfuscate(JSON.stringify(ctx)))
    },
    [orgs],
  )

  const clearOrg = useCallback(() => {
    setActiveOrg(null)
    sessionStorage.removeItem(STORAGE_ORG)
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
