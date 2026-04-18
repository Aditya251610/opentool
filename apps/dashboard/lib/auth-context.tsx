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

// XOR-based obfuscation for sessionStorage (not encryption, but prevents casual inspection)
// True security requires httpOnly cookies; this mitigates casual XSS scraping
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

  useEffect(() => {
    try {
      const storedKey = sessionStorage.getItem(STORAGE_KEY)
      const storedUser = sessionStorage.getItem(STORAGE_USER)
      if (storedKey) setApiKey(deobfuscate(storedKey))
      if (storedUser) setUser(JSON.parse(deobfuscate(storedUser)))
    } catch {
      // Corrupted storage — clear it
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(STORAGE_USER)
    }
    setIsLoading(false)
  }, [])

  const login = useCallback((key: string, userData: User) => {
    sessionStorage.setItem(STORAGE_KEY, obfuscate(key))
    sessionStorage.setItem(STORAGE_USER, obfuscate(JSON.stringify(userData)))
    setApiKey(key)
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_USER)
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
