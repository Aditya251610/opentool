'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

interface User {
  id: string
  email: string
  name: string | null
}

interface AuthState {
  apiKey: string | null
  user: User | null
  isLoading: boolean
  login: (apiKey: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthState>({
  apiKey: null,
  user: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
})

const STORAGE_KEY = 'opentool_api_key'
const STORAGE_USER = 'opentool_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const storedKey = localStorage.getItem(STORAGE_KEY)
      const storedUser = localStorage.getItem(STORAGE_USER)
      if (storedKey) setApiKey(storedKey)
      if (storedUser) setUser(JSON.parse(storedUser))
    } catch {}
    setIsLoading(false)
  }, [])

  const login = useCallback((key: string, userData: User) => {
    localStorage.setItem(STORAGE_KEY, key)
    localStorage.setItem(STORAGE_USER, JSON.stringify(userData))
    setApiKey(key)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STORAGE_USER)
    setApiKey(null)
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ apiKey, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
